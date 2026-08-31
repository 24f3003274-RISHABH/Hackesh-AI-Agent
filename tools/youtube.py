import webbrowser
from urllib.parse import quote_plus

from langchain_core.tools import tool


@tool
def youtube_search(query: str) -> str:
    """
    Search YouTube for a song, artist, music video, or other video
    and open the YouTube search results in the default browser.
    """

    if not query or not query.strip():
        return "Please provide something to search for on YouTube."

    query = query.strip()

    search_url = (
        "https://www.youtube.com/results?search_query="
        + quote_plus(query)
    )

    webbrowser.open(search_url)

    return (
        f"I opened YouTube search results for '{query}'."
    )
