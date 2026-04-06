"""Tests for the FastAPI API endpoints."""

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


class TestUploadEndpoint:
    """Tests for the /upload endpoint."""

    def test_upload_no_file(self) -> None:
        """Upload without file should be rejected."""
        response = client.post("/upload")
        assert response.status_code == 422
