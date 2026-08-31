"""
Text cleaner and normalizer for Hackesh Local RAG.
"""

import re


class TextCleaner:
    """Cleans and sanitizes raw document text before chunking."""

    @staticmethod
    def clean(text: str) -> str:
        """Removes excessive whitespace, null bytes, and non-printable artifacts."""
        if not text:
            return ""

        # Normalize carriage returns
        cleaned = text.replace("\r\n", "\n").replace("\r", "\n")

        # Collapse 3+ consecutive newlines into 2
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

        # Collapse consecutive spaces and tabs
        cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)

        # Strip surrounding whitespace
        return cleaned.strip()
