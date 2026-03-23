"""Tests for DBClient using SQLite in-memory — no PostgreSQL required."""
import pytest
from tools.lib.db_client import DBClient


@pytest.fixture
def db():
    client = DBClient(use_sqlite=":memory:")
    # Create a simple test table
    client._conn.execute(
        "CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, value INTEGER DEFAULT 0)"
    )
    client._conn.execute(
        "CREATE TABLE lookup (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)"
    )
    client._conn.commit()
    yield client
    client.close()


def test_query_returns_list_of_dicts(db):
    db._conn.execute("INSERT INTO items (name, value) VALUES ('alpha', 10)")
    db._conn.execute("INSERT INTO items (name, value) VALUES ('beta', 20)")
    db._conn.commit()

    rows = db.query("SELECT * FROM items ORDER BY id")
    assert isinstance(rows, list)
    assert len(rows) == 2
    assert rows[0]["name"] == "alpha"
    assert rows[1]["value"] == 20


def test_query_empty_returns_empty_list(db):
    rows = db.query("SELECT * FROM items")
    assert rows == []


def test_query_with_params(db):
    db._conn.execute("INSERT INTO items (name, value) VALUES ('gamma', 30)")
    db._conn.commit()

    rows = db.query("SELECT * FROM items WHERE name = ?", {"name": "gamma"})
    assert len(rows) == 1
    assert rows[0]["value"] == 30


def test_insert_one_returns_id(db):
    row_id = db.insert_one("items", {"name": "delta", "value": 42})
    assert isinstance(row_id, int)
    assert row_id >= 1

    rows = db.query("SELECT * FROM items WHERE id = ?", {"id": row_id})
    assert rows[0]["name"] == "delta"


def test_insert_batch_returns_ids(db):
    rows_data = [
        {"name": "one", "value": 1},
        {"name": "two", "value": 2},
        {"name": "three", "value": 3},
    ]
    ids = db.insert_batch("items", rows_data)
    assert len(ids) == 3
    assert all(isinstance(i, int) for i in ids)

    rows = db.query("SELECT * FROM items ORDER BY id")
    assert len(rows) == 3
    assert rows[0]["name"] == "one"
    assert rows[2]["value"] == 3


def test_insert_batch_empty_returns_empty(db):
    ids = db.insert_batch("items", [])
    assert ids == []


def test_insert_batch_rollback_on_failure(db):
    # Insert one valid row first
    db.insert_one("items", {"name": "existing", "value": 99})

    # Batch where second row has a NULL name (NOT NULL constraint)
    bad_batch = [
        {"name": "good_row", "value": 1},
        {"name": None, "value": 2},  # violates NOT NULL
    ]
    with pytest.raises(Exception):
        db.insert_batch("items", bad_batch)

    # Only the pre-existing row should remain
    rows = db.query("SELECT * FROM items")
    assert len(rows) == 1
    assert rows[0]["name"] == "existing"


def test_update_returns_affected_count(db):
    db.insert_one("items", {"name": "update_me", "value": 5})
    db.insert_one("items", {"name": "update_me", "value": 6})
    db.insert_one("items", {"name": "keep_me", "value": 7})

    count = db.update("items", {"value": 99}, {"name": "update_me"})
    assert count == 2

    rows = db.query("SELECT * FROM items WHERE name = 'update_me'")
    assert all(r["value"] == 99 for r in rows)

    kept = db.query("SELECT * FROM items WHERE name = 'keep_me'")
    assert kept[0]["value"] == 7


def test_update_no_match_returns_zero(db):
    count = db.update("items", {"value": 0}, {"name": "nonexistent"})
    assert count == 0


def test_count_no_where(db):
    db.insert_one("items", {"name": "a", "value": 1})
    db.insert_one("items", {"name": "b", "value": 2})

    total = db.count("items")
    assert total == 2


def test_count_with_where(db):
    db.insert_one("items", {"name": "x", "value": 10})
    db.insert_one("items", {"name": "x", "value": 20})
    db.insert_one("items", {"name": "y", "value": 30})

    count = db.count("items", {"name": "x"})
    assert count == 2


def test_count_empty_table(db):
    assert db.count("items") == 0


def test_get_lookup_returns_name_id_dict(db):
    db._conn.execute("INSERT INTO lookup (name) VALUES ('warrior')")
    db._conn.execute("INSERT INTO lookup (name) VALUES ('mage')")
    db._conn.execute("INSERT INTO lookup (name) VALUES ('rogue')")
    db._conn.commit()

    lookup = db.get_lookup("lookup")
    assert isinstance(lookup, dict)
    assert set(lookup.keys()) == {"warrior", "mage", "rogue"}
    assert all(isinstance(v, int) for v in lookup.values())


def test_get_lookup_empty_table(db):
    lookup = db.get_lookup("lookup")
    assert lookup == {}
