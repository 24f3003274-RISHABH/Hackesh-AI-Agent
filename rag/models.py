"""
Data models and dataclasses for Hackesh Local RAG Engine.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid


@dataclass
class Document:
    """Represents an ingested document file (PDF, TXT, MD, DOCX)."""
    filename: str
    doc_type: str  # 'pdf', 'txt', 'md', 'docx'
    content: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)
    total_pages: int = 1


@dataclass
class Chunk:
    """Represents an atomic semantic text chunk extracted from a Document."""
    doc_id: str
    source_filename: str
    text: str
    chunk_index: int
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    page_number: Optional[int] = None
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class SearchResult:
    """Represents a top-k semantic search match."""
    chunk: Chunk
    score: float
    citation: str


@dataclass
class RAGContext:
    """Aggregated context and citations ready for LLM prompt injection."""
    query: str
    formatted_context: str
    citations: List[str]
    matches: List[SearchResult]
