"""Admin game shared helpers."""

from datetime import datetime


def _row_to_dict(row) -> dict:
    """Convert a SQLModel row to a plain dict, excluding internal attrs."""
    data = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name, None)
        if isinstance(val, datetime):
            val = val.isoformat()
        data[col.name] = val
    return data
