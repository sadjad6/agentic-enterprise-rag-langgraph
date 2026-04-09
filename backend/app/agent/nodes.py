"""LangGraph agent nodes for decision making, tool execution, and response synthesis."""

import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage

from app.agent.state import AgentState
from app.agent.tools import AGENT_TOOLS, format_document_search_results, run_document_search
from app.core.citations import CitationSource, format_citation_context, merge_citation_sources
from app.core.language_detect import get_agent_prompt, get_rag_prompt
from app.core.llm_provider import get_chat_model

logger = logging.getLogger(__name__)

MAX_STEPS = 5

_TOOL_MAP = {tool.name: tool for tool in AGENT_TOOLS}


def decision_node(state: AgentState) -> dict[str, Any]:
    """Reason about the next action, optionally calling tools."""
    language = state.get("language", "en")
    system_prompt = get_agent_prompt(language)

    chat_model = get_chat_model()
    model_with_tools = chat_model.bind_tools(AGENT_TOOLS)

    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = model_with_tools.invoke(messages)

    logger.info(
        "Decision node reasoning complete, tool_calls=%d",
        len(response.tool_calls) if hasattr(response, "tool_calls") else 0,
    )

    return {
        "messages": [response],
        "step_count": state.get("step_count", 0) + 1,
    }


def tool_execution_node(state: AgentState) -> dict[str, Any]:
    """Execute all requested tools and preserve structured document context."""
    last_message = state["messages"][-1]

    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return {"messages": []}

    tool_messages: list[ToolMessage] = []
    tool_results: list[dict[str, Any]] = list(state.get("tool_results", []))
    retrieved_context: list[CitationSource] = list(state.get("retrieved_context", []))

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        logger.info("Executing tool: %s with args: %s", tool_name, tool_args)

        result: str
        matched_sources: list[CitationSource] = []

        if tool_name == "document_search":
            try:
                query = _extract_query_arg(tool_args)
                search_results = run_document_search(query)
                retrieved_context = merge_citation_sources(retrieved_context, search_results)
                matched_sources = _matched_citation_sources(search_results, retrieved_context)
                result = format_document_search_results(search_results, retrieved_context)
            except Exception as exc:
                result = f"Document search encountered an error: {exc}"
        else:
            tool_fn = _TOOL_MAP.get(tool_name)
            if not tool_fn:
                result = f"Unknown tool: {tool_name}"
            else:
                try:
                    result = str(tool_fn.invoke(tool_args))
                except Exception as exc:
                    result = f"Tool error: {exc}"

        tool_messages.append(ToolMessage(content=result, tool_call_id=tool_call["id"]))

        tool_result: dict[str, Any] = {
            "tool": tool_name,
            "args": tool_args,
            "result": result[:500],
        }
        if matched_sources:
            tool_result["sources"] = matched_sources
        tool_results.append(tool_result)

    return {
        "messages": tool_messages,
        "tool_results": tool_results,
        "retrieved_context": retrieved_context,
    }


async def response_node(state: AgentState) -> dict[str, Any]:
    """Generate the final response to the user."""
    retrieved_context = state.get("retrieved_context", [])
    if not retrieved_context:
        last_message = state["messages"][-1]
        answer = last_message.content if hasattr(last_message, "content") else ""
        return {"final_answer": answer}

    language = state.get("language", "en")
    context, sources_text = format_citation_context(retrieved_context)
    system_prompt = get_rag_prompt(language).format(context=context, sources=sources_text)
    system_prompt += (
        "\n\nIf the user message includes additional tool outputs, you may use them when relevant, "
        "but only cite document sources from the list above."
    )

    human_sections = [f"User question:\n{state.get('query', '')}"]
    additional_tool_context = _format_additional_tool_context(state.get("tool_results", []))
    if additional_tool_context:
        human_sections.append(
            "Additional tool outputs (use when relevant; do not cite them as document sources):\n"
            f"{additional_tool_context}"
        )

    chat_model = get_chat_model()
    response = await chat_model.ainvoke(
        [
            SystemMessage(content=system_prompt),
            HumanMessage(content="\n\n".join(human_sections)),
        ]
    )
    answer = response.content if isinstance(response.content, str) else str(response.content)

    return {"final_answer": answer}


def should_continue(state: AgentState) -> str:
    """Decide whether the graph should continue with tools or respond."""
    if state.get("step_count", 0) >= MAX_STEPS:
        logger.warning("Max steps reached (%d), forcing response", MAX_STEPS)
        return "respond"

    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"

    return "respond"


def _extract_query_arg(tool_args: Any) -> str:
    if isinstance(tool_args, dict):
        value = tool_args.get("query", "")
        return value if isinstance(value, str) else str(value)
    return str(tool_args)


def _matched_citation_sources(
    search_results: list[Any],
    retrieved_context: list[CitationSource],
) -> list[CitationSource]:
    lookup = {
        (source["source"], source["chunk_index"], source["excerpt"]): source
        for source in retrieved_context
    }
    matched_sources: list[CitationSource] = []
    for result in search_results:
        source = lookup.get((result.source, result.chunk_index, result.content.strip()))
        if source is not None:
            matched_sources.append(source)
    return matched_sources


def _format_additional_tool_context(tool_results: list[dict[str, Any]]) -> str:
    non_document_tools = [tool for tool in tool_results if tool.get("tool") != "document_search"]
    if not non_document_tools:
        return ""

    lines: list[str] = []
    for index, tool_result in enumerate(non_document_tools, 1):
        lines.append(
            f"{index}. {tool_result.get('tool', 'tool')}: {tool_result.get('result', '')}"
        )
    return "\n".join(lines)
