"""Slack bot integration — webhook-based interaction.

Provides a FastAPI route that handles Slack Events API requests
and slash commands. Requires SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET
environment variables.
"""

import logging

import httpx
from fastapi import APIRouter, Request

from app.agent.graph import run_agent
from app.config import get_settings

router = APIRouter(prefix="/integrations/slack", tags=["integrations"])
logger = logging.getLogger(__name__)

SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage"


@router.post("/events")
async def slack_events(request: Request) -> dict:
    """Handle incoming Slack events (messages and slash commands).

    Supports:
      - URL verification (challenge response)
      - Message events (triggers agent query)
    """
    body = await request.json()

    # Handle Slack URL verification challenge
    if body.get("type") == "url_verification":
        return {"challenge": body.get("challenge", "")}

    # Handle event callbacks
    event = body.get("event", {})
    if event.get("type") == "message" and not event.get("bot_id"):
        await _handle_message_event(event)

    return {"status": "ok"}


async def _handle_message_event(event: dict) -> None:
    """Process a Slack message event by running the agent."""
    settings = get_settings()
    if not settings.slack_bot_token:
        logger.warning("Slack bot token not configured — skipping message")
        return

    user_text = event.get("text", "")
    channel = event.get("channel", "")

    if not user_text or not channel:
        return

    try:
        result = await run_agent(query=user_text, session_id=f"slack-{channel}")
        answer = result.get("answer", "I couldn't process your request.")

        await _post_slack_message(channel, answer, settings.slack_bot_token)

    except Exception as e:
        logger.error("Slack message processing failed: %s", e)
        await _post_slack_message(
            channel, f"⚠️ Error processing your request: {e}", settings.slack_bot_token
        )


async def _post_slack_message(channel: str, text: str, token: str) -> None:
    """Send a message to a Slack channel."""
    async with httpx.AsyncClient() as client:
        await client.post(
            SLACK_POST_MESSAGE_URL,
            json={"channel": channel, "text": text},
            headers={"Authorization": f"Bearer {token}"},
        )
