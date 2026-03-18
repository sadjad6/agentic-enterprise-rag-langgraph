"""Health check endpoint — system component status."""

import logging

import httpx
from fastapi import APIRouter

from app.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check() -> dict:
    """Return health status of all system components."""
    settings = get_settings()

    status = {
        "status": "healthy",
        "mode": settings.system_mode.value,
        "components": {
            "api": {"status": "up"},
            "weaviate": await _check_weaviate(settings),
            "llm": await _check_llm(settings),
        },
    }

    # Overall status is degraded if any component is down
    component_statuses = [c["status"] for c in status["components"].values()]
    if "down" in component_statuses:
        status["status"] = "degraded"

    return status


async def _check_weaviate(settings) -> dict:
    """Check Weaviate connectivity."""
    try:
        url = settings.weaviate_local_url if settings.is_local_mode else settings.weaviate_cloud_url
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{url}/v1/.well-known/ready")
            if response.status_code == 200:
                return {"status": "up", "url": url}
    except Exception as e:
        logger.warning("Weaviate health check failed: %s", e)
    return {"status": "down"}


async def _check_llm(settings) -> dict:
    """Check LLM availability."""
    if settings.is_local_mode:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{settings.ollama_base_url}/api/tags")
                if response.status_code == 200:
                    return {"status": "up", "provider": "ollama"}
        except Exception:
            pass
        return {"status": "down", "provider": "ollama"}

    # Cloud mode — just check if API key is configured
    if settings.openai_api_key and settings.openai_api_key != "sk-your-openai-api-key":
        return {"status": "up", "provider": "openai"}
    return {"status": "down", "provider": "openai", "reason": "API key not configured"}
