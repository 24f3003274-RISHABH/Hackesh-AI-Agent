/**
 * Hackesh Local-First Memory Engine (Full-Stack TypeScript / Node.js Implementation)
 * Provides persistent local JSON/SQLite storage for sessions, messages, and long-term categorized memories.
 */

import fs from 'fs';
import path from 'path';

export type MemoryCategory = 'fact' | 'preference' | 'event' | 'goal' | 'task' | 'learning';
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface SessionRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface MemoryRecord {
  id: string;
  content: string;
  category: MemoryCategory;
  importance: number; // 1 to 10
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface MemoryStoreData {
  sessions: SessionRecord[];
  messages: MessageRecord[];
  memories: MemoryRecord[];
}

export class LocalMemoryEngine {
  private filePath: string;
  private data: MemoryStoreData;

  constructor(storagePath: string = 'data/hackesh_memory.json') {
    this.filePath = path.resolve(process.cwd(), storagePath);
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.data = {
      sessions: [],
      messages: [],
      memories: [],
    };
    this.load();
    this.seedDefaultsIfEmpty();
  }

  private load(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.warn('[MemoryEngine] Error reading store, starting fresh:', e);
      }
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[MemoryEngine] Error saving store:', e);
    }
  }

  private seedDefaultsIfEmpty(): void {
    if (this.data.memories.length === 0) {
      this.saveMemory(
        'User is building Hackesh: A local-first personal AI assistant',
        'fact',
        10,
        'system_init'
      );
      this.saveMemory(
        'Prefers dark mode, high-contrast layouts, and transparent execution traces',
        'preference',
        9,
        'system_init'
      );
      this.saveMemory(
        'Complete Hackesh V3 Local Memory & LangGraph state visibility',
        'goal',
        10,
        'system_init'
      );
      this.saveMemory(
        'Local-first privacy: Never transmit raw private user data to third parties by default',
        'learning',
        9,
        'system_init'
      );
    }
  }

  // =========================================================================
  // Sessions & Messages
  // =========================================================================

  public createSession(title: string = 'New Conversation', id?: string): SessionRecord {
    const sessionId = id || 'sess_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const session: SessionRecord = {
      id: sessionId,
      title,
      createdAt: now,
      updatedAt: now,
    };
    this.data.sessions.unshift(session);
    this.save();
    return session;
  }

  public getSessions(limit: number = 50): SessionRecord[] {
    return this.data.sessions.slice(0, limit);
  }

  public saveMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, any>,
    id?: string
  ): MessageRecord {
    // Ensure session exists
    let session = this.data.sessions.find((s) => s.id === sessionId);
    const now = new Date().toISOString();
    if (!session) {
      session = this.createSession(content.slice(0, 30) + '...', sessionId);
    } else {
      session.updatedAt = now;
    }

    const message: MessageRecord = {
      id: id || 'msg_' + Math.random().toString(36).substring(2, 9),
      sessionId,
      role,
      content,
      createdAt: now,
      metadata,
    };

    this.data.messages.push(message);
    this.save();
    return message;
  }

  public getRecentMessages(sessionId: string, limit: number = 20): MessageRecord[] {
    const filtered = this.data.messages.filter((m) => m.sessionId === sessionId);
    return filtered.slice(-limit);
  }

  public searchMessages(query: string, limit: number = 30): MessageRecord[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.data.messages.slice(-limit);
    return this.data.messages
      .filter((m) => m.content.toLowerCase().includes(q))
      .slice(-limit);
  }

  // =========================================================================
  // Long-Term Memories
  // =========================================================================

  public saveMemory(
    content: string,
    category: MemoryCategory = 'fact',
    importance: number = 5,
    source: string = 'user_interaction',
    id?: string
  ): MemoryRecord {
    const now = new Date().toISOString();
    const memId = id || 'mem_' + Math.random().toString(36).substring(2, 9);
    
    const existingIndex = this.data.memories.findIndex((m) => m.id === memId);
    const memoryRecord: MemoryRecord = {
      id: memId,
      content,
      category,
      importance: Math.max(1, Math.min(10, importance)),
      source,
      createdAt: existingIndex >= 0 ? this.data.memories[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      this.data.memories[existingIndex] = memoryRecord;
    } else {
      this.data.memories.unshift(memoryRecord);
    }

    this.save();
    return memoryRecord;
  }

  public searchMemories(
    query?: string,
    category?: MemoryCategory,
    minImportance: number = 1,
    limit: number = 50
  ): MemoryRecord[] {
    let list = this.data.memories.filter((m) => m.importance >= minImportance);

    if (category) {
      list = list.filter((m) => m.category === category);
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((m) => m.content.toLowerCase().includes(q) || m.source.toLowerCase().includes(q));
    }

    list.sort((a, b) => b.importance - a.importance || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list.slice(0, limit);
  }

  public deleteMemory(id: string): boolean {
    const initLen = this.data.memories.length;
    this.data.memories = this.data.memories.filter((m) => m.id !== id);
    if (this.data.memories.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }
}

// Global Singleton for API Routes
export const globalMemoryEngine = new LocalMemoryEngine();
