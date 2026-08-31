"""
Tests for the Hackesh Local Memory Engine
"""

import os
import unittest
from memory import MemoryEngine, MemoryCategory, MessageRole


class TestMemoryEngine(unittest.TestCase):
    def setUp(self):
        self.test_db = "data/test_hackesh_memory.db"
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        self.engine = MemoryEngine(db_path=self.test_db)

    def tearDown(self):
        if os.path.exists(self.test_db):
            os.remove(self.test_db)

    def test_save_and_retrieve_messages(self):
        session = self.engine.create_session("Test Session")
        self.assertIsNotNone(session.id)

        msg1 = self.engine.save_message(
            session_id=session.id,
            role=MessageRole.USER,
            content="Calculate 25 * 4",
        )
        msg2 = self.engine.save_message(
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content="The result is 100.",
        )

        recent = self.engine.get_recent_messages(session.id)
        self.assertEqual(len(recent), 2)
        self.assertEqual(recent[0].content, "Calculate 25 * 4")
        self.assertEqual(recent[1].content, "The result is 100.")

    def test_save_and_search_categorized_memories(self):
        mem1 = self.engine.save_memory(
            content="User prefers privacy-first local RAG workflows",
            category=MemoryCategory.PREFERENCE,
            importance=9,
            source="test_runner",
        )
        mem2 = self.engine.save_memory(
            content="User's goal is to complete Hackesh V3 Local Memory",
            category=MemoryCategory.GOAL,
            importance=10,
            source="test_runner",
        )

        results = self.engine.search_memories(query="privacy")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].category, MemoryCategory.PREFERENCE)

        goal_results = self.engine.search_memories(category=MemoryCategory.GOAL)
        self.assertEqual(len(goal_results), 1)
        self.assertEqual(goal_results[0].content, mem2.content)

    def test_delete_memory(self):
        mem = self.engine.save_memory(
            content="Temporary reminder to verify calculations",
            category=MemoryCategory.TASK,
            importance=5,
        )
        self.assertTrue(self.engine.delete_memory(mem.id))
        after_delete = self.engine.search_memories(query="Temporary")
        self.assertEqual(len(after_delete), 0)


if __name__ == "__main__":
    unittest.main()
