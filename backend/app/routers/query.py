import time
from fastapi import APIRouter, HTTPException
from ..models import QueryRequest, QueryResponse, CustomCodeRequest, SafetyResult
from .datasets import DATASETS_CACHE, METADATA_CACHE, POSTGRES_CONFIGS
from ..engine.generator import generate_code_and_reasoning
from ..engine.safety import validate_sql_safety, validate_pandas_safety, validate_user_prompt
from ..engine.executor import (
    execute_sql_duckdb,
    execute_sql_postgres,
    execute_pandas_safe,
    df_to_json_result
)
from ..engine.insights import generate_chart_spec, generate_insights

router = APIRouter(prefix="/api/query", tags=["query"])

@router.post("/execute", response_model=QueryResponse)
def execute_natural_language_query(req: QueryRequest):
    """Translates a natural language question into SQL or Pandas, validates safety, executes, and returns table, chart, and insights."""
    if req.dataset_id not in DATASETS_CACHE:
        raise HTTPException(status_code=404, detail=f"Dataset with ID '{req.dataset_id}' not found.")

    df = DATASETS_CACHE[req.dataset_id]
    meta = METADATA_CACHE[req.dataset_id]

    # Rule Validation: Detect invalid user prompts before sending to LLM
    prompt_check = validate_user_prompt(req.question, df)
    if not prompt_check.is_valid:
        error_msg = prompt_check.clarification if prompt_check.clarification else prompt_check.message
        return QueryResponse(
            success=False,
            question=req.question,
            code="",
            code_type="sql" if req.mode != "pandas" else "pandas",
            reasoning=f"Prompt rejected ({prompt_check.rule_violated}): {prompt_check.message}",
            columns=[],
            rows=[],
            total_rows=0,
            execution_time_ms=0.0,
            safety=SafetyResult(
                passed=False,
                message=prompt_check.message,
                sanitized_code="",
                rules_applied=[f"Rule: {prompt_check.rule_violated}"],
                risk_level="medium" if prompt_check.clarification else "blocked"
            ),
            chart=generate_chart_spec(None, req.question),
            insight=generate_insights(None, req.question),
            error=error_msg
        )

    # Use sanitized prompt for generation
    sanitized_question = prompt_check.sanitized_prompt

    # Generate Code using chosen provider / smart fallback
    try:
        code, code_type, reasoning = generate_code_and_reasoning(
            question=sanitized_question,
            df=df,
            mode=req.mode,
            provider=req.provider,
            api_key=req.api_key,
            model_name=req.model_name,
            base_url=req.base_url
        )
    except Exception as e:
        return QueryResponse(
            success=False,
            question=req.question,
            code="",
            code_type="sql",
            reasoning=f"Generation failed with {req.provider}: {str(e)}",
            columns=[],
            rows=[],
            total_rows=0,
            execution_time_ms=0.0,
            safety=SafetyResult(
                passed=False,
                message=str(e),
                sanitized_code="",
                rules_applied=["LLM Provider Required"],
                risk_level="blocked"
            ),
            chart=generate_chart_spec(None, req.question),
            insight=generate_insights(None, req.question),
            error=str(e)
        )

    # Safety validation
    if code_type == "sql":
        safety_status = validate_sql_safety(code)
    else:
        safety_status = validate_pandas_safety(code)

    if not safety_status.passed:
        # Return blocked query response
        return QueryResponse(
            success=False,
            question=req.question,
            code=code,
            code_type=code_type,
            reasoning=reasoning,
            columns=[],
            rows=[],
            total_rows=0,
            execution_time_ms=0.0,
            safety=safety_status,
            chart=generate_chart_spec(None, req.question),
            insight=generate_insights(None, req.question),
            error=f"Safety verification rejected the query: {safety_status.message}"
        )

    # Safe execution
    try:
        if code_type == "sql":
            if meta.source_type == "postgres" and req.dataset_id in POSTGRES_CONFIGS:
                pg_config = POSTGRES_CONFIGS[req.dataset_id]
                res_df, exec_time = execute_sql_postgres(safety_status.sanitized_code, pg_config)
            else:
                res_df, exec_time = execute_sql_duckdb(safety_status.sanitized_code, df)
        else:
            res_df, exec_time = execute_pandas_safe(safety_status.sanitized_code, df)

    except Exception as e:
        return QueryResponse(
            success=False,
            question=req.question,
            code=safety_status.sanitized_code,
            code_type=code_type,
            reasoning=reasoning,
            columns=[],
            rows=[],
            total_rows=0,
            execution_time_ms=0.0,
            safety=safety_status,
            chart=generate_chart_spec(None, req.question),
            insight=generate_insights(None, req.question),
            error=f"Execution error: {str(e)}"
        )

    # Convert results
    columns, rows, total_rows = df_to_json_result(res_df)
    chart_spec = generate_chart_spec(res_df, req.question)
    insights = generate_insights(res_df, req.question)

    return QueryResponse(
        success=True,
        question=req.question,
        code=safety_status.sanitized_code,
        code_type=code_type,
        reasoning=reasoning,
        columns=columns,
        rows=rows,
        total_rows=total_rows,
        execution_time_ms=exec_time,
        safety=safety_status,
        chart=chart_spec,
        insight=insights,
        error=None
    )


@router.post("/validate-prompt")
def validate_prompt_only(req: QueryRequest):
    """Explicitly checks all 10 prompt and safety rules before running any query."""
    df = DATASETS_CACHE.get(req.dataset_id)
    check = validate_user_prompt(req.question, df)
    return {
        "is_valid": check.is_valid,
        "rule_violated": check.rule_violated,
        "message": check.message,
        "clarification": check.clarification,
        "sanitized_prompt": check.sanitized_prompt
    }


@router.post("/run-custom", response_model=QueryResponse)
def run_custom_user_code(req: CustomCodeRequest):
    """Executes user-edited SQL or Pandas code with the same AST and sandbox safety constraints."""
    if req.dataset_id not in DATASETS_CACHE:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    df = DATASETS_CACHE[req.dataset_id]
    meta = METADATA_CACHE[req.dataset_id]
    question = req.original_question or "Custom Code Query"

    # Validate code
    if req.code_type == "sql":
        safety_status = validate_sql_safety(req.code)
    else:
        safety_status = validate_pandas_safety(req.code)

    if not safety_status.passed:
        return QueryResponse(
            success=False,
            question=question,
            code=req.code,
            code_type=req.code_type,
            reasoning="Custom query submitted by user.",
            columns=[],
            rows=[],
            total_rows=0,
            execution_time_ms=0.0,
            safety=safety_status,
            chart=generate_chart_spec(None, question),
            insight=generate_insights(None, question),
            error=f"Code rejected: {safety_status.message}"
        )

    # Safe execution
    try:
        if req.code_type == "sql":
            if meta.source_type == "postgres" and req.dataset_id in POSTGRES_CONFIGS:
                pg_config = POSTGRES_CONFIGS[req.dataset_id]
                res_df, exec_time = execute_sql_postgres(safety_status.sanitized_code, pg_config)
            else:
                res_df, exec_time = execute_sql_duckdb(safety_status.sanitized_code, df)
        else:
            res_df, exec_time = execute_pandas_safe(safety_status.sanitized_code, df)

    except Exception as e:
        return QueryResponse(
            success=False,
            question=question,
            code=safety_status.sanitized_code,
            code_type=req.code_type,
            reasoning="Custom query submitted by user.",
            columns=[],
            rows=[],
            total_rows=0,
            execution_time_ms=0.0,
            safety=safety_status,
            chart=generate_chart_spec(None, question),
            insight=generate_insights(None, question),
            error=f"Execution error: {str(e)}"
        )

    columns, rows, total_rows = df_to_json_result(res_df)
    chart_spec = generate_chart_spec(res_df, question)
    insights = generate_insights(res_df, question)

    return QueryResponse(
        success=True,
        question=question,
        code=safety_status.sanitized_code,
        code_type=req.code_type,
        reasoning="Successfully executed user-customized query.",
        columns=columns,
        rows=rows,
        total_rows=total_rows,
        execution_time_ms=exec_time,
        safety=safety_status,
        chart=chart_spec,
        insight=insights,
        error=None
    )
