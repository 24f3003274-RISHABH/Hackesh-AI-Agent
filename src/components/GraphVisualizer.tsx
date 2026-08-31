import React from 'react';
import { RouteType } from '../types';
import { ArrowRight, Bot, Calculator, Video, Mail, Compass, Cpu, CheckCircle } from 'lucide-react';

interface GraphVisualizerProps {
  activeRoute?: RouteType;
  isProcessing?: boolean;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  activeRoute,
  isProcessing,
}) => {
  const routes = [
    {
      id: 'calculator',
      name: 'Calculator Node',
      icon: Calculator,
      desc: 'Evaluates arithmetic expressions & mathematical logic',
      color: 'emerald',
      activeBorder: 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-emerald-950/50',
      tag: 'tools.calculator',
    },
    {
      id: 'youtube',
      name: 'YouTube Node',
      icon: Video,
      desc: 'Searches & plays music, videos & tutorials',
      color: 'red',
      activeBorder: 'border-red-500 bg-red-950/40 text-red-300 shadow-red-950/50',
      tag: 'tools.youtube',
    },
    {
      id: 'gmail',
      name: 'Gmail Node',
      icon: Mail,
      desc: 'Composes, formats & dispatches email messages',
      color: 'amber',
      activeBorder: 'border-amber-500 bg-amber-950/40 text-amber-300 shadow-amber-950/50',
      tag: 'tools.gmail',
    },
    {
      id: 'general',
      name: 'General LLM Node',
      icon: Compass,
      desc: 'Answers coding, knowledge, and conversation queries',
      color: 'blue',
      activeBorder: 'border-blue-500 bg-blue-950/40 text-blue-300 shadow-blue-950/50',
      tag: 'agent.general',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" /> Hackesh LangGraph Workflow
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time visual state machine representing agent decision routing and tool execution.
          </p>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          {isProcessing ? 'Graph Active' : 'Graph Idle'}
        </div>
      </div>

      {/* Interactive Node Flowchart */}
      <div className="mt-6 flex flex-col items-center gap-6">
        {/* Node 1: START */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold tracking-wide">
            START (User Message)
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />

        {/* Node 2: Router Node */}
        <div
          className={`px-5 py-3 rounded-xl border text-center transition-all ${
            isProcessing
              ? 'border-blue-500 bg-blue-950/40 text-blue-200 shadow-lg shadow-blue-950/50'
              : 'border-slate-700 bg-slate-800/80 text-slate-300'
          }`}
        >
          <div className="text-xs font-bold flex items-center justify-center gap-2 text-slate-200">
            <Bot className="w-4 h-4 text-blue-400" /> router_node(state)
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            decide_route() → conditional_edge
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />

        {/* Node 3: Specialized Branches */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {routes.map((r) => {
            const Icon = r.icon;
            const isSelected = activeRoute === r.id;

            return (
              <div
                key={r.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? r.activeBorder
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                    <Icon className="w-4 h-4" /> {r.name}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                  {r.desc}
                </p>
                <div className="text-[10px] font-mono text-slate-500 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 inline-block">
                  {r.tag}
                </div>
              </div>
            );
          })}
        </div>

        <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />

        {/* Node 4: Synthesizer & END */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" /> Synthesizer & Natural Language Output
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold">
            END
          </div>
        </div>
      </div>
    </div>
  );
};
