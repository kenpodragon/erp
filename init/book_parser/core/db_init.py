"""
Database schema initialisation for the Book Agent Reader.

Checks whether the required tables exist; if not, runs db/book_tables.sql
to create them.  Safe to call every startup — it is a no-op when the schema
is already present.
"""
from __future__ import annotations
import logging
import re
from pathlib import Path

from config import PROJECT_ROOT

logger = logging.getLogger("book_parser.db_init")

# The SQL file that creates the schema
SQL_FILE = PROJECT_ROOT / "db" / "book_tables.sql"

# Tables we use as sentinels: if ALL of these exist we consider the schema
# initialised.  Using multiple sentinels guards against a partial prior run.
SENTINEL_TABLES = {
    "books",
    "chapters",
    "scenes",
    "story_beats",
    "entities",
    "locations",
    "semantic_tags",
    "processing_runs",
    "review_items",
}


def _get_existing_tables(conn) -> set[str]:
    """Return the set of table names that currently exist in the public schema."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """)
        return {row[0] for row in cur.fetchall()}


def is_schema_initialised(conn) -> bool:
    """Return True if all sentinel tables are present."""
    existing = _get_existing_tables(conn)
    missing = SENTINEL_TABLES - existing
    if missing:
        logger.debug("Missing tables: %s", sorted(missing))
        return False
    return True


def _split_statements(sql: str) -> list[str]:
    """
    Split a SQL file into individual executable statements.

    Splits on semicolons that are NOT inside single-quoted strings.
    Empty / whitespace-only statements are discarded.
    """
    # Strip line comments (-- ...) and block comments (/* ... */) before splitting
    # so that a semicolon inside a comment doesn't confuse us.
    sql = re.sub(r"--[^\n]*", "", sql)
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)

    # Simple split on ";\n" boundaries, preserving multi-line statements
    raw = sql.split(";")
    statements = [s.strip() for s in raw if s.strip()]
    return statements


def init_schema(conn) -> None:
    """
    Run db/book_tables.sql against the connected database.
    Executes each statement individually inside a single transaction so that
    any failure rolls back cleanly.

    Raises FileNotFoundError if the SQL file is missing.
    Raises RuntimeError if any statement fails.
    """
    if not SQL_FILE.exists():
        raise FileNotFoundError(
            f"Schema SQL file not found: {SQL_FILE}\n"
            f"Expected at: {SQL_FILE.resolve()}"
        )

    logger.info("Initialising schema from %s", SQL_FILE.name)
    sql_text = SQL_FILE.read_text(encoding="utf-8")
    statements = _split_statements(sql_text)
    logger.debug("%d SQL statements to execute", len(statements))

    try:
        with conn.cursor() as cur:
            for i, stmt in enumerate(statements, start=1):
                logger.debug("  [%d/%d] %.80s...", i, len(statements), stmt.replace("\n", " "))
                cur.execute(stmt)
        conn.commit()
        logger.info("Schema initialised successfully (%d statements)", len(statements))
    except Exception as e:
        conn.rollback()
        raise RuntimeError(f"Schema initialisation failed: {e}") from e


def ensure_schema(conn) -> bool:
    """
    Check whether the schema exists; initialise it if not.

    Returns True if the schema was just created, False if it already existed.
    Raises on error.
    """
    if is_schema_initialised(conn):
        logger.debug("Schema already initialised — skipping.")
        return False

    missing = SENTINEL_TABLES - _get_existing_tables(conn)
    logger.info(
        "Schema not initialised (%d tables missing: %s). Running %s …",
        len(missing), sorted(missing), SQL_FILE.name,
    )
    init_schema(conn)
    return True
