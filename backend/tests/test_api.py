"""Tests for the FastAPI API endpoints."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)


class TestRootEndpoint:
    """Tests for the root / endpoint."""

    def test_root_returns_info(self) -> None:
        """Root endpoint should return API metadata."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Enterprise RAG Assistant"
        assert "endpoints" in data

    def test_root_includes_mode(self) -> None:
        """Root endpoint should include current system mode."""
        response = client.get("/")
        data = response.json()
        assert data["mode"] in ("local", "cloud")


class TestHealthEndpoint:
    """Tests for the /health endpoint."""

    def test_health_returns_status(self) -> None:
        """Health endpoint should return component statuses."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "components" in data
        assert "api" in data["components"]


class TestModeEndpoint:
    """Tests for the /mode endpoint."""

    def test_get_mode(self) -> None:
        """GET /mode should return current mode."""
        response = client.get("/mode")
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] in ("local", "cloud")
        assert "description" in data

    def test_set_invalid_mode(self) -> None:
        """POST /mode with invalid mode should return 400."""
        response = client.post("/mode", json={"mode": "invalid"})
        assert response.status_code == 400


class TestMetricsEndpoint:
    """Tests for the /metrics endpoint."""

    def test_get_metrics(self) -> None:
        """GET /metrics should return metrics structure."""
        response = client.get("/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "total_requests" in data
        assert "total_cost_usd" in data


class TestAnalyticsEndpoint:
    """Tests for the dashboard analytics endpoint."""

    def test_get_dashboard_returns_summary(self, monkeypatch) -> None:
        """GET /analytics/dashboard should return dashboard analytics payload."""

        class FakeAnalytics:
            def get_dashboard_data(self, document_count=None) -> dict:
                return {
                    "summary": {
                        "total_conversations": 1,
                        "total_user_messages": 1,
                        "total_assistant_responses": 1,
                        "total_requests": 1,
                        "total_uploads": 0,
                        "total_tokens": 10,
                        "total_input_tokens": 4,
                        "total_output_tokens": 6,
                        "total_cost_usd": 0.0,
                        "indexed_documents": document_count,
                    },
                    "activity_over_time": [],
                    "mode_breakdown": [],
                    "model_breakdown": [],
                    "recent_activity": [],
                    "has_data": True,
                }

        class FakeVectorStore:
            def get_document_sources(self) -> list[str]:
                return ["handbook.pdf", "policy.md"]

        monkeypatch.setattr("app.api.routes_analytics.get_analytics_service", lambda: FakeAnalytics())
        monkeypatch.setattr("app.api.routes_analytics.get_vector_store", lambda: FakeVectorStore())

        response = client.get("/analytics/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["indexed_documents"] == 2
        assert "recent_activity" in data

    def test_get_dashboard_uses_analytics_fallback_when_vector_store_fails(self, monkeypatch) -> None:
        """GET /analytics/dashboard should still return analytics when vector store is unavailable."""

        class FakeAnalytics:
            def get_dashboard_data(self, document_count=None) -> dict:
                return {
                    "summary": {
                        "total_conversations": 0,
                        "total_user_messages": 0,
                        "total_assistant_responses": 0,
                        "total_requests": 0,
                        "total_uploads": 1,
                        "total_tokens": 0,
                        "total_input_tokens": 0,
                        "total_output_tokens": 0,
                        "total_cost_usd": 0.0,
                        "indexed_documents": 1 if document_count is None else document_count,
                    },
                    "activity_over_time": [],
                    "mode_breakdown": [],
                    "model_breakdown": [],
                    "recent_activity": [],
                    "has_data": True,
                }

        class BrokenVectorStore:
            def get_document_sources(self) -> list[str]:
                raise RuntimeError("weaviate unavailable")

        monkeypatch.setattr("app.api.routes_analytics.get_analytics_service", lambda: FakeAnalytics())
        monkeypatch.setattr("app.api.routes_analytics.get_vector_store", lambda: BrokenVectorStore())

        response = client.get("/analytics/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["indexed_documents"] == 1


class TestQueryEndpoint:
    """Tests for the /query endpoint."""

    def test_query_empty_rejected(self) -> None:
        """Empty query should be rejected with 422."""
        response = client.post("/query", json={"query": ""})
        assert response.status_code == 422

    def test_query_missing_field(self) -> None:
        """Missing query field should be rejected."""
        response = client.post("/query", json={})
        assert response.status_code == 422

    def test_query_requires_session_id(self) -> None:
        """session_id is required for durable analytics tracking."""
        response = client.post("/query", json={"query": "What is the policy?"})
        assert response.status_code == 422

    def test_query_rag_returns_citation_sources(self, monkeypatch) -> None:
        analytics = MagicMock()

        async def fake_query(*, question: str, access_level: str, session_id: str):
            return SimpleNamespace(
                answer="The retention period is seven years [1].",
                sources=[
                    {
                        "citation_id": 1,
                        "source": "retention-policy.pdf",
                        "chunk_index": 0,
                        "score": 0.94,
                        "excerpt": "Records must be retained for seven years from the effective date.",
                    }
                ],
                language="en",
                tokens_used={"input": 10, "output": 8},
                cost_usd=0.001,
            )

        monkeypatch.setattr("app.api.routes_query.get_rag_pipeline", lambda: SimpleNamespace(query=fake_query))
        monkeypatch.setattr("app.api.routes_query.get_analytics_service", lambda: analytics)
        monkeypatch.setattr(
            "app.api.routes_query.get_settings",
            lambda: SimpleNamespace(
                active_llm_model="gpt-test",
                system_mode=SimpleNamespace(value="local"),
            ),
        )

        response = client.post(
            "/query",
            json={"query": "What is the retention period?", "mode": "rag", "session_id": "session-rag"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["sources"] == [
            {
                "citation_id": 1,
                "source": "retention-policy.pdf",
                "chunk_index": 0,
                "score": 0.94,
                "excerpt": "Records must be retained for seven years from the effective date.",
            }
        ]

    def test_query_agent_returns_citation_sources_when_available(self, monkeypatch) -> None:
        analytics = MagicMock()
        tracker = MagicMock()
        tracker.track_request.return_value = {"tokens": {"input": 7, "output": 6}, "cost_usd": 0.0}

        async def fake_run_agent(*, query: str, session_id: str):
            return {
                "answer": "Employees may work remotely up to three days per week [1].",
                "language": "en",
                "steps": 2,
                "sources": [
                    {
                        "citation_id": 1,
                        "source": "remote-work-policy.pdf",
                        "chunk_index": 2,
                        "score": 0.93,
                        "excerpt": "Employees may work remotely up to three days per week with manager approval.",
                    }
                ],
                "tool_results": [],
            }

        monkeypatch.setattr("app.api.routes_query.run_agent", fake_run_agent)
        monkeypatch.setattr("app.api.routes_query.get_cost_tracker", lambda: tracker)
        monkeypatch.setattr("app.api.routes_query.get_analytics_service", lambda: analytics)
        monkeypatch.setattr(
            "app.api.routes_query.get_settings",
            lambda: SimpleNamespace(
                active_llm_model="gpt-test",
                system_mode=SimpleNamespace(value="local"),
            ),
        )

        response = client.post(
            "/query",
            json={"query": "How often can employees work remotely?", "mode": "agent", "session_id": "session-agent"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["sources"][0]["citation_id"] == 1
        assert body["sources"][0]["source"] == "remote-work-policy.pdf"

    def test_query_agent_returns_empty_sources_without_document_context(self, monkeypatch) -> None:
        analytics = MagicMock()
        tracker = MagicMock()
        tracker.track_request.return_value = {"tokens": {"input": 4, "output": 3}, "cost_usd": 0.0}

        async def fake_run_agent(*, query: str, session_id: str):
            return {
                "answer": "The result is 57.",
                "language": "en",
                "steps": 1,
                "sources": [],
                "tool_results": [{"tool": "calculator", "args": {"expression": "sqrt(144) + 15 * 3"}, "result": "Result: 57.0"}],
            }

        monkeypatch.setattr("app.api.routes_query.run_agent", fake_run_agent)
        monkeypatch.setattr("app.api.routes_query.get_cost_tracker", lambda: tracker)
        monkeypatch.setattr("app.api.routes_query.get_analytics_service", lambda: analytics)
        monkeypatch.setattr(
            "app.api.routes_query.get_settings",
            lambda: SimpleNamespace(
                active_llm_model="gpt-test",
                system_mode=SimpleNamespace(value="local"),
            ),
        )

        response = client.post(
            "/query",
            json={"query": "What is sqrt(144) + 15 * 3?", "mode": "agent", "session_id": "session-agent-empty"},
        )

        assert response.status_code == 200
        assert response.json()["sources"] == []


class TestUploadEndpoint:
    """Tests for the /upload endpoint."""

    def test_upload_no_file(self) -> None:
        """Upload without file should be rejected."""
        response = client.post("/upload")
        assert response.status_code == 422
