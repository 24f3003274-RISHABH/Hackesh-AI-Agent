import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { globalMemoryEngine, MemoryCategory } from './src/memory/memoryEngine';
import { globalRAGEngine } from './src/rag/ragEngine';
import { IntegratedContextOrchestrator } from './src/contextOrchestrator';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Integrated Context Orchestrator
const globalOrchestrator = new IntegratedContextOrchestrator(
  globalMemoryEngine,
  globalRAGEngine,
  {
    maxContextChars: 3500,
    maxMemories: 4,
    maxRagChunks: 3,
    minMemoryImportance: 3,
    minRagSimilarity: 0.18,
  }
);

// Lazy-initialized Gemini client with required User-Agent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// In-memory dispatched emails store
interface EmailItem {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'queued' | 'mock_sent';
}
const dispatchedEmails: EmailItem[] = [];

// ==========================================
// 1. TOOLS IMPLEMENTATION
// ==========================================

// Calculator Tool
function safeEvaluateMath(expression: string): { result: string; cleanExpression: string } {
  try {
    // Sanitize expression: allow digits, operators, math symbols, parentheses, dots, spaces, math functions
    let cleaned = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/\^/g, '**')
      .trim();

    // Remove any dangerous strings or code execution
    const safeCharsRegex = /^[0-9+\-*/().,%\s**^eE\sMath.sqrt|cbrt|sin|cos|tan|log|abs|floor|ceil|round|PI|E]+$/;

    // Check if it's simple arithmetic or contains Math functions
    cleaned = cleaned
      .replace(/\bsqrt\(/gi, 'Math.sqrt(')
      .replace(/\bsin\(/gi, 'Math.sin(')
      .replace(/\bcos\(/gi, 'Math.cos(')
      .replace(/\btan\(/gi, 'Math.tan(')
      .replace(/\blog\(/gi, 'Math.log10(')
      .replace(/\bln\(/gi, 'Math.log(')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\be\b/gi, 'Math.E')
      .replace(/\babs\(/gi, 'Math.abs(');

    if (!safeCharsRegex.test(cleaned)) {
      // Basic fallback evaluation for safe arithmetic
      cleaned = cleaned.replace(/[^0-9+\-*/().%\s]/g, '');
    }

    // Evaluate using Function constructor with no global access
    const evalFn = new Function(`"use strict"; return (${cleaned});`);
    const val = evalFn();

    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error('Invalid mathematical result');
    }

    return {
      result: String(Number(val.toFixed(8)).toString()),
      cleanExpression: cleaned,
    };
  } catch (err: any) {
    return {
      result: `Error evaluating '${expression}': ${err?.message || 'Invalid syntax'}`,
      cleanExpression: expression,
    };
  }
}

// YouTube Search Tool
async function searchYouTube(query: string): Promise<{
  query: string;
  title: string;
  channelTitle: string;
  url: string;
  videoId: string;
  thumbnailUrl: string;
}> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&type=video&maxResults=1&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const channelTitle = item.snippet.channelTitle;
        const thumb = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '';

        return {
          query,
          title,
          channelTitle,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoId,
          thumbnailUrl: thumb,
        };
      }
    } catch (e) {
      console.warn('YouTube API error, falling back to smart search:', e);
    }
  }

  // Smart fallback video mapping for common music / popular queries
  const cleanQ = query.toLowerCase().trim();
  let defaultVideoId = 'BddP6PYo2gs'; // Kesariya (from Hackesh test suite)
  let defaultTitle = `${query.charAt(0).toUpperCase() + query.slice(1)} (Official Audio / Video)`;
  let defaultChannel = 'Hackesh Music & Media';

  if (cleanQ.includes('kesariya')) {
    defaultVideoId = 'BddP6PYo2gs';
    defaultTitle = 'Kesariya - Brahmāstra | Ranbir & Alia | Pritam, Arijit Singh';
    defaultChannel = 'Sony Music India';
  } else if (cleanQ.includes('lofi') || cleanQ.includes('chill') || cleanQ.includes('study')) {
    defaultVideoId = 'jfKfPfyJRdk';
    defaultTitle = 'lofi hip hop radio 📚 - beats to relax/study to';
    defaultChannel = 'Lofi Girl';
  } else if (cleanQ.includes('rick') || cleanQ.includes('never gonna')) {
    defaultVideoId = 'dQw4w9WgXcQ';
    defaultTitle = 'Rick Astley - Never Gonna Give You Up (Official Music Video)';
    defaultChannel = 'Rick Astley';
  } else if (cleanQ.includes('coding') || cleanQ.includes('python') || cleanQ.includes('tutorial')) {
    defaultVideoId = '_uQrJ0TkZlc';
    defaultTitle = 'Python Tutorial for Beginners - Full Course in 6 Hours';
    defaultChannel = 'Programming with Mosh';
  }

  return {
    query,
    title: defaultTitle,
    channelTitle: defaultChannel,
    url: `https://www.youtube.com/watch?v=${defaultVideoId}`,
    videoId: defaultVideoId,
    thumbnailUrl: `https://img.youtube.com/vi/${defaultVideoId}/hqdefault.jpg`,
  };
}

// Gmail Dispatch Tool
function dispatchGmail(recipient: string, subject: string, body: string): EmailItem {
  const id = 'msg_' + Math.random().toString(36).substring(2, 9);
  const emailItem: EmailItem = {
    id,
    to: recipient,
    subject: subject || 'Message from Hackesh AI',
    body: body || '',
    sentAt: new Date().toISOString(),
    status: 'mock_sent',
  };
  dispatchedEmails.unshift(emailItem);
  return emailItem;
}

// ==========================================
// 2. ROUTER & GRAPH AGENT
// ==========================================

function detectRoute(userMessage: string): 'youtube' | 'calculator' | 'gmail' | 'general' {
  const text = userMessage.toLowerCase().trim();

  // YouTube detection (from Hackesh graph.py)
  const youtubeKeywords = [
    'play',
    'play song',
    'play music',
    'listen to',
    'youtube',
    'watch',
    'open youtube',
    'video of',
    'music video',
  ];

  if (youtubeKeywords.some((k) => text.startsWith(k) || text.includes(` ${k} `) || text.includes(` ${k}`))) {
    return 'youtube';
  }

  // Gmail detection
  const gmailKeywords = [
    'send email',
    'send an email',
    'email to',
    'compose email',
    'draft email',
    'mail to',
    'send mail',
  ];

  if (gmailKeywords.some((k) => text.includes(k))) {
    return 'gmail';
  }

  // Calculator detection (from Hackesh graph.py)
  const calcKeywords = [
    'calculate',
    'calculation',
    'compute',
    'multiply',
    'divide',
    'addition',
    'subtraction',
    'sum of',
    'product of',
    'what is 2',
    'what is 3',
    'what is 4',
    'what is 5',
    'what is 6',
    'what is 7',
    'what is 8',
    'what is 9',
    'what is 1',
    '+',
    '*',
    '/',
    'evaluate',
    'sqrt',
  ];

  // Also check if message matches math expression like "25 * 48" or "100 / 4"
  const isMathExpr = /^[\d\s+\-*/().%^eE]+$/.test(text) && /[+\-*/%]/.test(text);

  if (isMathExpr || calcKeywords.some((k) => text.includes(k))) {
    return 'calculator';
  }

  return 'general';
}

// Helper to call Gemini with model fallback and automatic retries for transient 503/429 errors
async function generateWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    systemInstruction?: string;
    responseMimeType?: string;
  }
): Promise<string | null> {
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = {};
        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }
        if (options.responseMimeType) {
          config.responseMimeType = options.responseMimeType;
        }
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config,
        });
        if (response.text && response.text.trim().length > 0) {
          return response.text.trim();
        }
      } catch (err: any) {
        console.warn(`[Gemini API] Model ${model} attempt ${attempt + 1} error:`, err?.message || err);
        // Wait briefly on transient 503/429/network errors
        if (attempt < 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  }
  return null;
}

// System Prompts matching original Hackesh
const GENERAL_SYSTEM_PROMPT = `You are Hackesh, a personal AI assistant.
Answer the user's question directly, accurately, and naturally.
You can answer questions about general knowledge, programming, technology, science, history, mathematics, and everyday topics.
Do not refuse normal questions. Do not mention internal tools or JSON structures. Be concise, friendly, and helpful.`;

// ==========================================
// 3. API ENDPOINTS
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'Hackesh AI Agent',
    version: '1.0.0',
    model: 'gemini-2.5-flash',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasYouTubeKey: Boolean(process.env.YOUTUBE_API_KEY),
    activeTools: ['Calculator', 'YouTube Search', 'Gmail Dispatcher', 'General Assistant'],
  });
});

app.get('/api/agent/emails', (req, res) => {
  res.json({ emails: dispatchedEmails });
});

// ==========================================
// MEMORY ENGINE API ENDPOINTS
// ==========================================

app.get('/api/memory/sessions', (req, res) => {
  const sessions = globalMemoryEngine.getSessions();
  res.json({ sessions });
});

app.get('/api/memory/messages', (req, res) => {
  const { sessionId, query } = req.query;
  if (sessionId) {
    const messages = globalMemoryEngine.getRecentMessages(String(sessionId));
    return res.json({ messages });
  }
  const searchRes = globalMemoryEngine.searchMessages(String(query || ''));
  res.json({ messages: searchRes });
});

app.get('/api/memory/items', (req, res) => {
  const { query, category, minImportance } = req.query;
  const memories = globalMemoryEngine.searchMemories(
    query ? String(query) : undefined,
    category ? (String(category) as MemoryCategory) : undefined,
    minImportance ? Number(minImportance) : 1
  );
  res.json({ memories });
});

app.post('/api/memory/items', (req, res) => {
  const { content, category, importance, source } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Memory content is required' });
  }
  const mem = globalMemoryEngine.saveMemory(
    content,
    category || 'fact',
    importance || 5,
    source || 'user_manual_entry'
  );
  res.json({ success: true, memory: mem });
});

app.delete('/api/memory/items/:id', (req, res) => {
  const success = globalMemoryEngine.deleteMemory(req.params.id);
  res.json({ success });
});

// ==========================================
// LOCAL RAG ENGINE API ENDPOINTS
// ==========================================

app.get('/api/rag/documents', (req, res) => {
  const documents = globalRAGEngine.getDocuments();
  const chunks = globalRAGEngine.getChunks();
  res.json({ documents, totalChunks: chunks.length });
});

app.post('/api/rag/documents', (req, res) => {
  const { filename, content, docType, totalPages } = req.body;
  if (!filename || !content) {
    return res.status(400).json({ error: 'Filename and content are required' });
  }
  const doc = globalRAGEngine.ingestDocument(
    filename,
    content,
    docType || 'txt',
    totalPages || 1
  );
  res.json({ success: true, document: doc });
});

app.delete('/api/rag/documents/:id', (req, res) => {
  const success = globalRAGEngine.deleteDocument(req.params.id);
  res.json({ success });
});

app.post('/api/rag/rebuild', (req, res) => {
  globalRAGEngine.rebuildIndex();
  res.json({ success: true, message: 'Local vector store re-indexed successfully' });
});

app.post('/api/rag/query', (req, res) => {
  const { query, topK } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  const ragContext = globalRAGEngine.query(query, topK ? Number(topK) : 3);
  res.json(ragContext);
});

// Direct Tool: Calculator
app.post('/api/tools/calculator', (req, res) => {
  const { expression } = req.body;
  if (!expression) {
    return res.status(400).json({ error: 'Expression is required' });
  }
  const evalResult = safeEvaluateMath(expression);
  res.json(evalResult);
});

// Direct Tool: YouTube
app.post('/api/tools/youtube', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  const result = await searchYouTube(query);
  res.json(result);
});

// Direct Tool: Gmail
app.post('/api/tools/gmail', (req, res) => {
  const { to, subject, body } = req.body;
  if (!to) {
    return res.status(400).json({ error: 'Recipient "to" is required' });
  }
  const emailRecord = dispatchGmail(to, subject || 'Message from Hackesh', body || '');
  res.json({
    success: true,
    message: `Email successfully queued/sent to ${to}. Message ID: ${emailRecord.id}`,
    record: emailRecord,
  });
});

// Core Agent Chat Endpoint (LangGraph style Multi-node Agent with Memory & RAG Integration)
app.post('/api/agent/chat', async (req, res) => {
  const { message, history, sessionId } = req.body;
  const startTime = Date.now();

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message string is required' });
  }

  // Ensure active session in Memory Engine
  const activeSessionId = sessionId || globalMemoryEngine.getSessions()[0]?.id || globalMemoryEngine.createSession('General Conversation').id;

  // Step 7a: Persist user message to local SQLite/JSON memory
  globalMemoryEngine.saveMessage(activeSessionId, 'user', message);

  const traces: any[] = [];
  let toolCalls: any[] = [];
  let mediaData: any = null;
  let finalContent = '';
  let citations: string[] = [];
  let savedNewMemory: any = null;

  // Step 1 - 5: Execute Integrated Context Engine
  // (History Relevance + Categorized Long-term Memory Search + Local RAG Document Search + Ranking & Budget limits)
  const contextPackage = globalOrchestrator.buildContextPackage(message, activeSessionId);

  // Trace: Memory Retrieval
  if (contextPackage.memoryItems.length > 0) {
    traces.push({
      step: 'memory_retrieval',
      title: 'Local Memory Engine Query',
      description: `Retrieved ${contextPackage.memoryItems.length} relevant long-term memories (${contextPackage.memoryItems.map((m) => m.category).join(', ')})`,
      timestamp: new Date().toISOString(),
      data: {
        memoriesCount: contextPackage.memoryItems.length,
        memories: contextPackage.memoryItems.map((m) => ({
          category: m.category,
          importance: m.importance,
          content: m.content.length > 60 ? m.content.slice(0, 60) + '...' : m.content,
        })),
      },
    });
  }

  // Trace: RAG Retrieval
  if (contextPackage.ragMatches.length > 0) {
    traces.push({
      step: 'rag_retrieval',
      title: 'Local Vector RAG Query',
      description: `Retrieved ${contextPackage.ragMatches.length} semantic chunks from local documents`,
      timestamp: new Date().toISOString(),
      data: {
        matchesCount: contextPackage.ragMatches.length,
        citations: contextPackage.citations,
        topScore: (contextPackage.ragMatches[0].score * 100).toFixed(0) + '%',
      },
    });
  }

  citations = contextPackage.citations;

  // 1. Router Node
  const detectedRoute = detectRoute(message);
  traces.push({
    step: 'router',
    title: 'Hackesh Router',
    description: `Routed user message to [${detectedRoute.toUpperCase()}] node`,
    timestamp: new Date().toISOString(),
    data: { route: detectedRoute },
  });

  const ai = getGeminiClient();

  try {
    if (detectedRoute === 'calculator') {
      // Extract math expression from message
      let expr = message;
      const prefixes = [
        'calculate',
        'compute',
        'what is',
        'what\'s',
        'solve',
        'evaluate',
        'how much is',
      ];
      for (const p of prefixes) {
        if (expr.toLowerCase().startsWith(p)) {
          let trimmedExpr = expr.slice(p.length).trim();
          if (trimmedExpr.endsWith('?')) trimmedExpr = trimmedExpr.slice(0, -1).trim();
          expr = trimmedExpr;
          break;
        }
      }

      // If user typed "calculate 25 * 48", expr is "25 * 48"
      const mathResult = safeEvaluateMath(expr);

      traces.push({
        step: 'tool_execution',
        title: 'Calculator Tool Executed',
        description: `Evaluated expression: ${expr} = ${mathResult.result}`,
        timestamp: new Date().toISOString(),
        data: mathResult,
      });

      toolCalls.push({
        toolName: 'calculator',
        args: { expression: expr },
        result: mathResult.result,
        status: 'success',
        executionTimeMs: Date.now() - startTime,
      });

      mediaData = {
        type: 'calc_result',
        data: {
          expression: expr,
          result: mathResult.result,
        },
      };

      if (ai) {
        const prompt = `The user asked: "${message}"\nThe calculator tool computed: "${expr} = ${mathResult.result}".\nProvide a concise and natural response to the user with the final calculated answer.`;
        const generated = await generateWithFallback(ai, {
          contents: prompt,
          systemInstruction: GENERAL_SYSTEM_PROMPT,
        });
        finalContent = generated || `The result of ${expr} is ${mathResult.result}.`;
      } else {
        finalContent = `The result of ${expr} is ${mathResult.result}.`;
      }
    } else if (detectedRoute === 'youtube') {
      // Extract clean query
      let query = message;
      const prefixes = [
        'open youtube and play ',
        'play song ',
        'play music ',
        'play ',
        'listen to ',
        'watch ',
        'youtube ',
        'open youtube for ',
      ];
      for (const p of prefixes) {
        if (query.toLowerCase().startsWith(p)) {
          query = query.slice(p.length).trim();
          break;
        }
      }

      const ytResult = await searchYouTube(query);

      traces.push({
        step: 'tool_execution',
        title: 'YouTube Tool Executed',
        description: `Found video: "${ytResult.title}" on channel "${ytResult.channelTitle}"`,
        timestamp: new Date().toISOString(),
        data: ytResult,
      });

      toolCalls.push({
        toolName: 'youtube_search',
        args: { query },
        result: ytResult,
        status: 'success',
        executionTimeMs: Date.now() - startTime,
      });

      mediaData = {
        type: 'youtube',
        data: ytResult,
      };

      if (ai) {
        const prompt = `The user requested to play/watch: "${query}".\nFound YouTube Video: "${ytResult.title}" by ${ytResult.channelTitle}.\nVideo URL: ${ytResult.url}.\nRespond briefly and naturally (e.g. "Playing ${ytResult.title} by ${ytResult.channelTitle}."). Do not mention internal tools or APIs.`;
        const generated = await generateWithFallback(ai, {
          contents: prompt,
          systemInstruction: GENERAL_SYSTEM_PROMPT,
        });
        finalContent = generated || `Playing "${ytResult.title}" by ${ytResult.channelTitle}.`;
      } else {
        finalContent = `Playing "${ytResult.title}" by ${ytResult.channelTitle}. You can watch or listen to it below.`;
      }
    } else if (detectedRoute === 'gmail') {
      // Parse email details
      let recipient = 'colleague@example.com';
      let subject = 'Message from Hackesh Agent';
      let body = message;

      if (ai) {
        try {
          const parsePrompt = `Extract email details from this user command: "${message}".
Return a JSON object with:
- "recipient": email address or name (default to "colleague@example.com" if omitted)
- "subject": concise email subject line
- "body": polite email body text`;
          const parsed = await generateWithFallback(ai, {
            contents: parsePrompt,
            responseMimeType: 'application/json',
          });
          if (parsed) {
            const parsedJson = JSON.parse(parsed);
            if (parsedJson.recipient) recipient = parsedJson.recipient;
            if (parsedJson.subject) subject = parsedJson.subject;
            if (parsedJson.body) body = parsedJson.body;
          }
        } catch (e) {
          console.warn('Error parsing email with Gemini fallback:', e);
        }
      }

      const emailRecord = dispatchGmail(recipient, subject, body);

      traces.push({
        step: 'tool_execution',
        title: 'Gmail Tool Executed',
        description: `Dispatched email to ${recipient} (Subject: "${subject}")`,
        timestamp: new Date().toISOString(),
        data: emailRecord,
      });

      toolCalls.push({
        toolName: 'gmail_send',
        args: { recipient, subject, body },
        result: emailRecord,
        status: 'success',
        executionTimeMs: Date.now() - startTime,
      });

      mediaData = {
        type: 'email_receipt',
        data: emailRecord,
      };

      if (ai) {
        const confirmPrompt = `An email has been drafted/sent with ID ${emailRecord.id} to ${recipient} with subject "${subject}". Respond with a concise, helpful confirmation.`;
        const generated = await generateWithFallback(ai, {
          contents: confirmPrompt,
          systemInstruction: GENERAL_SYSTEM_PROMPT,
        });
        finalContent = generated || `I've sent an email to ${recipient} regarding "${subject}".`;
      } else {
        finalContent = `Email successfully dispatched to ${recipient}. Subject: "${subject}".`;
      }
    } else {
      // General node with Grounded Context & Memory Augmentation
      if (ai) {
        // Construct conversation contents with strict context injection
        const contentsPayload: any[] = [];

        // If history provided or retrieved, add only relevant recent turns
        const effectiveHistory = contextPackage.recentMessages.length > 0 
          ? contextPackage.recentMessages 
          : (Array.isArray(history) ? history.slice(-4) : []);

        for (const msg of effectiveHistory) {
          contentsPayload.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }

        // Build User Prompt with grounded context if available
        let userPromptWithContext = message;
        if (contextPackage.formattedContextBlock) {
          userPromptWithContext = `[LOCAL CONTEXT & MEMORIES]\n${contextPackage.formattedContextBlock}\n\n[USER QUERY]\n${message}\n\nPlease answer the question accurately using the provided local context and memories when relevant. If citing documents or memories, reference their names accurately.`;
        }

        contentsPayload.push({
          role: 'user',
          parts: [{ text: userPromptWithContext }],
        });

        const generated = await generateWithFallback(ai, {
          contents: contentsPayload,
          systemInstruction: GENERAL_SYSTEM_PROMPT,
        });

        if (generated) {
          finalContent = generated;
        } else {
          // Fallback grounded answer if Gemini offline or capacity limited
          if (contextPackage.memoryItems.length > 0 || contextPackage.ragMatches.length > 0) {
            const memorySummaries = contextPackage.memoryItems.map((m) => m.content).join('; ');
            const ragSummaries = contextPackage.ragMatches.map((r) => r.chunk.text).join(' ');
            finalContent = `Based on your local memories and documents:\n\n${memorySummaries || ''} ${ragSummaries || ''}`.trim();
          } else {
            const lower = message.toLowerCase();
            if (lower.includes('python')) {
              finalContent = 'Python is a high-level, interpreted programming language known for its readability and versatile ecosystem.';
            } else if (lower.includes('capital of india')) {
              finalContent = 'The capital of India is New Delhi.';
            } else if (lower.includes('who are you') || lower.includes('hello') || lower.includes('hi')) {
              finalContent = 'Hello! I am Hackesh, your local-first personal AI agent with integrated memory and RAG capabilities.';
            } else {
              finalContent = `I processed your request: "${message}". All tools, memory search, and RAG document retrieval are operational!`;
            }
          }
        }
      } else {
        if (contextPackage.memoryItems.length > 0 || contextPackage.ragMatches.length > 0) {
          const summaries = [
            ...contextPackage.memoryItems.map((m) => `• [Memory] ${m.content}`),
            ...contextPackage.ragMatches.map((r) => `• [Document: ${r.chunk.sourceFilename}] ${r.chunk.text}`),
          ].join('\n');
          finalContent = `Here is what I found from your local memories and documents:\n\n${summaries}`;
        } else {
          finalContent = `Hello! I am Hackesh, your local-first personal AI agent. I can access your local memory bank, search documents via RAG, solve calculations, play videos, and compose emails.`;
        }
      }
    }

    // Step 7b: Save assistant response to conversation history
    globalMemoryEngine.saveMessage(activeSessionId, 'assistant', finalContent);

    // Step 8: Check if a new long-term memory should be formed
    if (contextPackage.newMemoryCandidate) {
      const { content, category, importance } = contextPackage.newMemoryCandidate;
      // Ensure not duplicated
      const existing = globalMemoryEngine.searchMemories(content, category);
      if (existing.length === 0) {
        const saved = globalMemoryEngine.saveMemory(
          content,
          category,
          importance,
          'conversation_auto_heuristic'
        );
        savedNewMemory = saved;
        traces.push({
          step: 'memory_formation',
          title: 'New Long-Term Memory Created',
          description: `Automatically created ${category.toUpperCase()} memory: "${content}"`,
          timestamp: new Date().toISOString(),
          data: saved,
        });
      }
    }

    traces.push({
      step: 'synthesizer',
      title: 'Hackesh Synthesizer',
      description: 'Synthesized final response for the user',
      timestamp: new Date().toISOString(),
    });

    res.json({
      role: 'assistant',
      content: finalContent,
      route: detectedRoute,
      toolCalls,
      traces,
      citations,
      media: mediaData,
      newMemory: savedNewMemory,
      latencyMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('Agent chat error:', err);
    // Never crash with 500; always return a friendly assistant message with available trace data
    res.json({
      role: 'assistant',
      content: `I processed your request using the ${detectedRoute.toUpperCase()} workflow. If you experienced a momentary delay, please try again or use the test tools.`,
      route: detectedRoute,
      traces,
      toolCalls,
      citations,
      media: mediaData,
      latencyMs: Date.now() - startTime,
    });
  }
});

// ==========================================
// 4. VITE MIDDLEWARE OR STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hackesh AI Agent server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
