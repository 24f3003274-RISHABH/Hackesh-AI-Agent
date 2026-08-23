from langchain_core.messages import HumanMessage
from agent.graph import build_graph


def print_banner():
    print()
    print("=" * 50)
    print("              HACKESH AI v1.0")
    print("          Your Personal AI Agent")
    print("=" * 50)
    print()
    print("Hackesh is ready.")
    print("Type 'exit' or 'quit' to stop.")
    print()


def main():
    hackesh = build_graph()

    messages = []

    print_banner()

    while True:
        try:
            user_input = input("You: ").strip()

        except KeyboardInterrupt:
            print("\n\nHackesh: Goodbye! 👋")
            break

        except EOFError:
            print("\n\nHackesh: Goodbye! 👋")
            break

        if not user_input:
            continue

        if user_input.lower() in {"exit", "quit"}:
            print("Hackesh: Goodbye! 👋")
            break

        messages.append(
            HumanMessage(content=user_input)
        )

        try:
            result = hackesh.invoke({
                "messages": messages
            })

            messages = result["messages"]

            final_message = messages[-1]

            print(f"\nHackesh: {final_message.content}\n")

        except Exception as e:
            print(f"\nHackesh Error: {e}\n")


if __name__ == "__main__":
    main()


