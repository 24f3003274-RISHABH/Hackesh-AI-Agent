from auth.gmail_auth import get_gmail_credentials


def main():

    print("Testing Hackesh Gmail OAuth...\n")

    credentials = get_gmail_credentials()

    print("Gmail authentication successful!")
    print(
        "Token is ready for Gmail API."
    )


if __name__ == "__main__":
    main()
