"""Query endpoint — RAG and agent query processing."""

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agent.graph import run_agent
from app.core.language_detect import detect_language
from app.dependencies import get_cost_tracker, get_rag_pipeline
from app.gdpr.anonymizer import anonymize_text, contains_pii

logger = logging.getLogger(__name__)
router = APIRouter()


class QueryRequest(BaseModel):
    """Request body for the /query endpoint."""

    query: str = Field(..., min_length=1, max_length=5000)
    mode: Literal["rag", "agent"] = "agent"
    session_id: str = "default"
    access_level: str = "public"
    anonymize: bool = False


class SourceInfo(BaseModel):
    """Information about a source document."""

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
    return QueryResponse(
        answer=result.answer,
        sources=[SourceInfo(**s) for s in result.sources],
        language=result.language,
        tokens_used=result.tokens_used,
        cost_usd=result.cost_usd,
        mode_used="rag",
        pii_detected=pii_detected,
    )


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
    from app.config import get_settings

    settings = get_settings()
    usage = tracker.track_request(
        model=settings.active_llm_model,
        input_text=query_text,
        output_text=result.get("answer", ""),
        session_id=request.session_id,
    )

    return QueryResponse(
        answer=result.get("answer", ""),
        sources=[],
        language=result.get("language", "en"),
        tokens_used=usage.get("tokens", {}),
        cost_usd=usage.get("cost_usd", 0.0),
        mode_used="agent",
        pii_detected=pii_detected,
        agent_steps=result.get("steps", 0),
        tool_results=result.get("tool_results", []),
    )
