"""Helpers for stable citation-aware source attribution."""

from typing import TypedDict

from app.core.vector_store import SearchResult


class CitationSource(TypedDict):
    """Structured citation source shared by RAG and agent responses."""

    citation_id: int
    source: str
    chunk_index: int
    score: float
    excerpt: str


def merge_citation_sources(
    existing_sources: list[CitationSource] | None,
    results: list[SearchResult],
) -> list[CitationSource]:
    """Merge retrieved chunks into a stable citation list."""
    merged: list[CitationSource] = [
        {
            "citation_id": int(source["citation_id"]),
            "source": str(source["source"]),
            "chunk_index": int(source["chunk_index"]),
            "score": float(source["score"]),
            "excerpt": str(source["excerpt"]),
        }
        for source in (existing_sources or [])
    ]
    source_by_key = {
        _citation_key(source["source"], source["chunk_index"], source["excerpt"]): source
        for source in merged
    }
    next_citation_id = max((source["citation_id"] for source in merged), default=0) + 1

    for result in results:
        excerpt = result.content.strip()
        key = _citation_key(result.source, result.chunk_index, excerpt)
        existing = source_by_key.get(key)
        rounded_score = round(result.score, 4)

        if existing:
            existing["score"] = max(float(existing["score"]), rounded_score)
            continue

        citation_source: CitationSource = {
            "citation_id": next_citation_id,
            "source": result.source,
            "chunk_index": result.chunk_index,
            "score": rounded_score,
            "excerpt": excerpt,
        }
        merged.append(citation_source)
        source_by_key[key] = citation_source
        next_citation_id += 1

    merged.sort(key=lambda source: source["citation_id"])
    return merged


def format_citation_context(
    sources: list[CitationSource],
) -> tuple[str, str]:
    """Format stable citation sources into prompt-ready context blocks."""
    context_parts: list[str] = []
    sources_parts: list[str] = []

    for source in sorted(sources, key=lambda item: item["citation_id"]):
        citation_id = source["citation_id"]
        context_parts.append(f"[{citation_id}] {source['excerpt']}")
        sources_parts.append(
            f"[{citation_id}] {source['source']} (chunk {source['chunk_index']})"
        )

    return "\n\n".join(context_parts), "\n".join(sources_parts)


def _citation_key(source: str, chunk_index: int, excerpt: str) -> tuple[str, int, str]:
    return source, chunk_index, excerpt
