import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .routers import datasets, query, llm

app = FastAPI(
    title="Text2Insight - AI Data Analyst Engine",
    description="Natural language to SQL & Pandas analytics engine with safety sandbox, table, charts, and insights.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(datasets.router)
app.include_router(query.router)
app.include_router(llm.router)

@app.get("/api/health")
def health():
    return {"status": "healthy"}

# Mount frontend static build if it exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve index.html for client-side routing
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "app": "Text2Insight AI Data Analyst API",
            "status": "online",
            "docs": "/docs",
            "endpoints": {
                "datasets": "/api/datasets/samples",
                "current": "/api/datasets/current",
                "query": "/api/query/execute"
            }
        }
