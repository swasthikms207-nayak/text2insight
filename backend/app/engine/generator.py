import os
import re
import json
import requests
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from .safety import clean_code_block

SYSTEM_PROMPT = """You are an expert Data Analyst and Code Generator.
Given a dataset schema and a natural language question, your task is to generate safe, read-only SQL or Pandas code.

Rules:
1. Always generate READ-ONLY code. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, etc.
2. In SQL mode:
   - The table is named `df` (or `dataset`).
   - Use standard ANSI SQL supported by DuckDB / PostgreSQL.
   - Return clean SQL without comments or extra explanations.
3. In Pandas mode:
   - The input DataFrame is named `df`.
   - Assign the final computed DataFrame or Series to `result_df`.
   - Never import forbidden modules (os, sys, subprocess, etc.). Never write files.
4. Output JSON strictly adhering to this format:
{
  "code": "<only SQL or Python code>",
  "code_type": "sql" or "pandas",
  "reasoning": "<1-2 sentence explanation of logic>"
}
"""

def generate_local_fallback(question: str, df: pd.DataFrame, mode: str = "sql") -> Tuple[str, str, str]:
    """Smart semantic fallback generator when LLM API keys are not supplied.
    Translates common business intelligence and analytical questions into high quality SQL & Pandas.
    """
    q = question.lower().strip()
    cols = list(df.columns)
    num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
    cat_cols = [c for c in cols if not pd.api.types.is_numeric_dtype(df[c])]

    # Determine desired mode
    target_mode = "pandas" if mode == "pandas" else "sql"

    # Match columns in question
    matched_num = [c for c in num_cols if c.lower() in q or c.lower().replace("_", " ") in q]
    matched_cat = [c for c in cat_cols if c.lower() in q or c.lower().replace("_", " ") in q]

    metric_col = matched_num[0] if matched_num else (num_cols[0] if num_cols else None)
    group_col = matched_cat[0] if matched_cat else (cat_cols[0] if cat_cols else None)

    # Check for "top N" or "highest N"
    top_n_match = re.search(r"\b(?:top|highest|best|first)\s+(\d+)\b", q)
    limit_val = int(top_n_match.group(1)) if top_n_match else (10 if ("top" in q or "highest" in q) else None)

    # Check for aggregate operation
    is_avg = any(w in q for w in ["average", "avg", "mean"])
    is_count = any(w in q for w in ["count", "how many", "number of"])
    is_min = any(w in q for w in ["min", "minimum", "lowest"])
    is_max = any(w in q for w in ["max", "maximum", "highest", "peak"])
    
    agg_func = "AVG" if is_avg else ("COUNT" if is_count else ("MIN" if is_min else ("MAX" if is_max else "SUM")))
    pd_agg = "mean" if is_avg else ("count" if is_count else ("min" if is_min else ("max" if is_max else "sum")))

    # Specific dataset heuristics
    # SaaS: "churn rate by plan"
    if "churn" in q and "plan" in cols and "is_churned" in cols:
        if target_mode == "sql":
            code = (
                "SELECT plan, \n"
                "       COUNT(*) as total_customers, \n"
                "       ROUND(AVG(CASE WHEN is_churned = 'Yes' THEN 1.0 ELSE 0.0 END) * 100, 2) as churn_rate_pct, \n"
                "       ROUND(SUM(monthly_spend), 2) as total_mrr\n"
                "FROM df\n"
                "GROUP BY plan\n"
                "ORDER BY churn_rate_pct DESC"
            )
            reasoning = "Calculates total customer volume, percentage churn rate, and monthly recurring revenue grouped by plan tier."
            return code, "sql", reasoning
        else:
            code = (
                "churn_calc = df.groupby('plan').apply(lambda g: pd.Series({\n"
                "    'total_customers': len(g),\n"
                "    'churn_rate_pct': round((g['is_churned'] == 'Yes').mean() * 100, 2),\n"
                "    'total_mrr': round(g['monthly_spend'].sum(), 2)\n"
                "})).reset_index()\n"
                "result_df = churn_calc.sort_values(by='churn_rate_pct', ascending=False)"
            )
            reasoning = "Aggregates customer counts, churn rate percentage, and total spend grouped by plan."
            return code, "pandas", reasoning

    # Grouped aggregation
    if group_col and metric_col and ("by" in q or "per" in q or "across" in q or "distribution" in q or "compare" in q or is_avg or is_count or limit_val):
        limit_clause = f"\nLIMIT {limit_val}" if limit_val else ""
        if target_mode == "sql":
            code = (
                f"SELECT {group_col}, \n"
                f"       ROUND({agg_func}({metric_col}), 2) AS {agg_func.lower()}_{metric_col}\n"
                f"FROM df\n"
                f"GROUP BY {group_col}\n"
                f"ORDER BY {agg_func.lower()}_{metric_col} DESC{limit_clause}"
            )
            reasoning = f"Groups the records by `{group_col}` and calculates {agg_func} of `{metric_col}`, sorted in descending order."
            return code, "sql", reasoning
        else:
            head_clause = f".head({limit_val})" if limit_val else ""
            code = (
                f"result_df = df.groupby('{group_col}')['{metric_col}'].{pd_agg}().round(2).reset_index()\n"
                f"result_df = result_df.sort_values(by='{metric_col}', ascending=False){head_clause}"
            )
            reasoning = f"Uses pandas groupby on `{group_col}` and computes the {pd_agg} of `{metric_col}`."
            return code, "pandas", reasoning

    # Ranking / Top items without explicit grouping
    if limit_val and metric_col:
        display_col = group_col or cols[0]
        if target_mode == "sql":
            code = (
                f"SELECT {display_col}, {metric_col}\n"
                f"FROM df\n"
                f"ORDER BY {metric_col} DESC\n"
                f"LIMIT {limit_val}"
            )
            reasoning = f"Selects the top {limit_val} records ordered by `{metric_col}` descending."
            return code, "sql", reasoning
        else:
            code = (
                f"result_df = df[['{display_col}', '{metric_col}']].sort_values(by='{metric_col}', ascending=False).head({limit_val})"
            )
            reasoning = f"Selects relevant columns, sorts by `{metric_col}` in descending order, and extracts the top {limit_val} rows."
            return code, "pandas", reasoning

    # Time series / Date analysis
    date_cols = [c for c in cols if "date" in c.lower() or "quarter" in c.lower() or "year" in c.lower()]
    if date_cols and metric_col and ("trend" in q or "over time" in q or "quarter" in q or "monthly" in q):
        d_col = date_cols[0]
        if target_mode == "sql":
            code = (
                f"SELECT {d_col}, \n"
                f"       ROUND(SUM({metric_col}), 2) AS total_{metric_col}\n"
                f"FROM df\n"
                f"GROUP BY {d_col}\n"
                f"ORDER BY {d_col} ASC"
            )
            reasoning = f"Aggregates total `{metric_col}` chronologically across `{d_col}`."
            return code, "sql", reasoning
        else:
            code = (
                f"result_df = df.groupby('{d_col}')['{metric_col}'].sum().round(2).reset_index()\n"
                f"result_df = result_df.sort_values(by='{d_col}', ascending=True)"
            )
            reasoning = f"Calculates total `{metric_col}` grouped by `{d_col}` sorted chronologically."
            return code, "pandas", reasoning

    # General overview / sample
    if target_mode == "sql":
        sel_cols = ", ".join(cols[:6])
        code = f"SELECT {sel_cols} FROM df LIMIT 20"
        reasoning = "Provides a curated view of the primary dataset dimensions and metrics."
    else:
        sel_cols = cols[:6]
        code = f"result_df = df[{sel_cols}].head(20)"
        reasoning = "Extracts the top 20 rows of the primary columns from the dataset."

    return code, target_mode, reasoning


def generate_with_gemini(
    question: str,
    df: pd.DataFrame,
    mode: str,
    api_key: str,
    model_name: Optional[str] = "gemini-2.5-flash"
) -> Tuple[str, str, str]:
    """Generates SQL or Pandas code using Google Gemini API."""
    from google import genai
    from google.genai import types

    # Prepare schema overview
    schema_info = []
    for col in df.columns:
        sample_vals = df[col].dropna().head(3).tolist()
        dtype = str(df[col].dtype)
        schema_info.append(f"- Column: `{col}` ({dtype}), sample values: {sample_vals}")
    schema_text = "\n".join(schema_info)

    prompt = f"""Dataset Table: `df`
Total Rows: {len(df)}
Columns and Sample Data:
{schema_text}

Target Language: {mode.upper() if mode in ['sql', 'pandas'] else 'SQL'}
User Question: "{question}"

Generate clean, efficient, safe {mode.upper() if mode in ['sql', 'pandas'] else 'SQL'} code that directly answers the user's question.
Remember:
- In SQL: read-only query over table `df`.
- In Pandas: assign output to `result_df`. No imports.
- Respond ONLY with a valid JSON object matching:
{{"code": "<code string>", "code_type": "{mode if mode in ['sql', 'pandas'] else 'sql'}", "reasoning": "<explanation>"}}
"""

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model_name or "gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json"
        )
    )

    text_resp = response.text.strip()
    try:
        parsed = json.loads(text_resp)
        code = clean_code_block(parsed.get("code", ""))
        code_type = parsed.get("code_type", "sql")
        reasoning = parsed.get("reasoning", "Generated by Google Gemini")
        return code, code_type, reasoning
    except Exception:
        # If response was wrapped or raw code
        cleaned = clean_code_block(text_resp)
        return cleaned, "sql" if "SELECT" in cleaned.upper() else "pandas", "Generated by Google Gemini"


def generate_with_groq(
    question: str,
    df: pd.DataFrame,
    mode: str,
    api_key: str,
    model_name: Optional[str] = "llama-3.3-70b-versatile"
) -> Tuple[str, str, str]:
    """Generates SQL or Pandas code using Groq API with ultra-low latency LPU inference."""
    schema_info = [f"- `{col}` ({df[col].dtype}): {df[col].dropna().head(3).tolist()}" for col in df.columns]
    schema_text = "\n".join(schema_info)

    user_msg = f"""Table name: `df`
Schema:
{schema_text}

Target Mode: {mode}
Question: {question}

Return JSON with keys: 'code', 'code_type', 'reasoning'."""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model_name or "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg}
        ],
        "response_format": {"type": "json_object"}
    }

    resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=20.0)
    resp.raise_for_status()
    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    return clean_code_block(parsed.get("code", "")), parsed.get("code_type", "sql"), parsed.get("reasoning", "Generated by Groq")


def generate_code_and_reasoning(
    question: str,
    df: pd.DataFrame,
    mode: str = "auto",
    provider: str = "smart-local",
    api_key: Optional[str] = None,
    model_name: Optional[str] = None
) -> Tuple[str, str, str]:
    """Master entry point for NL -> Code generation with automatic fallback."""
    # Check if user provided API key or environment variable exists
    gemini_key = api_key or os.getenv("GEMINI_API_KEY")
    groq_key = api_key or os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")

    if provider == "gemini" and gemini_key:
        try:
            return generate_with_gemini(question, df, mode, gemini_key, model_name)
        except Exception as e:
            # Fall back gracefully to smart-local if API call errors (e.g. quota or bad key)
            code, ctype, reas = generate_local_fallback(question, df, mode)
            return code, ctype, f"{reas} (Fallback used due to Gemini API notice: {str(e)[:120]})"

    if (provider == "groq" or provider == "openai") and groq_key:
        try:
            return generate_with_groq(question, df, mode, groq_key, model_name)
        except Exception as e:
            code, ctype, reas = generate_local_fallback(question, df, mode)
            return code, ctype, f"{reas} (Fallback used due to Groq API notice: {str(e)[:120]})"

    # Default to high-accuracy smart local NLP engine
    return generate_local_fallback(question, df, mode)
