export type RouteType = 'general' | 'calculator' | 'youtube' | 'gmail';

export interface ToolCallTrace {
  toolName: string;
  args: Record<string, any>;
  result: any;
  status: 'success' | 'error';
  executionTimeMs?: number;
}

export interface AgentStepTrace {
  step: 'router' | 'tool_execution' | 'synthesizer';
  title: string;
  description: string;
  timestamp: string;
  data?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  route?: RouteType;
  toolCalls?: ToolCallTrace[];
  traces?: AgentStepTrace[];
  media?: {
    type: 'youtube' | 'calc_result' | 'email_receipt';
    data: any;
  };
}

export interface AgentStatus {
  status: 'idle' | 'routing' | 'executing_tool' | 'generating' | 'error';
  currentTool?: string;
  activeRoute?: RouteType;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
}

export interface EmailRecord {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'queued' | 'mock_sent';
}
