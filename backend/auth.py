"""
Authentication & Authorization middleware for ERP API.

Provides FastAPI dependencies:
- get_current_player(): Validates Firebase ID token, checks ban status & session invalidation.
- get_current_admin(): Whitelist (DB/Env) OR (System Admin OR Owner) database flag. Bypasses player ban.
- get_current_owner(): Only allows players with the is_owner flag.

References:
- docs/1_ONBOARDING_INIT_RECS.md §2.3 (FR-2.11 through FR-2.15)
- docs/TODO.md §7.2, 7.10
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Depends, HTTPException, Request
from sqlmodel import Session, select

from db import get_session
from models import Player, AdminWhitelistEmail, AdminWhitelistIP
import config_cache

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Firebase Admin SDK Initialization
# ---------------------------------------------------------------------------

_firebase_initialized = False


def init_firebase():
    """Initialize Firebase Admin SDK. Safe to call multiple times."""
    global _firebase_initialized
    if _firebase_initialized:
        return

    cred = None
    source = None

    for env_var in ("FIREBASE_SERVICE_ACCOUNT_JSON", "GOOGLE_APPLICATION_CREDENTIALS"):
        sa_path = os.getenv(env_var, "")
        if sa_path and os.path.isfile(sa_path):
            cred = credentials.Certificate(sa_path)
            source = f"{env_var} file ({sa_path})"
            break

    if cred is None:
        inline_json = os.getenv("FIREBASE_CREDENTIALS", "")
        if inline_json:
            try:
                cred = credentials.Certificate(json.loads(inline_json))
                source = "FIREBASE_CREDENTIALS inline JSON"
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning("FIREBASE_CREDENTIALS is not valid JSON: %s", e)

    if cred is None:
        try:
            import google.auth
            google.auth.default()
            cred = credentials.ApplicationDefault()
            source = "Application Default Credentials"
        except Exception:
            logger.error("No Firebase credentials found.")
            _firebase_initialized = False
            return

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)
    _firebase_initialized = True
    logger.info("Firebase Admin SDK initialized via %s", source)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _get_admin_emails(session: Session) -> set[str]:
    """Fetch whitelisted emails from DB, fallback to ENV."""
    # 1. Try DB
    try:
        db_emails = session.exec(select(AdminWhitelistEmail.email)).all()
        if db_emails:
            return {e.lower() for e in db_emails}
    except Exception as e:
        logger.warning("Failed to fetch admin emails from DB: %s", e)

    # 2. Fallback to ENV
    raw = os.getenv("ADMIN_ALLOWED_EMAILS", "")
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def _get_admin_ips(session: Session) -> set[str]:
    """Fetch whitelisted IPs from DB, fallback to ENV."""
    # 1. Try DB
    try:
        db_ips = session.exec(select(AdminWhitelistIP.ip_address)).all()
        if db_ips:
            return set(db_ips)
    except Exception as e:
        logger.warning("Failed to fetch admin IPs from DB: %s", e)

    # 2. Fallback to ENV
    raw = os.getenv("ADMIN_ALLOWED_IPS", "")
    return {ip.strip() for ip in raw.split(",") if ip.strip()}


# ---------------------------------------------------------------------------
# Core Token Validation
# ---------------------------------------------------------------------------

async def get_decoded_token(request: Request) -> dict:
    """Base dependency to extract and verify Firebase token."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": "Invalid or expired token"})

    token = auth_header[7:]
    if not token or not _firebase_initialized:
        raise HTTPException(status_code=401, detail={"error": "Invalid or expired token"})

    try:
        return firebase_auth.verify_id_token(token)
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail={"error": "Invalid or expired token"})


# ---------------------------------------------------------------------------
# Specialized Dependencies
# ---------------------------------------------------------------------------

async def get_current_player(
    decoded: dict = Depends(get_decoded_token), 
    session: Session = Depends(get_session)
) -> dict:
    """
    Dependency for PLAYER-facing endpoints.
    Enforces ban status and session invalidation.
    """
    firebase_uid = decoded.get("uid")
    player = session.exec(select(Player).where(Player.firebase_uid == firebase_uid)).first()

    if player:
        # 1. Ban Check
        if player.is_banned:
            raise HTTPException(
                status_code=403,
                detail={"error": "Account suspended. Contact support."},
            )

        # 2. Force Logout Check
        if player.sessions_invalid_before:
            auth_time = decoded.get("auth_time")
            if auth_time:
                auth_dt = datetime.fromtimestamp(auth_time, tz=timezone.utc)
                invalid_before = player.sessions_invalid_before
                if invalid_before.tzinfo is None:
                    invalid_before = invalid_before.replace(tzinfo=timezone.utc)
                
                # Grace period of 2s for clock skew
                if auth_dt < (invalid_before - timedelta(seconds=2)):
                    raise HTTPException(
                        status_code=401,
                        detail={"error": "Session invalidated. Please login again."},
                    )

    decoded["player_id"] = player.id if player else None
    decoded["player"] = player
    return decoded


async def get_current_admin(
    request: Request,
    decoded: dict = Depends(get_decoded_token),
    session: Session = Depends(get_session)
) -> dict:
    """
    Dependency for ADMIN-facing endpoints.
    Allows Whitelisted Email OR (System Admin flag OR Owner flag).
    Bypasses player ban status.
    Enforces IP whitelist ONLY IF ops.admin_ip_whitelist_enabled is True.
    """
    email = (decoded.get("email") or "").lower()
    firebase_uid = decoded.get("uid")
    
    # Fetch player from DB to check flags
    player = session.exec(select(Player).where(Player.firebase_uid == firebase_uid)).first()
    
    # 1. Permission Check
    is_whitelisted = email in _get_admin_emails(session)
    is_sys_admin = player.is_system_admin if player else False
    is_owner = player.is_owner if player else False
    
    if not (is_whitelisted or is_sys_admin or is_owner):
        logger.warning("Admin access denied for email: %s", email)
        raise HTTPException(
            status_code=403, 
            detail={"error": f"Access denied: email '{email}' is not authorized."}
        )

    # 2. IP Whitelist (Toggleable)
    config_cache.refresh_if_stale(session)
    ip_enforcement_enabled = config_cache.get_config_bool("ops.admin_ip_whitelist_enabled", True)

    if ip_enforcement_enabled:
        allowed_ips = _get_admin_ips(session)
        if allowed_ips:
            client_ip = get_client_ip(request)
            if client_ip not in allowed_ips:
                logger.warning("Admin access denied for IP: %s (Email: %s)", client_ip, email)
                raise HTTPException(
                    status_code=403, 
                    detail={"error": f"Access denied: IP '{client_ip}' is not whitelisted."}
                )

    # 3. Session Invalidation
    if player and player.sessions_invalid_before:
        auth_time = decoded.get("auth_time")
        if auth_time:
            auth_dt = datetime.fromtimestamp(auth_time, tz=timezone.utc)
            invalid_before = player.sessions_invalid_before
            if invalid_before.tzinfo is None:
                invalid_before = invalid_before.replace(tzinfo=timezone.utc)
            
            if auth_dt < (invalid_before - timedelta(seconds=2)):
                raise HTTPException(
                    status_code=401,
                    detail={"error": "Admin session invalidated. Please login again."},
                )

    decoded["player"] = player
    decoded["is_owner"] = is_owner
    return decoded


async def get_current_owner(
    admin_token: dict = Depends(get_current_admin)
) -> dict:
    """
    Dependency that ONLY allows owners.
    """
    if not admin_token.get("is_owner"):
        raise HTTPException(status_code=403, detail={"error": "Owner privileges required"})
    return admin_token
