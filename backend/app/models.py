from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field

class DatasetMeta(BaseModel):
    id: str
    name: str
    source_type: str  # "csv", "excel", "postgres", "sample"
    row_count: int
    column_count: int
    columns: List[Dict[str, Any]]  # [{"name": "sales", "type": "FLOAT", "sample": [10, 20]}]
    sample_rows: List[Dict[str, Any]]
    created_at: str
    summary_stats: Optional[Dict[str, Any]] = None

class PostgresConnectRequest(BaseModel):
    host: str = "localhost"
    port: int = 5432
    database: str
    username: str
    password: Optional[str] = ""
    table_name: Optional[str] = None
    connection_url: Optional[str] = None

class QueryRequest(BaseModel):
    dataset_id: str
    question: str
    mode: str = "auto"  # "auto", "sql", "pandas"
    provider: str = "smart-local"  # "gemini", "groq", "local_ollama", "smart-local"
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    base_url: Optional[str] = None

class CustomCodeRequest(BaseModel):
    dataset_id: str
    code: str
    code_type: str  # "sql" or "pandas"
    original_question: Optional[str] = None

class SafetyResult(BaseModel):
    passed: bool
    message: str
    sanitized_code: str
    rules_applied: List[str]
    risk_level: str = "low"  # "low", "medium", "blocked"

class ChartSpec(BaseModel):
    recommended: bool = True
    chart_type: str = "bar"  # "bar", "line", "area", "pie", "scatter", "table"
    title: str
    x_key: Optional[str] = None
    y_keys: List[str] = []
    labels: Dict[str, str] = {}
    data: List[Dict[str, Any]] = []
    description: Optional[str] = None

class InsightReport(BaseModel):
    headline: str
    summary: str
    key_metrics: List[Dict[str, Any]] = []  # [{"label": "Total Revenue", "value": "$12,450", "badge": "+15%"}]
    takeaways: List[str] = []

class QueryResponse(BaseModel):
    success: bool
    question: str
    code: str
    code_type: str  # "sql" or "pandas"
    reasoning: Optional[str] = None
    columns: List[Dict[str, Any]] = []
    rows: List[Dict[str, Any]] = []
    total_rows: int = 0
    execution_time_ms: float = 0.0
    safety: SafetyResult
    chart: ChartSpec
    insight: InsightReport
    error: Optional[str] = None
