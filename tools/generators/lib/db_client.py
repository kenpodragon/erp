"""Database client module providing CRUD helpers for generator pipeline tools.

Supports PostgreSQL (via psycopg2) for production and SQLite (in-memory) for testing.
"""
from __future__ import annotations

import os
import sqlite3
from typing import Optional

try:
    import psycopg2
    import psycopg2.extras
    _PSYCOPG2_AVAILABLE = True
except ImportError:
    _PSYCOPG2_AVAILABLE = False

try:
    from dotenv import load_dotenv
    _DOTENV_AVAILABLE = True
except ImportError:
    _DOTENV_AVAILABLE = False


class DBClient:
    """Thin database client for generator pipeline tools.

    Usage (PostgreSQL):
        db = DBClient(env_file="backend/.env")

    Usage (SQLite — testing only):
        db = DBClient(use_sqlite=":memory:")
    """

    def __init__(self, env_file: str = "backend/.env", use_sqlite: str = None):
        self._use_sqlite = use_sqlite is not None
        if self._use_sqlite:
            self._conn = sqlite3.connect(use_sqlite)
            self._conn.row_factory = sqlite3.Row
        else:
            if not _PSYCOPG2_AVAILABLE:
                raise ImportError("psycopg2 is required for PostgreSQL connections. Install it with: pip install psycopg2-binary")
            database_url = os.environ.get("DATABASE_URL")
            if not database_url and _DOTENV_AVAILABLE and os.path.exists(env_file):
                load_dotenv(env_file)
                database_url = os.environ.get("DATABASE_URL")
            if not database_url:
                raise ValueError(f"DATABASE_URL not found in environment or {env_file}")
            self._conn = psycopg2.connect(database_url)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _cursor(self):
        if self._use_sqlite:
            return self._conn.cursor()
        return self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def _placeholder(self) -> str:
        return "?" if self._use_sqlite else "%s"

    def _row_to_dict(self, row) -> dict:
        if self._use_sqlite:
            return dict(row)
        return dict(row)  # RealDictCursor already behaves like dict

    def _build_where_clause(self, where: dict) -> tuple[str, list]:
        """Build 'WHERE col = ? AND col2 = ?' and matching param list."""
        ph = self._placeholder()
        clauses = [f"{col} = {ph}" for col in where]
        return " AND ".join(clauses), list(where.values())

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def query(self, sql: str, params=None) -> list[dict]:
        """Execute a SELECT query and return results as a list of dicts."""
        cur = self._cursor()
        try:
            if params:
                if isinstance(params, dict):
                    cur.execute(sql, list(params.values()))
                else:
                    cur.execute(sql, params)
            else:
                cur.execute(sql)
            rows = cur.fetchall()
            return [self._row_to_dict(r) for r in rows]
        except Exception:
            if self._is_pg:
                self._conn.rollback()
            raise
        finally:
            cur.close()

    def insert_one(self, table: str, data: dict) -> Optional[int]:
        """Insert a single row into *table* and return its generated ID."""
        ph = self._placeholder()
        columns = ", ".join(data.keys())
        placeholders = ", ".join([ph] * len(data))
        values = list(data.values())

        if self._use_sqlite:
            sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
            cur = self._cursor()
            cur.execute(sql, values)
            row_id = cur.lastrowid
            cur.close()
            self._conn.commit()
            return row_id
        else:
            sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders}) RETURNING id"
            cur = self._cursor()
            cur.execute(sql, values)
            row = cur.fetchone()
            cur.close()
            self._conn.commit()
            return row["id"] if row else None

    def insert_batch(self, table: str, rows: list[dict]) -> list[int]:
        """Insert multiple rows in a single transaction.

        Returns a list of generated IDs. Rolls back the entire batch on any failure.
        """
        if not rows:
            return []

        ph = self._placeholder()
        columns = ", ".join(rows[0].keys())
        placeholders = ", ".join([ph] * len(rows[0]))
        ids: list[int] = []

        cur = self._cursor()
        try:
            if self._use_sqlite:
                sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
                for row in rows:
                    cur.execute(sql, list(row.values()))
                    ids.append(cur.lastrowid)
                self._conn.commit()
            else:
                sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders}) RETURNING id"
                for row in rows:
                    cur.execute(sql, list(row.values()))
                    result = cur.fetchone()
                    ids.append(result["id"])
                self._conn.commit()
        except Exception:
            self._conn.rollback()
            cur.close()
            raise
        cur.close()
        return ids

    def update(self, table: str, data: dict, where: dict) -> int:
        """Update rows in *table* matching *where* with *data*.

        Returns the number of rows affected.
        """
        ph = self._placeholder()
        set_clause = ", ".join(f"{col} = {ph}" for col in data)
        where_clause, where_vals = self._build_where_clause(where)
        sql = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        values = list(data.values()) + where_vals

        cur = self._cursor()
        cur.execute(sql, values)
        affected = cur.rowcount
        cur.close()
        self._conn.commit()
        return affected

    def count(self, table: str, where: dict = None) -> int:
        """Return the number of rows in *table*, optionally filtered by *where*."""
        if where:
            where_clause, values = self._build_where_clause(where)
            sql = f"SELECT COUNT(*) FROM {table} WHERE {where_clause}"
            cur = self._cursor()
            cur.execute(sql, values)
        else:
            sql = f"SELECT COUNT(*) FROM {table}"
            cur = self._cursor()
            cur.execute(sql)

        row = cur.fetchone()
        cur.close()
        # SQLite returns a plain tuple; psycopg2 RealDictCursor returns dict
        if isinstance(row, (sqlite3.Row, dict)):
            val = dict(row)
            return list(val.values())[0]
        return row[0]

    def get_lookup(self, table: str) -> dict[str, int]:
        """Return a {name: id} mapping for the entire *table*.

        Assumes the table has columns named *id* and *name*.
        """
        rows = self.query(f"SELECT id, name FROM {table}")
        return {r["name"]: r["id"] for r in rows}

    def close(self):
        """Close the underlying database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None
