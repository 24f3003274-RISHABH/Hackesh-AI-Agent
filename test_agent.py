from langchain_core.messages import HumanMessage
from agent.graph import build_graph


def main():

    hackesh = build_graph()

    result = hackesh.invoke({
        "messages": [
            HumanMessage(
                content="What is 25 multiplied by 48?"
            )
        ]
    })

    final_message = result["messages"][-1]

    print("\nHackesh:")
    print(final_message.content)


if __name__ == "__main__":
    main()