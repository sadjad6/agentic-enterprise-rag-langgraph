"""Weaviate vector store integration — supports local and cloud modes.

Handles schema creation, document insertion, and hybrid search
(vector + BM25 keyword) through the Weaviate v4 Python client.
"""

import logging
from dataclasses import dataclass
from typing import Any

import weaviate
from weaviate.classes.config import Configure, DataType, Property
from weaviate.classes.query import MetadataQuery

from app.config import SystemMode, get_settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "Document"


@dataclass
class SearchResult:
    """A single search result from the vector store."""

    content: str
    source: str
    access_level: str
    score: float
    chunk_index: int


class VectorStore:
    """Weaviate vector store wrapper supporting local and cloud modes."""

    def __init__(self, mode: SystemMode | None = None) -> None:
        settings = get_settings()
        self._mode = mode or settings.system_mode
        self._client: weaviate.WeaviateClient | None = None

    def connect(self) -> None:
        """Establish connection to Weaviate."""
        settings = get_settings()

        if self._mode == SystemMode.LOCAL:
            self._client = weaviate.connect_to_local(
                host=settings.weaviate_local_url.replace("http://", "").split(":")[0],
                port=int(settings.weaviate_local_url.split(":")[-1]),
                grpc_port=settings.weaviate_grpc_port,
            )
        else:
            self._client = weaviate.connect_to_weaviate_cloud(
                cluster_url=settings.weaviate_cloud_url,
                auth_credentials=weaviate.auth.AuthApiKey(settings.weaviate_cloud_api_key),
            )

        logger.info("Connected to Weaviate (%s mode)", self._mode.value)
        self._ensure_schema()

    def close(self) -> None:
        """Close the Weaviate connection."""
        if self._client:
            self._client.close()
            self._client = None

    def _ensure_schema(self) -> None:
        """Create the Document collection if it doesn't exist."""
        if not self._client:
            raise ConnectionError("Weaviate client not connected")

        if self._client.collections.exists(COLLECTION_NAME):
            logger.info("Collection '%s' already exists", COLLECTION_NAME)
            return

        self._client.collections.create(
            name=COLLECTION_NAME,
            vectorizer_config=Configure.Vectorizer.none(),
            properties=[
                Property(name="content", data_type=DataType.TEXT),
                Property(name="source", data_type=DataType.TEXT),
                Property(name="access_level", data_type=DataType.TEXT),
                Property(name="chunk_index", data_type=DataType.INT),
                Property(name="language", data_type=DataType.TEXT),
            ],
        )
        logger.info("Created collection '%s'", COLLECTION_NAME)

    def add_documents(
        self,
        chunks: list[str],
        vectors: list[list[float]],
        source: str,
        access_level: str = "public",
        language: str = "en",
    ) -> int:
        """Insert document chunks with their embeddings.

        Returns the number of inserted objects.
        """
        if not self._client:
            raise ConnectionError("Weaviate client not connected")

        collection = self._client.collections.get(COLLECTION_NAME)
        inserted = 0

        with collection.batch.dynamic() as batch:
            for idx, (chunk, vector) in enumerate(zip(chunks, vectors)):
                batch.add_object(
                    properties={
                        "content": chunk,
                        "source": source,
                        "access_level": access_level,
                        "chunk_index": idx,
                        "language": language,
                    },
                    vector=vector,
                )
                inserted += 1

        logger.info("Inserted %d chunks from '%s'", inserted, source)
        return inserted

    def hybrid_search(
        self,
        query_vector: list[float],
        query_text: str,
        top_k: int = 5,
        access_level: str | None = None,
    ) -> list[SearchResult]:
        """Perform hybrid search (vector + BM25 keyword).

        Combines semantic similarity with keyword matching for
        higher retrieval quality.
        """
        if not self._client:
            raise ConnectionError("Weaviate client not connected")

        collection = self._client.collections.get(COLLECTION_NAME)

        results = collection.query.hybrid(
            query=query_text,
            vector=query_vector,
            limit=top_k,
            return_metadata=MetadataQuery(score=True),
            alpha=0.7,  # 0.7 = 70% vector, 30% keyword
        )

        search_results: list[SearchResult] = []
        for obj in results.objects:
            props: dict[str, Any] = obj.properties
            if access_level and props.get("access_level") != access_level:
                continue
            search_results.append(
                SearchResult(
                    content=props.get("content", ""),
                    source=props.get("source", "unknown"),
                    access_level=props.get("access_level", "public"),
                    score=obj.metadata.score if obj.metadata and obj.metadata.score else 0.0,
                    chunk_index=props.get("chunk_index", 0),
                )
            )

        return search_results

    def delete_by_source(self, source: str) -> None:
        """Delete all chunks from a given source document."""
        if not self._client:
            raise ConnectionError("Weaviate client not connected")

        collection = self._client.collections.get(COLLECTION_NAME)
        collection.data.delete_many(
            where=weaviate.classes.query.Filter.by_property("source").equal(source)
        )
        logger.info("Deleted all chunks from source '%s'", source)

    def get_document_sources(self) -> list[str]:
        """Return a list of unique document source names."""
        if not self._client:
            raise ConnectionError("Weaviate client not connected")

        collection = self._client.collections.get(COLLECTION_NAME)
        result = collection.aggregate.over_all(total_count=True)
        # Fetch unique sources via a query
        sources_set: set[str] = set()
        for obj in collection.iterator():
            sources_set.add(obj.properties.get("source", "unknown"))

        return sorted(sources_set)
