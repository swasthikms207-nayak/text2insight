import os
import requests
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/llm", tags=["llm"])

@router.get("/local-status")
def get_local_ollama_status(base_url: str = Query(default="http://localhost:11434/v1")):
    """Checks if local Ollama instance is reachable and returns available installed models."""
    host = base_url.strip().rstrip("/")
    if host.endswith("/v1"):
        host = host[:-3]
    tags_url = f"{host}/api/tags"

    try:
        resp = requests.get(tags_url, timeout=3.0)
        resp.raise_for_status()
        data = resp.json()
        raw_models = data.get("models", [])
        model_names = [m.get("name") for m in raw_models if isinstance(m, dict) and m.get("name")]
        return {
            "online": True,
            "host": host,
            "message": f"Connected to Ollama ({len(model_names)} models found)",
            "models": model_names
        }
    except Exception as e:
        return {
            "online": False,
            "host": host,
            "message": f"Cannot connect to Ollama at {host}. Ensure Ollama is running (`ollama serve`). Details: {str(e)}",
            "models": []
        }


@router.get("/server-config")
def get_server_llm_config():
    """Returns server-level pre-configured LLM provider availability."""
    groq_ready = bool(os.getenv("GROQ_API_KEY", ""))
    gemini_ready = bool(os.getenv("GEMINI_API_KEY", ""))
    return {
        "groq_configured": groq_ready,
        "gemini_configured": gemini_ready,
        "default_provider": "groq",
        "default_model": "openai/gpt-oss-120b"
    }
