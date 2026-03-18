"""LangGraph state graph — agentic workflow definition.

Wires together decision, tool execution, and response nodes
into a stateful graph with conditional edges. This is NOT a
simple sequential chain — it's a true graph with cycles.

Flow:
  START → decision → [tools → decision]* → respond → END
"""

import logging

from langgraph.graph import END, StateGraph

from app.agent.nodes import (
    decision_node,
    response_node,
    should_continue,
    tool_execution_node,
)
from app.agent.state import AgentState
from app.core.language_detect import detect_language

logger = logging.getLogger(__name__)


def build_agent_graph() -> StateGraph:
    """Construct the LangGraph agent workflow.

    The graph supports multi-step reasoning:
    1. Decision node reasons about the query
    2. If tools are needed, executes them and loops back
    3. When done, generates the final response
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("decision", decision_node)
    graph.add_node("tools", tool_execution_node)
    graph.add_node("respond", response_node)

    # Set entry point
    graph.set_entry_point("decision")

    # Add conditional edges from decision node
    graph.add_conditional_edges(
        "decision",
        should_continue,
        {
            "tools": "tools",
            "respond": "respond",
        },
    )

    # After tool execution, loop back to decision
    graph.add_edge("tools", "decision")

    # Response node ends the graph
    graph.add_edge("respond", END)

    return graph


# Compile the graph into a runnable
_compiled_graph = None


def get_agent_graph():
    """Return the compiled agent graph (singleton)."""
    global _compiled_graph  # noqa: PLW0603
    if _compiled_graph is None:
        graph = build_agent_graph()
        _compiled_graph = graph.compile()
    return _compiled_graph


async def run_agent(
    query: str,
    session_id: str = "default",
) -> dict:
    """Execute the agent graph with a user query.

    Returns the final answer and metadata about the execution.
    """
    language = detect_language(query)
    agent = get_agent_graph()

    from langchain_core.messages import HumanMessage

    initial_state: AgentState = {
        "messages": [HumanMessage(content=query)],
        "query": query,
        "language": language,
        "retrieved_context": [],
        "tool_results": [],
        "reasoning": "",
        "step_count": 0,
        "final_answer": "",
        "session_id": session_id,
    }

    result = await agent.ainvoke(initial_state)

    return {
        "answer": result.get("final_answer", ""),
        "language": language,
        "steps": result.get("step_count", 0),
        "tool_results": result.get("tool_results", []),
    }
