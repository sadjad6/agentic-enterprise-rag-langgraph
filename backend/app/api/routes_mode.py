"""Mode switching endpoint — toggle between local and cloud modes."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import SystemMode, get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


class ModeResponse(BaseModel):
    """Response for mode-related endpoints."""

    mode: str
    description: str


class ModeUpdateRequest(BaseModel):
    """Request body for changing the system mode."""

    mode: str


_MODE_DESCRIPTIONS: dict[str, str] = {
    "local": "GDPR-safe mode: Ollama (local LLM) + local Weaviate. No external API calls.",
    "cloud": "Cloud mode: GPT-4o-mini (OpenAI) + Weaviate Cloud. Data leaves local network.",
}


@router.get("/mode", response_model=ModeResponse)
async def get_mode() -> ModeResponse:
    """Return the current system operating mode."""
    settings = get_settings()
    mode = settings.system_mode.value
    return ModeResponse(
        mode=mode,
        description=_MODE_DESCRIPTIONS.get(mode, "Unknown mode"),
    )


@router.post("/mode", response_model=ModeResponse)
async def set_mode(request: ModeUpdateRequest) -> ModeResponse:
    """Switch the system operating mode.

    Note: This modifies the in-memory settings. For persistent changes,
    update the SYSTEM_MODE environment variable.
    """
    try:
        new_mode = SystemMode(request.mode.lower())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode '{request.mode}'. Must be 'local' or 'cloud'.",
        )

    settings = get_settings()
    settings.system_mode = new_mode
    logger.info("System mode changed to: %s", new_mode.value)

    return ModeResponse(
        mode=new_mode.value,
        description=_MODE_DESCRIPTIONS.get(new_mode.value, "Unknown mode"),
    )
