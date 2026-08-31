"""
Retriever and Context Builder for Hackesh Local RAG.
Extracts top-k semantic matches, builds formatted prompt contexts, and produces accurate source citations.
"""

from typing import List, Dict, Any
from .models import Chunk, SearchResult, RAGContext
from .vector_store import LocalVectorStore
from .embeddings import LocalEmbeddingEngine


class LocalRetriever:
    """Retrieves relevant chunks and builds LLM-ready context with citations."""

    def __init__(self, vector_store: LocalVectorStore, embedding_engine: LocalEmbeddingEngine):
        self.vector_store = vector_store
        self.embedding_engine = embedding_engine

    def retrieve(self, query: str, top_k: int = 3, min_score: float = 0.05) -> List[SearchResult]:
        """Performs semantic search for a query and formats SearchResults."""
        query_vec = self.embedding_engine.embed_text(query)
        raw_matches = self.vector_store.search(query_vec, top_k=top_k)

        results: List[SearchResult] = []
        for chunk, score in raw_matches:
            if score >= min_score:
                page_str = f", Page {chunk.page_number}" if chunk.page_number else ""
                citation = f"[{chunk.source_filename}{page_str}, Chunk #{chunk.chunk_index}]"
                results.append(SearchResult(
                    chunk=chunk,
                    score=round(score, 4),
                    citation=citation
                ))
        return results

    def build_context(self, query: str, top_k: int = 3) -> RAGContext:
        """Assembles prompt-injectable context and structured citations."""
        matches = self.retrieve(query, top_k=top_k)
        
        context_parts = []
        citations = []

        for idx, match in enumerate(matches, 1):
            context_parts.append(
                f"--- SOURCE {idx}: {match.citation} ---\n{match.chunk.text}"
            )
            citations.append(match.citation)

        formatted_context = "\n\n".join(context_parts) if context_parts else "No relevant local documents found."

        return RAGContext(
            query=query,
            formatted_context=formatted_context,
            citations=citations,
            matches=matches
        )
