"""Dependency injection — shared resources for the application.

Provides singleton instances of VectorStore, CostTracker, and
RAGPipeline to be used across API routes.
"""

import logging

from app.analytics.service import AnalyticsService
from app.config import get_settings
from app.core.llm_provider import get_embeddings
from app.core.rag_pipeline import RAGPipeline
from app.core.vector_store import VectorStore
from app.tracking.cost_tracker import CostTracker

logger = logging.getLogger(__name__)

# ── Singletons ────────────────────────────────────────────────

_cost_tracker = CostTracker()
_vector_store: VectorStore | None = None
_rag_pipeline: RAGPipeline | None = None
_analytics_service: AnalyticsService | None = None


def get_cost_tracker() -> CostTracker:
    """Return the global cost tracker instance."""
    return _cost_tracker


def get_vector_store() -> VectorStore:
    """Return the global vector store instance (lazy init)."""
    global _vector_store  # noqa: PLW0603
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store


def get_analytics_service() -> AnalyticsService:
    """Return the persistent analytics service instance."""
    global _analytics_service  # noqa: PLW0603
    if _analytics_service is None:
        settings = get_settings()
        _analytics_service = AnalyticsService(settings.analytics_db_path)
    return _analytics_service


def get_rag_pipeline() -> RAGPipeline:
    """Return the global RAG pipeline instance (lazy init)."""
    global _rag_pipeline  # noqa: PLW0603
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline(
            vector_store=get_vector_store(),
            cost_tracker=get_cost_tracker(),
        )
    return _rag_pipeline


def initialize_services() -> None:
    """Connect to external services at startup."""
    try:
        get_analytics_service()
        logger.info("Analytics service initialized")
    except Exception as e:
        logger.warning("Analytics initialization failed: %s", e)

    try:
        vs = get_vector_store()
        vs.connect()
        logger.info("Vector store connected")

        # Initialize agent tools with shared resources
        from app.agent.tools import init_tools

        embeddings = get_embeddings()
        init_tools(vector_store=vs, embeddings_model=embeddings)
        logger.info("Agent tools initialized")

    except Exception as e:
        logger.warning("Service initialization partial failure: %s", e)
        logger.info("Application will start but some features may be unavailable")


def shutdown_services() -> None:
    """Disconnect from external services on shutdown."""
    global _vector_store  # noqa: PLW0603
    global _analytics_service  # noqa: PLW0603
    if _vector_store:
        _vector_store.close()
        _vector_store = None
    _analytics_service = None
    logger.info("Services shut down")
