"""
Database engine and session management for ERP API.

Centralizes the SQLModel engine and provides the get_session() dependency
used across all route handlers.
"""

import os
import logging
from dotenv import load_dotenv
from sqlmodel import Session, create_engine

logger = logging.getLogger(__name__)

logger.info("db.py: Loading .env...")
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("db.py: DATABASE_URL is NOT set!")
else:
    logger.info("db.py: DATABASE_URL found (length: %d)", len(DATABASE_URL))

try:
    engine = create_engine(DATABASE_URL)
    logger.info("db.py: Engine created successfully")
except Exception as e:
    logger.error("db.py: Failed to create engine: %s", e)
    raise


def get_session():
    """FastAPI dependency that yields a SQLModel session."""
    with Session(engine) as session:
        yield session
