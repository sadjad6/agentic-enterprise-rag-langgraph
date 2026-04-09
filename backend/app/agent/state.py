"""Agent state schema for the LangGraph workflow.

Defines the TypedDict used as the state flowing through the
graph nodes. LangGraph uses this to manage state automatically.
"""

from typing import Annotated, Any

from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from app.core.citations import CitationSource


class AgentState(TypedDict):
    """State flowing through the LangGraph agent workflow."""

    # Chat message history — LangGraph manages appending via add_messages
    messages: Annotated[list, add_messages]

    # Original user query
    query: str

    # Detected language
    language: str

    # Retrieved context from Weaviate
    retrieved_context: list[CitationSource]

    # Tool results accumulator
    tool_results: list[dict[str, Any]]

    # Current step reasoning
    reasoning: str

    # Number of reasoning steps taken (guards infinite loops)
    step_count: int

    # Final answer (set by response node)
    final_answer: str

    # Session ID for cost tracking
    session_id: str
