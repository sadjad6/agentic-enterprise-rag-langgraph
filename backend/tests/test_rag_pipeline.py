import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.rag_pipeline import RAGPipeline

@pytest.fixture
def mock_vector_store():
    store = MagicMock()
    store.hybrid_search = MagicMock()
    return store

@pytest.fixture
def mock_cost_tracker():
    tracker = MagicMock()
    tracker.track_request = MagicMock(return_value={"tokens": {"input": 1, "output": 1}, "cost_usd": 0.001})
    return tracker

@pytest.fixture
def rag_pipeline(mock_vector_store, mock_cost_tracker):
    return RAGPipeline(
        vector_store=mock_vector_store,
        cost_tracker=mock_cost_tracker
    )

@pytest.mark.asyncio
@patch("app.core.rag_pipeline.get_embeddings")
@patch("app.core.rag_pipeline.get_chat_model")
async def test_rag_pipeline_happy_path(mock_get_chat_model, mock_get_embeddings, rag_pipeline):
    """Test standard RAG search with results."""
    # Setup mocks
    embed_mock = AsyncMock()
    embed_mock.aembed_query.return_value = [0.1, 0.2]
    mock_get_embeddings.return_value = embed_mock
    
    mock_result = MagicMock()
    mock_result.content = "Internal document text"
    mock_result.source = "doc1.pdf"
    mock_result.score = 0.9
    mock_result.chunk_index = 0
    rag_pipeline._vector_store.hybrid_search.return_value = [mock_result]
    
    chat_mock = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "Based on the internal doc, this is the answer."
    chat_mock.ainvoke.return_value = mock_response
    mock_get_chat_model.return_value = chat_mock

    # Execute
    res = await rag_pipeline.query("What is the policy?")
    
    # Assert
    assert res.answer == "Based on the internal doc, this is the answer."
    assert len(res.sources) == 1
    assert res.sources[0]["source"] == "doc1.pdf"
    assert res.sources[0]["score"] == 0.9
    assert res.language == "en"
    rag_pipeline._cost_tracker.track_request.assert_called_once()

@pytest.mark.asyncio
@patch("app.core.rag_pipeline.get_embeddings")
@patch("app.core.rag_pipeline.get_chat_model")
async def test_rag_pipeline_unhappy_path_empty_results(mock_get_chat_model, mock_get_embeddings, rag_pipeline):
    """Test edge case where vector store returns no results."""
    embed_mock = AsyncMock()
    embed_mock.aembed_query.return_value = [0.1, 0.2]
    mock_get_embeddings.return_value = embed_mock
    
    rag_pipeline._vector_store.hybrid_search.return_value = [] # Empty results

    res = await rag_pipeline.query("What is the policy?")
    
    # Assert specific to no results
    assert "information" in res.answer or "find" in res.answer
    assert len(res.sources) == 0

@pytest.mark.asyncio
@patch("app.core.rag_pipeline.get_embeddings")
async def test_rag_pipeline_unhappy_path_embed_failure(mock_get_embeddings, rag_pipeline):
    """Test edge case where embedding generation fails."""
    embed_mock = AsyncMock()
    embed_mock.aembed_query.side_effect = Exception("Embedding API timeout")
    mock_get_embeddings.return_value = embed_mock
    
    with pytest.raises(Exception, match="Embedding API timeout"):
        await rag_pipeline.query("What is the policy?")

@pytest.mark.asyncio
@patch("app.core.rag_pipeline.get_embeddings")
@patch("app.core.rag_pipeline.get_chat_model")
async def test_rag_pipeline_unhappy_path_llm_failure(mock_get_chat_model, mock_get_embeddings, rag_pipeline):
    """Test edge case where final LLM generation fails."""
    embed_mock = AsyncMock()
    embed_mock.aembed_query.return_value = [0.1, 0.2]
    mock_get_embeddings.return_value = embed_mock
    
    mock_result = MagicMock()
    mock_result.content = "text"
    mock_result.source = "doc1.pdf"
    mock_result.score = 0.9
    mock_result.chunk_index = 0
    rag_pipeline._vector_store.hybrid_search.return_value = [mock_result]
    
    chat_mock = AsyncMock()
    chat_mock.ainvoke.side_effect = Exception("LLM generation failed")
    mock_get_chat_model.return_value = chat_mock
    
    with pytest.raises(Exception, match="LLM generation failed"):
        await rag_pipeline.query("What is the policy?")

