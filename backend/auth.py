"""
Authentication & Authorization middleware for ERP API.

Provides FastAPI dependencies:
- get_current_player(): Validates Firebase ID token, checks ban status.
- get_current_admin(): Validates player + checks admin email/IP whitelist.

References:
- docs/1_ONBOARDING_INIT_RECS.md §2.3 (FR-2.11 through FR-2.15)
- docs/TODO.md §7.2
"""

import os
import json
import logging

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Depends, HTTPException, Request
from sqlmodel import Session, select

from db import get_session
from models import Player

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Firebase Admin SDK Initialization
# ---------------------------------------------------------------------------

_firebase_initialized = False


def init_firebase():
    """Initialize Firebase Admin SDK. Safe to call multiple times.

    Credential resolution order:
      1. FIREBASE_SERVICE_ACCOUNT_JSON env var → path to a JSON key file.
      2. GOOGLE_APPLICATION_CREDENTIALS env var → path to a JSON key file.
      3. FIREBASE_CREDENTIALS env var → inline JSON string (useful in Docker / Cloud Run).
      4. Application Default Credentials (auto-detected on GCE / Cloud Run).
    """
    global _firebase_initialized
    if _firebase_initialized:
        return

    cred = None
    source = None

    # --- Option 1 & 2: explicit file path ---
    for env_var in ("FIREBASE_SERVICE_ACCOUNT_JSON", "GOOGLE_APPLICATION_CREDENTIALS"):
        sa_path = os.getenv(env_var, "")
        if sa_path and os.path.isfile(sa_path):
            cred = credentials.Certificate(sa_path)
            source = f"{env_var} file ({sa_path})"
            break
        elif sa_path:
            logger.warning(
                "%s is set to '%s' but file not found — skipping.", env_var, sa_path
            )

    # --- Option 3: inline JSON string ---
    if cred is None:
        inline_json = os.getenv("FIREBASE_CREDENTIALS", "")
        if inline_json:
            try:
                cred = credentials.Certificate(json.loads(inline_json))
                source = "FIREBASE_CREDENTIALS inline JSON"
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning("FIREBASE_CREDENTIALS is not valid JSON: %s", e)

    # --- Option 4: Application Default Credentials (Cloud Run auto-detect) ---
    if cred is None:
        try:
            import google.auth  # noqa: F811
            google.auth.default()
            cred = credentials.ApplicationDefault()
            source = "Application Default Credentials"
        except Exception:
            logger.error(
                "No Firebase credentials found. Set one of:\n"
                "  - FIREBASE_SERVICE_ACCOUNT_JSON=path/to/key.json\n"
                "  - GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json\n"
                "  - FIREBASE_CREDENTIALS='{...json...}'\n"
                "Generate a key at: Firebase Console → Project Settings → "
                "Service Accounts → Generate New Private Key"
            )
            # Don't crash the server — auth endpoints will return 401
            _firebase_initialized = False
            return

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)
    _firebase_initialized = True
    logger.info("Firebase Admin SDK initialized via %s", source)


# ---------------------------------------------------------------------------
# IP Resolution (Cloud Run sends client IP via X-Forwarded-For)
# ---------------------------------------------------------------------------


def get_client_ip(request: Request) -> str:
    """Extract the real client IP, respecting X-Forwarded-For from Cloud Run."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2 — first entry is the client
        return forwarded.split(",")[0].strip()
    # Direct connection (local dev)
    if request.client:
        return request.client.host
    return "unknown"


# ---------------------------------------------------------------------------
# Admin Whitelist Helpers
# ---------------------------------------------------------------------------


def _get_admin_emails() -> set[str]:
    """Parse ADMIN_ALLOWED_EMAILS env var into a lowercase set."""
    raw = os.getenv("ADMIN_ALLOWED_EMAILS", "")
    if not raw:
        return set()
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def _get_admin_ips() -> set[str]:
    """Parse ADMIN_ALLOWED_IPS env var into a set. Empty set = allow all IPs."""
    raw = os.getenv("ADMIN_ALLOWED_IPS", "")
    if not raw:
        return set()
    return {ip.strip() for ip in raw.split(",") if ip.strip()}


# ---------------------------------------------------------------------------
# FastAPI Dependencies
# ---------------------------------------------------------------------------


async def get_current_player(
    request: Request, session: Session = Depends(get_session)
) -> dict:
    """
    Validate Firebase ID token and return decoded token dict.

    Flow:
    1. Extract Bearer token from Authorization header.
    2. Verify with Firebase Admin SDK.
    3. Look up player in DB — check ban status.
    4. Return decoded token (uid, email, name, picture, + player_id).

    Raises:
        HTTPException 401: Missing, invalid, or expired token.
        HTTPException 403: Player account is banned.
    """
    # --- Extract token ---
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired authentication token"},
        )

    token = auth_header[7:]  # Strip "Bearer "
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired authentication token"},
        )

    # --- Verify with Firebase ---
    if not _firebase_initialized:
        logger.error("Firebase not initialized — cannot verify tokens")
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired authentication token"},
        )

    try:
        decoded = firebase_auth.verify_id_token(token)
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired authentication token"},
        )
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired authentication token"},
        )
    except Exception:
        logger.exception("Unexpected error verifying Firebase token")
        raise HTTPException(
            status_code=401,
            detail={"error": "Invalid or expired authentication token"},
        )

    # --- Ban check ---
    firebase_uid = decoded.get("uid")
    if firebase_uid:
        player = session.exec(
            select(Player).where(Player.firebase_uid == firebase_uid)
        ).first()

        if player and player.is_banned:
            raise HTTPException(
                status_code=403,
                detail={"error": "Account suspended. Contact support."},
            )

        # Attach player_id for downstream use (None if player not yet created)
        decoded["player_id"] = player.id if player else None
        decoded["player"] = player

    return decoded


async def get_current_admin(
    request: Request, token: dict = Depends(get_current_player)
) -> dict:
    """
    Validate that the authenticated user is an authorized admin.

    Flow:
    1. Base token validation via get_current_player().
    2. Check email against ADMIN_ALLOWED_EMAILS.
    3. Check client IP against ADMIN_ALLOWED_IPS (if configured).
    4. Return decoded token on success.

    Raises:
        HTTPException 403: Generic "Access denied" (no detail about which check failed).
    """
    email = (token.get("email") or "").lower()

    # --- Email whitelist check ---
    allowed_emails = _get_admin_emails()
    if not allowed_emails or email not in allowed_emails:
        raise HTTPException(
            status_code=403,
            detail={"error": "Access denied"},
        )

    # --- IP whitelist check (skip if not configured) ---
    allowed_ips = _get_admin_ips()
    if allowed_ips:
        client_ip = get_client_ip(request)
        if client_ip not in allowed_ips:
            raise HTTPException(
                status_code=403,
                detail={"error": "Access denied"},
            )

    return token
