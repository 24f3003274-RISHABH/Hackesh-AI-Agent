"""
Semantic & Sliding-Window Chunker for Hackesh Local RAG.
Splits text into chunks while preserving source metadata, page numbers, and chunk sequences.
"""

import re
from typing import List, Optional
from .models import Document, Chunk


class DocumentChunker:
    """Chunks documents into overlapping segments with metadata tracking."""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 80):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(self, doc: Document) -> List[Chunk]:
        """Splits a Document into an array of Chunk objects."""
        chunks: List[Chunk] = []
        text = doc.content

        # Check for explicit page markers from PDF loader
        page_splits = re.split(r"--- \[Page (\d+)\] ---", text)

        if len(page_splits) > 1:
            # Document has page metadata
            current_page = 1
            chunk_idx = 0
            for i in range(1, len(page_splits), 2):
                page_num = int(page_splits[i])
                page_content = page_splits[i + 1] if i + 1 < len(page_splits) else ""
                sub_chunks = self._split_text(page_content)
                for sc in sub_chunks:
                    chunk = Chunk(
                        doc_id=doc.id,
                        source_filename=doc.filename,
                        text=sc,
                        chunk_index=chunk_idx,
                        page_number=page_num,
                        metadata={"doc_type": doc.doc_type, "total_pages": doc.total_pages}
                    )
                    chunks.append(chunk)
                    chunk_idx += 1
            return chunks

        # Standard document splitting (Markdown, TXT, DOCX)
        raw_chunks = self._split_text(text)
        for idx, sc in enumerate(raw_chunks):
            chunk = Chunk(
                doc_id=doc.id,
                source_filename=doc.filename,
                text=sc,
                chunk_index=idx,
                page_number=1,
                metadata={"doc_type": doc.doc_type, "total_pages": doc.total_pages}
            )
            chunks.append(chunk)

        return chunks

    def _split_text(self, text: str) -> List[str]:
        """Splits a single text block by character/word window with overlap."""
        text = text.strip()
        if not text:
            return []

        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            
            # Try to break at sentence or newline boundary if near the end
            if end < len(text):
                boundary = max(
                    text.rfind("\n\n", start, end),
                    text.rfind(". ", start, end),
                    text.rfind("? ", start, end),
                    text.rfind("! ", start, end)
                )
                if boundary != -1 and boundary > start + (self.chunk_size // 2):
                    end = boundary + 1

            chunk_str = text[start:end].strip()
            if chunk_str:
                chunks.append(chunk_str)

            start = end - self.chunk_overlap
            if start >= len(text) - self.chunk_overlap:
                break

        return chunks
