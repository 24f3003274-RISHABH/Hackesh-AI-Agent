from tools.youtube import youtube_search


def main():
    result = youtube_search.invoke(
        {
            "query": "Arijit Singh Tum Hi Ho"
        }
    )

    print(result)


if __name__ == "__main__":
    main()
