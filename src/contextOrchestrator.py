"""
Hackesh Integrated Context Engine
Orchestrates:
1. Conversation relevance detection
2. Categorized long-term memory retrieval
3. Local RAG document vector retrieval
4. Context scoring & deduplication
5. Budget & token limit enforcement
6. Source attribution builder
7. Automatic memory formation heuristics
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from memory.engine import MemoryEngine
from memory.models import MemoryCategory, MessageRole, MemoryRecord, ConversationMessage
from rag.engine import RAGEngine
from rag.models import RAGContext, SearchResult


@dataclass
class RetrievedContextPackage:
    query: str
    recent_messages: List[ConversationMessage] = field(default_factory=list)
    memory_items: List[MemoryRecord] = field(default_factory=list)
    rag_matches: List[SearchResult] = field(default_factory=list)
    formatted_context_block: str = ""
    citations: List[str] = field(default_factory=list)
    total_tokens_approx: int = 0
    new_memory_candidate: Optional[Tuple[str, MemoryCategory, int]] = None


class ContextOrchestrator:
    def __init__(
        self,
        memory_engine: MemoryEngine,
        rag_engine: RAGEngine,
        max_context_chars: int = 4000,
        max_memories: int = 4,
        max_rag_chunks: int = 3,
        min_memory_importance: int = 3,
        min_rag_similarity: float = 0.15,
    ):
        self.memory = memory_engine
        self.rag = rag_engine
        self.max_context_chars = max_context_chars
        self.max_memories = max_memories
        self.max_rag_chunks = max_rag_chunks
        self.min_memory_importance = min_memory_importance
        self.min_rag_similarity = min_rag_similarity

    def is_history_relevant(self, query: str, recent_messages: List[ConversationMessage]) -> bool:
        """Determines if the recent conversation context is semantically relevant."""
        if not recent_messages:
            return False

        q_lower = query.lower().strip()
        pronouns = ["it", "this", "that", "they", "them", "those", "these", "he", "she", "his", "her", "again", "previous", "earlier", "above"]
        words = re.findall(r"\b\w+\b", q_lower)

        # If query has referential pronouns, history is highly relevant
        if any(w in pronouns for w in words):
            return True

        # Check for lexical overlap with recent turn
        last_turn = recent_messages[-1]
        last_words = set(re.findall(r"\b\w{3,}\b", last_turn.content.lower()))
        query_words = set(re.findall(r"\b\w{3,}\b", q_lower))
        if len(last_words.intersection(query_words)) > 0:
            return True

        return len(recent_messages) <= 4

    def build_context_package(
        self,
        query: str,
        session_id: Optional[str] = None,
    ) -> RetrievedContextPackage:
        """
        Executes the 8-step integrated context pipeline:
        1. Query recent conversation history
        2. Query categorized long-term memory
        3. Query local RAG documents with vector scoring
        4. Rank, deduplicate, and enforce strict context budgets
        5. Build formatted source-attributed context block
        6. Propose automatic long-term memory extraction candidate
        """
        # Step 1: Recent Conversation
        recent_messages: List[ConversationMessage] = []
        if session_id:
            all_recent = self.memory.get_recent_messages(session_id, limit=6)
            if self.is_history_relevant(query, all_recent):
                recent_messages = all_recent[-4:]

        # Step 2: Search Categorized Long-Term Memories
        # Extract potential keywords from query
        clean_q = re.sub(r"[^\w\s]", " ", query).lower()
        q_tokens = [w for w in clean_q.split() if len(w) > 2]
        
        # Check specific category heuristics
        target_category: Optional[MemoryCategory] = None
        if any(w in clean_q for w in ["learn", "taught", "professor", "class", "study", "lecture", "concept"]):
            target_category = MemoryCategory.LEARNING
        elif any(w in clean_q for w in ["prefer", "like", "favorite", "style", "theme"]):
            target_category = MemoryCategory.PREFERENCE
        elif any(w in clean_q for w in ["goal", "plan", "target", "roadmap", "milestone"]):
            target_category = MemoryCategory.GOAL
        elif any(w in clean_q for w in ["todo", "task", "action", "remind"]):
            target_category = MemoryCategory.TASK

        # Retrieve categorized memories with ranking
        candidate_memories = self.memory.search_memories(
            query=None,
            category=target_category,
            min_importance=self.min_memory_importance,
        )
        
        # Also query general memories if category query yielded few results
        if len(candidate_memories) < self.max_memories:
            general_memories = self.memory.search_memories(
                query=" ".join(q_tokens[:3]) if q_tokens else None,
                category=None,
                min_importance=self.min_memory_importance,
            )
            for gm in general_memories:
                if not any(m.id == gm.id for m in candidate_memories):
                    candidate_memories.append(gm)

        # Rank memories by keyword overlap + importance
        def score_memory(m: MemoryRecord) -> float:
            score = float(m.importance) * 1.5
            m_text = m.content.lower()
            for token in q_tokens:
                if token in m_text:
                    score += 4.0
            if target_category and m.category == target_category:
                score += 3.0
            return score

        candidate_memories.sort(key=score_memory, reverse=True)
        selected_memories = candidate_memories[: self.max_memories]

        # Step 3: Search Local RAG Documents
        rag_context: RAGContext = self.rag.query(query, top_k=self.max_rag_chunks)
        selected_rag = [
            m for m in rag_context.matches if m.score >= self.min_rag_similarity
        ][: self.max_rag_chunks]

        # Step 4 & 5: Format context block with strict budget & source attribution
        context_sections: List[str] = []
        citations: List[str] = []
        current_chars = 0

        # Add RAG documents section
        if selected_rag:
            rag_lines = ["=== RELEVANT LOCAL DOCUMENTS (RAG) ==="]
            for m in selected_rag:
                citation_label = f"[{m.chunk.source_filename}, p.{m.chunk.page_number or 1}, Chunk #{m.chunk.chunk_index}]"
                citations.append(citation_label)
                rag_lines.append(f"Source {citation_label} (Relevance: {m.score:.2f}):\n{m.chunk.text}\n")
            rag_block = "\n".join(rag_lines)
            if current_chars + len(rag_block) <= self.max_context_chars:
                context_sections.append(rag_block)
                current_chars += len(rag_block)

        # Add Long-Term Memory section
        if selected_memories:
            mem_lines = ["=== RELEVANT LONG-TERM MEMORIES ==="]
            for mem in selected_memories:
                mem_label = f"[Memory:{mem.category.value.upper()} (Imp:{mem.importance}/10)]"
                citations.append(mem_label)
                mem_lines.append(f"- {mem_label}: {mem.content}")
            mem_block = "\n".join(mem_lines)
            if current_chars + len(mem_block) <= self.max_context_chars:
                context_sections.append(mem_block)
                current_chars += len(mem_block)

        formatted_context = "\n\n".join(context_sections)

        # Step 8: Memory formation check on user query
        new_memory = self.detect_new_memory_intent(query)

        return RetrievedContextPackage(
            query=query,
            recent_messages=recent_messages,
            memory_items=selected_memories,
            rag_matches=selected_rag,
            formatted_context_block=formatted_context,
            citations=citations,
            total_tokens_approx=len(formatted_context) // 4,
            new_memory_candidate=new_memory,
        )

    def detect_new_memory_intent(self, text: str) -> Optional[Tuple[str, MemoryCategory, int]]:
        """Heuristic analyzer to detect if user is stating a long-term fact, preference, or goal."""
        t = text.strip()
        lower = t.lower()

        # Preference patterns
        if lower.startswith("i prefer ") or lower.startswith("i like ") or lower.startswith("my favorite "):
            return (t, MemoryCategory.PREFERENCE, 8)

        # Goal patterns
        if lower.startswith("my goal is ") or lower.startswith("i want to achieve ") or lower.startswith("i am planning to "):
            return (t, MemoryCategory.GOAL, 9)

        # Explicit memory command
        if lower.startswith("remember that ") or lower.startswith("remember: ") or lower.startswith("save memory: "):
            cleaned = re.sub(r"^(remember that|remember:|save memory:)\s*", "", t, flags=re.IGNORECASE).strip()
            return (cleaned, MemoryCategory.FACT, 9)

        # Learning / Class notes
        if lower.startswith("my professor taught ") or lower.startswith("in class today ") or lower.startswith("i learned that "):
            return (t, MemoryCategory.LEARNING, 8)

        return None
