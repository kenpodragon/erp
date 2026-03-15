"""Public endpoints (no auth required)."""

import os
import logging

from fastapi import APIRouter, Depends
from sqlmodel import Session, text

from db import get_session
import config_cache

logger = logging.getLogger(__name__)

router = APIRouter(tags=["public"])


@router.get("/")
def read_default():
    return {
        "message": "Welcome to the ERP API",
        "endpoints": {
            "health": "/health",
            "hello": "/hello"
        }
    }


@router.get("/health")
def health_check(session: Session = Depends(get_session)):
    db_status = "connected"
    error = None
    try:
        session.exec(text("SELECT 1"))
    except Exception as e:
        db_status = "disconnected"
        error = str(e)

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "database_error": error,
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@router.get("/hello")
def read_root():
    return {"message": "Hello from the ERP Backend!"}


@router.get("/api/config/public")
def get_public_config(session: Session = Depends(get_session)):
    """
    Unauthenticated endpoint returning only settings the frontend needs.
    FR-8.12
    """
    config_cache.refresh_if_stale(session)
    public_keys = [
        "ops.maintenance_mode",
        "ops.maintenance_message",
        "ops.announcement_banner",
        "ops.announcement_banner_type",
        "ops.registration_open",
    ]
    result = {}
    for key in public_keys:
        raw = config_cache.get_config(key, "")
        # Cast booleans for frontend convenience
        if key in ("ops.maintenance_mode", "ops.registration_open"):
            result[key] = raw.lower() in ("true", "1", "yes")
        else:
            result[key] = raw

    # Auth bypass availability (double-gated: .env + DB)
    env_allows = os.getenv("ALLOW_AUTH_BYPASS", "").lower() == "true"
    db_allows = config_cache.get_config_bool("ops.auth_bypass_enabled", False)
    if env_allows and db_allows:
        result["auth_bypass_available"] = True
        result["auth_bypass_player_id"] = config_cache.get_config("ops.auth_bypass_player_id", "")
    else:
        result["auth_bypass_available"] = False

    return result
