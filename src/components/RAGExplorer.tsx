import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  RefreshCw,
  Layers,
  Sparkles,
  BookOpen,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Tag,
  Hash,
} from 'lucide-react';
import { RAGDocument, RAGSearchResult, RAGContextResponse } from '../rag/ragEngine';

export const RAGExplorer: React.FC = () => {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('How does Hackesh store memories?');
  const [topK, setTopK] = useState(3);
  const [searchResult, setSearchResult] = useState<RAGContextResponse | null>(null);
  const [searching, setSearching] = useState(false);

  // Ingest Document State
  const [isIngesting, setIsIngesting] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('md');
  const [docContent, setDocContent] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [ingesting, setIngesting] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rag/documents');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
        setTotalChunks(data.totalChunks || 0);
      }
    } catch (e) {
      console.error('Error loading RAG documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, topK }),
      });
      const data = await res.json();
      setSearchResult(data);
    } catch (e) {
      console.error('RAG query error:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    setIngesting(true);
    try {
      const res = await fetch('/api/rag/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: docTitle.endsWith(`.${docType}`) ? docTitle : `${docTitle}.${docType}`,
          content: docContent,
          docType,
          totalPages: Number(totalPages) || 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDocTitle('');
        setDocContent('');
        setIsIngesting(false);
        fetchDocuments();
      }
    } catch (e) {
      console.error('Ingestion error:', e);
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/rag/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
      if (searchResult) {
        setSearchResult(null);
      }
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleRebuildIndex = async () => {
    setLoading(true);
    try {
      await fetch('/api/rag/rebuild', { method: 'POST' });
      fetchDocuments();
    } catch (e) {
      console.error('Rebuild error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Sample file templates
  const loadTemplate = (type: 'notes' | 'api' | 'research') => {
    if (type === 'notes') {
      setDocTitle('Personal_Project_Roadmap.md');
      setDocType('md');
      setTotalPages(1);
      setDocContent(`# Personal Project Roadmap 2026
- Milestone 1: LangGraph conditional tool router
- Milestone 2: Local SQLite Memory Engine with 6 categories
- Milestone 3: Privacy-preserving local document RAG with vector search
- Milestone 4: Voice integration and local Whisper models`);
    } else if (type === 'api') {
      setDocTitle('Hackesh_API_Reference.txt');
      setDocType('txt');
      setTotalPages(2);
      setDocContent(`HACKESH LOCAL API SPECIFICATION
Endpoint /api/tools/calculator: Evaluates arithmetic strings securely.
Endpoint /api/tools/weather: Queries Open-Meteo with no API key requirement.
Endpoint /api/memory/items: Inserts and retrieves categorized memories.
Endpoint /api/rag/query: Generates local vector embeddings and returns top-k citations.`);
    } else {
      setDocTitle('Edge_AI_Research.docx');
      setDocType('docx');
      setTotalPages(3);
      setDocContent(`Research Paper: On-Device Vector Indexing
Authors: Hackesh Research Group
Abstract: By combining quantized dense representations with sliding-window chunking, personal assistants achieve sub-10ms semantic retrieval with zero cloud egress.`);
    }
  };

  const getDocTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400" />;
      case 'md':
        return <FileCode className="w-4 h-4 text-emerald-400" />;
      case 'docx':
        return <FileSpreadsheet className="w-4 h-4 text-blue-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" /> Hackesh Local RAG Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Offline document ingestion, sliding-window chunking, local vector indexing & semantic top-k retriever.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRebuildIndex}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Rebuild Index
          </button>
          <button
            onClick={() => setIsIngesting(!isIngesting)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Ingest Document
          </button>
        </div>
      </div>

      {/* Ingest Form */}
      {isIngesting && (
        <form onSubmit={handleIngest} className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Document Ingestion Pipeline
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Quick templates:</span>
              <button
                type="button"
                onClick={() => loadTemplate('notes')}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Roadmap (MD)
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('api')}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Manual (TXT)
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('research')}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Paper (DOCX)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Source Filename:</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. system_architecture.md"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Document Format:</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="md">Markdown (.md)</option>
                <option value="txt">Plain Text (.txt)</option>
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="docx">Word Document (.docx)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Total Pages:</label>
              <input
                type="number"
                min={1}
                max={500}
                value={totalPages}
                onChange={(e) => setTotalPages(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Document Text Content:</label>
            <textarea
              rows={4}
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Paste or type document text here..."
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsIngesting(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={ingesting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {ingesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Chunk & Embed Locally
            </button>
          </div>
        </form>
      )}

      {/* Semantic Search Sandbox */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-emerald-400" /> Semantic Vector Query Sandbox
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Top-K:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask a question grounded in your local documents..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Retrieve Context
          </button>
        </form>

        {/* Search Results Display */}
        {searchResult && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Retrieved {searchResult.matches.length} Top-K Chunks
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {searchResult.citations.length} Citations Formatted
              </span>
            </div>

            {/* Citations badges */}
            <div className="flex flex-wrap gap-1.5">
              {searchResult.citations.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono"
                >
                  {c}
                </span>
              ))}
            </div>

            {/* Chunks */}
            <div className="space-y-2">
              {searchResult.matches.map((m, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 pb-1 border-b border-slate-800">
                    <span className="font-bold text-slate-200">{m.citation}</span>
                    <span className="text-amber-400 font-mono">Similarity: {m.score}</span>
                  </div>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {m.chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document Library Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-400" /> Indexed Local Documents ({documents.length} files • {totalChunks} chunks)
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No local documents ingested yet. Click "Ingest Document" above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getDocTypeIcon(doc.docType)}
                      <span className="text-xs font-bold text-slate-200">{doc.filename}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                      {doc.docType} • {doc.totalPages} p.
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-3 font-mono leading-relaxed">
                    {doc.content}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                    title="Delete document"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
