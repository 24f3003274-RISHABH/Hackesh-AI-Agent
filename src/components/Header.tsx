import React from 'react';
import { Bot, Sparkles, Cpu, Play, RotateCcw, Activity, Brain, Layers } from 'lucide-react';
import { AgentStatus, RouteType } from '../types';

interface HeaderProps {
  status: AgentStatus;
  onClearChat: () => void;
  onRunTest: (query: string) => void;
  activeTab: 'chat' | 'sandbox' | 'graph' | 'memory' | 'rag';
  setActiveTab: (tab: 'chat' | 'sandbox' | 'graph' | 'memory' | 'rag') => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onClearChat,
  onRunTest,
  activeTab,
  setActiveTab,
}) => {
  const testQueries = [
    { label: '🔢 25 * 48', query: 'Calculate 25 * 48' },
    { label: '🎵 Play Kesariya', query: 'Play Kesariya' },
    { label: '☀️ Weather Tokyo', query: 'What is the weather in Tokyo?' },
    { label: '📰 Tech News', query: 'Show me the latest tech news' },
    { label: '🧠 Query RAG', query: 'How does Hackesh store memories?' },
    { label: '✉️ Send Email', query: 'Send an email to john@example.com about Project Milestone' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Logo and Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-2">
                HACKESH <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">Personal AI Agent</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  status.status === 'idle'
                    ? 'bg-emerald-400 animate-pulse'
                    : status.status === 'error'
                    ? 'bg-rose-400'
                    : 'bg-amber-400 animate-ping'
                }`} />
                {status.status === 'idle' && 'Agent Ready (LangGraph Engine)'}
                {status.status === 'routing' && 'Router Node Evaluating...'}
                {status.status === 'executing_tool' && `Executing ${status.currentTool}...`}
                {status.status === 'generating' && 'Synthesizing Response...'}
                {status.status === 'error' && 'Execution Error'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Gemini 2.5 Flash
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              id="tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chat & Execution
            </button>
            <button
              id="tab-graph"
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'graph'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Graph Workflow
            </button>
            <button
              id="tab-sandbox"
              onClick={() => setActiveTab('sandbox')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'sandbox'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> Tool Sandbox
            </button>
            <button
              id="tab-memory"
              onClick={() => setActiveTab('memory')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'memory'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5" /> Memory
            </button>
            <button
              id="tab-rag"
              onClick={() => setActiveTab('rag')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'rag'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Local RAG
            </button>
          </div>

          {/* Quick Clear */}
          <button
            id="clear-chat-btn"
            onClick={onClearChat}
            title="Reset conversation"
            className="p-2 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Quick Prompts Bar */}
      <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs py-1">
        <span className="text-slate-500 whitespace-nowrap flex items-center gap-1 font-medium">
          <Play className="w-3 h-3 text-blue-400" /> Test Suite:
        </span>
        {testQueries.map((t, idx) => (
          <button
            key={idx}
            onClick={() => onRunTest(t.query)}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white whitespace-nowrap transition-all"
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
};
