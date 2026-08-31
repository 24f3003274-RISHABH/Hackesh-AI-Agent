from tools.gmail import send_email


def main():

    print("Testing Hackesh Gmail Send Tool...\n")

    result = send_email(
        recipient="rishabhmyp@gmail.com",
        subject="Hackesh AI Agent Test",
        body=(
            "Hello!\n\n"
            "This email was sent by Hackesh AI Agent "
            "using the Gmail API.\n\n"
            "— Hackesh"
        )
    )

    print("\nRESULT:")
    print(result)


if __name__ == "__main__":
    main()
