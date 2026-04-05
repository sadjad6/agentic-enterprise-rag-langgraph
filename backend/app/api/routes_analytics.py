"""Analytics dashboard endpoint."""

import logging

from fastapi import APIRouter

from app.dependencies import get_analytics_service, get_vector_store

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


@router.get("/dashboard")
async def get_dashboard() -> dict:
    """Return persisted dashboard analytics."""
    document_count: int | None = None

    try:
        document_count = len(get_vector_store().get_document_sources())
    except Exception as exc:
        logger.warning("Falling back to analytics-backed document count: %s", exc)

    analytics = get_analytics_service()
    return analytics.get_dashboard_data(document_count=document_count)
