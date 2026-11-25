import sys
import os
from dotenv import load_dotenv

# Ensure backend root is in sys.path and load environment variables
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.routers.datasets import DATASETS_CACHE, METADATA_CACHE, ACTIVE_DATASET_ID, initialize_default_samples
from app.routers.query import execute_natural_language_query
from app.models import QueryRequest

# Initialize sample specifically for test verification
initialize_default_samples()
from app.routers.datasets import ACTIVE_DATASET_ID

print(f"Backend initialized successfully!")
print(f"Active dataset: {ACTIVE_DATASET_ID}")
print(f"Available datasets: {list(DATASETS_CACHE.keys())}")

# Test 1: Verify pre-configured backend Groq LLM generates code automatically without user key entry
req_query = QueryRequest(
    dataset_id=ACTIVE_DATASET_ID,
    question="Show count by plan",
    mode="sql",
    provider="groq"
)
res_query = execute_natural_language_query(req_query)
print(f"\n[Test 1] Pre-configured Backend LLM Query Success: {res_query.success}")
print(f"Generated SQL: {res_query.code}")
assert res_query.success, f"Query generation failed: {res_query.error}"
assert len(res_query.rows) > 0

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

# Test 5: JSON dataset upload parsing
import io
import asyncio
from fastapi import UploadFile
from app.routers.datasets import upload_dataset_file

json_bytes = b'[{"customer": "Acme", "spend": 1200, "active": true}, {"customer": "Globex", "spend": 3400, "active": false}]'
fake_upload = UploadFile(filename="test_customers.json", file=io.BytesIO(json_bytes))
upload_res = asyncio.run(upload_dataset_file(fake_upload))
print(f"[Test 5] JSON File Upload: Success ({upload_res['dataset'].row_count} rows, source: {upload_res['dataset'].source_type})")
assert upload_res['dataset'].row_count == 2
assert upload_res['dataset'].source_type == "json"

print("\nALL BACKEND TESTS PASSED!")
