"""
Hackesh SQLite-Backed Local Memory Engine
"""

import os
import sqlite3
import uuid
from datetime import datetime
from typing import List, Optional
from memory.models import (
    MemoryCategory,
    MessageRole,
    ConversationSession,
    ConversationMessage,
    MemoryRecord,
)


class MemoryEngine:
    def __init__(self, db_path: str = "data/hackesh_memory.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(id)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    category TEXT NOT NULL,
                    importance INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            conn.commit()

    def create_session(self, title: str = "New Conversation") -> ConversationSession:
        session_id = f"sess_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (session_id, title, now, now),
            )
            conn.commit()
        return ConversationSession(id=session_id, title=title, created_at=now, updated_at=now)

    def save_message(
        self, session_id: str, role: MessageRole, content: str
    ) -> ConversationMessage:
        msg_id = f"msg_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Ensure session exists
            cursor.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (session_id, content[:30] + "...", now, now),
                )
            else:
                cursor.execute(
                    "UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id)
                )

            cursor.execute(
                "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                (msg_id, session_id, role.value if isinstance(role, MessageRole) else role, content, now),
            )
            conn.commit()

        return ConversationMessage(
            id=msg_id, session_id=session_id, role=role, content=content, created_at=now
        )

    def get_recent_messages(self, session_id: str, limit: int = 20) -> List[ConversationMessage]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?",
                (session_id, limit),
            )
            rows = cursor.fetchall()
            return [
                ConversationMessage(
                    id=r["id"],
                    session_id=r["session_id"],
                    role=MessageRole(r["role"]) if r["role"] in MessageRole._value2member_map_ else r["role"],
                    content=r["content"],
                    created_at=r["created_at"],
                )
                for r in rows
            ]

    def save_memory(
        self,
        content: str,
        category: MemoryCategory = MemoryCategory.FACT,
        importance: int = 5,
        source: str = "manual_entry",
    ) -> MemoryRecord:
        mem_id = f"mem_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        cat_val = category.value if isinstance(category, MemoryCategory) else category
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO memories (id, content, category, importance, source, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (mem_id, content, cat_val, importance, source, now, now),
            )
            conn.commit()

        return MemoryRecord(
            id=mem_id,
            content=content,
            category=category,
            importance=importance,
            source=source,
            created_at=now,
            updated_at=now,
        )

    def search_memories(
        self,
        query: Optional[str] = None,
        category: Optional[MemoryCategory] = None,
        min_importance: int = 1,
    ) -> List[MemoryRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            sql = "SELECT id, content, category, importance, source, created_at, updated_at FROM memories WHERE importance >= ?"
            params = [min_importance]

            if category:
                cat_val = category.value if isinstance(category, MemoryCategory) else category
                sql += " AND category = ?"
                params.append(cat_val)

            if query:
                sql += " AND (content LIKE ? OR source LIKE ?)"
                params.extend([f"%{query}%", f"%{query}%"])

            sql += " ORDER BY importance DESC, updated_at DESC"

            cursor.execute(sql, params)
            rows = cursor.fetchall()
            return [
                MemoryRecord(
                    id=r["id"],
                    content=r["content"],
                    category=MemoryCategory(r["category"]) if r["category"] in MemoryCategory._value2member_map_ else r["category"],
                    importance=r["importance"],
                    source=r["source"],
                    created_at=r["created_at"],
                    updated_at=r["updated_at"],
                )
                for r in rows
            ]

    def delete_memory(self, memory_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
            conn.commit()
            return cursor.rowcount > 0
