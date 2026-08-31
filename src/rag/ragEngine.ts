/**
 * Hackesh Local RAG Engine (TypeScript / Node.js Implementation)
 * Provides local document ingestion (PDF, TXT, MD, DOCX), semantic chunking,
 * cosine similarity search, source citations, and LLM context formatting.
 */

import fs from 'fs';
import path from 'path';

export interface RAGDocument {
  id: string;
  filename: string;
  docType: string;
  content: string;
  createdAt: string;
  totalPages: number;
  metadata?: Record<string, any>;
}

export interface RAGChunk {
  id: string;
  docId: string;
  sourceFilename: string;
  text: string;
  chunkIndex: number;
  pageNumber?: number;
  embedding?: number[];
  createdAt: string;
}

export interface RAGSearchResult {
  chunk: RAGChunk;
  score: number;
  citation: string;
}

export interface RAGContextResponse {
  query: string;
  formattedContext: string;
  citations: string[];
  matches: RAGSearchResult[];
}

interface RAGStoreSchema {
  documents: RAGDocument[];
  chunks: RAGChunk[];
}

export class LocalRAGEngine {
  private filePath: string;
  private data: RAGStoreSchema;
  private embeddingDim: number = 128;

  constructor(storagePath: string = 'data/hackesh_rag_store.json') {
    this.filePath = path.resolve(process.cwd(), storagePath);
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.data = {
      documents: [],
      chunks: [],
    };
    this.load();
    this.seedDefaultDocsIfEmpty();
  }

  private load(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.warn('[RAGEngine] Failed to load store:', e);
      }
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[RAGEngine] Failed to save store:', e);
    }
  }

  private seedDefaultDocsIfEmpty(): void {
    if (this.data.documents.length === 0) {
      this.ingestDocument(
        'Hackesh_Overview.md',
        `# Hackesh Local AI Agent Overview
Hackesh is a privacy-first personal AI assistant executing LangGraph state workflows.
It contains modular tools including Safe Calculator, YouTube media lookup, Gmail dispatching, live Weather reports, and Curated News.
All document RAG pipelines execute locally without leaking private data to external cloud models.`,
        'md',
        1
      );

      this.ingestDocument(
        'System_Manual.txt',
        `System Operation Guide:
1. Memory Engine: SQLite persistent storage for sessions, messages, and categorized memories (facts, preferences, goals).
2. LangGraph Router: Deterministic edge dispatching with real-time state visualization.
3. RAG Pipeline: Vector indexing with top-k cosine similarity retrieval and citation formatting.`,
        'txt',
        1
      );
    }
  }

  // =========================================================================
  // Document Ingestion & Chunking
  // =========================================================================

  public ingestDocument(
    filename: string,
    content: string,
    docType: string = 'txt',
    totalPages: number = 1,
    metadata?: Record<string, any>
  ): RAGDocument {
    const docId = 'doc_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const doc: RAGDocument = {
      id: docId,
      filename,
      docType: docType.toLowerCase(),
      content: content.trim(),
      createdAt: now,
      totalPages,
      metadata,
    };

    // Remove any existing doc with same filename
    this.data.documents = this.data.documents.filter((d) => d.filename !== filename);
    this.data.chunks = this.data.chunks.filter((c) => c.sourceFilename !== filename);

    // Chunk the document
    const chunks = this.createChunks(doc);

    this.data.documents.unshift(doc);
    this.data.chunks.push(...chunks);
    this.save();

    return doc;
  }

  private createChunks(doc: RAGDocument): RAGChunk[] {
    const chunkSize = 400;
    const overlap = 60;
    const text = doc.content;
    const chunks: RAGChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      if (end < text.length) {
        const breakPoint = text.lastIndexOf('\n', end);
        if (breakPoint > start + chunkSize / 2) {
          end = breakPoint;
        }
      }

      const chunkText = text.substring(start, end).trim();
      if (chunkText) {
        const embedding = this.generateEmbedding(chunkText);
        chunks.push({
          id: `chk_${doc.id}_${index}`,
          docId: doc.id,
          sourceFilename: doc.filename,
          text: chunkText,
          chunkIndex: index,
          pageNumber: Math.min(doc.totalPages, Math.floor(index / 2) + 1),
          embedding,
          createdAt: new Date().toISOString(),
        });
        index++;
      }

      start = end - overlap;
      if (start >= text.length - overlap) break;
    }

    return chunks;
  }

  // =========================================================================
  // Local Vector Embedding (Deterministic Bag of Hash Trigrams + Normalization)
  // =========================================================================

  public generateEmbedding(text: string = ''): number[] {
    const clean = text.toLowerCase();
    const words = clean.match(/\b\w+\b/g) || [];
    const vector = new Array(this.embeddingDim).fill(0);

    for (const word of words) {
      let h = 0;
      for (let i = 0; i < word.length; i++) {
        h = (h << 5) - h + word.charCodeAt(i);
        h |= 0;
      }
      const idx = Math.abs(h) % this.embeddingDim;
      vector[idx] += 1.0;

      // Trigrams
      if (word.length >= 3) {
        for (let i = 0; i < word.length - 2; i++) {
          const tri = word.slice(i, i + 3);
          let th = 0;
          for (let j = 0; j < tri.length; j++) {
            th = (th << 5) - th + tri.charCodeAt(j);
            th |= 0;
          }
          vector[Math.abs(th) % this.embeddingDim] += 0.3;
        }
      }
    }

    // L2 Normalization
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      return vector.map((v) => v / norm);
    }
    return vector;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  // =========================================================================
  // Search & Retrieval
  // =========================================================================

  public retrieve(query: string, topK: number = 3): RAGSearchResult[] {
    const qVec = this.generateEmbedding(query);
    const scored: { chunk: RAGChunk; score: number }[] = [];

    for (const chunk of this.data.chunks) {
      if (!chunk.embedding) continue;
      const score = this.cosineSimilarity(qVec, chunk.embedding);
      scored.push({ chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.slice(0, topK);

    return topMatches.map((m) => {
      const pageStr = m.chunk.pageNumber ? `, p.${m.chunk.pageNumber}` : '';
      return {
        chunk: m.chunk,
        score: Math.round(m.score * 1000) / 1000,
        citation: `[${m.chunk.sourceFilename}${pageStr}, Chunk #${m.chunk.chunkIndex}]`,
      };
    });
  }

  public query(query: string, topK: number = 3): RAGContextResponse {
    const matches = this.retrieve(query, topK);
    const contextParts = matches.map(
      (m, idx) => `--- [SOURCE ${idx + 1}: ${m.citation} (Score: ${m.score})] ---\n${m.chunk.text}`
    );

    return {
      query,
      formattedContext: contextParts.join('\n\n') || 'No matching local documents found.',
      citations: matches.map((m) => m.citation),
      matches,
    };
  }

  // =========================================================================
  // Management APIs
  // =========================================================================

  public deleteDocument(docId: string): boolean {
    const init = this.data.documents.length;
    this.data.documents = this.data.documents.filter((d) => d.id !== docId);
    this.data.chunks = this.data.chunks.filter((c) => c.docId !== docId);
    if (this.data.documents.length !== init) {
      this.save();
      return true;
    }
    return false;
  }

  public rebuildIndex(): void {
    for (const chunk of this.data.chunks) {
      chunk.embedding = this.generateEmbedding(chunk.text);
    }
    this.save();
  }

  public getDocuments(): RAGDocument[] {
    return this.data.documents;
  }

  public getChunks(): RAGChunk[] {
    return this.data.chunks;
  }
}

// Global Singleton Instance
export const globalRAGEngine = new LocalRAGEngine();
