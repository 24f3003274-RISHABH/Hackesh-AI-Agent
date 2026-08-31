# ============================================================
# HACKESH - YOUTUBE TOOL
# ============================================================

import os
import webbrowser

from dotenv import load_dotenv
from googleapiclient.discovery import build
from langchain_core.tools import tool


# Load environment variables
load_dotenv()


YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")


@tool
def youtube_search(query: str) -> str:
    """
    Search YouTube for a song, video, artist, or topic.

    Returns the best matching YouTube video and opens it
    in the user's default browser.
    """

    if not YOUTUBE_API_KEY:
        return (
            "YouTube API key is not configured. "
            "Please add YOUTUBE_API_KEY to .env."
        )

    try:

        youtube = build(
            "youtube",
            "v3",
            developerKey=YOUTUBE_API_KEY
        )

        request = youtube.search().list(
            part="snippet",
            q=query,
            type="video",
            maxResults=1
        )

        response = request.execute()

        items = response.get("items", [])

        if not items:
            return f"I couldn't find a YouTube video for '{query}'."

        video = items[0]

        video_id = video["id"]["videoId"]

        title = video["snippet"]["title"]

        channel = video["snippet"]["channelTitle"]

        url = f"https://www.youtube.com/watch?v={video_id}"

        # Open YouTube in browser
        webbrowser.open(url)

        return (
            f"Playing '{title}' by {channel}. "
            f"YouTube URL: {url}"
        )

    except Exception as e:

        return (
            f"Sorry, I couldn't search YouTube. "
            f"Error: {str(e)}"
        )