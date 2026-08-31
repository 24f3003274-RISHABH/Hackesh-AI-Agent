/**
 * Hackesh Integrated Context Orchestrator (TypeScript / Node.js Engine)
 * Coordinates:
 * 1. History relevance detection
 * 2. Categorized long-term memory retrieval
 * 3. Local RAG document vector search
 * 4. Context scoring, ranking, and budget enforcement
 * 5. Structured source attribution
 * 6. Automatic memory formation heuristics
 */

import { LocalMemoryEngine, MemoryCategory, MemoryRecord, MessageRecord } from './memory/memoryEngine';
import { LocalRAGEngine, RAGSearchResult } from './rag/ragEngine';

export interface RetrievedContextPackage {
  query: string;
  isHistoryRelevant: boolean;
  recentMessages: MessageRecord[];
  memoryItems: MemoryRecord[];
  ragMatches: RAGSearchResult[];
  formattedContextBlock: string;
  citations: string[];
  totalTokensApprox: number;
  newMemoryCandidate: {
    content: string;
    category: MemoryCategory;
    importance: number;
  } | null;
}

export class IntegratedContextOrchestrator {
  private memory: LocalMemoryEngine;
  private rag: LocalRAGEngine;
  private maxContextChars: number;
  private maxMemories: number;
  private maxRagChunks: number;
  private minMemoryImportance: number;
  private minRagSimilarity: number;

  constructor(
    memoryEngine: LocalMemoryEngine,
    ragEngine: LocalRAGEngine,
    options: {
      maxContextChars?: number;
      maxMemories?: number;
      maxRagChunks?: number;
      minMemoryImportance?: number;
      minRagSimilarity?: number;
    } = {}
  ) {
    this.memory = memoryEngine;
    this.rag = ragEngine;
    this.maxContextChars = options.maxContextChars ?? 3500;
    this.maxMemories = options.maxMemories ?? 4;
    this.maxRagChunks = options.maxRagChunks ?? 3;
    this.minMemoryImportance = options.minMemoryImportance ?? 3;
    this.minRagSimilarity = options.minRagSimilarity ?? 0.18;
  }

  /**
   * Evaluates if recent conversation turns are relevant to the active user prompt.
   */
  public isHistoryRelevant(query: string, recentMessages: MessageRecord[]): boolean {
    if (!recentMessages || recentMessages.length === 0) return false;

    const qLower = query.toLowerCase().trim();
    const pronouns = ['it', 'this', 'that', 'they', 'them', 'those', 'these', 'he', 'she', 'his', 'her', 'again', 'previous', 'earlier', 'above'];
    const words = qLower.match(/\b\w+\b/g) || [];

    // Pronoun referential check
    if (words.some((w) => pronouns.includes(w))) {
      return true;
    }

    // Lexical overlap check
    const lastTurn = recentMessages[recentMessages.length - 1];
    const lastWords = new Set((lastTurn.content.toLowerCase().match(/\b\w{3,}\b/g) || []));
    const queryWords = new Set((qLower.match(/\b\w{3,}\b/g) || []));

    let commonCount = 0;
    queryWords.forEach((qw) => {
      if (lastWords.has(qw)) commonCount++;
    });

    if (commonCount > 0) return true;

    return recentMessages.length <= 4;
  }

  /**
   * Executes the 8-step integrated context assembly pipeline.
   */
  public buildContextPackage(query: string, sessionId?: string): RetrievedContextPackage {
    // 1. History relevance
    let recentMessages: MessageRecord[] = [];
    let isHistRel = false;
    if (sessionId) {
      const allRecent = this.memory.getRecentMessages(sessionId, 6);
      isHistRel = this.isHistoryRelevant(query, allRecent);
      if (isHistRel) {
        recentMessages = allRecent.slice(-4);
      }
    }

    // 2. Search Categorized Long-Term Memory
    const cleanQ = query.replace(/[^\w\s]/g, ' ').toLowerCase();
    const qTokens = cleanQ.split(/\s+/).filter((w) => w.length > 2);

    let targetCategory: MemoryCategory | undefined = undefined;
    if (['learn', 'taught', 'professor', 'class', 'study', 'lecture', 'concept', 'notes'].some((k) => cleanQ.includes(k))) {
      targetCategory = 'learning';
    } else if (['prefer', 'like', 'favorite', 'style', 'theme', 'preference'].some((k) => cleanQ.includes(k))) {
      targetCategory = 'preference';
    } else if (['goal', 'plan', 'target', 'roadmap', 'milestone'].some((k) => cleanQ.includes(k))) {
      targetCategory = 'goal';
    } else if (['todo', 'task', 'action', 'remind'].some((k) => cleanQ.includes(k))) {
      targetCategory = 'task';
    }

    let candidateMemories = this.memory.searchMemories(
      undefined,
      targetCategory,
      this.minMemoryImportance
    );

    if (candidateMemories.length < this.maxMemories) {
      const generalMemories = this.memory.searchMemories(
        qTokens.slice(0, 3).join(' '),
        undefined,
        this.minMemoryImportance
      );
      for (const gm of generalMemories) {
        if (!candidateMemories.some((m) => m.id === gm.id)) {
          candidateMemories.push(gm);
        }
      }
    }

    // Rank memories by relevance score + importance
    const scoreMemory = (m: MemoryRecord): number => {
      let score = m.importance * 1.5;
      const mText = m.content.toLowerCase();
      for (const token of qTokens) {
        if (mText.includes(token)) score += 4.0;
      }
      if (targetCategory && m.category === targetCategory) score += 3.0;
      return score;
    };

    candidateMemories.sort((a, b) => scoreMemory(b) - scoreMemory(a));
    const selectedMemories = candidateMemories.slice(0, this.maxMemories);

    // 3. Search Local RAG Documents
    const ragResponse = this.rag.query(query, this.maxRagChunks);
    const selectedRag = ragResponse.matches.filter(
      (m) => m.score >= this.minRagSimilarity
    ).slice(0, this.maxRagChunks);

    // 4 & 5. Build strict context budget and source attributions
    const contextSections: string[] = [];
    const citations: string[] = [];
    let currentChars = 0;

    // Add RAG documents section
    if (selectedRag.length > 0) {
      const ragLines: string[] = ['=== RELEVANT LOCAL DOCUMENTS (RAG) ==='];
      for (const m of selectedRag) {
        const citationLabel = `[${m.chunk.sourceFilename}, p.${m.chunk.pageNumber || 1}, Chunk #${m.chunk.chunkIndex}]`;
        citations.push(citationLabel);
        ragLines.push(`Source ${citationLabel} (Relevance: ${(m.score * 100).toFixed(0)}%):\n${m.chunk.text}\n`);
      }
      const ragBlock = ragLines.join('\n');
      if (currentChars + ragBlock.length <= this.maxContextChars) {
        contextSections.push(ragBlock);
        currentChars += ragBlock.length;
      }
    }

    // Add Long-Term Memories section
    if (selectedMemories.length > 0) {
      const memLines: string[] = ['=== RELEVANT LONG-TERM MEMORIES ==='];
      for (const mem of selectedMemories) {
        const memLabel = `[Memory:${mem.category.toUpperCase()} (Imp:${mem.importance}/10)]`;
        citations.push(memLabel);
        memLines.push(`- ${memLabel}: ${mem.content}`);
      }
      const memBlock = memLines.join('\n');
      if (currentChars + memBlock.length <= this.maxContextChars) {
        contextSections.push(memBlock);
        currentChars += memBlock.length;
      }
    }

    const formattedContextBlock = contextSections.join('\n\n');

    // 8. Automatic long-term memory formation intent heuristic
    const newMemoryCandidate = this.detectNewMemoryIntent(query);

    return {
      query,
      isHistoryRelevant: isHistRel,
      recentMessages,
      memoryItems: selectedMemories,
      ragMatches: selectedRag,
      formattedContextBlock,
      citations,
      totalTokensApprox: Math.ceil(formattedContextBlock.length / 4),
      newMemoryCandidate,
    };
  }

  /**
   * Analyzes if user input contains a durable fact, preference, goal, or learning item.
   */
  public detectNewMemoryIntent(text: string): {
    content: string;
    category: MemoryCategory;
    importance: number;
  } | null {
    const t = text.trim();
    const lower = t.toLowerCase();

    if (lower.startsWith('i prefer ') || lower.startsWith('i like ') || lower.startsWith('my favorite ')) {
      return { content: t, category: 'preference', importance: 8 };
    }

    if (lower.startsWith('my goal is ') || lower.startsWith('i want to achieve ') || lower.startsWith('i am planning to ')) {
      return { content: t, category: 'goal', importance: 9 };
    }

    if (lower.startsWith('remember that ') || lower.startsWith('remember: ') || lower.startsWith('save memory: ')) {
      const cleaned = t.replace(/^(remember that|remember:|save memory:)\s*/i, '').trim();
      return { content: cleaned, category: 'fact', importance: 9 };
    }

    if (lower.startsWith('my professor taught ') || lower.startsWith('in class today ') || lower.startsWith('i learned that ')) {
      return { content: t, category: 'learning', importance: 8 };
    }

    return null;
  }
}
