from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage


llm = ChatOllama(
    model="llama3.1:latest",
    temperature=0,
    keep_alive="30m",
)


def main():

    print("Testing ChatOllama...\n")

    response = llm.invoke(
        [
            HumanMessage(
                content="What is the capital of India?"
            )
        ]
    )

    print("LLAMA RESPONSE:")
    print(response.content)


if __name__ == "__main__":
    main()
