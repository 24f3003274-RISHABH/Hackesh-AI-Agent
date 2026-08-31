"""
Hackesh Gmail Tool

Responsible for sending emails through Gmail API.
"""

import os
import base64
from email.mime.text import MIMEText
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


# Only request the permission Hackesh currently needs.
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

BASE_DIR = Path(__file__).resolve().parent.parent

CREDENTIALS_FILE = BASE_DIR / "credentials.json"
TOKEN_FILE = BASE_DIR / "token.json"


def get_gmail_service():
    """
    Authenticate with Google and return Gmail API service.
    """

    creds = None

    # Existing OAuth token
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(
            str(TOKEN_FILE),
            SCOPES
        )

    # Refresh expired token
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

    # Authenticate if no valid credentials exist
    if not creds or not creds.valid:

        if not CREDENTIALS_FILE.exists():
            raise FileNotFoundError(
                "credentials.json not found in project root."
            )

        flow = InstalledAppFlow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            SCOPES
        )

        creds = flow.run_local_server(port=0)

        TOKEN_FILE.write_text(creds.to_json())

    return build(
        "gmail",
        "v1",
        credentials=creds
    )


def send_email(
    recipient: str,
    subject: str,
    body: str
) -> str:
    """
    Send an email using Gmail API.
    """

    service = get_gmail_service()

    message = MIMEText(body)

    message["to"] = recipient
    message["subject"] = subject

    raw_message = base64.urlsafe_b64encode(
        message.as_bytes()
    ).decode()

    result = service.users().messages().send(
        userId="me",
        body={
            "raw": raw_message
        }
    ).execute()

    message_id = result.get("id")

    return (
        f"Email successfully sent to {recipient}. "
        f"Message ID: {message_id}"
    )
