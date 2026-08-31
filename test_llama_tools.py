from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

from tools.calculator import calculator


llm = ChatOllama(
    model="llama3.1:latest",
    temperature=0,
    keep_alive="30m",
)

llm_with_tools = llm.bind_tools(
    [calculator]
)


def main():

    print("Testing ChatOllama + Tools...\n")

    response = llm_with_tools.invoke(
        [
            HumanMessage(
                content="Calculate 25*48"
            )
        ]
    )

    print("CONTENT:")
    print(response.content)

    print("\nTOOL CALLS:")
    print(response.tool_calls)


if __name__ == "__main__":
    main()
