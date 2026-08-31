from agent.graph import hackesh
from langchain_core.messages import HumanMessage


def ask_hackesh(question: str):

    print("\n" + "=" * 60)
    print(f"You: {question}")
    print("=" * 60)

    result = hackesh.invoke(
        {
            "messages": [
                HumanMessage(
                    content=question
                )
            ]
        }
    )

    final_message = result["messages"][-1]

    print("\nHackesh:")
    print(final_message.content)


def main():

    print("================================")
    print("       HACKESH AI AGENT")
    print("================================")

    ask_hackesh(
        "What is the capital of India?"
    )

    ask_hackesh(
        "Calculate 25 * 48"
    )

    ask_hackesh(
        "What is Python?"
    )

    ask_hackesh(
        "Play Kesariya"
    )


if __name__ == "__main__":
    main()