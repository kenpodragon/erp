"""
In-memory config cache for server_config values.

Loaded on startup, refreshed every 60 seconds or on-demand when
an admin changes a value. All config values are stored as strings
in the DB; typed accessors cast them at read time.
"""

import time
import logging
from typing import Optional
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

# Module-level cache state
_cache: dict[str, str] = {}
_last_refresh: float = 0.0
_refresh_interval: float = 60.0  # seconds


def load_config(session: Session) -> None:
    """Load all server_config rows into memory."""
    global _cache, _last_refresh

    from models import ServerConfig

    rows = session.exec(select(ServerConfig)).all()
    _cache = {row.key: (row.value or "") for row in rows}
    _last_refresh = time.time()
    logger.info("Config cache loaded: %d keys", len(_cache))


def invalidate() -> None:
    """Force the next access to reload from DB."""
    global _last_refresh
    _last_refresh = 0.0


def refresh_if_stale(session: Session) -> None:
    """Reload config if more than _refresh_interval seconds have passed."""
    if time.time() - _last_refresh > _refresh_interval:
        load_config(session)


def get_config(key: str, default: Optional[str] = None) -> Optional[str]:
    """Return raw string value from cache."""
    return _cache.get(key, default)


def get_config_bool(key: str, default: bool = False) -> bool:
    """Return config value as boolean."""
    val = _cache.get(key)
    if val is None:
        return default
    return val.lower() in ("true", "1", "yes")


def get_config_int(key: str, default: int = 0) -> int:
    """Return config value as integer."""
    val = _cache.get(key)
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def get_config_float(key: str, default: float = 0.0) -> float:
    """Return config value as float."""
    val = _cache.get(key)
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default
