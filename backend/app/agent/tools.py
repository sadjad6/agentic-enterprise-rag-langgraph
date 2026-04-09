"""Agent tools callable by the LangGraph agent."""

import logging
import math
from typing import Any

from langchain_core.tools import tool

from app.core.citations import CitationSource
from app.core.vector_store import SearchResult

logger = logging.getLogger(__name__)

_vector_store = None
_embeddings_model = None


def init_tools(vector_store: Any, embeddings_model: Any) -> None:
    """Inject shared resources into tools at startup."""
    global _vector_store, _embeddings_model  # noqa: PLW0603
    _vector_store = vector_store
    _embeddings_model = embeddings_model


def run_document_search(query: str) -> list[SearchResult]:
    """Return structured retrieval results for a query."""
    if not _vector_store or not _embeddings_model:
        raise RuntimeError("Document search is not available: vector store not initialized.")

    import asyncio

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as pool:
                query_vector = pool.submit(
                    asyncio.run, _embeddings_model.aembed_query(query)
                ).result()
        else:
            query_vector = asyncio.run(_embeddings_model.aembed_query(query))

        return _vector_store.hybrid_search(
            query_vector=query_vector,
            query_text=query,
            top_k=5,
        )
    except Exception as exc:
        logger.error("Document search failed: %s", exc)
        raise


def format_document_search_results(
    results: list[SearchResult],
    citation_sources: list[CitationSource] | None = None,
) -> str:
    """Format retrieval results for the agent tool transcript."""
    if not results:
        return "No relevant documents found."

    citation_lookup = {
        (source["source"], source["chunk_index"], source["excerpt"]): source["citation_id"]
        for source in (citation_sources or [])
    }

    output_parts: list[str] = []
    for index, result in enumerate(results, 1):
        citation_id = citation_lookup.get(
            (result.source, result.chunk_index, result.content.strip()),
            index,
        )
        output_parts.append(
            f"[{citation_id}] Source: {result.source} (chunk {result.chunk_index}, score: {result.score:.3f})\n"
            f"    {result.content.strip()}"
        )

    return "\n\n".join(output_parts)


@tool
def document_search(query: str) -> str:
    """Search internal documents for information relevant to the query."""
    try:
        results = run_document_search(query)
    except RuntimeError as exc:
        return str(exc)
    except Exception as exc:
        return f"Document search encountered an error: {exc}"

    return format_document_search_results(results)


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely.

    Use this tool for any calculations. Supports basic math operations,
    powers, square roots, and common math functions.
    Examples: '2 + 3 * 4', 'sqrt(144)', '15 ** 2', 'log(100)'
    """
    safe_names: dict[str, Any] = {
        "sqrt": math.sqrt,
        "pow": math.pow,
        "log": math.log,
        "log10": math.log10,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "pi": math.pi,
        "e": math.e,
        "abs": abs,
        "round": round,
    }

    try:
        sanitized = expression.strip()
        result = eval(sanitized, {"__builtins__": {}}, safe_names)  # noqa: S307
        return f"Result: {result}"
    except Exception as exc:
        return f"Calculation error: {exc}. Please check the expression."


@tool
def external_api(query: str) -> str:
    """Query an external API for real-time information.

    Provides mock responses for weather, currency exchange,
    and general knowledge queries. In production, this would
    connect to real external services.
    """
    query_lower = query.lower()

    if any(word in query_lower for word in ["weather", "wetter", "temperature", "temperatur"]):
        return (
            "Current weather data (mock):\n"
            "- Berlin: 12C, partly cloudy\n"
            "- Munich: 9C, rainy\n"
            "- Hamburg: 11C, windy\n"
            "- Frankfurt: 13C, sunny"
        )

    if any(word in query_lower for word in ["currency", "exchange", "waehrung", "kurs"]):
        return (
            "Exchange rates (mock, 2024-01-15):\n"
            "- EUR/USD: 1.0876\n"
            "- EUR/GBP: 0.8612\n"
            "- EUR/CHF: 0.9423\n"
            "- EUR/JPY: 161.42"
        )

    return (
        f"External API query received: '{query}'. "
        "This is a mock endpoint. In production, this connects to real APIs."
    )


AGENT_TOOLS = [document_search, calculator, external_api]
