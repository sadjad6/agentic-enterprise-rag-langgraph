"""Language detection for multilingual support (DE/EN).

Detects the language of user input and provides locale-aware
prompt templates.
"""

import logging

from langdetect import LangDetectException, detect

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


RAG_SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are a helpful enterprise assistant. Answer the user's question "
        "based ONLY on the provided context. If the context does not contain "
        "enough information, say so. Every grounded claim must cite one or "
        "more source ids inline using [n] format exactly as provided. Never "
        "invent citation ids and never move all citations to the end.\n\n"
        "Context:\n{context}\n\n"
        "Sources:\n{sources}"
    ),
    "de": (
        "Du bist ein hilfreicher Unternehmensassistent. Beantworte die Frage "
        "des Benutzers NUR basierend auf dem bereitgestellten Kontext. Wenn der "
        "Kontext nicht genug Informationen enthaelt, sage das. Jede belegte "
        "Aussage muss eine oder mehrere Quellen-IDs direkt inline im Format [n] "
        "enthalten. Erfinde keine Quellen-IDs und sammle die Zitate nicht nur "
        "am Ende.\n\n"
        "Kontext:\n{context}\n\n"
        "Quellen:\n{sources}"
    ),
}

AGENT_SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are an intelligent enterprise assistant with access to tools. "
        "Use the available tools to answer the user's question accurately. "
        "Think step-by-step and use tools when needed. "
        "When document search results are used, keep track of the provided "
        "source ids and cite grounded claims inline with [n] markers."
    ),
    "de": (
        "Du bist ein intelligenter Unternehmensassistent mit Zugriff auf Tools. "
        "Verwende die verfuegbaren Tools, um die Frage des Benutzers genau zu "
        "beantworten. Denke schrittweise und verwende Tools bei Bedarf. "
        "Wenn Dokumentensuchergebnisse verwendet werden, merke dir die "
        "bereitgestellten Quellen-IDs und zitiere belegte Aussagen inline mit "
        "[n]-Markern."
    ),
}


def get_rag_prompt(language: str) -> str:
    """Return the RAG system prompt for the given language."""
    return RAG_SYSTEM_PROMPTS.get(language, RAG_SYSTEM_PROMPTS[DEFAULT_LANGUAGE])


def get_agent_prompt(language: str) -> str:
    """Return the agent system prompt for the given language."""
    return AGENT_SYSTEM_PROMPTS.get(language, AGENT_SYSTEM_PROMPTS[DEFAULT_LANGUAGE])
