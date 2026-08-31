import React, { useState } from 'react';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { GraphVisualizer } from './components/GraphVisualizer';
import { ToolSandbox } from './components/ToolSandbox';
import { ChatMessage, AgentStatus, RouteType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'sandbox' | 'graph'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ status: 'idle' });
  const [activeRoute, setActiveRoute] = useState<RouteType | undefined>(undefined);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setAgentStatus({ status: 'routing' });

    try {
      // Small simulated delay for visual graph feedback
      await new Promise((r) => setTimeout(r, 200));

      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setActiveRoute(data.route);
      setAgentStatus({
        status: data.toolCalls && data.toolCalls.length > 0 ? 'executing_tool' : 'generating',
        currentTool: data.toolCalls?.[0]?.toolName,
        activeRoute: data.route,
      });

      const assistantMessage: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        route: data.route,
        toolCalls: data.toolCalls,
        traces: data.traces,
        media: data.media,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Agent chat error:', err);
      const errorMessage: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        content: `Sorry, I encountered an issue processing your request: ${err.message || 'Server error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        route: 'general',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setAgentStatus({ status: 'idle' });
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setAgentStatus({ status: 'idle' });
    setActiveRoute(undefined);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* App Header */}
      <Header
        status={agentStatus}
        onClearChat={handleClearChat}
        onRunTest={handleSendMessage}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Chat Interface */}
            <div className="lg:col-span-8">
              <ChatView
                messages={messages}
                status={agentStatus}
                onSendMessage={handleSendMessage}
              />
            </div>

            {/* Side Overview / Quick Graph & Capabilities */}
            <div className="lg:col-span-4 space-y-4">
              <GraphVisualizer
                activeRoute={activeRoute || agentStatus.activeRoute}
                isProcessing={agentStatus.status !== 'idle'}
              />

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2.5">
                <div className="font-bold text-slate-200">Hackesh Tool Ecosystem</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-emerald-500/20">
                    <span className="font-semibold text-emerald-400 block">Calculator</span>
                    <span className="text-[11px] text-slate-400">Arithmetic & safe expression evaluation</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-red-500/20">
                    <span className="font-semibold text-red-400 block">YouTube</span>
                    <span className="text-[11px] text-slate-400">Song & video search with interactive player</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-amber-500/20">
                    <span className="font-semibold text-amber-400 block">Gmail</span>
                    <span className="text-[11px] text-slate-400">Email dispatch & status tracking</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-blue-500/20">
                    <span className="font-semibold text-blue-400 block">Gemini 2.5</span>
                    <span className="text-[11px] text-slate-400">General intelligence & natural synthesis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="max-w-4xl mx-auto">
            <GraphVisualizer
              activeRoute={activeRoute || agentStatus.activeRoute}
              isProcessing={agentStatus.status !== 'idle'}
            />
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div className="max-w-4xl mx-auto">
            <ToolSandbox />
          </div>
        )}
      </main>
    </div>
  );
}
