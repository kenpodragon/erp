"""Tests for tools/lib/base_generator.py"""
import argparse
import asyncio
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock

import pytest

# Ensure tools/ is on path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "tools"))

from lib.base_generator import BaseGenerator
from lib.cache import GeneratorCache


# ---------------------------------------------------------------------------
# MockGenerator subclass for testing
# ---------------------------------------------------------------------------

class MockGenerator(BaseGenerator):
    name = "mock_gen"
    table = "test_table"
    default_batch_size = 10

    def get_missing_items(self, db):
        return [
            {"id": 1, "type": "creature", "name": "Wolf"},
            {"id": 2, "type": "creature", "name": "Bear"},
            {"id": 3, "type": "spirit",   "name": "Wisp"},
        ]

    def build_prompt(self, batch, context):
        return f"Generate for {len(batch)} items"

    def python_fallback(self, batch, context):
        return [{"id": item["id"], "movement": "ground"} for item in batch]

    def validate(self, record, db):
        return [] if "movement" in record else ["missing movement"]

    def get_group_key(self, item):
        return item.get("type", "default")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def gen(tmp_path):
    """Return a MockGenerator with cache rooted in a temp directory."""
    g = MockGenerator()
    g._cache_dir = str(tmp_path / ".cache")
    return g


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.insert_batch.return_value = [1, 2, 3]
    return db


# ---------------------------------------------------------------------------
# CLI parsing
# ---------------------------------------------------------------------------

class TestParseArgs:
    def test_status_command(self, gen):
        ns = gen.parse_args(["status"])
        assert ns.command == "status"

    def test_generate_defaults(self, gen):
        ns = gen.parse_args(["generate"])
        assert ns.command == "generate"
        assert ns.ai is False
        assert ns.parallel == 1
        assert ns.batch_size == gen.default_batch_size
        assert ns.no_insert is False
        assert ns.resume is False
        assert ns.retry_errors is False
        assert ns.estimate is False

    def test_generate_ai_parallel(self, gen):
        ns = gen.parse_args(["generate", "--ai", "--parallel", "4"])
        assert ns.ai is True
        assert ns.parallel == 4

    def test_generate_no_insert(self, gen):
        ns = gen.parse_args(["generate", "--no-insert"])
        assert ns.no_insert is True

    def test_generate_estimate(self, gen):
        ns = gen.parse_args(["generate", "--estimate"])
        assert ns.estimate is True

    def test_generate_batch_size(self, gen):
        ns = gen.parse_args(["generate", "--batch-size", "25"])
        assert ns.batch_size == 25

    def test_generate_resume(self, gen):
        ns = gen.parse_args(["generate", "--resume"])
        assert ns.resume is True

    def test_generate_retry_errors(self, gen):
        ns = gen.parse_args(["generate", "--retry-errors"])
        assert ns.retry_errors is True

    def test_insert_command(self, gen):
        ns = gen.parse_args(["insert"])
        assert ns.command == "insert"

    def test_validate_command(self, gen):
        ns = gen.parse_args(["validate"])
        assert ns.command == "validate"

    def test_export_sql(self, gen):
        ns = gen.parse_args(["export", "--format", "sql"])
        assert ns.command == "export"
        assert ns.format == "sql"

    def test_export_json(self, gen):
        ns = gen.parse_args(["export", "--format", "json"])
        assert ns.format == "json"

    def test_clean_cache_flag(self, gen):
        ns = gen.parse_args(["--clean-cache"])
        assert ns.clean_cache is True


# ---------------------------------------------------------------------------
# _group_items
# ---------------------------------------------------------------------------

class TestGroupItems:
    def test_groups_by_key(self, gen):
        items = gen.get_missing_items(None)
        groups = gen._group_items(items)
        assert set(groups.keys()) == {"creature", "spirit"}
        assert len(groups["creature"]) == 2
        assert len(groups["spirit"]) == 1

    def test_single_item_group(self, gen):
        items = [{"id": 99, "type": "boss", "name": "Dragon"}]
        groups = gen._group_items(items)
        assert "boss" in groups
        assert len(groups["boss"]) == 1

    def test_empty_items(self, gen):
        groups = gen._group_items([])
        assert groups == {}


# ---------------------------------------------------------------------------
# python_fallback
# ---------------------------------------------------------------------------

class TestPythonFallback:
    def test_fallback_produces_valid_records(self, gen):
        items = gen.get_missing_items(None)
        results = gen.python_fallback(items, {})
        assert len(results) == 3
        for r in results:
            assert "movement" in r

    def test_fallback_ids_match(self, gen):
        items = gen.get_missing_items(None)
        results = gen.python_fallback(items, {})
        ids = [r["id"] for r in results]
        assert ids == [1, 2, 3]


# ---------------------------------------------------------------------------
# validate
# ---------------------------------------------------------------------------

class TestValidate:
    def test_valid_record_returns_no_errors(self, gen, mock_db):
        errors = gen.validate({"id": 1, "movement": "ground"}, mock_db)
        assert errors == []

    def test_invalid_record_returns_errors(self, gen, mock_db):
        errors = gen.validate({"id": 1}, mock_db)
        assert "missing movement" in errors

    def test_validate_all_fallback_records(self, gen, mock_db):
        items = gen.get_missing_items(None)
        results = gen.python_fallback(items, {})
        for r in results:
            assert gen.validate(r, mock_db) == []


# ---------------------------------------------------------------------------
# Full orchestration — generate command with --no-insert
# ---------------------------------------------------------------------------

class TestOrchestrationNoInsert:
    def test_generate_no_insert_writes_cache(self, gen, mock_db, tmp_path):
        """Run _cmd_generate with fallback, no-insert; cache files should exist."""
        cache_dir = str(tmp_path / ".cache")
        gen._cache_dir = cache_dir

        args = gen.parse_args(["generate", "--no-insert"])

        # Patch DBClient to return mock_db
        with patch("lib.base_generator.DBClient", return_value=mock_db):
            asyncio.run(gen._cmd_generate(args))

        # Cache directory for mock_gen should exist with at least one batch file
        cache_path = Path(cache_dir) / "mock_gen"
        json_files = [f for f in cache_path.iterdir() if f.suffix == ".json" and f.name != "manifest.json"]
        assert len(json_files) >= 1

    def test_generate_no_insert_skips_db_insert(self, gen, mock_db, tmp_path):
        """With --no-insert, insert_batch should NOT be called."""
        gen._cache_dir = str(tmp_path / ".cache")
        args = gen.parse_args(["generate", "--no-insert"])

        with patch("lib.base_generator.DBClient", return_value=mock_db):
            asyncio.run(gen._cmd_generate(args))

        mock_db.insert_batch.assert_not_called()

    def test_generate_default_inserts(self, gen, mock_db, tmp_path):
        """Without --no-insert, insert_batch SHOULD be called."""
        gen._cache_dir = str(tmp_path / ".cache")
        args = gen.parse_args(["generate"])

        with patch("lib.base_generator.DBClient", return_value=mock_db):
            asyncio.run(gen._cmd_generate(args))

        mock_db.insert_batch.assert_called()

    def test_estimate_exits_without_generating(self, gen, mock_db, tmp_path, capsys):
        """--estimate should print batch/group counts and return early."""
        gen._cache_dir = str(tmp_path / ".cache")
        args = gen.parse_args(["generate", "--estimate"])

        with patch("lib.base_generator.DBClient", return_value=mock_db):
            asyncio.run(gen._cmd_generate(args))

        captured = capsys.readouterr()
        assert "creature" in captured.out or "spirit" in captured.out or "batch" in captured.out.lower()
        # No cache batches should be written
        cache_path = Path(tmp_path / ".cache" / "mock_gen")
        if cache_path.exists():
            json_files = [f for f in cache_path.iterdir() if f.suffix == ".json" and f.name != "manifest.json"]
            assert len(json_files) == 0


# ---------------------------------------------------------------------------
# _cmd_status
# ---------------------------------------------------------------------------

class TestCmdStatus:
    def test_status_prints_counts(self, gen, mock_db, capsys):
        with patch("lib.base_generator.DBClient", return_value=mock_db):
            gen._cmd_status()
        captured = capsys.readouterr()
        assert "missing" in captured.out.lower() or "3" in captured.out


# ---------------------------------------------------------------------------
# _cmd_export
# ---------------------------------------------------------------------------

class TestCmdExport:
    def _seed_cache(self, gen, tmp_path):
        cache_dir = str(tmp_path / ".cache")
        gen._cache_dir = cache_dir
        cache = GeneratorCache("mock_gen", cache_dir)
        cache.write_batch("batch_001", [
            {"id": 1, "movement": "ground", "name": "Wolf's Peak"},
            {"id": 2, "movement": "fly"},
        ])
        return cache_dir

    def test_export_json(self, gen, tmp_path, capsys):
        self._seed_cache(gen, tmp_path)
        gen._cmd_export("json")
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert isinstance(data, list)
        assert len(data) == 2

    def test_export_sql_escapes_quotes(self, gen, tmp_path, capsys):
        self._seed_cache(gen, tmp_path)
        gen._cmd_export("sql")
        captured = capsys.readouterr()
        # Single quotes in string values should be doubled
        assert "Wolf''s Peak" in captured.out
        assert "INSERT INTO" in captured.out


# ---------------------------------------------------------------------------
# _insert_results default behaviour
# ---------------------------------------------------------------------------

class TestInsertResults:
    def test_calls_insert_batch(self, gen, mock_db):
        rows = [{"id": 1, "movement": "ground"}]
        gen._insert_results(mock_db, rows)
        mock_db.insert_batch.assert_called_once_with(gen.table, rows)
