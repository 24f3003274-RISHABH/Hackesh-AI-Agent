# ============================================================
# HACKESH - GMAIL OAUTH
# ============================================================

import os

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

from google_auth_oauthlib.flow import InstalledAppFlow


# Gmail permission
SCOPES = [
    "https://www.googleapis.com/auth/gmail.send"
]


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


CREDENTIALS_FILE = os.path.join(
    BASE_DIR,
    "credentials.json"
)


TOKEN_FILE = os.path.join(
    BASE_DIR,
    "token.json"
)


def get_gmail_credentials():

    credentials = None

    # --------------------------------------------------------
    # Existing token
    # --------------------------------------------------------

    if os.path.exists(TOKEN_FILE):

        credentials = Credentials.from_authorized_user_file(
            TOKEN_FILE,
            SCOPES
        )

    # --------------------------------------------------------
    # Refresh expired token
    # --------------------------------------------------------

    if credentials and credentials.expired and credentials.refresh_token:

        credentials.refresh(
            Request()
        )

    # --------------------------------------------------------
    # First-time authentication
    # --------------------------------------------------------

    if not credentials or not credentials.valid:

        if not os.path.exists(CREDENTIALS_FILE):

            raise FileNotFoundError(
                "credentials.json not found."
            )

        flow = InstalledAppFlow.from_client_secrets_file(
            CREDENTIALS_FILE,
            SCOPES
        )

        credentials = flow.run_local_server(
            port=0
        )

        # Save token
        with open(
            TOKEN_FILE,
            "w"
        ) as token:

            token.write(
                credentials.to_json()
            )

    return credentials
