import io
import uuid
from datetime import datetime
import pandas as pd
import numpy as np
import pg8000.native
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response

from ..models import DatasetMeta, PostgresConnectRequest
from ..data.sample_data import (
    get_sample_saas_data,
    get_sample_ecommerce_data,
    get_sample_tech_financials
)
from ..engine.executor import clean_for_json

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

# In-memory storage for datasets and configs
DATASETS_CACHE: dict[str, pd.DataFrame] = {}
METADATA_CACHE: dict[str, DatasetMeta] = {}
POSTGRES_CONFIGS: dict[str, dict] = {}
ACTIVE_DATASET_ID: str = ""

def build_dataset_meta(dataset_id: str, name: str, source_type: str, df: pd.DataFrame) -> DatasetMeta:
    """Builds comprehensive dataset metadata including columns, types, and sample rows."""
    columns = []
    for col in df.columns:
        col_str = str(col)
        dtype_str = str(df[col].dtype).upper()
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

        sample_vals = [clean_for_json(v) for v in df[col].dropna().head(3).tolist()]
        columns.append({
            "name": col_str,
            "type": clean_type,
            "sample": sample_vals
        })

    sample_rows = []
    for _, record in df.head(5).iterrows():
        sample_rows.append({str(k): clean_for_json(v) for k, v in record.items()})

    # Summary statistics for numeric columns
    summary = {}
    num_df = df.select_dtypes(include=[np.number])
    if not num_df.empty:
        desc = num_df.describe().to_dict()
        for metric_col, stats in desc.items():
            summary[metric_col] = {k: clean_for_json(round(v, 2)) for k, v in stats.items()}

    return DatasetMeta(
        id=dataset_id,
        name=name,
        source_type=source_type,
        row_count=len(df),
        column_count=len(df.columns),
        columns=columns,
        sample_rows=sample_rows,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        summary_stats=summary
    )


def initialize_default_samples():
    """Initializes the three default sample datasets."""
    global ACTIVE_DATASET_ID
    # SaaS
    saas_df = get_sample_saas_data()
    saas_id = "sample-saas"
    DATASETS_CACHE[saas_id] = saas_df
    METADATA_CACHE[saas_id] = build_dataset_meta(saas_id, "SaaS Customer Subscriptions & Churn", "sample", saas_df)

    # E-Commerce
    ecom_df = get_sample_ecommerce_data()
    ecom_id = "sample-ecommerce"
    DATASETS_CACHE[ecom_id] = ecom_df
    METADATA_CACHE[ecom_id] = build_dataset_meta(ecom_id, "Global E-Commerce Sales & Deliveries", "sample", ecom_df)

    # Tech Financials
    tech_df = get_sample_tech_financials()
    tech_id = "sample-tech"
    DATASETS_CACHE[tech_id] = tech_df
    METADATA_CACHE[tech_id] = build_dataset_meta(tech_id, "Tech Giants Financial Performance (2024)", "sample", tech_df)

    # Default to SaaS
    if not ACTIVE_DATASET_ID:
        ACTIVE_DATASET_ID = saas_id

# Initialize on module import
initialize_default_samples()


@router.get("/samples")
def get_sample_datasets():
    """Returns available sample datasets and suggested starter questions."""
    return [
        {
            "id": "sample-saas",
            "name": "SaaS Customer Subscriptions & Churn",
            "description": "120 accounts with plan tiers, monthly MRR spend, support tickets, NPS score, and churn status.",
            "row_count": len(DATASETS_CACHE["sample-saas"]),
            "columns": [c["name"] for c in METADATA_CACHE["sample-saas"].columns],
            "suggested_questions": [
                "Show churn rate and customer count by subscription plan",
                "Top 5 companies by monthly spend",
                "Average NPS score and support tickets by plan",
                "What is the total monthly spend by country?"
            ]
        },
        {
            "id": "sample-ecommerce",
            "name": "Global E-Commerce Sales & Deliveries",
            "description": "160 retail orders with categories, products, unit prices, revenue, regions, and delivery speed.",
            "row_count": len(DATASETS_CACHE["sample-ecommerce"]),
            "columns": [c["name"] for c in METADATA_CACHE["sample-ecommerce"].columns],
            "suggested_questions": [
                "Total revenue by product category",
                "Average delivery days by customer region",
                "Top 5 best selling products by total revenue",
                "Revenue distribution by payment method"
            ]
        },
        {
            "id": "sample-tech",
            "name": "Tech Giants Financial Performance (2024)",
            "description": "Quarterly revenue, net income, R&D expenditure, and P/E ratios for Alphabet, Microsoft, Apple, Nvidia, Amazon.",
            "row_count": len(DATASETS_CACHE["sample-tech"]),
            "columns": [c["name"] for c in METADATA_CACHE["sample-tech"].columns],
            "suggested_questions": [
                "Compare total revenue and R&D spend by company",
                "Which company has the highest gross margin percentage?",
                "Quarterly revenue trend across companies",
                "Top companies by net income in billions"
            ]
        }
    ]


@router.post("/load-sample/{sample_id}")
def load_sample_dataset(sample_id: str):
    """Activates one of the sample datasets."""
    global ACTIVE_DATASET_ID
    if sample_id not in DATASETS_CACHE:
        raise HTTPException(status_code=404, detail="Sample dataset not found.")
    ACTIVE_DATASET_ID = sample_id
    return {
        "message": f"Loaded dataset '{METADATA_CACHE[sample_id].name}'",
        "dataset": METADATA_CACHE[sample_id]
    }


@router.post("/upload")
async def upload_dataset_file(file: UploadFile = File(...)):
    """Uploads CSV or Excel (.xlsx, .xls) dataset."""
    global ACTIVE_DATASET_ID
    filename = file.filename or "uploaded_dataset"
    content = await file.read()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
            source_type = "csv"
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
            source_type = "excel"
        else:
            # Attempt CSV parsing fallback
            df = pd.read_csv(io.BytesIO(content))
            source_type = "csv"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse dataset file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file contains no data rows.")

    dataset_id = f"ds-{uuid.uuid4().hex[:8]}"
    DATASETS_CACHE[dataset_id] = df
    meta = build_dataset_meta(dataset_id, filename, source_type, df)
    METADATA_CACHE[dataset_id] = meta
    ACTIVE_DATASET_ID = dataset_id

    return {
        "message": f"Successfully loaded '{filename}' ({len(df)} rows, {len(df.columns)} columns).",
        "dataset": meta
    }


@router.post("/connect-postgres")
def connect_postgres(req: PostgresConnectRequest):
    """Tests connection to PostgreSQL and fetches schema and preview rows."""
    global ACTIVE_DATASET_ID
    try:
        conn = pg8000.native.Connection(
            user=req.username,
            password=req.password or "",
            host=req.host,
            port=int(req.port),
            database=req.database,
            timeout=5
        )

        # List tables
        table_query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """
        table_rows = conn.run(table_query)
        tables = [r[0] for r in table_rows]

        if not tables:
            conn.close()
            raise HTTPException(status_code=400, detail="Connection successful, but no public tables were found in this database.")

        selected_table = req.table_name if req.table_name in tables else tables[0]

        # Fetch sample rows
        preview_query = f"SELECT * FROM {selected_table} LIMIT 500;"
        preview_rows = conn.run(preview_query)
        col_names = [col["name"] for col in conn.columns]
        conn.close()

        df = pd.DataFrame(preview_rows, columns=col_names)
        dataset_id = f"pg-{uuid.uuid4().hex[:8]}"
        
        DATASETS_CACHE[dataset_id] = df
        POSTGRES_CONFIGS[dataset_id] = req.model_dump()
        meta = build_dataset_meta(dataset_id, f"PostgreSQL: {selected_table}", "postgres", df)
        METADATA_CACHE[dataset_id] = meta
        ACTIVE_DATASET_ID = dataset_id

        return {
            "message": f"Connected to PostgreSQL database '{req.database}'. Loaded table '{selected_table}'.",
            "available_tables": tables,
            "selected_table": selected_table,
            "dataset": meta
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PostgreSQL connection failed: {str(e)}")


@router.get("/all")
def list_datasets():
    """Lists all registered datasets."""
    return [
        {
            "id": meta.id,
            "name": meta.name,
            "source_type": meta.source_type,
            "row_count": meta.row_count,
            "column_count": meta.column_count,
            "is_active": meta.id == ACTIVE_DATASET_ID
        }
        for meta in METADATA_CACHE.values()
    ]


@router.get("/current")
def get_current_dataset():
    """Returns the metadata of current active dataset."""
    if not ACTIVE_DATASET_ID or ACTIVE_DATASET_ID not in METADATA_CACHE:
        initialize_default_samples()
    return METADATA_CACHE[ACTIVE_DATASET_ID]


@router.get("/{dataset_id}")
def get_dataset_details(dataset_id: str):
    """Returns full metadata for a specific dataset."""
    if dataset_id not in METADATA_CACHE:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return METADATA_CACHE[dataset_id]


@router.get("/{dataset_id}/export")
def export_dataset_csv(dataset_id: str):
    """Exports dataset to downloadable CSV format."""
    if dataset_id not in DATASETS_CACHE:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    df = DATASETS_CACHE[dataset_id]
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={dataset_id}.csv"}
    )
