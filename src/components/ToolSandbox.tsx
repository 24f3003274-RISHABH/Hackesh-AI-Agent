import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Video,
  Mail,
  Play,
  Send,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { EmailRecord, YouTubeSearchResult } from '../types';

export const ToolSandbox: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'calculator' | 'youtube' | 'gmail'>('calculator');

  // Calculator State
  const [calcInput, setCalcInput] = useState('25 * 48');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // YouTube State
  const [ytQuery, setYtQuery] = useState('Kesariya');
  const [ytResult, setYtResult] = useState<YouTubeSearchResult | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  // Gmail State
  const [emailTo, setEmailTo] = useState('colleague@example.com');
  const [emailSubject, setEmailSubject] = useState('Project Update - Hackesh Agent');
  const [emailBody, setEmailBody] = useState('Hi there,\n\nHackesh AI Agent has been successfully configured and is ready to automate your tasks.\n\nBest regards,\nHackesh');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);

  // Fetch sent emails
  const fetchSentEmails = async () => {
    try {
      const res = await fetch('/api/agent/emails');
      const data = await res.json();
      if (data.emails) {
        setSentEmails(data.emails);
      }
    } catch (e) {
      console.error('Error fetching sent emails:', e);
    }
  };

  useEffect(() => {
    fetchSentEmails();
  }, []);

  // Run Calculator
  const handleRunCalculator = async () => {
    if (!calcInput.trim()) return;
    setCalcLoading(true);
    try {
      const res = await fetch('/api/tools/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: calcInput }),
      });
      const data = await res.json();
      setCalcResult(data.result);
    } catch (err: any) {
      setCalcResult(`Error: ${err.message}`);
    } finally {
      setCalcLoading(false);
    }
  };

  // Run YouTube
  const handleRunYouTube = async () => {
    if (!ytQuery.trim()) return;
    setYtLoading(true);
    try {
      const res = await fetch('/api/tools/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ytQuery }),
      });
      const data = await res.json();
      setYtResult(data);
    } catch (err: any) {
      console.error('YouTube error:', err);
    } finally {
      setYtLoading(false);
    }
  };

  // Send Email
  const handleSendEmail = async () => {
    if (!emailTo.trim()) return;
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/tools/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus(`Successfully sent email to ${emailTo}`);
        fetchSentEmails();
      }
    } catch (err: any) {
      setEmailStatus(`Error: ${err.message}`);
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Sandbox Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" /> Hackesh Tool Sandbox
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Directly test, execute, and verify individual tools isolated from agent graph routing.
          </p>
        </div>

        {/* Tool selector tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTool('calculator')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              activeTool === 'calculator'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> Calculator
          </button>
          <button
            onClick={() => setActiveTool('youtube')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              activeTool === 'youtube'
                ? 'bg-red-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" /> YouTube
          </button>
          <button
            onClick={() => setActiveTool('gmail')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              activeTool === 'gmail'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Gmail
          </button>
        </div>
      </div>

      {/* Tool 1: Calculator */}
      {activeTool === 'calculator' && (
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mathematical Expression:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={calcInput}
                onChange={(e) => setCalcInput(e.target.value)}
                placeholder="e.g. 25 * 48 or sqrt(144) + 10"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleRunCalculator}
                disabled={calcLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {calcLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Evaluate
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="text-slate-500 py-1 text-[11px]">Presets:</span>
            {['25 * 48', '(120 / 4) + 15', 'sqrt(256) * 3', '2^8 + 10', 'sin(pi/2) * 50'].map((expr) => (
              <button
                key={expr}
                onClick={() => setCalcInput(expr)}
                className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700"
              >
                {expr}
              </button>
            ))}
          </div>

          {/* Result */}
          {calcResult !== null && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Result:</span>
              <div className="text-xl font-bold font-mono text-emerald-300">{calcResult}</div>
            </div>
          )}
        </div>
      )}

      {/* Tool 2: YouTube */}
      {activeTool === 'youtube' && (
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Search Query:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ytQuery}
                onChange={(e) => setYtQuery(e.target.value)}
                placeholder="e.g. Kesariya, Lofi beats, Python tutorial"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleRunYouTube}
                disabled={ytLoading}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {ytLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Search & Play
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="text-slate-500 py-1 text-[11px]">Presets:</span>
            {['Kesariya', 'lofi hip hop radio', 'Python Tutorial', 'Never Gonna Give You Up'].map((q) => (
              <button
                key={q}
                onClick={() => setYtQuery(q)}
                className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700"
              >
                {q}
              </button>
            ))}
          </div>

          {/* YouTube Video Result */}
          {ytResult && (
            <div className="rounded-xl overflow-hidden bg-slate-950 border border-red-500/40 p-4">
              <div className="aspect-video w-full max-w-xl mx-auto rounded-lg overflow-hidden bg-slate-900 mb-3 shadow-lg">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/${ytResult.videoId}?autoplay=0&rel=0`}
                  title={ytResult.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{ytResult.title}</h4>
                  <p className="text-xs text-red-400">{ytResult.channelTitle}</p>
                </div>
                <a
                  href={ytResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  Open in YouTube <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool 3: Gmail */}
      {activeTool === 'gmail' && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recipient (To):
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Subject Line:
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Body:
            </label>
            <textarea
              rows={4}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Write your email body..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSendEmail}
              disabled={emailLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {emailLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Dispatch Email
            </button>

            {emailStatus && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {emailStatus}
              </span>
            )}
          </div>

          {/* Sent Emails Feed */}
          {sentEmails.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Sent Emails History ({sentEmails.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sentEmails.map((e) => (
                  <div key={e.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex justify-between items-center text-slate-400 mb-1">
                      <span className="font-semibold text-slate-200">{e.to}</span>
                      <span className="text-[10px] text-slate-500">{new Date(e.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-300 font-medium">{e.subject}</div>
                    <div className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{e.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
