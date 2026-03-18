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


class TestUploadEndpoint:
    """Tests for the /upload endpoint."""

    def test_upload_no_file(self) -> None:
        """Upload without file should be rejected."""
        response = client.post("/upload")
        assert response.status_code == 422
