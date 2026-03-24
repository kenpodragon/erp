#!/usr/bin/env python3
"""
tools/generate_artifact_icons.py

Generator for curated artifact icon sprite keys.
Generates a unique icon_sprite_key per artifact and inserts asset_registry entries.

Usage (from tools/ directory):
    python generate_artifact_icons.py status
    python generate_artifact_icons.py generate
    python generate_artifact_icons.py generate --estimate
    python generate_artifact_icons.py insert
    python generate_artifact_icons.py validate
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


class ArtifactIconGenerator(BaseGenerator):
    name = "generate_artifact_icons"
    table = "curated_artifacts"
    default_batch_size = 20

    def get_missing_items(self, db: DBClient) -> list[dict]:
        # Generate for all curated artifacts — check if icon_sprite_key points to
        # a real asset_registry entry, or generate if missing/unverified
        sql = """
            SELECT
                ca.id,
                ca.name,
                ca.source_type,
                ca.icon_sprite_key
            FROM curated_artifacts ca
            LEFT JOIN asset_registry ar ON ar.asset_key = ca.icon_sprite_key
            WHERE ar.id IS NULL
               OR ca.icon_sprite_key IS NULL
            ORDER BY ca.id
        """
        return db.query(sql)

    def get_group_key(self, item: dict) -> str:
        return (item.get("source_type") or "unknown").lower()

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            artifact_id = item["id"]
            source_type = (item.get("source_type") or "unknown").lower()
            sprite_key = f"artifact_icon_{artifact_id}"

            asset_config = {
                "type": "sprite",
                "category": "artifact_icon",
                "source_type": source_type,
                "size": "64x64",
                "format": "png",
            }

            results.append({
                "id": artifact_id,
                "icon_sprite_key": sprite_key,
                "asset_config": json.dumps(asset_config),
            })
        return results

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [
            f"  - id={r['id']} name=\"{r.get('name')}\" source_type=\"{r.get('source_type')}\""
            for r in batch
        ]
        return (
            "Generate icon sprite keys for these curated artifacts.\n"
            "Return JSON array with fields: id, icon_sprite_key\n\n"
            + "\n".join(lines)
        )

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("id"):
            errors.append("id is required")
        if not record.get("icon_sprite_key"):
            errors.append("icon_sprite_key is required")
        return errors

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        for record in results:
            artifact_id = record["id"]
            sprite_key = record["icon_sprite_key"]
            asset_config = record.get("asset_config", "{}")

            # Update curated_artifact
            db.update("curated_artifacts", {"icon_sprite_key": sprite_key}, {"id": artifact_id})

            # Insert asset_registry entry if not already present
            existing = db.query(
                "SELECT id FROM asset_registry WHERE asset_key = %s LIMIT 1",
                [sprite_key],
            )
            if not existing:
                db.insert_batch("asset_registry", [{
                    "asset_key": sprite_key,
                    "category": "artifact_icon",
                    "render_definition": asset_config,
                    "source": "generator",
                }])


if __name__ == "__main__":
    ArtifactIconGenerator().run()
