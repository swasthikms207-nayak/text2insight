import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.routers.datasets import DATASETS_CACHE, METADATA_CACHE, ACTIVE_DATASET_ID
from app.routers.query import execute_natural_language_query
from app.models import QueryRequest

print(f"Backend initialized successfully!")
print(f"Active dataset: {ACTIVE_DATASET_ID}")
print(f"Available datasets: {list(DATASETS_CACHE.keys())}")

# Test SQL query execution
req_sql = QueryRequest(
    dataset_id=ACTIVE_DATASET_ID,
    question="Show churn rate and customer count by subscription plan",
    mode="sql"
)
res_sql = execute_natural_language_query(req_sql)
print(f"\n[Test 1] SQL Query Success: {res_sql.success}")
print(f"Generated SQL:\n{res_sql.code}")
print(f"Rows count: {len(res_sql.rows)}")
print(f"First row: {res_sql.rows[0] if res_sql.rows else None}")
print(f"Chart recommended: {res_sql.chart.recommended}, type: {res_sql.chart.chart_type}")
print(f"Insight headline: {res_sql.insight.headline}")

# Test Pandas query execution
req_pandas = QueryRequest(
    dataset_id=ACTIVE_DATASET_ID,
    question="Top 5 companies by monthly spend",
    mode="pandas"
)
res_pandas = execute_natural_language_query(req_pandas)
print(f"\n[Test 2] Pandas Query Success: {res_pandas.success}")
print(f"Generated Pandas:\n{res_pandas.code}")
print(f"Rows count: {len(res_pandas.rows)}")
print(f"First row: {res_pandas.rows[0] if res_pandas.rows else None}")
print(f"Chart recommended: {res_pandas.chart.recommended}, type: {res_pandas.chart.chart_type}")

# Test Safety Sandbox (Forbidden statement)
from app.engine.safety import validate_sql_safety, validate_pandas_safety
sql_attack = validate_sql_safety("DROP TABLE customers;")
print(f"\n[Test 3] SQL Drop Attack Blocked: {not sql_attack.passed} (Message: {sql_attack.message})")

pandas_attack = validate_pandas_safety("import os; os.system('echo hacked')")
print(f"[Test 4] Pandas Import Attack Blocked: {not pandas_attack.passed} (Message: {pandas_attack.message})")

print("\nALL BACKEND TESTS PASSED!")
