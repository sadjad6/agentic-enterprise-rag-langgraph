"""Application configuration using pydantic-settings.

Centralizes all environment variables and provides typed access
with validation. Supports local (GDPR) and cloud system modes.
"""

from enum import Enum
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class SystemMode(str, Enum):
    """Operating mode controlling data flow and LLM selection."""

    LOCAL = "local"
    CLOUD = "cloud"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── System mode ──────────────────────────────────────────
    system_mode: SystemMode = SystemMode.LOCAL

    # ── OpenAI (cloud) ───────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embed_model: str = "text-embedding-3-small"

    # ── Ollama (local) ───────────────────────────────────────
    ollama_base_url: str = "http://localhost:11600"
    ollama_model: str = "llama3.2:1b"
    ollama_embed_model: str = "nomic-embed-text"

    # ── Weaviate ─────────────────────────────────────────────
    weaviate_local_url: str = "http://localhost:8080"
    weaviate_grpc_port: int = 50051
    weaviate_cloud_url: str = ""
    weaviate_cloud_api_key: str = ""

    # ── Slack ────────────────────────────────────────────────
    slack_bot_token: str = ""
    slack_signing_secret: str = ""

    # ── Teams ────────────────────────────────────────────────
    teams_webhook_url: str = ""

    # ── Server ───────────────────────────────────────────────
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:5173"
    log_level: str = "info"
    analytics_db_path: str = str(Path("data") / "analytics.db")

    # ── RAG ──────────────────────────────────────────────────
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k_results: int = 5

    @property
    def is_local_mode(self) -> bool:
        """Check if running in GDPR-safe local mode."""
        return self.system_mode == SystemMode.LOCAL

    @property
    def active_llm_model(self) -> str:
        """Return the active LLM model name based on mode."""
        return self.ollama_model if self.is_local_mode else self.openai_model

    @property
    def active_embed_model(self) -> str:
        """Return the active embedding model name based on mode."""
        return self.ollama_embed_model if self.is_local_mode else self.openai_embed_model


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
