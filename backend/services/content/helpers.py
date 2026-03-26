"""Content service shared helpers."""

from datetime import datetime, timezone


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _paginate(query, page: int, page_size: int):
    """Return (offset, limit) for the given page parameters."""
    offset = (page - 1) * page_size
    return offset, page_size
