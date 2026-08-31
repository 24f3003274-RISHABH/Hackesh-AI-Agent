import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw, Terminal, Cpu, Lightbulb } from 'lucide-react';
import { ChatMessage, AgentStatus } from '../types';
import { ChatMessageItem } from './ChatMessageItem';

interface ChatViewProps {
  messages: ChatMessage[];
  status: AgentStatus;
  onSendMessage: (text: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  status,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef不易 = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  const handleSubmit不易 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status.status !== 'idle') return;
    onSendMessage(input);
    setInput('');
  };

  const samplePrompts = [
    'Calculate 25 * 48',
    'Play Kesariya on YouTube',
    'What is Python and why is it popular?',
    'What is the capital of India?',
    'Send an email to team@example.com about Q3 goals',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-h-[820px] bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
              <Terminal className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">
              Welcome to Hackesh AI Agent
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your LangGraph-powered personal assistant capable of math calculation, YouTube media playback, email automation, and general AI reasoning.
            </p>

            <div className="w-full space-y-2 text-left">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 px-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Try asking:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(prompt)}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/40 text-xs text-slate-300 hover:text-white transition-all text-left flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <Sparkles className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => <ChatMessageItem key={msg.id} message={msg} />
        ))}

        {/* Loading Indicator */}
        {status.status !== 'idle' && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 w-fit animate-pulse">
            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            <span>
              {status.status === 'routing' && 'LangGraph evaluating router conditions...'}
              {status.status === 'executing_tool' && `Executing tool: ${status.currentTool}...`}
              {status.status === 'generating' && 'Gemini model synthesizing response...'}
              {status.status === 'error' && 'Failed to execute node'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 md:p-4 bg-slate-950 border-t border-slate-800">
        <form onSubmit={handleSubmit不易} className="flex items-center gap-2">
          <input
            ref={inputRef不易}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status.status !== 'idle'}
            placeholder="Ask Hackesh (e.g. 'Calculate 25 * 48', 'Play Kesariya', 'What is Python?')..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || status.status !== 'idle'}
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 shadow-md"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
