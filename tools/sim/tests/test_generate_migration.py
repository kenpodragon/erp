"""Tests for the migration generator."""
import json
import os
import tempfile
import pytest

# Allow imports from tools/sim
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from generate_migration import generate_sql, build_migration


class TestGenerateSQL:
    """Test SQL generation from config overrides."""

    def test_produces_valid_update_statements(self):
        overrides = {"hp_scaling_factor": 1.45, "gold_to_essence_base_rate": 800}
        sql = generate_sql(overrides)
        assert "UPDATE game_configs" in sql
        assert "hp_scaling_factor" in sql
        assert "1.45" in sql
        assert "gold_to_essence_base_rate" in sql
        assert "800" in sql

    def test_only_includes_changed_values(self):
        overrides = {"hp_scaling_factor": 1.45}
        sql = generate_sql(overrides)
        assert "hp_scaling_factor" in sql
        # Should NOT include keys that weren't overridden
        assert "gold_to_essence_base_rate" not in sql
        assert "crit_chance" not in sql

    def test_empty_overrides_produces_no_updates(self):
        sql = generate_sql({})
        assert "UPDATE" not in sql

    def test_sql_uses_where_key_equals(self):
        overrides = {"crit_chance": 0.05}
        sql = generate_sql(overrides)
        assert "WHERE key = 'crit_chance'" in sql

    def test_value_json_is_stringified(self):
        overrides = {"crit_multiplier": 3.0}
        sql = generate_sql(overrides)
        assert "value_json = '3.0'" in sql

    def test_integer_values_stringified(self):
        overrides = {"monsters_per_zone": 15}
        sql = generate_sql(overrides)
        assert "value_json = '15'" in sql


class TestBuildMigration:
    """Test full migration file generation."""

    def test_writes_to_output_path(self):
        overrides = {"hp_scaling_factor": 1.45}
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = os.path.join(tmpdir, "062_balanced_game_configs.sql")
            build_migration(overrides, out_path, run_ids=["math_model_run_001"])
            assert os.path.exists(out_path)

    def test_output_contains_header_comment(self):
        overrides = {"hp_scaling_factor": 1.45}
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = os.path.join(tmpdir, "062_test.sql")
            build_migration(overrides, out_path, run_ids=["run_001"])
            with open(out_path, 'r') as f:
                content = f.read()
            assert "Migration 062" in content
            assert "run_001" in content

    def test_reads_from_config_overrides_json(self):
        """Test the full flow: JSON file -> SQL migration."""
        overrides_data = {
            "description": "Test tuning pass",
            "overrides": {
                "hp_scaling_factor": 1.45,
                "gold_to_essence_base_rate": 800
            }
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            json_path = os.path.join(tmpdir, "config_overrides.json")
            with open(json_path, 'w') as f:
                json.dump(overrides_data, f)
            out_path = os.path.join(tmpdir, "062_balanced.sql")
            # The build_migration_from_file function reads the JSON
            from generate_migration import build_migration_from_file
            build_migration_from_file(json_path, out_path)
            with open(out_path, 'r') as f:
                content = f.read()
            assert "hp_scaling_factor" in content
            assert "gold_to_essence_base_rate" in content
            assert "1.45" in content
