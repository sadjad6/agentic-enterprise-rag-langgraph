"""Persistent analytics storage and dashboard aggregation."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import Any


@dataclass(frozen=True)
class AnalyticsEvent:
    """Normalized analytics event payload."""

    event_type: str
    created_at: str
    session_id: str | None = None
    query_mode: str | None = None
    system_mode: str | None = None
    model: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    filename: str | None = None
    chunks_created: int = 0
    language: str | None = None


class AnalyticsService:
    """SQLite-backed analytics event store."""

    def __init__(self, db_path: str) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS analytics_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    session_id TEXT,
                    query_mode TEXT,
                    system_mode TEXT,
                    model TEXT,
                    input_tokens INTEGER NOT NULL DEFAULT 0,
                    output_tokens INTEGER NOT NULL DEFAULT 0,
                    cost_usd REAL NOT NULL DEFAULT 0,
                    filename TEXT,
                    chunks_created INTEGER NOT NULL DEFAULT 0,
                    language TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
                ON analytics_events(created_at DESC)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_analytics_events_session
                ON analytics_events(session_id)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_analytics_events_type
                ON analytics_events(event_type)
                """
            )
            conn.commit()

    @staticmethod
    def _utc_now() -> str:
        return datetime.now(UTC).isoformat()

    def record_query(
        self,
        *,
        session_id: str,
        query_mode: str,
        system_mode: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float,
    ) -> None:
        self._record_event(
            AnalyticsEvent(
                event_type="query",
                created_at=self._utc_now(),
                session_id=session_id,
                query_mode=query_mode,
                system_mode=system_mode,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost_usd,
            )
        )

    def record_upload(
        self,
        *,
        filename: str,
        chunks_created: int,
        language: str,
        system_mode: str,
        session_id: str | None = None,
    ) -> None:
        self._record_event(
            AnalyticsEvent(
                event_type="upload",
                created_at=self._utc_now(),
                session_id=session_id,
                system_mode=system_mode,
                filename=filename,
                chunks_created=chunks_created,
                language=language,
            )
        )

    def _record_event(self, event: AnalyticsEvent) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO analytics_events (
                    event_type,
                    created_at,
                    session_id,
                    query_mode,
                    system_mode,
                    model,
                    input_tokens,
                    output_tokens,
                    cost_usd,
                    filename,
                    chunks_created,
                    language
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.event_type,
                    event.created_at,
                    event.session_id,
                    event.query_mode,
                    event.system_mode,
                    event.model,
                    event.input_tokens,
                    event.output_tokens,
                    event.cost_usd,
                    event.filename,
                    event.chunks_created,
                    event.language,
                ),
            )
            conn.commit()

    def get_dashboard_data(self, document_count: int | None = None) -> dict[str, Any]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT event_type, created_at, session_id, query_mode, system_mode, model,
                       input_tokens, output_tokens, cost_usd, filename, chunks_created, language
                FROM analytics_events
                ORDER BY created_at DESC
                """
            ).fetchall()

        query_rows = [row for row in rows if row["event_type"] == "query"]
        upload_rows = [row for row in rows if row["event_type"] == "upload"]

        fallback_document_count = len({row["filename"] for row in upload_rows if row["filename"]})
        resolved_document_count = (
            document_count if document_count is not None else fallback_document_count
        )

        total_input_tokens = sum(int(row["input_tokens"] or 0) for row in query_rows)
        total_output_tokens = sum(int(row["output_tokens"] or 0) for row in query_rows)
        total_cost_usd = round(sum(float(row["cost_usd"] or 0.0) for row in query_rows), 6)
        conversation_count = len({row["session_id"] for row in query_rows if row["session_id"]})

        return {
            "summary": {
                "total_conversations": conversation_count,
                "total_user_messages": len(query_rows),
                "total_assistant_responses": len(query_rows),
                "total_requests": len(query_rows),
                "total_uploads": len(upload_rows),
                "total_tokens": total_input_tokens + total_output_tokens,
                "total_input_tokens": total_input_tokens,
                "total_output_tokens": total_output_tokens,
                "total_cost_usd": total_cost_usd,
                "indexed_documents": resolved_document_count,
            },
            "activity_over_time": self._build_activity_series(query_rows, upload_rows),
            "mode_breakdown": self._build_breakdown(query_rows, "system_mode"),
            "model_breakdown": self._build_breakdown(query_rows, "model"),
            "recent_activity": [self._serialize_row(row) for row in rows[:20]],
            "has_data": bool(rows),
        }

    def reset(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM analytics_events")
            conn.commit()

    @staticmethod
    def _serialize_row(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "event_type": row["event_type"],
            "created_at": row["created_at"],
            "session_id": row["session_id"],
            "query_mode": row["query_mode"],
            "system_mode": row["system_mode"],
            "model": row["model"],
            "input_tokens": int(row["input_tokens"] or 0),
            "output_tokens": int(row["output_tokens"] or 0),
            "cost_usd": round(float(row["cost_usd"] or 0.0), 6),
            "filename": row["filename"],
            "chunks_created": int(row["chunks_created"] or 0),
            "language": row["language"],
        }

    @staticmethod
    def _build_breakdown(rows: list[sqlite3.Row], key: str) -> list[dict[str, Any]]:
        totals: dict[str, dict[str, Any]] = {}
        for row in rows:
            name = row[key] or "unknown"
            entry = totals.setdefault(
                name,
                {
                    "name": name,
                    "requests": 0,
                    "tokens": 0,
                    "cost_usd": 0.0,
                },
            )
            entry["requests"] += 1
            entry["tokens"] += int(row["input_tokens"] or 0) + int(row["output_tokens"] or 0)
            entry["cost_usd"] = round(entry["cost_usd"] + float(row["cost_usd"] or 0.0), 6)

        return sorted(totals.values(), key=lambda item: item["requests"], reverse=True)

    @staticmethod
    def _build_activity_series(
        query_rows: list[sqlite3.Row], upload_rows: list[sqlite3.Row]
    ) -> list[dict[str, Any]]:
        today = datetime.now(UTC).date()
        start = today - timedelta(days=29)
        buckets: dict[str, dict[str, Any]] = {}

        for offset in range(30):
            day = start + timedelta(days=offset)
            key = day.isoformat()
            buckets[key] = {
                "date": key,
                "queries": 0,
                "uploads": 0,
                "tokens": 0,
                "cost_usd": 0.0,
            }

        for row in query_rows:
            key = AnalyticsService._row_date(row)
            if key in buckets:
                buckets[key]["queries"] += 1
                buckets[key]["tokens"] += int(row["input_tokens"] or 0) + int(row["output_tokens"] or 0)
                buckets[key]["cost_usd"] = round(
                    buckets[key]["cost_usd"] + float(row["cost_usd"] or 0.0), 6
                )

        for row in upload_rows:
            key = AnalyticsService._row_date(row)
            if key in buckets:
                buckets[key]["uploads"] += 1

        return list(buckets.values())

    @staticmethod
    def _row_date(row: sqlite3.Row) -> str:
        return datetime.fromisoformat(row["created_at"]).date().isoformat()
