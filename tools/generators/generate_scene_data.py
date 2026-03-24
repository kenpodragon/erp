#!/usr/bin/env python3
"""
tools/generate_scene_data.py

Generator for scene_gameplay_data and scene_wave_configs.
Assigns atmosphere_id from chapter, and populates default wave configs.

Usage (from tools/ directory):
    python generate_scene_data.py status
    python generate_scene_data.py generate
    python generate_scene_data.py generate --estimate
    python generate_scene_data.py insert
    python generate_scene_data.py validate
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure repo root is on sys.path so `tools.generators.lib` resolves
_REPO_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from tools.generators.lib.base_generator import BaseGenerator
from tools.generators.lib.db_client import DBClient


class SceneDataGenerator(BaseGenerator):
    name = "generate_scene_data"
    table = "scene_gameplay_data"
    default_batch_size = 50

    def get_missing_items(self, db: DBClient) -> list[dict]:
        # Scenes missing a scene_gameplay_data row entirely
        sql_missing = """
            SELECT
                s.id,
                s.chapter_id,
                s.scene_number,
                s.scene_type
            FROM scenes s
            LEFT JOIN scene_gameplay_data sgd ON sgd.scene_id = s.id
            WHERE sgd.id IS NULL
            ORDER BY s.id
        """
        # Scenes where sgd exists but atmosphere_id IS NULL
        sql_no_atmo = """
            SELECT
                s.id,
                s.chapter_id,
                s.scene_number,
                s.scene_type
            FROM scenes s
            INNER JOIN scene_gameplay_data sgd ON sgd.scene_id = s.id
            WHERE sgd.atmosphere_id IS NULL
            ORDER BY s.id
        """
        missing = db.query(sql_missing)
        no_atmo = db.query(sql_no_atmo)
        # Tag so _insert_results can route correctly
        for row in missing:
            row["_needs_insert"] = True
        for row in no_atmo:
            row["_needs_insert"] = False
        return missing + no_atmo

    def get_group_key(self, item: dict) -> str:
        return str(item.get("chapter_id", "unknown"))

    def get_context(self, db: DBClient) -> dict:
        chapters = db.query("SELECT id, atmosphere_id FROM chapters")
        chapter_atmosphere = {c["id"]: c["atmosphere_id"] for c in chapters}
        backgrounds = db.query("SELECT id, name FROM backgrounds ORDER BY id") if self._table_exists(db, "backgrounds") else []
        return {
            "chapter_atmosphere": chapter_atmosphere,
            "backgrounds": backgrounds,
        }

    def _table_exists(self, db: DBClient, table_name: str) -> bool:
        rows = db.query(
            "SELECT to_regclass(%s) AS t", [table_name]
        )
        return bool(rows and rows[0].get("t"))

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        chapter_atmosphere = context["chapter_atmosphere"]
        results = []
        for item in batch:
            scene_id = item["id"]
            chapter_id = item.get("chapter_id")
            scene_number = item.get("scene_number") or 0
            scene_type = item.get("scene_type") or ""
            atmosphere_id = chapter_atmosphere.get(chapter_id)
            is_boss = scene_type in ("chapter_boss", "book_boss")

            if item.get("_needs_insert", True):
                # New scene_gameplay_data row
                results.append({
                    "_record_type": "scene_gameplay_data",
                    "scene_id": scene_id,
                    "required_time_seconds": 300,
                    "atmosphere_id": atmosphere_id,
                    "background_id": None,
                    "is_boss_scene": is_boss,
                })
                # Also generate wave config for new scenes
                results.append({
                    "_record_type": "scene_wave_configs",
                    "scene_id": scene_id,
                    "max_enemies_per_wave": 3 + (scene_number // 20),
                    "wave_count": 5 + (scene_number // 30),
                    "spawn_interval_ms": max(1000, 3000 - scene_number * 10),
                    "scaling_factor": 1.0,
                    "hp_multiplier": 1.0,
                    "gold_multiplier": 1.0,
                    "entity_pool": "[]",
                })
            else:
                # Just update atmosphere_id
                results.append({
                    "_record_type": "scene_gameplay_data_update",
                    "scene_id": scene_id,
                    "atmosphere_id": atmosphere_id,
                })
        return results

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [f"  - scene_id={r['id']} chapter_id={r.get('chapter_id')} scene_number={r.get('scene_number')} scene_type={r.get('scene_type')}" for r in batch]
        return f"Generate scene_gameplay_data for:\n" + "\n".join(lines)

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("scene_id"):
            errors.append("scene_id is required")
        return errors

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        sgd_inserts = []
        wave_inserts = []
        atmo_updates = []

        for r in results:
            rtype = r.pop("_record_type", "scene_gameplay_data")
            if rtype == "scene_gameplay_data":
                sgd_inserts.append(r)
            elif rtype == "scene_wave_configs":
                wave_inserts.append(r)
            elif rtype == "scene_gameplay_data_update":
                atmo_updates.append(r)

        if sgd_inserts:
            db.insert_batch("scene_gameplay_data", sgd_inserts)

        if wave_inserts:
            # Only insert wave configs that don't already exist
            for row in wave_inserts:
                scene_id = row["scene_id"]
                exists = db.query(
                    "SELECT id FROM scene_wave_configs WHERE scene_id = %s LIMIT 1",
                    [scene_id]
                )
                if not exists:
                    db.insert_batch("scene_wave_configs", [row])

        if atmo_updates:
            for row in atmo_updates:
                db.update("scene_gameplay_data", {"atmosphere_id": row["atmosphere_id"]}, {"scene_id": row["scene_id"]})


if __name__ == "__main__":
    SceneDataGenerator().run()
