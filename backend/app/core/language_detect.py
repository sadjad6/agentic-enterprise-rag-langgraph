"""Language detection for multilingual support (DE/EN).

Detects the language of user input and provides locale-aware
prompt templates.
"""

import logging

from langdetect import detect, LangDetectException

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {"en", "de"}
DEFAULT_LANGUAGE = "en"


def detect_language(text: str) -> str:
    """Detect language of input text. Returns ISO 639-1 code.

    Falls back to English if detection fails or language is unsupported.
    """
    if not text or len(text.strip()) < 10:
        return DEFAULT_LANGUAGE

    try:
        lang = detect(text)
        if lang in SUPPORTED_LANGUAGES:
            return lang
        logger.info("Detected unsupported language '%s', defaulting to EN", lang)
        return DEFAULT_LANGUAGE
    except LangDetectException:
        logger.warning("Language detection failed, defaulting to EN")
        return DEFAULT_LANGUAGE


# ── Multilingual prompt templates ─────────────────────────────

RAG_SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are a helpful enterprise assistant. Answer the user's question "
        "based ONLY on the provided context. If the context doesn't contain "
        "enough information, say so. Always cite your sources.\n\n"
        "Context:\n{context}\n\n"
        "Sources:\n{sources}"
    ),
    "de": (
        "Du bist ein hilfreicher Unternehmensassistent. Beantworte die Frage "
        "des Benutzers NUR basierend auf dem bereitgestellten Kontext. Wenn der "
        "Kontext nicht genügend Informationen enthält, sage das. Zitiere immer "
        "deine Quellen.\n\n"
        "Kontext:\n{context}\n\n"
        "Quellen:\n{sources}"
    ),
}

AGENT_SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are an intelligent enterprise assistant with access to tools. "
        "Use the available tools to answer the user's question accurately. "
        "Think step-by-step and use tools when needed. "
        "Always cite sources when using document search results."
    ),
    "de": (
        "Du bist ein intelligenter Unternehmensassistent mit Zugriff auf Tools. "
        "Verwende die verfügbaren Tools, um die Frage des Benutzers genau zu "
        "beantworten. Denke schrittweise und verwende Tools bei Bedarf. "
        "Zitiere immer Quellen, wenn du Dokumentensuchergebnisse verwendest."
    ),
}


def get_rag_prompt(language: str) -> str:
    """Return the RAG system prompt for the given language."""
    return RAG_SYSTEM_PROMPTS.get(language, RAG_SYSTEM_PROMPTS[DEFAULT_LANGUAGE])


def get_agent_prompt(language: str) -> str:
    """Return the agent system prompt for the given language."""
    return AGENT_SYSTEM_PROMPTS.get(language, AGENT_SYSTEM_PROMPTS[DEFAULT_LANGUAGE])
