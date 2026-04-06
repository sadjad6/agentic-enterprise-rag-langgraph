from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)


def test_query_records_dashboard_analytics(monkeypatch) -> None:
    analytics = MagicMock()

    async def fake_query(*, question: str, access_level: str, session_id: str):
        return SimpleNamespace(
            answer="Answer",
            sources=[],
            language="en",
            tokens_used={"input": 11, "output": 7},
            cost_usd=0.0,
        )

    monkeypatch.setattr(
        "app.api.routes_query.get_rag_pipeline",
        lambda: SimpleNamespace(query=fake_query),
    )
    monkeypatch.setattr("app.api.routes_query.get_analytics_service", lambda: analytics)
    monkeypatch.setattr(
        "app.api.routes_query.get_settings",
        lambda: SimpleNamespace(
            active_llm_model="llama3.2:1b",
            system_mode=SimpleNamespace(value="local"),
        ),
    )

    response = client.post(
        "/query",
        json={"query": "What is the policy for remote work?", "mode": "rag", "session_id": "session-123"},
    )

    assert response.status_code == 200
    analytics.record_query.assert_called_once()
    kwargs = analytics.record_query.call_args.kwargs
    assert kwargs["session_id"] == "session-123"
    assert kwargs["query_mode"] == "rag"
    assert kwargs["input_tokens"] == 11
    assert kwargs["output_tokens"] == 7


def test_upload_records_dashboard_analytics(monkeypatch) -> None:
    analytics = MagicMock()
    vector_store = MagicMock()
    vector_store.add_documents.return_value = 3

    monkeypatch.setattr("app.api.routes_upload.extract_text", lambda filename, content: "Document body")
    monkeypatch.setattr("app.api.routes_upload.detect_language", lambda text: "en")
    monkeypatch.setattr("app.api.routes_upload.chunk_text", lambda text: ["one", "two", "three"])
    monkeypatch.setattr("app.api.routes_upload.get_embeddings", lambda: object())

    async def fake_generate_embeddings(chunks, embeddings_model):
        return [[0.1], [0.2], [0.3]]

    monkeypatch.setattr("app.api.routes_upload.generate_embeddings", fake_generate_embeddings)
    monkeypatch.setattr("app.api.routes_upload.get_vector_store", lambda: vector_store)
    monkeypatch.setattr("app.api.routes_upload.get_analytics_service", lambda: analytics)
    monkeypatch.setattr(
        "app.api.routes_upload.get_settings",
        lambda: SimpleNamespace(system_mode=SimpleNamespace(value="local")),
    )

    response = client.post(
        "/upload?session_id=session-456",
        files={"file": ("policy.txt", b"policy text", "text/plain")},
    )

    assert response.status_code == 200
    analytics.record_upload.assert_called_once()
    kwargs = analytics.record_upload.call_args.kwargs
    assert kwargs["filename"] == "policy.txt"
    assert kwargs["chunks_created"] == 3
    assert kwargs["session_id"] == "session-456"


def test_query_succeeds_when_analytics_recording_fails(monkeypatch) -> None:
    analytics = MagicMock()
    analytics.record_query.side_effect = RuntimeError("analytics write failed")

    async def fake_query(*, question: str, access_level: str, session_id: str):
        return SimpleNamespace(
            answer="Answer",
            sources=[],
            language="en",
            tokens_used={"input": 2, "output": 3},
            cost_usd=0.0,
        )

    monkeypatch.setattr(
        "app.api.routes_query.get_rag_pipeline",
        lambda: SimpleNamespace(query=fake_query),
    )
    monkeypatch.setattr("app.api.routes_query.get_analytics_service", lambda: analytics)
    monkeypatch.setattr(
        "app.api.routes_query.get_settings",
        lambda: SimpleNamespace(
            active_llm_model="llama3.2:1b",
            system_mode=SimpleNamespace(value="local"),
        ),
    )

    response = client.post(
        "/query",
        json={"query": "Summarize the policy", "mode": "rag", "session_id": "session-999"},
    )

    assert response.status_code == 200
    assert response.json()["answer"] == "Answer"


def test_upload_succeeds_when_analytics_recording_fails(monkeypatch) -> None:
    analytics = MagicMock()
    analytics.record_upload.side_effect = RuntimeError("analytics write failed")
    vector_store = MagicMock()
    vector_store.add_documents.return_value = 2

    monkeypatch.setattr("app.api.routes_upload.extract_text", lambda filename, content: "Document body")
    monkeypatch.setattr("app.api.routes_upload.detect_language", lambda text: "en")
    monkeypatch.setattr("app.api.routes_upload.chunk_text", lambda text: ["one", "two"])
    monkeypatch.setattr("app.api.routes_upload.get_embeddings", lambda: object())

    async def fake_generate_embeddings(chunks, embeddings_model):
        return [[0.1], [0.2]]

    monkeypatch.setattr("app.api.routes_upload.generate_embeddings", fake_generate_embeddings)
    monkeypatch.setattr("app.api.routes_upload.get_vector_store", lambda: vector_store)
    monkeypatch.setattr("app.api.routes_upload.get_analytics_service", lambda: analytics)
    monkeypatch.setattr(
        "app.api.routes_upload.get_settings",
        lambda: SimpleNamespace(system_mode=SimpleNamespace(value="local")),
    )

    response = client.post(
        "/upload?session_id=session-888",
        files={"file": ("policy.txt", b"policy text", "text/plain")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "policy.txt"
    assert body["chunks_created"] == 2
