"""
tools/seed_entity_families.py

Seeds entity_families table with 10 canonical families, then classifies
all entities into families via type-based mapping + keyword overrides.
"""
from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from tools.generators.lib.base_generator import BaseGenerator
from tools.generators.lib.db_client import DBClient


# ---------------------------------------------------------------------------
# Canonical family definitions
# ---------------------------------------------------------------------------

CANONICAL_FAMILIES = [
    ("wraiths",       "Spectral entities bound between life and death, manifesting as ghostly presences."),
    ("demons",        "Malevolent beings of dark origin, driven by corruption and destruction."),
    ("beasts",        "Natural and supernatural creatures guided by instinct and predatory drive."),
    ("elementals",    "Beings composed of or empowered by primal elemental forces."),
    ("undead",        "Formerly living entities reanimated through dark magic or cursed circumstance."),
    ("constructs",    "Artificially created or magically animated beings without biological origin."),
    ("humanoids",     "Sentient bipedal beings of mortal origin, including human and near-human races."),
    ("celestials",    "Divine or heavenly beings aligned with light, order, or higher planes."),
    ("aberrations",   "Alien intelligences and twisted entities that defy natural classification."),
    ("plants",        "Animate flora, fungal entities, and nature-bound organic life forms."),
]

# ---------------------------------------------------------------------------
# Type → family mapping
# ---------------------------------------------------------------------------

TYPE_FAMILY_MAP: dict[str, str] = {
    "creature":       "beasts",
    "manifestation":  "elementals",
    "spirit":         "wraiths",
    "humanoid":       "humanoids",
    "beast":          "beasts",
    "construct":      "constructs",
}

# Keyword override rules: (keywords_tuple, family)
KEYWORD_RULES: list[tuple[tuple[str, ...], str]] = [
    (("skeleton", "zombie", "lich", "revenant", "ghoul", "wight"),        "undead"),
    (("demon", "fiend", "devil", "daemon", "infernal"),                    "demons"),
    (("golem", "automaton", "sentinel", "construct", "clockwork"),         "constructs"),
    (("angel", "seraph", "celestial", "herald", "divine"),                 "celestials"),
    (("vine", "fungus", "spore", "thorn", "root", "blight", "mycel"),      "plants"),
    (("aberration", "tentacle", "eldritch", "void", "anomaly"),            "aberrations"),
]

DEFAULT_FAMILY = "beasts"


def _classify_name(canonical_name: str, entity_type_name: str, families_lookup: dict[str, int]) -> int:
    """Return family_id for an entity using type map then keyword overrides."""
    name_lower = (canonical_name or "").lower()

    # Keyword overrides take highest priority
    for keywords, family_name in KEYWORD_RULES:
        if any(kw in name_lower for kw in keywords):
            return families_lookup[family_name]

    # Type-based mapping
    type_lower = (entity_type_name or "").lower()
    family_name = TYPE_FAMILY_MAP.get(type_lower, DEFAULT_FAMILY)
    return families_lookup[family_name]


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

class EntityFamilySeeder(BaseGenerator):
    name = "seed_entity_families"
    table = "entities"
    default_batch_size = 50

    # ------------------------------------------------------------------
    # Phase 1 — seed families table
    # ------------------------------------------------------------------

    def _seed_families(self, db: DBClient) -> None:
        """Insert canonical families that don't already exist."""
        existing = {row["name"] for row in db.query("SELECT name FROM entity_families")}
        inserted = 0
        for family_name, description in CANONICAL_FAMILIES:
            if family_name not in existing:
                db.insert_one("entity_families", {
                    "name": family_name,
                    "display_name": family_name.capitalize(),
                    "description": description,
                })
                inserted += 1
        if inserted:
            print(f"[{self.name}] Seeded {inserted} new family row(s) into entity_families.")
        else:
            print(f"[{self.name}] All {len(CANONICAL_FAMILIES)} families already present.")

    # ------------------------------------------------------------------
    # Override run() to seed families first
    # ------------------------------------------------------------------

    def run(self, argv=None):
        db = DBClient()
        try:
            self._seed_families(db)
        finally:
            db.close()
        super().run(argv)

    # ------------------------------------------------------------------
    # BaseGenerator abstract interface
    # ------------------------------------------------------------------

    def get_missing_items(self, db: DBClient) -> list[dict]:
        """Return entities that have no entity_family_id assigned."""
        return db.query(
            """
            SELECT
                e.id,
                e.canonical_name,
                e.base_description,
                et.name AS entity_type_name
            FROM entities e
            LEFT JOIN entity_types et ON et.id = e.entity_type_id
            WHERE e.entity_family_id IS NULL
            """
        )

    def get_group_key(self, item: dict) -> str:
        return item.get("entity_type_name") or "unknown"

    def get_context(self, db: DBClient) -> dict:
        return {
            "families_lookup": db.get_lookup("entity_families"),
            "entity_types_lookup": db.get_lookup("entity_types"),
        }

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        families_lookup: dict[str, int] = context["families_lookup"]
        results = []
        for item in batch:
            family_id = _classify_name(
                item.get("canonical_name", ""),
                item.get("entity_type_name", ""),
                families_lookup,
            )
            results.append({"id": item["id"], "entity_family_id": family_id})
        return results

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        families = list(context["families_lookup"].keys())
        entity_lines = "\n".join(
            f'  - id={e["id"]} name="{e["canonical_name"]}" type="{e.get("entity_type_name", "")}"'
            for e in batch
        )
        return (
            f"Classify these entities into one of the following families:\n"
            f"Families: {', '.join(families)}\n\n"
            f"Entities:\n{entity_lines}\n\n"
            f"Return a JSON array of objects with keys 'id' (integer) and 'family' (string from the list above).\n"
            f"Example: [{{'id': 1, 'family': 'beasts'}}, ...]"
        )

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if "entity_family_id" not in record:
            errors.append("missing entity_family_id")
            return errors
        # Lazy-load valid IDs using a simple query
        rows = db.query("SELECT id FROM entity_families")
        valid_ids = {r["id"] for r in rows}
        if record["entity_family_id"] not in valid_ids:
            errors.append(
                f"entity_family_id {record['entity_family_id']!r} is not a valid entity_families.id"
            )
        return errors

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        """Override: UPDATE entities rather than INSERT."""
        for r in results:
            db.update(
                "entities",
                {"entity_family_id": r["entity_family_id"]},
                {"id": r["id"]},
            )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    EntityFamilySeeder().run()
