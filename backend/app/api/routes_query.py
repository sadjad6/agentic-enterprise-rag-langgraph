"""Query endpoint — RAG and agent query processing."""

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agent.graph import run_agent
from app.config import get_settings
from app.dependencies import get_analytics_service, get_cost_tracker, get_rag_pipeline
from app.gdpr.anonymizer import anonymize_text, contains_pii

logger = logging.getLogger(__name__)
router = APIRouter()


class QueryRequest(BaseModel):
    """Request body for the /query endpoint."""

    query: str = Field(..., min_length=1, max_length=5000)
    mode: Literal["rag", "agent"] = "agent"
    session_id: str = Field(..., min_length=1, max_length=255)
    access_level: str = "public"
    anonymize: bool = False


class SourceInfo(BaseModel):
    """Information about a source document."""

    citation_id: int
    source: str
    chunk_index: int = 0
    score: float = 0.0
    excerpt: str = ""


class QueryResponse(BaseModel):
    """Response body from the /query endpoint."""

    answer: str
    sources: list[SourceInfo] = []
    language: str
    tokens_used: dict[str, int] = {}
    cost_usd: float = 0.0
    mode_used: str = "agent"
    pii_detected: bool = False
    agent_steps: int = 0
    tool_results: list[dict] = []


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest) -> QueryResponse:
    """Process a user query through the RAG or agent pipeline."""
    try:
        query_text = request.query

        # Check for PII and optionally anonymize
        pii_detected = contains_pii(query_text)
        if request.anonymize and pii_detected:
            result = anonymize_text(query_text)
            query_text = result.text
            logger.info("Anonymized %d PII instances", len(result.detections))

        if request.mode == "rag":
            return await _handle_rag_query(query_text, request, pii_detected)

        return await _handle_agent_query(query_text, request, pii_detected)

    except Exception as e:
        logger.error("Query failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query processing failed: {e}")


async def _handle_rag_query(
    query_text: str, request: QueryRequest, pii_detected: bool
) -> QueryResponse:
    """Process a query through the RAG pipeline."""
    pipeline = get_rag_pipeline()
    result = await pipeline.query(
        question=query_text,
        access_level=request.access_level,
        session_id=request.session_id,
    )
    response = QueryResponse(
        answer=result.answer,
        sources=[SourceInfo(**s) for s in result.sources],
        language=result.language,
        tokens_used=result.tokens_used,
        cost_usd=result.cost_usd,
        mode_used="rag",
        pii_detected=pii_detected,
    )
    _record_query_analytics(
        session_id=request.session_id,
        query_mode="rag",
        tokens_used=response.tokens_used,
        cost_usd=response.cost_usd,
    )
    return response


async def _handle_agent_query(
    query_text: str, request: QueryRequest, pii_detected: bool
) -> QueryResponse:
    """Process a query through the LangGraph agent."""
    result = await run_agent(
        query=query_text,
        session_id=request.session_id,
    )

    # Track cost for agent queries
    tracker = get_cost_tracker()
    settings = get_settings()
    usage = tracker.track_request(
        model=settings.active_llm_model,
        input_text=query_text,
        output_text=result.get("answer", ""),
        session_id=request.session_id,
    )

    response = QueryResponse(
        answer=result.get("answer", ""),
        sources=[SourceInfo(**s) for s in result.get("sources", [])],
        language=result.get("language", "en"),
        tokens_used=usage.get("tokens", {}),
        cost_usd=usage.get("cost_usd", 0.0),
        mode_used="agent",
        pii_detected=pii_detected,
        agent_steps=result.get("steps", 0),
        tool_results=result.get("tool_results", []),
    )
    _record_query_analytics(
        session_id=request.session_id,
        query_mode="agent",
        tokens_used=response.tokens_used,
        cost_usd=response.cost_usd,
    )
    return response


def _record_query_analytics(
    *,
    session_id: str,
    query_mode: str,
    tokens_used: dict[str, int],
    cost_usd: float,
) -> None:
    """Persist analytics for successful query completions."""
    try:
        settings = get_settings()
        analytics = get_analytics_service()
        analytics.record_query(
            session_id=session_id,
            query_mode=query_mode,
            system_mode=settings.system_mode.value,
            model=settings.active_llm_model,
            input_tokens=int(tokens_used.get("input", 0)),
            output_tokens=int(tokens_used.get("output", 0)),
            cost_usd=cost_usd,
        )
    except Exception as exc:
        logger.warning("Failed to record query analytics: %s", exc)
