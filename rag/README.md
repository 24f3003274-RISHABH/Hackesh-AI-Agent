# Hackesh Local-First RAG Engine (`/rag`)

## Overview
The Hackesh Local RAG Engine is an independent, privacy-first Retrieval-Augmented Generation subsystem designed to ingest and semantically retrieve local user documents without cloud vector database dependencies or remote telemetry.

## Supported Document Formats
- 📄 **PDF** (`.pdf`): Multi-page text extraction with page-level boundary tracking.
- 📝 **Plain Text** (`.txt`): Raw unformatted documents.
- 📑 **Markdown** (`.md`): Structured documentation and roadmaps.
- 📜 **Word Documents** (`.docx`): Formatted manuscripts and notes.

## Ingestion & Retrieval Pipeline
```
Document (PDF / TXT / MD / DOCX)
     │
     ▼
[Document Loader] ────► Extracts raw text & page numbers
     │
     ▼
[Text Cleaner]    ────► Normalizes whitespace, carriage returns & characters
     │
     ▼
[Chunker]         ────► Sliding-window chunking (chunk size, overlap, chunk index, page metadata)
     │
     ▼
[Local Embedding] ────► Computes deterministic dense hash-normalized vector space
     │
     ▼
[Local Store]     ────► Saves chunks & embeddings to local store
     │
     ▼
[Retriever]       ────► Top-K cosine similarity semantic matching
     │
     ▼
[Context Builder] ────► Formats citation blocks: [filename, p.X, Chunk #Y]
```

## Key Python API Usage
```python
from rag import RAGEngine

engine = RAGEngine()

# 1. Ingest document
doc = engine.ingest_text(
    text="# Personal Notes\nHackesh uses local SQLite and sliding-window chunking.",
    filename="notes.md"
)

# 2. Query and retrieve context with citations
context = engine.query("How does Hackesh store notes?", top_k=3)

print("Formatted Context:\n", context.formatted_context)
print("Citations:\n", context.citations)

# 3. Delete or Rebuild
engine.delete_document(doc.id)
engine.rebuild_index()
```

## Independence
The RAG engine is isolated and does not depend on LangGraph or external cloud databases. It can be utilized standalone or integrated into any agent routing workflow.
