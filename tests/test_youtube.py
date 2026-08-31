from tools.youtube import youtube_search


def main():

    print("Testing Hackesh YouTube Tool...\n")

    result = youtube_search.invoke(
        {
            "query": "Kesariya Arijit Singh"
        }
    )

    print("\nRESULT:")
    print(result)


if __name__ == "__main__":
    main()