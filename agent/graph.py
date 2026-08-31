# ============================================================
# HACKESH AI AGENT
# ============================================================

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END, MessagesState

from tools.calculator import calculator
from tools.youtube import youtube_search
from typing import Annotated
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage, SystemMessage
from langchain_ollama import ChatOllama

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

# ============================================================
# 1. LLM
# ============================================================

llm = ChatOllama(
    model="llama3.1:latest",
    temperature=0,
    keep_alive="30m",
    top_p=0.8,
    top_k=20,
)


# ============================================================
# 2. TOOL-ENABLED LLM
# ============================================================

llm_with_tools = llm.bind_tools(
    [calculator]
)


# ============================================================
# 3. SYSTEM PROMPTS
# ============================================================

GENERAL_SYSTEM_PROMPT = """
You are Hackesh, a personal AI assistant.

Answer the user's question directly and naturally.

You can answer questions about:
- general knowledge
- programming
- technology
- science
- history
- mathematics
- everyday topics

Do not refuse normal questions.

Do not mention internal tools.

Be concise but helpful.
"""


CALCULATOR_SYSTEM_PROMPT = """
You are Hackesh, a personal AI assistant.

The user has requested a mathematical calculation.

Use the calculator tool to perform the calculation.

After receiving the calculator result, provide the final answer concisely.
"""


# ============================================================
# 4. ROUTER LOGIC
# ============================================================

def route_request(user_message: str) -> str:

    text = user_message.lower().strip()

    # ========================================================
    # YOUTUBE
    # ========================================================

    youtube_keywords = [
        "play",
        "play song",
        "play music",
        "listen to",
        "youtube",
        "watch",
        "open youtube",
    ]

    if any(
        keyword in text
        for keyword in youtube_keywords
    ):
        return "youtube"


    # ========================================================
    # CALCULATOR
    # ========================================================

    calculation_keywords = [
        "calculate",
        "calculation",
        "compute",
        "multiply",
        "divide",
        "addition",
        "subtraction",
        "sum",
        "product",
    ]

    if any(
        keyword in text
        for keyword in calculation_keywords
    ):
        return "calculator"


    # ========================================================
    # GENERAL
    # ========================================================

    return "general"
# ============================================================
# 5. ROUTER NODE
# ============================================================

def router_node(state: MessagesState):

    # MessagesState contains LangChain message objects.
    last_message = state["messages"][-1]

    user_message = last_message.content

    route = route_request(user_message)

    print(
        f"\n[Hackesh Router] → {route}"
    )

    return {}


# ============================================================
# 6. GENERAL NODE
# ============================================================

def general_node(state: MessagesState):

    user_message = state["messages"][-1].content

    response = llm.invoke(
        [
            SystemMessage(
                content=GENERAL_SYSTEM_PROMPT
            ),
            HumanMessage(
                content=user_message
            ),
        ]
    )

    return {
        "messages": [response]
    }


# ============================================================
# 7. CALCULATOR NODE
# ============================================================

def calculator_node(state: MessagesState):

    user_message = state["messages"][-1].content

    response = llm_with_tools.invoke(
        [
            SystemMessage(
                content=CALCULATOR_SYSTEM_PROMPT
            ),
            HumanMessage(
                content=user_message
            ),
        ]
    )

    # --------------------------------------------------------
    # Check whether the model requested a tool
    # --------------------------------------------------------

    if response.tool_calls:

        tool_call = response.tool_calls[0]

        if tool_call["name"] == "calculator":

            expression = tool_call["args"]["expression"]

            print(
                f"[Hackesh Tool] calculator → {expression}"
            )

            result = calculator.invoke(
                {
                    "expression": expression
                }
            )

            # ------------------------------------------------
            # Generate final natural-language response
            # ------------------------------------------------

            final_response = llm.invoke(
                [
                    SystemMessage(
                        content=GENERAL_SYSTEM_PROMPT
                    ),
                    HumanMessage(
                        content=(
                            f"The user asked: {user_message}\n\n"
                            f"The calculator returned: {result}\n\n"
                            "Give the final answer to the user."
                        )
                    ),
                ]
            )

            return {
                "messages": [final_response]
            }

    # --------------------------------------------------------
    # Fallback
    # --------------------------------------------------------

    return {
        "messages": [response]
    }


def youtube_node(state: MessagesState):

    user_message = state["messages"][-1].content

    query = user_message

    # Remove common command words
    prefixes = [
        "play ",
        "listen to ",
        "watch ",
        "open youtube and play ",
        "play song ",
        "play music ",
    ]

    for prefix in prefixes:

        if query.lower().startswith(prefix):
            query = query[len(prefix):].strip()
            break

    print(
        f"[Hackesh YouTube] Searching → {query}"
    )

    result = youtube_search.invoke(
        {
            "query": query
        }
    )

    final_response = llm.invoke(
        [
            SystemMessage(
                content="""
You are Hackesh, a personal AI assistant.

The requested YouTube content has been opened in the browser.

Respond briefly and naturally.

For example:
"Sure, playing Kesariya."

Do not mention internal tools or APIs.
"""
            ),
            HumanMessage(
                content=result
            ),
        ]
    )

    return {
        "messages": [final_response]
    }
# ============================================================
# 8. CONDITIONAL ROUTING
# ============================================================

def decide_route(state: MessagesState):

    user_message = state["messages"][-1].content

    return route_request(user_message)


# ============================================================
# 9. BUILD GRAPH
# ============================================================

graph = StateGraph(MessagesState)


# Nodes
graph.add_node(
    "router",
    router_node
)

graph.add_node(
    "general",
    general_node
)

graph.add_node(
    "calculator",
    calculator_node
)
graph.add_node(
    "youtube",
    youtube_node
)

# ============================================================
# 10. EDGES
# ============================================================

graph.add_edge(
    START,
    "router"
)


graph.add_conditional_edges(
    "router",
    decide_route,
    {
        "general": "general",
        "calculator": "calculator",
        "youtube": "youtube",
    }
)


graph.add_edge(
    "general",
    END
)

graph.add_edge(
    "calculator",
    END
)

graph.add_edge(
    "youtube",
    END
)


# ============================================================
# 11. COMPILE HACKESH
# ============================================================
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


hackesh = graph.compile()



print("Hackesh graph loaded successfully.")