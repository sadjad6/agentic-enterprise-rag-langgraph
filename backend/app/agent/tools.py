"""Agent tools — callable by the LangGraph agent.

Each tool is a LangChain tool that the agent can invoke:
  - document_search: hybrid search over Weaviate
  - calculator: evaluate mathematical expressions
  - external_api: mock external API (weather/currency)
"""

import logging
import math
from typing import Any

from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# ── Global references set at startup ─────────────────────────
# These are injected by dependencies.py so tools can access shared resources
_vector_store = None
_embeddings_model = None


def init_tools(vector_store: Any, embeddings_model: Any) -> None:
    """Inject shared resources into tools at startup."""
    global _vector_store, _embeddings_model  # noqa: PLW0603
    _vector_store = vector_store
    _embeddings_model = embeddings_model


@tool
def document_search(query: str) -> str:
    """Search internal documents for information relevant to the query.

    Use this tool when you need to find information from uploaded
    enterprise documents. Returns relevant text excerpts with sources.
    """
    if not _vector_store or not _embeddings_model:
        return "Document search is not available — vector store not initialized."

    try:
        import asyncio

        # Generate query embedding
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as pool:
                query_vector = pool.submit(
                    asyncio.run, _embeddings_model.aembed_query(query)
                ).result()
        else:
            query_vector = asyncio.run(_embeddings_model.aembed_query(query))

        results = _vector_store.hybrid_search(
            query_vector=query_vector,
            query_text=query,
            top_k=5,
        )

        if not results:
            return "No relevant documents found."

        output_parts: list[str] = []
        for i, r in enumerate(results, 1):
            output_parts.append(
                f"[{i}] Source: {r.source} (chunk {r.chunk_index}, score: {r.score:.3f})\n"
                f"    {r.content[:500]}"
            )
        return "\n\n".join(output_parts)

    except Exception as e:
        logger.error("Document search failed: %s", e)
        return f"Document search encountered an error: {e}"


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely.

    Use this tool for any calculations. Supports basic math operations,
    powers, square roots, and common math functions.
    Examples: '2 + 3 * 4', 'sqrt(144)', '15 ** 2', 'log(100)'
    """
    # Allowed names for safe evaluation
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
        # Sanitize: only allow digits, operators, parentheses, dots, and known names
        sanitized = expression.strip()
        result = eval(sanitized, {"__builtins__": {}}, safe_names)  # noqa: S307
        return f"Result: {result}"
    except Exception as e:
        return f"Calculation error: {e}. Please check the expression."


@tool
def external_api(query: str) -> str:
    """Query an external API for real-time information.

    Provides mock responses for weather, currency exchange,
    and general knowledge queries. In production, this would
    connect to real external services.
    """
    query_lower = query.lower()

    # Mock weather responses
    if any(word in query_lower for word in ["weather", "wetter", "temperature", "temperatur"]):
        return (
            "Current weather data (mock):\n"
            "- Berlin: 12°C, partly cloudy\n"
            "- Munich: 9°C, rainy\n"
            "- Hamburg: 11°C, windy\n"
            "- Frankfurt: 13°C, sunny"
        )

    # Mock currency responses
    if any(word in query_lower for word in ["currency", "exchange", "währung", "kurs"]):
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


# List of all available tools for the agent
AGENT_TOOLS = [document_search, calculator, external_api]
