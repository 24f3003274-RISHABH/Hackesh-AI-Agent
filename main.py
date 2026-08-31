from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from agent.graph import build_graph


def print_banner():

    print()
    print("=" * 60)
    print("                    HACKESH AI")
    print("                  Personal Agent")
    print("=" * 60)
    print()

    print("✓ Ollama")
    print("✓ Qwen3:4B")
    print("✓ LangChain")
    print("✓ LangGraph")
    print("✓ Calculator Tool")
    print()

    print("Hackesh is ready.")
    print("Type 'exit' or 'quit' to stop.")
    print()


def main():

    hackesh = build_graph()

    # Current conversation.
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
            HumanMessage(
                content=user_input
            )
        )


        print("\nHackesh: ", end="", flush=True)


        # This will contain the final state.
        final_messages = None


        try:

            for chunk in hackesh.stream(
                {
                    "messages": messages
                },
                stream_mode=["messages", "updates"],
            ):

                mode, data = chunk


                # ==================================================
                # LLM TOKEN STREAM
                # ==================================================

                if mode == "messages":

                    message_chunk, metadata = data

                    # Only print actual AI text.
                    if isinstance(
                        message_chunk,
                        AIMessage
                    ):

                        content = message_chunk.content

                        if isinstance(content, str) and content:

                            print(
                                content,
                                end="",
                                flush=True
                            )


                # ==================================================
                # GRAPH STATE UPDATES
                # ==================================================

                elif mode == "updates":

                    for node_name, update in data.items():

                        if "messages" in update:

                            new_messages = update["messages"]

                            if new_messages:

                                if final_messages is None:

                                    final_messages = []

                                final_messages.extend(
                                    new_messages
                                )


            # ======================================================
            # Update conversation memory
            # ======================================================

            if final_messages:

                messages.extend(
                    final_messages
                )


            print("\n")


        except Exception as e:

            print()

            print(
                f"[Hackesh Error] "
                f"{type(e).__name__}: {e}"
            )

            print()


if __name__ == "__main__":
    main()
