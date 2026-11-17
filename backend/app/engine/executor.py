import time
import math
import duckdb
import pandas as pd
import numpy as np
import pg8000.native
from typing import Dict, Any, Tuple, List, Optional
from datetime import date, datetime
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

from .safety import validate_sql_safety, validate_pandas_safety, clean_code_block
from ..models import SafetyResult

# Safe built-in functions allowed during pandas execution
SAFE_BUILTINS = {
    "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict,
    "enumerate": enumerate, "float": float, "int": int, "len": len,
    "list": list, "max": max, "min": min, "range": range, "round": round,
    "set": set, "str": str, "sum": sum, "tuple": tuple, "zip": zip,
    "True": True, "False": False, "None": None, "isinstance": isinstance
}

def clean_for_json(val: Any) -> Any:
    """Ensures values like NaN, Inf, and numpy/pandas data types are valid JSON values."""
    if val is None:
        return None
    if isinstance(val, (int, bool, str)):
        return val
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    if isinstance(val, (date, datetime, pd.Timestamp)):
        return val.isoformat()
    if isinstance(val, (list, tuple, np.ndarray)):
        return [clean_for_json(v) for v in val]
    if isinstance(val, dict):
        return {k: clean_for_json(v) for k, v in val.items()}
    return str(val)


def df_to_json_result(df: pd.DataFrame, max_rows: int = 1000) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], int]:
    """Converts a DataFrame to column definitions and JSON-safe rows."""
    if df is None or not isinstance(df, (pd.DataFrame, pd.Series)):
        return [], [], 0

    if isinstance(df, pd.Series):
        df = df.to_frame()

    total_rows = len(df)
    display_df = df.head(max_rows).copy()

    # Reset index if meaningful (e.g. groupby results)
    if not isinstance(display_df.index, pd.RangeIndex):
        display_df = display_df.reset_index()

    columns = []
    for col in display_df.columns:
        col_str = str(col)
        dtype_str = str(display_df[col].dtype).upper()
        if "INT" in dtype_str:
            clean_type = "INTEGER"
        elif "FLOAT" in dtype_str:
            clean_type = "FLOAT"
        elif "DATE" in dtype_str or "TIME" in dtype_str:
            clean_type = "DATETIME"
        elif "BOOL" in dtype_str:
            clean_type = "BOOLEAN"
        else:
            clean_type = "STRING"

        columns.append({
            "name": col_str,
            "type": clean_type
        })

    rows = []
    for _, record in display_df.iterrows():
        cleaned_row = {str(k): clean_for_json(v) for k, v in record.items()}
        rows.append(cleaned_row)

    return columns, rows, total_rows


def execute_sql_duckdb(query: str, df: pd.DataFrame, table_name: str = "dataset", timeout_sec: int = 5) -> Tuple[pd.DataFrame, float]:
    """Executes SQL against an in-memory DuckDB instance containing the DataFrame."""
    start_time = time.perf_counter()
    
    def _run():
        con = duckdb.connect(database=":memory:")
        # Register standard aliases so users can refer to 'dataset', 'df', or the specific name
        con.register(table_name, df)
        con.register("dataset", df)
        con.register("df", df)
        
        rel = con.execute(query)
        result_df = rel.df()
        con.close()
        return result_df

    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_run)
        try:
            res_df = future.result(timeout=timeout_sec)
        except FutureTimeoutError:
            raise TimeoutError(f"SQL execution exceeded timeout limit ({timeout_sec}s).")
            
    exec_time = round((time.perf_counter() - start_time) * 1000, 2)
    return res_df, exec_time


def execute_sql_postgres(query: str, pg_config: Dict[str, Any], timeout_sec: int = 5) -> Tuple[pd.DataFrame, float]:
    """Executes read-only SQL directly on PostgreSQL using pg8000."""
    start_time = time.perf_counter()
    
    def _run():
        conn = pg8000.native.Connection(
            user=pg_config.get("username", "postgres"),
            password=pg_config.get("password", ""),
            host=pg_config.get("host", "localhost"),
            port=int(pg_config.get("port", 5432)),
            database=pg_config.get("database", "postgres"),
            timeout=timeout_sec
        )
        
        # Enforce read-only session
        conn.run("SET TRANSACTION READ ONLY;")
        conn.run(f"SET statement_timeout = '{timeout_sec * 1000}';")
        
        results = conn.run(query)
        columns = [col["name"] for col in conn.columns]
        conn.close()
        return pd.DataFrame(results, columns=columns)

    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_run)
        try:
            res_df = future.result(timeout=timeout_sec + 2)
        except FutureTimeoutError:
            raise TimeoutError(f"PostgreSQL query exceeded timeout limit ({timeout_sec}s).")
            
    exec_time = round((time.perf_counter() - start_time) * 1000, 2)
    return res_df, exec_time


def execute_pandas_safe(code: str, df: pd.DataFrame, timeout_sec: int = 5) -> Tuple[pd.DataFrame, float]:
    """Executes Pandas code in a sandboxed execution namespace with strict timeouts."""
    start_time = time.perf_counter()
    cleaned_code = clean_code_block(code, "python")
    
    # Execution namespace
    safe_globals = {
        "__builtins__": SAFE_BUILTINS,
        "pd": pd,
        "np": np,
    }
    safe_locals = {
        "df": df.copy(),
        "result_df": None
    }
    
    def _run():
        # Compile and execute
        compiled = compile(cleaned_code, "<query_sandbox>", "exec")
        exec(compiled, safe_globals, safe_locals)
        
        res = safe_locals.get("result_df")
        if res is None:
            # If result_df wasn't assigned, check if variable names were created
            candidate_dfs = [v for k, v in safe_locals.items() if k != "df" and isinstance(v, (pd.DataFrame, pd.Series))]
            if candidate_dfs:
                res = candidate_dfs[-1]
            else:
                # Last resort: try evaluating last line if it's an expression
                lines = [line.strip() for line in cleaned_code.split("\n") if line.strip() and not line.strip().startswith("#")]
                if lines:
                    last_line = lines[-1]
                    try:
                        eval_res = eval(last_line, safe_globals, safe_locals)
                        if isinstance(eval_res, (pd.DataFrame, pd.Series)):
                            res = eval_res
                    except Exception:
                        pass
                        
        if res is None:
            raise ValueError("The executed Pandas code did not produce a DataFrame or Series. Please assign the final output to 'result_df'.")
            
        if isinstance(res, pd.Series):
            res = res.to_frame()
            
        return res

    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_run)
        try:
            res_df = future.result(timeout=timeout_sec)
        except FutureTimeoutError:
            raise TimeoutError(f"Pandas code execution exceeded safety timeout limit ({timeout_sec}s).")
            
    exec_time = round((time.perf_counter() - start_time) * 1000, 2)
    return res_df, exec_time
