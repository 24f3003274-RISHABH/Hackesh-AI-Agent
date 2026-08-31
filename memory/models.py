"""
Hackesh Python Memory Models
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any


class MemoryCategory(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    EVENT = "event"
    GOAL = "goal"
    TASK = "task"
    LEARNING = "learning"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


@dataclass
class ConversationSession:
    id: str
    title: str
    created_at: str
    updated_at: str


@dataclass
class ConversationMessage:
    id: str
    session_id: str
    role: MessageRole
    content: str
    created_at: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class MemoryRecord:
    id: str
    content: str
    category: MemoryCategory
    importance: int
    source: str
    created_at: str
    updated_at: str
