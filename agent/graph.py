
from typing import Annotated
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage, SystemMessage
from langchain_ollama import ChatOllama

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from tools.calculator import calculator
from tools.youtube import youtube_search

# ============================================================
# Hackesh State
# ============================================================

class HackeshState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# ============================================================
# Hackesh System Prompt
# ============================================================

SYSTEM_PROMPT = SYSTEM_PROMPT = """
You are Hackesh, a fast and practical personal AI assistant.

Your job is to help the user complete tasks and answer questions.

IMPORTANT RULES:

1. Be concise and direct.
2. Do not reveal your internal reasoning.
3. Do not pretend that you performed an action if you did not.
4. Use tools when a tool is appropriate.
5. For calculations, use the calculator tool.
6. For YouTube/music requests, use the youtube_search tool.
7. If the user asks to play a song, search YouTube for that song.
8. If the user asks to search for a video on YouTube, use the YouTube tool.
9. After a tool returns a result, briefly tell the user what happened.
10. Do not give unnecessary explanations.

You are Hackesh, the user's personal AI assistant.
"""
# ============================================================
# LLM 
# ============================================================

llm = ChatOllama(
    model="llama3.1",

    # Deterministic responses are better for an agent.
    temperature=0,

    # Keep Qwen loaded in memory.
    # This avoids repeatedly loading the model.
    keep_alive="30m",

    # Conservative generation.
    top_p=0.8,
    top_k=20,
)


# ============================================================
# Tools
# ============================================================

tools = [
    calculator,
    youtube_search,
]

llm_with_tools = llm.bind_tools(tools)


# ============================================================
# Agent Node
# ============================================================

def agent_node(state: HackeshState):

    messages = state["messages"]

    # Add system prompt only for the current model call.
    model_messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        *messages,
    ]

    response = llm_with_tools.invoke(model_messages)

    # Show when Hackesh decides to use a tool.
    if getattr(response, "tool_calls", None):

        print("\n[Hackesh → Tool]")

        for tool_call in response.tool_calls:
            print(
                f"  {tool_call['name']}("
                f"{tool_call['args']}"
                f")"
            )

    return {
        "messages": [response]
    }


# ============================================================
# Tool Node
# ============================================================

tool_node = ToolNode(tools)


# ============================================================
# Routing
# ============================================================

def should_continue(state: HackeshState):

    last_message = state["messages"][-1]

    if getattr(last_message, "tool_calls", None):
        return "tools"

    return END


# ============================================================
# Build Graph
# ============================================================

def build_graph():

    graph = StateGraph(HackeshState)

    graph.add_node("agent", agent_node)

    graph.add_node("tools", tool_node)

    graph.add_edge(
        START,
        "agent"
    )

    graph.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            END: END,
        },
    )

    graph.add_edge(
        "tools",
        "agent"
    )

    return graph.compile()
