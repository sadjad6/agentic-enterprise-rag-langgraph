"""LangGraph agent nodes — individual processing steps.

Each node is a function that takes the AgentState and returns
a partial state update. Nodes handle:
  - Decision making (LLM reasoning about which tool to use)
  - Tool execution
  - Response generation
"""

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent.state import AgentState
from app.agent.tools import AGENT_TOOLS
from app.core.language_detect import get_agent_prompt
from app.core.llm_provider import get_chat_model

logger = logging.getLogger(__name__)

MAX_STEPS = 5

# Tool lookup by name
_TOOL_MAP = {tool.name: tool for tool in AGENT_TOOLS}


def decision_node(state: AgentState) -> dict[str, Any]:
    """LLM reasoning node — decides whether to use tools or respond directly.

    The LLM is bound with available tools and makes autonomous decisions
    about which tool to call (if any) based on the conversation context.
    """
    language = state.get("language", "en")
    system_prompt = get_agent_prompt(language)

    chat_model = get_chat_model()
    model_with_tools = chat_model.bind_tools(AGENT_TOOLS)

    messages = [SystemMessage(content=system_prompt)] + state["messages"]

    response = model_with_tools.invoke(messages)
    logger.info("Decision node reasoning complete, tool_calls=%d",
                len(response.tool_calls) if hasattr(response, "tool_calls") else 0)

    return {
        "messages": [response],
        "step_count": state.get("step_count", 0) + 1,
    }


def tool_execution_node(state: AgentState) -> dict[str, Any]:
    """Execute tools called by the decision node.

    Processes all tool calls from the last AI message and returns
    ToolMessage results back into the state.
    """
    last_message = state["messages"][-1]

    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return {"messages": []}

    tool_messages: list[ToolMessage] = []
    tool_results: list[dict[str, Any]] = list(state.get("tool_results", []))

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]

        logger.info("Executing tool: %s with args: %s", tool_name, tool_args)

        tool_fn = _TOOL_MAP.get(tool_name)
        if not tool_fn:
            result = f"Unknown tool: {tool_name}"
        else:
            try:
                result = tool_fn.invoke(tool_args)
            except Exception as e:
                result = f"Tool error: {e}"

        tool_messages.append(
            ToolMessage(content=str(result), tool_call_id=tool_call["id"])
        )
        tool_results.append({
            "tool": tool_name,
            "args": tool_args,
            "result": str(result)[:500],  # type: ignore
        })

    return {
        "messages": tool_messages,
        "tool_results": tool_results,
    }


def response_node(state: AgentState) -> dict[str, Any]:
    """Generate the final response to the user.

    Called when the agent has finished reasoning and tool usage.
    Synthesizes all gathered information into a final answer.
    """
    last_message = state["messages"][-1]
    answer = last_message.content if hasattr(last_message, "content") else ""

    return {
        "final_answer": answer,
    }


def should_continue(state: AgentState) -> str:
    """Conditional edge: decide whether to continue tool use or respond.

    Returns "tools" if the last message has tool calls,
    "respond" if the agent is done reasoning.
    Also enforces the maximum step limit.
    """
    # Guard against infinite loops
    if state.get("step_count", 0) >= MAX_STEPS:
        logger.warning("Max steps reached (%d), forcing response", MAX_STEPS)
        return "respond"

    last_message = state["messages"][-1]

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"

    return "respond"
