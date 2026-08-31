import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Bookmark,
  Sparkles,
  RefreshCw,
  Clock,
  Star,
  MessageSquare,
} from 'lucide-react';
import { MemoryCategory } from '../memory/memoryEngine';

interface MemoryItem {
  id: string;
  content: string;
  category: MemoryCategory;
  importance: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageItem {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

export const MemoryExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'memories' | 'conversations'>('memories');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minImportance, setMinImportance] = useState<number>(1);

  // New Memory Form
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('fact');
  const [newImportance, setNewImportance] = useState(7);
  const [isAdding, setIsAdding] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : '';
      const queryParam = searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/memory/items?minImportance=${minImportance}${categoryParam}${queryParam}`);
      const data = await res.json();
      if (data.memories) {
        setMemories(data.memories);
      }
    } catch (e) {
      console.error('Error fetching memories:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const queryParam = searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/memory/messages${queryParam}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'memories') {
      fetchMemories();
    } else {
      fetchMessages();
    }
  }, [activeTab, selectedCategory, minImportance]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'memories') {
      fetchMemories();
    } else {
      fetchMessages();
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const res = await fetch('/api/memory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent,
          category: newCategory,
          importance: newImportance,
          source: 'user_manual_entry',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewContent('');
        setIsAdding(false);
        fetchMemories();
      }
    } catch (e) {
      console.error('Error saving memory:', e);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memory/items/${id}`, { method: 'DELETE' });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error('Error deleting memory:', e);
    }
  };

  const categories: { label: string; value: string }[] = [
    { label: 'All Categories', value: 'all' },
    { label: 'Fact', value: 'fact' },
    { label: 'Preference', value: 'preference' },
    { label: 'Event', value: 'event' },
    { label: 'Goal', value: 'goal' },
    { label: 'Task', value: 'task' },
    { label: 'Learning', value: 'learning' },
  ];

  const getCategoryBadge = (cat: string) => {
    const map: Record<string, string> = {
      fact: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      preference: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      event: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      goal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      task: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      learning: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return map[cat] || 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" /> Hackesh Local Memory Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Local-first SQLite storage for conversation sessions and categorized long-term memories.
          </p>
        </div>

        {/* View switch */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('memories')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'memories' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Long-Term Memories ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'conversations' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> History & Logs
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories or conversation history..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Search
          </button>
        </form>

        {activeTab === 'memories' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Memory
            </button>
          </div>
        )}
      </div>

      {/* Add Memory Modal / Form */}
      {isAdding && (
        <form onSubmit={handleAddMemory} className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 space-y-3">
          <div className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" /> New Long-Term Memory Entry
          </div>
          <div>
            <textarea
              rows={2}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="e.g. User is developing an offline AI coding assistant with LangGraph..."
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Category:</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
              >
                <option value="fact">Fact</option>
                <option value="preference">Preference</option>
                <option value="event">Event</option>
                <option value="goal">Goal</option>
                <option value="task">Task</option>
                <option value="learning">Learning</option>
              </select>

              <label className="text-xs text-slate-400 ml-2">Importance (1-10):</label>
              <input
                type="number"
                min={1}
                max={10}
                value={newImportance}
                onChange={(e) => setNewImportance(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Save to SQLite
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Content Feed */}
      <div className="mt-2">
        {loading ? (
          <div className="py-12 flex items-center justify-center text-slate-500 gap-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> Loading local database...
          </div>
        ) : activeTab === 'memories' ? (
          memories.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No memories found matching the current query or filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getCategoryBadge(
                          mem.category
                        )}`}
                      >
                        {mem.category}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold font-mono">
                        <Star className="w-3 h-3 fill-amber-400" /> {mem.importance}/10
                      </div>
                    </div>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">{mem.content}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Source: {mem.source}</span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(mem.updatedAt).toLocaleTimeString()}</span>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No conversation logs found.
          </div>
        ) : (
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div key={m.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1 text-[11px]">
                  <span
                    className={`font-semibold uppercase ${
                      m.role === 'user' ? 'text-blue-400' : 'text-emerald-400'
                    }`}
                  >
                    {m.role}
                  </span>
                  <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
