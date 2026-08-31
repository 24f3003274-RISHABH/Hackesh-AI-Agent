"""
Comprehensive Unit Tests for Hackesh Local RAG Engine.
Tests document ingestion, chunking, local embeddings, top-k retrieval, citations, and index rebuilds.
"""

import unittest
import os
import tempfile
from rag.engine import RAGEngine


class TestRAGEngine(unittest.TestCase):
    """Test suite for local-first RAG pipeline."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_rag.json")
        self.engine = RAGEngine(storage_path=self.db_path, chunk_size=200, chunk_overlap=30)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_ingest_and_retrieve_markdown(self):
        doc_content = """# Architecture of Hackesh
Hackesh is a local-first personal AI assistant built for privacy and performance.
It executes LangGraph workflows directly on the user's host machine.

## Memory Subsystem
Hackesh uses local SQLite databases to maintain conversation sessions and long-term memories.
It never uploads user memories to the cloud.

## Local RAG Subsystem
Documents in PDF, Markdown, TXT, and DOCX formats are chunked and embedded locally.
"""
        doc = self.engine.ingest_text(
            text=doc_content,
            filename="hackesh_arch.md"
        )
        
        self.assertIsNotNone(doc.id)
        self.assertEqual(doc.filename, "hackesh_arch.md")
        
        # Test Query
        res = self.engine.query("How does Hackesh store memories?", top_k=2)
        self.assertGreater(len(res.matches), 0)
        self.assertIn("SQLite", res.formatted_context)
        self.assertTrue(any("hackesh_arch.md" in c for c in res.citations))

    def test_top_k_semantic_ranking(self):
        self.engine.ingest_text(
            text="Quantum computing uses qubits and quantum superposition to perform complex calculations.",
            filename="quantum.txt"
        )
        self.engine.ingest_text(
            text="Baking sourdough bread requires water, flour, salt, and wild yeast fermentation.",
            filename="recipe.txt"
        )

        # Search for quantum
        res_quantum = self.engine.query("qubits and superposition", top_k=1)
        self.assertEqual(len(res_quantum.matches), 1)
        self.assertEqual(res_quantum.matches[0].chunk.source_filename, "quantum.txt")

        # Search for sourdough
        res_bread = self.engine.query("sourdough flour and yeast", top_k=1)
        self.assertEqual(len(res_bread.matches), 1)
        self.assertEqual(res_bread.matches[0].chunk.source_filename, "recipe.txt")

    def test_delete_and_rebuild_index(self):
        doc1 = self.engine.ingest_text("Document 1 details about aerospace.", filename="aero.txt")
        doc2 = self.engine.ingest_text("Document 2 details about botany.", filename="botany.txt")

        self.assertEqual(len(self.engine.list_documents()), 2)
        
        # Delete doc1
        self.engine.delete_document(doc1.id)
        self.assertEqual(len(self.engine.list_documents()), 1)

        # Rebuild index
        self.engine.rebuild_index()
        results = self.engine.query("aerospace", top_k=2)
        # Should not match doc1 anymore
        self.assertFalse(any(m.chunk.source_filename == "aero.txt" for m in results.matches))


if __name__ == "__main__":
    unittest.main()
