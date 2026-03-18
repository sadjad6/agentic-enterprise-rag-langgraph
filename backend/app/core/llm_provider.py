"""LLM provider factory — Ollama (local) and OpenAI (cloud) with fallback.

Provides a unified interface to get a LangChain chat model and
embedding model based on the current system mode. Includes automatic
fallback from local to cloud when Ollama is unavailable.
"""

import logging
from typing import Union

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from app.config import Settings, SystemMode, get_settings

logger = logging.getLogger(__name__)

# Cost per 1K tokens (USD) — used by cost tracker
MODEL_COSTS: dict[str, dict[str, float]] = {
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "text-embedding-3-small": {"input": 0.00002, "output": 0.0},
    "ollama": {"input": 0.0, "output": 0.0},
}


def _build_ollama_chat(settings: Settings) -> BaseChatModel:
    """Build an Ollama-backed chat model."""
    from langchain_ollama import ChatOllama

    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0.3,
    )


def _build_openai_chat(settings: Settings) -> BaseChatModel:
    """Build an OpenAI-backed chat model."""
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=0.3,
        streaming=True,
    )


def _build_ollama_embeddings(settings: Settings) -> Embeddings:
    """Build Ollama-backed embeddings."""
    from langchain_ollama import OllamaEmbeddings

    return OllamaEmbeddings(
        model=settings.ollama_embed_model,
        base_url=settings.ollama_base_url,
    )


def _build_openai_embeddings(settings: Settings) -> Embeddings:
    """Build OpenAI-backed embeddings."""
    from langchain_openai import OpenAIEmbeddings

    return OpenAIEmbeddings(
        model=settings.openai_embed_model,
        api_key=settings.openai_api_key,
    )


def get_chat_model(
    mode: SystemMode | None = None,
) -> BaseChatModel:
    """Return the appropriate chat model based on system mode.

    Tries local Ollama first in local mode; falls back to cloud
    if Ollama is unreachable and cloud credentials are available.
    """
    settings = get_settings()
    effective_mode = mode or settings.system_mode

    if effective_mode == SystemMode.LOCAL:
        try:
            model = _build_ollama_chat(settings)
            logger.info("Using Ollama model: %s", settings.ollama_model)
            return model
        except Exception:
            logger.warning("Ollama unavailable, attempting cloud fallback")
            if settings.openai_api_key:
                return _build_openai_chat(settings)
            raise

    return _build_openai_chat(settings)


def get_embeddings(
    mode: SystemMode | None = None,
) -> Embeddings:
    """Return the appropriate embedding model based on system mode."""
    settings = get_settings()
    effective_mode = mode or settings.system_mode

    if effective_mode == SystemMode.LOCAL:
        try:
            embeddings = _build_ollama_embeddings(settings)
            logger.info("Using Ollama embeddings: %s", settings.ollama_embed_model)
            return embeddings
        except Exception:
            logger.warning("Ollama embeddings unavailable, attempting cloud fallback")
            if settings.openai_api_key:
                return _build_openai_embeddings(settings)
            raise

    return _build_openai_embeddings(settings)


ChatModelType = Union[BaseChatModel]
EmbeddingsType = Union[Embeddings]
