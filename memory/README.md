# Hackesh Local-First Memory Engine (`/memory`)

## Overview
The Hackesh Memory Engine provides local, zero-cloud persistence for conversation sessions, message logs, and structured long-term memory records using SQLite.

## Supported Memory Categories
1. 💡 **Fact**: Objective truths and profile attributes (e.g. user location, project specs).
2. ❤️ **Preference**: UI themes, tone, formatting styles, and tool defaults.
3. 📅 **Event**: Key milestones, release dates, and scheduled checkpoints.
4. 🎯 **Goal**: Multi-step user objectives and targets.
5. ✅ **Task**: Action items, to-dos, and follow-ups.
6. 📚 **Learning**: Inferred concepts and user workflow feedback.

## Python API Usage
```python
from memory import MemoryEngine, MemoryCategory, MessageRole

# Initialize local SQLite engine
engine = MemoryEngine("data/hackesh_memory.db")

# Save a categorized memory
mem = engine.save_memory(
    content="User is building Hackesh: A local-first personal AI assistant",
    category=MemoryCategory.FACT,
    importance=10,
    source="chat_session"
)

# Search memories
results = engine.search_memories(query="Hackesh", min_importance=5)
```
