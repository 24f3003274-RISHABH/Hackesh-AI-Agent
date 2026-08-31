"""
Local Vector Store for Hackesh RAG Engine.
Supports adding documents, storing chunk embeddings, top-k cosine similarity search,
document deletion, metadata indexing, and rebuilding indices.
"""

import json
import os
import math
from typing import List, Dict, Any, Optional, Tuple
from .models import Chunk, Document, SearchResult


class LocalVectorStore:
    """
    Independent local vector database and metadata indexer.
    Stores chunks and embeddings on local filesystem with zero cloud exposure.
    """

    def __init__(self, storage_path: str = "data/hackesh_rag_store.json"):
        self.storage_path = storage_path
        self.documents: Dict[str, Document] = {}
        self.chunks: List[Chunk] = []
        self._init_storage()

    def _init_storage(self) -> None:
        """Initializes or loads the vector index from disk."""
        db_dir = os.path.dirname(self.storage_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)

        if os.path.exists(self.storage_path):
            self.load()

    def add_document_and_chunks(self, document: Document, chunks: List[Chunk]) -> None:
        """Adds a document and its embedded chunks to the local vector store."""
        self.documents[document.id] = document
        
        # Remove any prior chunks for this doc_id
        self.chunks = [c for c in self.chunks if c.doc_id != document.id]
        self.chunks.extend(chunks)
        self.save()

    def delete_document(self, doc_id: str) -> bool:
        """Deletes a document and its associated chunks from the index."""
        if doc_id in self.documents:
            del self.documents[doc_id]
            self.chunks = [c for c in self.chunks if c.doc_id != doc_id]
            self.save()
            return True
        return False

    def rebuild_index(self, embedding_engine) -> None:
        """Re-computes embeddings for all indexed chunks and saves store."""
        for chunk in self.chunks:
            chunk.embedding = embedding_engine.embed_text(chunk.text)
        self.save()

    def search(self, query_embedding: List[float], top_k: int = 4) -> List[Tuple[Chunk, float]]:
        """Performs cosine similarity search against all stored chunks."""
        if not self.chunks:
            return []

        scored: List[Tuple[Chunk, float]] = []

        for chunk in self.chunks:
            if not chunk.embedding:
                continue
            score = self._cosine_similarity(query_embedding, chunk.embedding)
            scored.append((chunk, score))

        # Sort descending by score
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    @staticmethod
    def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Calculates cosine similarity between two normalized vectors."""
        if len(vec_a) != len(vec_b):
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def save(self) -> None:
        """Persists document registry and chunks to local disk."""
        data = {
            "documents": [
                {
                    "id": d.id,
                    "filename": d.filename,
                    "doc_type": d.doc_type,
                    "content": d.content,
                    "created_at": d.created_at,
                    "metadata": d.metadata,
                    "total_pages": d.total_pages,
                }
                for d in self.documents.values()
            ],
            "chunks": [
                {
                    "id": c.id,
                    "doc_id": c.doc_id,
                    "source_filename": c.source_filename,
                    "text": c.text,
                    "chunk_index": c.chunk_index,
                    "page_number": c.page_number,
                    "embedding": c.embedding,
                    "metadata": c.metadata,
                    "created_at": c.created_at,
                }
                for c in self.chunks
            ],
        }
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def load(self) -> None:
        """Loads store from local file."""
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self.documents = {
                d["id"]: Document(
                    id=d["id"],
                    filename=d["filename"],
                    doc_type=d["doc_type"],
                    content=d["content"],
                    created_at=d["created_at"],
                    metadata=d.get("metadata", {}),
                    total_pages=d.get("total_pages", 1)
                )
                for d in data.get("documents", [])
            }

            self.chunks = [
                Chunk(
                    id=c["id"],
                    doc_id=c["doc_id"],
                    source_filename=c["source_filename"],
                    text=c["text"],
                    chunk_index=c["chunk_index"],
                    page_number=c.get("page_number", 1),
                    embedding=c.get("embedding"),
                    metadata=c.get("metadata", {}),
                    created_at=c["created_at"]
                )
                for c in data.get("chunks", [])
            ]
        except Exception as e:
            print(f"[LocalVectorStore] Error loading: {e}")
