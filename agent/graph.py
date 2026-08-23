from typing import Annotated
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from tools.calculator import calculator


class HackeshState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


llm = ChatOllama(
    model="qwen3:4b",
    temperature=0,
)

tools = [calculator]

llm_with_tools = llm.bind_tools(tools)


def agent_node(state: HackeshState):

    response = llm_with_tools.invoke(state["messages"])

    if getattr(response, "tool_calls", None):
        print("\n[Hackesh] Tool selected:")
        print(response.tool_calls)

    return {
        "messages": [response]
    }


tool_node = ToolNode(tools)


def should_continue(state: HackeshState):

    last_message = state["messages"][-1]

    if getattr(last_message, "tool_calls", None):
        return "tools"

    return END


def build_graph():

    graph = StateGraph(HackeshState)

    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)

    graph.add_edge(START, "agent")

    graph.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            END: END,
        },
    )

    graph.add_edge("tools", "agent")

    return graph.compile()