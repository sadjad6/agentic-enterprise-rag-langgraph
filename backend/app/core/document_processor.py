"""Document processing — parse, chunk, and embed uploaded files.

Supports PDF, TXT, and Markdown. Uses LangChain's
RecursiveCharacterTextSplitter for intelligent chunking.
"""

import logging
from io import BytesIO
from pathlib import Path

import markdown
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.embeddings import Embeddings
from pypdf import PdfReader

from app.config import get_settings

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}


def _extract_text_pdf(content: bytes) -> str:
    """Extract text from a PDF file."""
    reader = PdfReader(BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages)


def _extract_text_markdown(content: bytes) -> str:
    """Convert Markdown to plain text."""
    md_text = content.decode("utf-8", errors="replace")
    html = markdown.markdown(md_text)
    # Strip HTML tags for plain text
    import re

    return re.sub(r"<[^>]+>", "", html)


def _extract_text_plain(content: bytes) -> str:
    """Decode plain text content."""
    return content.decode("utf-8", errors="replace")


# Dispatch table keyed by file extension
_EXTRACTORS: dict[str, callable] = {
    ".pdf": _extract_text_pdf,
    ".txt": _extract_text_plain,
    ".md": _extract_text_markdown,
}


def extract_text(filename: str, content: bytes) -> str:
    """Extract text from an uploaded file based on its extension.

    Raises:
        ValueError: If the file type is not supported.
    """
    ext = Path(filename).suffix.lower()
    extractor = _EXTRACTORS.get(ext)
    if not extractor:
        supported = ", ".join(SUPPORTED_EXTENSIONS)
        raise ValueError(f"Unsupported file type '{ext}'. Supported: {supported}")

    text = extractor(content)
    logger.info("Extracted %d characters from '%s'", len(text), filename)
    return text


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    settings = get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    logger.info("Split text into %d chunks", len(chunks))
    return chunks


async def generate_embeddings(
    chunks: list[str],
    embeddings_model: Embeddings,
) -> list[list[float]]:
    """Generate embedding vectors for a list of text chunks."""
    vectors = await embeddings_model.aembed_documents(chunks)
    logger.info("Generated %d embedding vectors", len(vectors))
    return vectors
