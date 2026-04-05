"""Document processing — parse, chunk, and embed uploaded files.

Supports PDF, TXT, and Markdown. Uses LangChain's
RecursiveCharacterTextSplitter for intelligent chunking.
"""

import logging
from pathlib import Path

import markdown
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.embeddings import Embeddings
import tempfile
import pymupdf4llm

from app.config import get_settings

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}


def _extract_text_pdf(content: bytes, filename: str) -> str:
    """Extract text from a PDF file with inline markdown figures using PyMuPDF4LLM."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Create output directory for images if it doesn't exist
        static_dir = Path(__file__).parent.parent.parent / "static" / "figures"
        static_dir.mkdir(parents=True, exist_ok=True)
        
        # Use PyMuPDF4LLM to convert to markdown, extracting images
        md_text = pymupdf4llm.to_markdown(
            tmp_path,
            write_images=True,
            image_path=str(static_dir),
            image_format="png"
        )
        
        # Fix the markdown image paths to route locally via FastAPI StaticFiles
        import re
        # Convert any absolute filepath references injected by pymupdf4llm into static links.
        # usually they look like ![id](some/absolute/path/file.png)
        # We just find anything ending in .png and replace the path, or replace the `static_dir` string directly.
        
        md_text = md_text.replace(str(static_dir) + "/", "/static/figures/")
        md_text = md_text.replace(str(static_dir) + "\\", "/static/figures/")
        # Sometimes it converts backslashes to forward slashes in python even on windows inside the string
        forward_slash_dir = str(static_dir).replace("\\", "/")
        md_text = md_text.replace(forward_slash_dir + "/", "/static/figures/")
        
        return md_text
    finally:
        import os
        os.unlink(tmp_path)


def _extract_text_markdown(content: bytes, filename: str) -> str:
    """Convert Markdown to plain text."""
    md_text = content.decode("utf-8", errors="replace")
    html = markdown.markdown(md_text)
    # Strip HTML tags for plain text
    import re

    return re.sub(r"<[^>]+>", "", html)


def _extract_text_plain(content: bytes, filename: str) -> str:
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

    text = extractor(content, filename)
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
