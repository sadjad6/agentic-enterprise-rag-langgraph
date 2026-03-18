"""Upload endpoint — document ingestion pipeline."""

import logging

from fastapi import APIRouter, HTTPException, UploadFile

from app.core.document_processor import (
    SUPPORTED_EXTENSIONS,
    chunk_text,
    extract_text,
    generate_embeddings,
)
from app.core.language_detect import detect_language
from app.core.llm_provider import get_embeddings
from app.dependencies import get_vector_store

logger = logging.getLogger(__name__)
router = APIRouter()


class UploadResponse:
    """Not used as Pydantic model — we return dict for flexibility."""


@router.post("/upload")
async def upload_document(
    file: UploadFile,
    access_level: str = "public",
) -> dict:
    """Upload and ingest a document into the vector store.

    Supports PDF, TXT, and Markdown files. The document is parsed,
    chunked, embedded, and stored in Weaviate.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    try:
        # 1. Read file content
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")

        # 2. Extract text
        text = extract_text(file.filename, content)
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text content extracted")

        # 3. Detect language
        language = detect_language(text[:500])

        # 4. Chunk text
        chunks = chunk_text(text)

        # 5. Generate embeddings
        embeddings_model = get_embeddings()
        vectors = await generate_embeddings(chunks, embeddings_model)

        # 6. Store in vector database
        vector_store = get_vector_store()
        inserted = vector_store.add_documents(
            chunks=chunks,
            vectors=vectors,
            source=file.filename,
            access_level=access_level,
            language=language,
        )

        logger.info(
            "Ingested '%s': %d chunks, language=%s",
            file.filename, inserted, language,
        )

        return {
            "status": "success",
            "filename": file.filename,
            "chunks_created": inserted,
            "language_detected": language,
            "access_level": access_level,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Upload failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


@router.get("/documents")
async def list_documents() -> dict:
    """List all ingested document sources."""
    try:
        vector_store = get_vector_store()
        sources = vector_store.get_document_sources()
        return {
            "documents": sources,
            "count": len(sources),
            "supported_formats": list(SUPPORTED_EXTENSIONS),
        }
    except Exception as e:
        logger.error("Failed to list documents: %s", e)
        return {"documents": [], "count": 0, "error": str(e)}
