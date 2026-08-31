"""
Unified RAGEngine for Hackesh.
Coordinates Document Loaders, Cleaners, Chunkers, Local Embeddings, Vector Storage, and Retrieval.
"""

from typing import List, Optional, Dict, Any
from .models import Document, Chunk, SearchResult, RAGContext
from .loaders import DocumentLoader
from .cleaner import TextCleaner
from .chunker import DocumentChunker
from .embeddings import LocalEmbeddingEngine
from .vector_store import LocalVectorStore
from .retriever import LocalRetriever


class RAGEngine:
    """
    Independent local-first RAG subsystem.
    Zero external dependencies or cloud telemetry.
    """

    def __init__(
        self,
        storage_path: str = "data/hackesh_rag_store.json",
        chunk_size: int = 450,
        chunk_overlap: int = 60,
        embedding_dim: int = 128
    ):
        self.loader = DocumentLoader()
        self.cleaner = TextCleaner()
        self.chunker = DocumentChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.embeddings = LocalEmbeddingEngine(dimension=embedding_dim)
        self.vector_store = LocalVectorStore(storage_path=storage_path)
        self.retriever = LocalRetriever(
            vector_store=self.vector_store,
            embedding_engine=self.embeddings
        )

    def ingest_text(
        self,
        text: str,
        filename: str = "document.txt",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Document:
        """Ingests raw text, cleans it, chunks it, generates local embeddings, and saves to vector store."""
        cleaned = self.cleaner.clean(text)
        doc = self.loader.load_from_text(cleaned, filename=filename, metadata=metadata)
        chunks = self.chunker.chunk_document(doc)

        # Generate embeddings for each chunk
        for c in chunks:
            c.embedding = self.embeddings.embed_text(c.text)

        self.vector_store.add_document_and_chunks(doc, chunks)
        return doc

    def ingest_file(self, file_path: str) -> Document:
        """Ingests a local file (PDF, TXT, MD, DOCX)."""
        raw_doc = self.loader.load_file(file_path)
        cleaned_content = self.cleaner.clean(raw_doc.content)
        raw_doc.content = cleaned_content
        
        chunks = self.chunker.chunk_document(raw_doc)
        for c in chunks:
            c.embedding = self.embeddings.embed_text(c.text)

        self.vector_store.add_document_and_chunks(raw_doc, chunks)
        return raw_doc

    def query(self, user_query: str, top_k: int = 3) -> RAGContext:
        """Performs semantic search, extracts relevant chunks, and produces structured context with citations."""
        return self.retriever.build_context(user_query, top_k=top_k)

    def search_chunks(self, user_query: str, top_k: int = 4) -> List[SearchResult]:
        """Returns direct search result matches."""
        return self.retriever.retrieve(user_query, top_k=top_k)

    def delete_document(self, doc_id: str) -> bool:
        """Deletes a document and its chunks from local store."""
        return self.vector_store.delete_document(doc_id)

    def rebuild_index(self) -> None:
        """Re-indexes all stored documents."""
        self.vector_store.rebuild_index(self.embeddings)

    def list_documents(self) -> List[Document]:
        """Returns all registered documents."""
        return list(self.vector_store.documents.values())

    def get_all_chunks(self) -> List[Chunk]:
        """Returns all indexed chunks."""
        return self.vector_store.chunks
