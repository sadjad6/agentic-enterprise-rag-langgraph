"""Tests for the cost tracker module."""

import time

from app.tracking.cost_tracker import CostTracker


class TestCostTracker:
    """Unit tests for CostTracker."""
    
    tracker: CostTracker

    def setup_method(self) -> None:
        """Create a fresh tracker for each test."""
        self.tracker = CostTracker()

    def test_track_request_returns_tokens(self) -> None:
        """Verify that tracking a request returns token counts."""
        result = self.tracker.track_request(
            model="gpt-4o-mini",
            input_text="Hello, how are you?",
            output_text="I'm doing well!",
            session_id="test-session",
        )
        assert "tokens" in result
        assert result["tokens"]["input"] > 0
        assert result["tokens"]["output"] > 0
        assert result["cost_usd"] >= 0

    def test_track_request_local_model_zero_cost(self) -> None:
        """Ollama (local) requests should have zero cost."""
        result = self.tracker.track_request(
            model="mistral",
            input_text="Test query",
            output_text="Test response",
        )
        assert result["cost_usd"] == 0.0

    def test_get_metrics_empty(self) -> None:
        """Empty tracker should return zero metrics."""
        metrics = self.tracker.get_metrics()
        assert metrics["total_requests"] == 0
        assert metrics["total_cost_usd"] == 0.0
        assert metrics["by_model"] == {}

    def test_get_metrics_after_requests(self) -> None:
        """Metrics should aggregate multiple requests correctly."""
        self.tracker.track_request("gpt-4o-mini", "query 1", "answer 1", "s1")
        self.tracker.track_request("gpt-4o-mini", "query 2", "answer 2", "s1")
        self.tracker.track_request("mistral", "query 3", "answer 3", "s2")

        metrics = self.tracker.get_metrics()
        assert metrics["total_requests"] == 3
        assert "gpt-4o-mini" in metrics["by_model"]
        assert "mistral" in metrics["by_model"]
        assert "s1" in metrics["by_session"]
        assert "s2" in metrics["by_session"]
        assert metrics["by_model"]["gpt-4o-mini"]["requests"] == 2

    def test_reset_clears_all(self) -> None:
        """Reset should clear all tracked data."""
        self.tracker.track_request("gpt-4o-mini", "test", "test")
        self.tracker.reset()
        metrics = self.tracker.get_metrics()
        assert metrics["total_requests"] == 0

    def test_recent_requests_limit(self) -> None:
        """Recent requests should be capped at 20."""
        for i in range(25):
            self.tracker.track_request("gpt-4o-mini", f"q{i}", f"a{i}")

        metrics = self.tracker.get_metrics()
        assert len(metrics["recent_requests"]) == 20

    def test_session_breakdown(self) -> None:
        """Session breakdown should track per-session stats."""
        self.tracker.track_request("gpt-4o-mini", "q1", "a1", "user-1")
        self.tracker.track_request("gpt-4o-mini", "q2", "a2", "user-2")
        self.tracker.track_request("gpt-4o-mini", "q3", "a3", "user-1")

        metrics = self.tracker.get_metrics()
        assert metrics["by_session"]["user-1"]["requests"] == 2
        assert metrics["by_session"]["user-2"]["requests"] == 1
