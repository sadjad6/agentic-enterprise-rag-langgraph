from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.agent.nodes import response_node, tool_execution_node


def test_tool_execution_node_preserves_structured_document_sources(monkeypatch) -> None:
    search_result = SimpleNamespace(
        content='Employees may work remotely up to three days per week with manager approval.',
        source='remote-work-policy.pdf',
        score=0.93,
        chunk_index=2,
    )

    monkeypatch.setattr('app.agent.nodes.run_document_search', lambda query: [search_result])

    state = {
        'messages': [
            HumanMessage(content='How often can employees work remotely?'),
            AIMessage(
                content='',
                tool_calls=[
                    {
                        'id': 'tool-1',
                        'name': 'document_search',
                        'args': {'query': 'remote work policy'},
                    }
                ],
            ),
        ],
        'query': 'How often can employees work remotely?',
        'language': 'en',
        'retrieved_context': [],
        'tool_results': [],
        'reasoning': '',
        'step_count': 1,
        'final_answer': '',
        'session_id': 'session-1',
    }

    result = tool_execution_node(state)

    assert result['retrieved_context'] == [
        {
            'citation_id': 1,
            'source': 'remote-work-policy.pdf',
            'chunk_index': 2,
            'score': 0.93,
            'excerpt': 'Employees may work remotely up to three days per week with manager approval.',
        }
    ]
    assert result['tool_results'][0]['sources'][0]['citation_id'] == 1
    assert '[1] Source: remote-work-policy.pdf' in result['messages'][0].content


@pytest.mark.asyncio
async def test_response_node_uses_structured_context_for_cited_answer(monkeypatch) -> None:
    chat_model = MagicMock()
    chat_model.ainvoke = AsyncMock(return_value=SimpleNamespace(content='Employees may work remotely up to three days per week [1].'))
    monkeypatch.setattr('app.agent.nodes.get_chat_model', lambda: chat_model)

    state = {
        'messages': [HumanMessage(content='How often can employees work remotely?')],
        'query': 'How often can employees work remotely?',
        'language': 'en',
        'retrieved_context': [
            {
                'citation_id': 1,
                'source': 'remote-work-policy.pdf',
                'chunk_index': 2,
                'score': 0.93,
                'excerpt': 'Employees may work remotely up to three days per week with manager approval.',
            }
        ],
        'tool_results': [],
        'reasoning': '',
        'step_count': 1,
        'final_answer': '',
        'session_id': 'session-1',
    }

    result = await response_node(state)

    assert result == {'final_answer': 'Employees may work remotely up to three days per week [1].'}
    chat_model.ainvoke.assert_awaited_once()
    sent_messages = chat_model.ainvoke.await_args.args[0]
    assert '[1] remote-work-policy.pdf (chunk 2)' in sent_messages[0].content
    assert 'User question:' in sent_messages[1].content
