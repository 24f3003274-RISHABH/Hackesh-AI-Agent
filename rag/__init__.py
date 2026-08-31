"""
Hackesh Local-First RAG Subsystem
Independent document ingestion, local vector storage, and semantic context retrieval.
"""

from .engine import RAGEngine
from .models import Document, Chunk, SearchResult, RAGContext

__all__ = [
    "RAGEngine",
    "Document",
    "Chunk",
    "SearchResult",
    "RAGContext",
]
