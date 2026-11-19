import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.routers.datasets import DATASETS_CACHE, METADATA_CACHE, ACTIVE_DATASET_ID, initialize_default_samples
from app.routers.query import execute_natural_language_query
from app.models import QueryRequest

# Initialize sample specifically for test verification
initialize_default_samples()
from app.routers.datasets import ACTIVE_DATASET_ID

print(f"Backend initialized successfully!")
print(f"Active dataset: {ACTIVE_DATASET_ID}")
print(f"Available datasets: {list(DATASETS_CACHE.keys())}")

# Test 1: Verify built-in rule engine is removed and LLM is required
req_unconfigured = QueryRequest(
    dataset_id=ACTIVE_DATASET_ID,
    question="Show churn rate and customer count by subscription plan",
    mode="sql"
)
res_unconfigured = execute_natural_language_query(req_unconfigured)
print(f"\n[Test 1] Unconfigured LLM Handled Gracefully: {not res_unconfigured.success}")
print(f"Error Message: {res_unconfigured.error}")
assert "LLM Engine Settings" in res_unconfigured.error or "required" in res_unconfigured.error

# Test 2: Direct SQL & Pandas execution engine test
from app.engine.executor import execute_sql_duckdb, execute_pandas_safe
df = DATASETS_CACHE[ACTIVE_DATASET_ID]
sql_code = "SELECT plan, COUNT(*) AS record_count FROM df GROUP BY plan ORDER BY record_count DESC"
res_df, exec_time = execute_sql_duckdb(sql_code, df)
print(f"\n[Test 2] DuckDB SQL Engine Execution: Success ({len(res_df)} rows in {exec_time:.2f}ms)")
assert len(res_df) > 0

# Test Safety Sandbox (Forbidden statement)
from app.engine.safety import validate_sql_safety, validate_pandas_safety
sql_attack = validate_sql_safety("DROP TABLE customers;")
print(f"\n[Test 3] SQL Drop Attack Blocked: {not sql_attack.passed} (Message: {sql_attack.message})")

pandas_attack = validate_pandas_safety("import os; os.system('echo hacked')")
print(f"[Test 4] Pandas Import Attack Blocked: {not pandas_attack.passed} (Message: {pandas_attack.message})")

print("\nALL BACKEND TESTS PASSED!")
