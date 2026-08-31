"""
Local Embedding Engine for Hackesh RAG.
Produces normalized dense vector representations locally without external cloud API calls.
"""

import math
import re
from typing import List


class LocalEmbeddingEngine:
    """
    Computes local semantic embeddings using a hash-projected normalized bag-of-words / n-gram vectorizer.
    Can also wrap sentence-transformers / fastembed if installed.
    """

    def __init__(self, dimension: int = 128):
        self.dimension = dimension

    def embed_text(self, text: str) -> List[float]:
        """Generates a normalized dense embedding vector for the provided text."""
        # Try local sentence-transformers if available
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            vec = model.encode(text).tolist()
            return vec
        except Exception:
            pass

        # High-performance local deterministic semantic embedding
        import hashlib
        cleaned = text.lower()
        words = re.findall(r"\b\w+\b", cleaned)
        vector = [0.0] * self.dimension

        if not words:
            return vector

        # Token hashing into vector space
        for word in words:
            # 1-gram
            h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16) % self.dimension
            vector[h] += 1.0
            
            # Character trigrams for morphological similarity
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    trigram = word[i:i+3]
                    th = int(hashlib.md5(trigram.encode('utf-8')).hexdigest(), 16) % self.dimension
                    vector[th] += 0.35

        # L2 Normalization
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0.0:
            vector = [v / norm for v in vector]

        return vector

    def embed_chunks(self, texts: List[str]) -> List[List[float]]:
        """Embeds multiple texts."""
        return [self.embed_text(t) for t in texts]
