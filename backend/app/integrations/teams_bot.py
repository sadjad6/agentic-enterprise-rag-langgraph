"""Microsoft Teams bot integration — incoming webhook.

Provides a FastAPI route that handles Teams Bot Framework
activity payloads and responds via the conversation reply URL.
Requires TEAMS_WEBHOOK_URL environment variable.
"""

import logging

import httpx
from fastapi import APIRouter, Request

from app.agent.graph import run_agent

router = APIRouter(prefix="/integrations/teams", tags=["integrations"])
logger = logging.getLogger(__name__)


@router.post("/webhook")
async def teams_webhook(request: Request) -> dict:
    """Handle incoming Microsoft Teams bot activity.

    Processes message activities and responds with the agent's answer.
    """
    body = await request.json()

    activity_type = body.get("type", "")
    if activity_type != "message":
        return {"status": "ignored", "reason": f"Activity type '{activity_type}' not handled"}

    text = body.get("text", "").strip()
    if not text:
        return {"status": "ignored", "reason": "Empty message"}

    service_url = body.get("serviceUrl", "")
    conversation_id = body.get("conversation", {}).get("id", "")
    activity_id = body.get("id", "")

    try:
        result = await run_agent(
            query=text,
            session_id=f"teams-{conversation_id}",
        )
        answer = result.get("answer", "I couldn't process your request.")

        # Reply to the Teams conversation
        if service_url and conversation_id:
            await _reply_to_teams(service_url, conversation_id, activity_id, answer)

        return {"status": "ok", "answer": answer}

    except Exception as e:
        logger.error("Teams webhook processing failed: %s", e)
        return {"status": "error", "detail": str(e)}


async def _reply_to_teams(
    service_url: str,
    conversation_id: str,
    reply_to_id: str,
    text: str,
) -> None:
    """Send a reply message to a Teams conversation."""
    reply_url = (
        f"{service_url.rstrip('/')}/v3/conversations/{conversation_id}/activities/{reply_to_id}"
    )

    payload = {
        "type": "message",
        "text": text,
    }

    try:
        async with httpx.AsyncClient() as client:
            await client.post(reply_url, json=payload, timeout=10.0)
    except Exception as e:
        logger.error("Failed to reply to Teams: %s", e)
