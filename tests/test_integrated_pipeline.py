"""
Unit Tests for Integrated Hackesh Context Orchestrator (Memory + RAG).
Tests the full 8-step pipeline:
1. History relevance evaluation
2. Long-term memory extraction (e.g. learning, preference, goals)
3. Local RAG document matching and vector scoring
4. Ranking and context budget enforcement (no database dumping)
5. Source attribution builder
6. End-to-end grounded generation flow
7. Conversation persistence
8. Automatic long-term memory formation
"""

import os
import unittest
import tempfile
from memory.engine import MemoryEngine
from memory.models import MemoryCategory, MessageRole
from rag.engine import RAGEngine
from context_orchestrator import ContextOrchestrator


class TestContextOrchestrator(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.mem_db = os.path.join(self.temp_dir.name, "test_mem.db")
        self.rag_store = os.path.join(self.temp_dir.name, "test_rag.json")

        self.memory = MemoryEngine(db_path=self.mem_db)
        self.rag = RAGEngine(storage_path=self.rag_store, chunk_size=200, chunk_overlap=30)
        self.orchestrator = ContextOrchestrator(
            memory_engine=self.memory,
            rag_engine=self.rag,
            max_context_chars=1500,
            max_memories=3,
            max_rag_chunks=2,
            min_rag_similarity=0.20,
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_example_professor_lecture_integration(self):
        """
        User asks: "What did my professor teach last week?"
        Pipeline should retrieve:
        - conversation history
        - learning memories
        - relevant lecture documents
        """
        # Seed 1: Learning memory
        self.memory.save_memory(
            content="Professor Miller explained transformers, self-attention mechanisms, and positional encoding last Tuesday.",
            category=MemoryCategory.LEARNING,
            importance=9,
            source="lecture_notes_nlp",
        )

        # Seed 2: Lecture document in RAG
        self.rag.ingest_text(
            text="""Lecture 8: Deep Sequence Models & Transformers
Professor Miller covered multi-head self-attention, Query-Key-Value matrices, and residual connections in transformer blocks.""",
            filename="CS480_Lecture_8_Transformers.md",
        )

        # Seed 3: Unrelated document that shouldn't pollute the prompt
        self.rag.ingest_text(
            text="Guide to Italian Espresso Roasting and extraction ratios.",
            filename="espresso_guide.txt",
        )

        # Build Context Package
        pkg = self.orchestrator.build_context_package(
            query="What did my professor teach last week?"
        )

        # 1. Verify memory retrieved
        self.assertTrue(any("Miller" in m.content for m in pkg.memory_items))
        self.assertEqual(pkg.memory_items[0].category, MemoryCategory.LEARNING)

        # 2. Verify RAG document retrieved
        self.assertTrue(any("CS480_Lecture_8_Transformers.md" in m.chunk.source_filename for m in pkg.rag_matches))

        # 3. Verify unrelated documents are filtered out
        self.assertFalse(any("espresso_guide.txt" in m.chunk.source_filename for m in pkg.rag_matches))

        # 4. Verify formatted context and attribution
        self.assertIn("CS480_Lecture_8_Transformers.md", pkg.formatted_context_block)
        self.assertIn("LEARNING", pkg.formatted_context_block)
        self.assertGreater(len(pkg.citations), 0)

        # 5. Verify context budget limits (not dumping entire database)
        self.assertLessEqual(len(pkg.formatted_context_block), 1500)

    def test_history_relevance_detection(self):
        session = self.memory.create_session("Math and AI")
        self.memory.save_message(session.id, MessageRole.USER, "What is cosine similarity?")
        self.memory.save_message(session.id, MessageRole.ASSISTANT, "Cosine similarity measures the angle between two non-zero vectors.")

        # Query with pronoun refers to previous turn
        is_rel = self.orchestrator.is_history_relevant("How is it calculated in RAG?", self.memory.get_recent_messages(session.id))
        self.assertTrue(is_rel)

    def test_new_memory_formation_detection(self):
        pkg = self.orchestrator.build_context_package(
            query="Remember that my favorite programming language is Rust"
        )
        self.assertIsNotNone(pkg.new_memory_candidate)
        content, category, importance = pkg.new_memory_candidate
        self.assertIn("favorite programming language is Rust", content)
        self.assertEqual(category, MemoryCategory.FACT)


if __name__ == "__main__":
    unittest.main()
