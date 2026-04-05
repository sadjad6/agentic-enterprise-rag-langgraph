"""FastAPI application entry point.

Configures CORS, registers all route modules, and manages
the application lifecycle (startup/shutdown).
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (
    routes_analytics,
    routes_health,
    routes_metrics,
    routes_mode,
    routes_query,
    routes_upload,
)
from app.config import get_settings
from app.dependencies import initialize_services, shutdown_services
from app.integrations import slack_bot, teams_bot

# ── Logging Setup ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Application Lifecycle ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown of external services."""
    logger.info("Starting Enterprise RAG Assistant...")
    settings = get_settings()
    logger.info("System mode: %s", settings.system_mode.value)
    initialize_services()
    yield
    logger.info("Shutting down...")
    shutdown_services()


# ── Application Factory ─────────────────────────────────────
app = FastAPI(
    title="Enterprise RAG Assistant",
    description=(
        "GDPR-compliant Enterprise RAG system with LangGraph agentic workflows, "
        "multilingual support, and hybrid LLM infrastructure."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files (For Extracted PDF Images) ──────────────────
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "figures")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "..", "static")),
    name="static",
)

# ── Register Routes ──────────────────────────────────────────
app.include_router(routes_query.router, tags=["query"])
app.include_router(routes_upload.router, tags=["upload"])
app.include_router(routes_analytics.router, tags=["analytics"])
app.include_router(routes_metrics.router, tags=["metrics"])
app.include_router(routes_health.router, tags=["health"])
app.include_router(routes_mode.router, tags=["mode"])
app.include_router(slack_bot.router)
app.include_router(teams_bot.router)


@app.get("/")
async def root() -> dict:
    """Root endpoint with API information."""
    return {
        "name": "Enterprise RAG Assistant",
        "version": "1.0.0",
        "mode": settings.system_mode.value,
        "docs": "/docs",
        "endpoints": [
            "/query",
            "/upload",
            "/documents",
            "/analytics/dashboard",
            "/metrics",
            "/health",
            "/mode",
        ],
    }
