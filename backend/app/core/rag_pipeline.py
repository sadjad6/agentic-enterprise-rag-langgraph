"""RAG pipeline — orchestrates retrieval, prompt building, and generation.

Ties together the vector store, LLM provider, and language detection
to produce answers with source citations.
"""

import logging
from dataclasses import dataclass, field

from langchain_core.messages import HumanMessage, SystemMessage

from app.core.citations import CitationSource, format_citation_context, merge_citation_sources
from app.core.language_detect import detect_language, get_rag_prompt
from app.core.llm_provider import get_chat_model, get_embeddings
from app.core.vector_store import SearchResult, VectorStore
from app.tracking.cost_tracker import CostTracker

logger = logging.getLogger(__name__)


@dataclass
class RAGResponse:
    """Structured response from the RAG pipeline."""

    answer: str
    sources: list[CitationSource]
    language: str
    tokens_used: dict[str, int] = field(default_factory=dict)
    cost_usd: float = 0.0


class RAGPipeline:
    """Orchestrates the full RAG workflow."""

    def __init__(
        self,
        vector_store: VectorStore,
        cost_tracker: CostTracker,
    ) -> None:
        self._vector_store = vector_store
        self._cost_tracker = cost_tracker

    async def query(
        self, question: str, access_level: str = "public", session_id: str = "default"
    ) -> RAGResponse:
        """Execute the RAG pipeline: retrieve → build prompt → generate answer."""
        language = detect_language(question)
        logger.info("Detected language: %s", language)

        # 1. Generate query embedding
        embeddings_model = get_embeddings()
        query_vector = await embeddings_model.aembed_query(question)

        # 2. Hybrid search
        results: list[SearchResult] = self._vector_store.hybrid_search(
            query_vector=query_vector,
            query_text=question,
            top_k=5,
            access_level=access_level,
        )

        if not results:
            return RAGResponse(
                answer=self._no_results_message(language),
                sources=[],
                language=language,
            )

        # 3. Build prompt with context
        context, sources_text, source_list = self._format_context(results)
        system_prompt = get_rag_prompt(language).format(
            context=context, sources=sources_text
        )

        # 4. Generate answer
        chat_model = get_chat_model()
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=question),
        ]
        response = await chat_model.ainvoke(messages)
        answer = response.content

        # 5. Track cost
        usage = self._cost_tracker.track_request(
            model=chat_model.model_name if hasattr(chat_model, "model_name") else "unknown",
            input_text=system_prompt + question,
            output_text=answer,
            session_id=session_id,
        )

        return RAGResponse(
            answer=answer,
            sources=source_list,
            language=language,
            tokens_used=usage.get("tokens", {}),
            cost_usd=usage.get("cost_usd", 0.0),
        )

    def _format_context(
        self, results: list[SearchResult]
    ) -> tuple[str, str, list[CitationSource]]:
        """Format search results into context string and source list."""
        source_list = merge_citation_sources([], results)
        context, sources_text = format_citation_context(source_list)
        return context, sources_text, source_list

    @staticmethod
    def _no_results_message(language: str) -> str:
        """Return a 'no results' message in the detected language."""
        messages = {
            "en": "I couldn't find relevant information in the documents to answer your question.",
            "de": (
                "Ich konnte in den Dokumenten keine relevanten Informationen finden, "
                "um Ihre Frage zu beantworten."
            ),
        }
        return messages.get(language, messages["en"])
