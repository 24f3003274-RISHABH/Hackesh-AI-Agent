import React, { useState } from 'react';
import {
  Bot,
  User,
  Calculator,
  Video,
  Mail,
  Compass,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ChatMessage, RouteType } from '../types';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const [showTraces, setShowTraces] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRouteBadge = (route?: RouteType) => {
    switch (route) {
      case 'calculator':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calculator className="w-3 h-3" /> CALCULATOR TOOL
          </span>
        );
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <Video className="w-3 h-3" /> YOUTUBE TOOL
          </span>
        );
      case 'gmail':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Mail className="w-3 h-3" /> GMAIL TOOL
          </span>
        );
      case 'general':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Compass className="w-3 h-3" /> GENERAL REASONING
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-slate-800 border border-slate-700 text-blue-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Body */}
      <div className={`flex flex-col gap-2 max-w-[88%] md:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            {isUser ? 'You' : 'Hackesh AI'}
          </span>
          <span>{message.timestamp}</span>
          {!isUser && getRouteBadge(message.route)}
        </div>

        {/* Content Container */}
        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm'
              : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm shadow-sm'
          }`}
        >
          {/* Main Text Content */}
          <div className="whitespace-pre-wrap">{message.content}</div>

          {/* Media: Calculator Result Card */}
          {message.media?.type === 'calc_result' && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1.5 pb-1.5 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Calculator className="w-3.5 h-3.5" /> Arithmetic Evaluation
                </span>
                <button
                  onClick={() => copyToClipboard(message.media?.data?.result)}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-slate-400 mb-1">
                <span className="text-slate-500">Expression: </span>
                <span className="text-slate-200 font-medium">{message.media.data.expression}</span>
              </div>
              <div className="text-base text-emerald-300 font-bold flex items-center gap-2">
                <span className="text-slate-500 text-xs">=</span>
                {message.media.data.result}
              </div>
            </div>
          )}

          {/* Media: YouTube Video Card */}
          {message.media?.type === 'youtube' && (
            <div className="mt-3 rounded-xl overflow-hidden bg-slate-950 border border-red-500/30">
              {/* Embedded Player or Video Thumbnail */}
              <div className="aspect-video w-full bg-slate-900 relative">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${message.media.data.videoId}?autoplay=0&rel=0`}
                  title={message.media.data.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-3">
                <h4 className="font-semibold text-slate-100 text-xs line-clamp-1 mb-1">
                  {message.media.data.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-red-400 font-medium">{message.media.data.channelTitle}</span>
                  <a
                    href={message.media.data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline hover:text-blue-300"
                  >
                    Open on YouTube <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Media: Email Receipt Card */}
          {message.media?.type === 'email_receipt' && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2 pb-1.5 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Mail className="w-3.5 h-3.5" /> Dispatched Email
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sent & Recorded
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">To: </span>
                  <span className="text-slate-200">{message.media.data.to}</span>
                </div>
                <div>
                  <span className="text-slate-500">Subject: </span>
                  <span className="text-slate-200">{message.media.data.subject}</span>
                </div>
                {message.media.data.body && (
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 font-sans mt-1">
                    {message.media.data.body}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LangGraph Trace Accordion */}
          {message.traces && message.traces.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setShowTraces(!showTraces)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
              >
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>LangGraph Execution Trace ({message.traces.length} steps)</span>
                {showTraces ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showTraces && (
                <div className="mt-2.5 space-y-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  {message.traces.map((trace, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          {trace.title}
                          <span className="text-[10px] text-slate-500 font-normal">
                            {new Date(trace.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">{trace.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
