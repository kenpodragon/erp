"""Tests for tools/lib/cache.py — GeneratorCache"""
import json
import pytest
from pathlib import Path
from tools.lib.cache import GeneratorCache


@pytest.fixture
def cache(tmp_path):
    return GeneratorCache("test_gen", cache_dir=str(tmp_path))


def test_write_batch_creates_json_file(cache, tmp_path):
    data = [{"id": 1, "name": "foo"}, {"id": 2, "name": "bar"}]
    cache.write_batch("batch_001", data)
    batch_file = tmp_path / "test_gen" / "batch_001.json"
    assert batch_file.exists()
    assert json.loads(batch_file.read_text()) == data


def test_write_batch_updates_manifest(cache, tmp_path):
    data = [{"id": 1}, {"id": 2}, {"id": 3}]
    cache.write_batch("batch_001", data)
    manifest = cache.read_manifest()
    assert "batch_001" in manifest["batches"]
    entry = manifest["batches"]["batch_001"]
    assert entry["status"] == "generated"
    assert entry["item_count"] == 3


def test_read_batch_returns_data(cache):
    data = [{"x": 10}]
    cache.write_batch("batch_002", data)
    result = cache.read_batch("batch_002")
    assert result == data


def test_read_batch_returns_none_for_missing(cache):
    result = cache.read_batch("batch_nonexistent")
    assert result is None


def test_mark_batch_inserted(cache):
    cache.write_batch("batch_003", [{"a": 1}])
    cache.mark_batch("batch_003", "inserted")
    manifest = cache.read_manifest()
    entry = manifest["batches"]["batch_003"]
    assert entry["status"] == "inserted"
    assert "inserted_at" in entry


def test_mark_batch_failed(cache):
    cache.write_batch("batch_004", [{"b": 2}])
    cache.mark_batch("batch_004", "failed", error="DB timeout")
    manifest = cache.read_manifest()
    entry = manifest["batches"]["batch_004"]
    assert entry["status"] == "failed"
    assert entry["error"] == "DB timeout"


def test_get_resumable_returns_generated_only(cache):
    cache.write_batch("batch_005", [{}])
    cache.write_batch("batch_006", [{}])
    cache.write_batch("batch_007", [{}])
    cache.mark_batch("batch_006", "inserted")
    cache.mark_batch("batch_007", "failed", error="oops")
    resumable = cache.get_resumable()
    assert resumable == ["batch_005"]


def test_get_failed_returns_failed_only(cache):
    cache.write_batch("batch_008", [{}])
    cache.write_batch("batch_009", [{}])
    cache.mark_batch("batch_008", "failed", error="err1")
    failed = cache.get_failed()
    assert failed == ["batch_008"]
    assert "batch_009" not in failed


def test_get_inserted_returns_inserted_only(cache):
    cache.write_batch("batch_010", [{}])
    cache.write_batch("batch_011", [{}])
    cache.mark_batch("batch_010", "inserted")
    inserted = cache.get_inserted()
    assert inserted == ["batch_010"]
    assert "batch_011" not in inserted


def test_clean_removes_cache_directory(cache, tmp_path):
    cache.write_batch("batch_012", [{"z": 99}])
    gen_dir = tmp_path / "test_gen"
    assert gen_dir.exists()
    cache.clean()
    assert not gen_dir.exists()
