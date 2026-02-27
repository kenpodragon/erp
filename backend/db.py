"""
Database engine and session management for ERP API.

Centralizes the SQLModel engine and provides the get_session() dependency
used across all route handlers.
"""

import os
from dotenv import load_dotenv
from sqlmodel import Session, create_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)


def get_session():
    """FastAPI dependency that yields a SQLModel session."""
    with Session(engine) as session:
        yield session
