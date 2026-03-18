"""Metrics endpoint — cost tracking dashboard data."""

from fastapi import APIRouter

from app.dependencies import get_cost_tracker

router = APIRouter()


@router.get("/metrics")
async def get_metrics() -> dict:
    """Return aggregated token usage and cost metrics."""
    tracker = get_cost_tracker()
    return tracker.get_metrics()


@router.post("/metrics/reset")
async def reset_metrics() -> dict:
    """Reset all tracked metrics."""
    tracker = get_cost_tracker()
    tracker.reset()
    return {"status": "reset", "message": "All metrics have been cleared"}
