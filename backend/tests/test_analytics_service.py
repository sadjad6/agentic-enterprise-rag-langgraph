from pathlib import Path

from app.analytics.service import AnalyticsService


def test_analytics_persists_events_across_instances(tmp_path: Path) -> None:
    db_path = tmp_path / "analytics.db"

    first = AnalyticsService(str(db_path))
    first.record_query(
        session_id="session-1",
        query_mode="rag",
        system_mode="local",
        model="llama3.2:1b",
        input_tokens=12,
        output_tokens=34,
        cost_usd=0.0,
    )
    first.record_upload(
        filename="policy.pdf",
        chunks_created=7,
        language="en",
        system_mode="local",
        session_id="session-1",
    )

    second = AnalyticsService(str(db_path))
    dashboard = second.get_dashboard_data()

    assert dashboard["has_data"] is True
    assert dashboard["summary"]["total_conversations"] == 1
    assert dashboard["summary"]["total_requests"] == 1
    assert dashboard["summary"]["total_uploads"] == 1
    assert dashboard["summary"]["total_tokens"] == 46
    assert dashboard["summary"]["indexed_documents"] == 1
    assert dashboard["recent_activity"][0]["event_type"] in {"query", "upload"}


def test_analytics_returns_30_day_series(tmp_path: Path) -> None:
    service = AnalyticsService(str(tmp_path / "analytics.db"))

    service.record_query(
        session_id="session-2",
        query_mode="agent",
        system_mode="cloud",
        model="gpt-4o-mini",
        input_tokens=20,
        output_tokens=10,
        cost_usd=0.01,
    )

    dashboard = service.get_dashboard_data(document_count=4)

    assert len(dashboard["activity_over_time"]) == 30
    assert dashboard["summary"]["indexed_documents"] == 4
    assert dashboard["model_breakdown"][0]["name"] == "gpt-4o-mini"
