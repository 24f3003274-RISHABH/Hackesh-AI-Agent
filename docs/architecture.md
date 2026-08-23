# Hackesh Architecture

## Overview

Hackesh is a local-first personal AI agent.

The initial architecture uses:

- Python
- Ollama
- Qwen3
- LangChain
- LangGraph

## Current Architecture

User
  ↓
Interactive CLI
  ↓
LangGraph
  ↓
Hackesh Agent
  ↓
Qwen3
  ↓
Tool Decision
  ↓
Calculator Tool
  ↓
Final Response

## Current Tools

### Calculator

The calculator is the first Hackesh tool.

It demonstrates:

1. User request
2. LLM reasoning/tool selection
3. Tool execution
4. Tool result
5. Final LLM response

## Future Tools

- YouTube
- Gmail
- Reminders
- News
- Web search
- Voice input
- Text-to-speech
- MCP servers

## Future Architecture

Voice Input
    ↓
Speech-to-Text
    ↓
Hackesh Agent
    ↓
LangGraph
    ↓
Tools / MCP
    ↓
Text-to-Speech
    ↓
Voice Output
