"""Cost tracking — token counting and cost estimation.

Tracks token usage per request and accumulates totals by model
and session. Uses tiktoken for accurate GPT token counting.
"""

import logging
import time
from dataclasses import dataclass, field
from threading import Lock

import tiktoken

from app.core.llm_provider import MODEL_COSTS

logger = logging.getLogger(__name__)

# Default encoding for models without a specific tiktoken mapping
_DEFAULT_ENCODING = "cl100k_base"


@dataclass
class RequestUsage:
    """Token usage for a single request."""

    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    timestamp: float
    session_id: str


@dataclass
class CostTracker:
    """In-memory cost tracker for token usage and cost estimation."""

    _history: list[RequestUsage] = field(default_factory=list)
    _lock: Lock = field(default_factory=Lock)

    def _count_tokens(self, text: str, model: str = "") -> int:
        """Count tokens in text using tiktoken."""
        try:
            encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            encoding = tiktoken.get_encoding(_DEFAULT_ENCODING)
        return len(encoding.encode(text))

    def track_request(
        self,
        model: str,
        input_text: str,
        output_text: str,
        session_id: str = "default",
    ) -> dict:
        """Record token usage and estimated cost for a request."""
        input_tokens = self._count_tokens(input_text, model)
        output_tokens = self._count_tokens(output_text, model)

        costs = MODEL_COSTS.get(model, MODEL_COSTS.get("ollama", {}))
        cost_usd = (
            (input_tokens / 1000) * costs.get("input", 0.0)
            + (output_tokens / 1000) * costs.get("output", 0.0)
        )

        usage = RequestUsage(
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
            timestamp=time.time(),
            session_id=session_id,
        )

        with self._lock:
            self._history.append(usage)

        logger.info(
            "Tracked: model=%s, in=%d, out=%d, cost=$%.6f",
            model, input_tokens, output_tokens, cost_usd,
        )

        return {
            "tokens": {"input": input_tokens, "output": output_tokens},
            "cost_usd": round(cost_usd, 6),
        }

    def get_metrics(self) -> dict:
        """Return aggregated cost metrics."""
        with self._lock:
            history = list(self._history)

        if not history:
            return self._empty_metrics()

        total_cost = sum(u.cost_usd for u in history)
        total_input = sum(u.input_tokens for u in history)
        total_output = sum(u.output_tokens for u in history)

        # Breakdown by model
        model_breakdown: dict[str, dict] = {}
        for u in history:
            entry = model_breakdown.setdefault(u.model, {
                "requests": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0,
            })
            entry["requests"] += 1
            entry["input_tokens"] += u.input_tokens
            entry["output_tokens"] += u.output_tokens
            entry["cost_usd"] = round(entry["cost_usd"] + u.cost_usd, 6)

        # Breakdown by session
        session_breakdown: dict[str, dict] = {}
        for u in history:
            entry = session_breakdown.setdefault(u.session_id, {
                "requests": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0,
            })
            entry["requests"] += 1
            entry["input_tokens"] += u.input_tokens
            entry["output_tokens"] += u.output_tokens
            entry["cost_usd"] = round(entry["cost_usd"] + u.cost_usd, 6)

        return {
            "total_requests": len(history),
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_cost_usd": round(total_cost, 6),
            "by_model": model_breakdown,
            "by_session": session_breakdown,
            "recent_requests": [
                {
                    "model": u.model,
                    "input_tokens": u.input_tokens,
                    "output_tokens": u.output_tokens,
                    "cost_usd": round(u.cost_usd, 6),
                    "timestamp": u.timestamp,
                    "session_id": u.session_id,
                }
                for u in history[-20:]
            ],
        }

    @staticmethod
    def _empty_metrics() -> dict:
        """Return empty metrics structure."""
        return {
            "total_requests": 0,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_cost_usd": 0.0,
            "by_model": {},
            "by_session": {},
            "recent_requests": [],
        }

    def reset(self) -> None:
        """Clear all tracked data."""
        with self._lock:
            self._history.clear()
