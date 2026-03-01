"""
Phase 3: Post-Processing & Consistency Validation.

This phase operates across ALL books (after Phase 2 is complete for all).
Steps:
  1. Feed the AI a summary of all entities + all semantic tag values.
  2. AI returns: entity merge proposals, taxonomy standardisation mappings,
     and a list of inconsistency flags.
  3. Apply auto-fixable items (taxonomy mappings, entity merges flagged as safe).
  4. Insert remaining inconsistencies as review_items for Phase 4.
  5. Mark all chapters as 'post_processed'.
  6. Write CONSISTENCY_REPORT.md to the book_parser directory.
"""
from __future__ import annotations
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from config import BOOK_REGISTRY, PARSER_DIR
from core.ai_provider import AIProvider
from core.db import (
    get_book_id, get_chapters_for_book, update_chapter_status,
    get_entities_summary, update_canonical_tag_values,
    insert_review_item, transaction,
)
from core.display import ProgressTracker
from core.models import Phase3Response, EntityMergeProposal, TaxonomyMapping, InconsistencyFlag

import psycopg2.extras

logger = logging.getLogger("book_parser.phase3")

REPORT_PATH = PARSER_DIR / "CONSISTENCY_REPORT.md"

# ── Prompts ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a continuity editor for a fantasy novel trilogy. You will receive:
1. A list of all entities extracted across all books.
2. All distinct semantic tag values grouped by category.

Your job is to return structured JSON with three sections:

entity_merges: Entities that are duplicates or aliases of each other, and should be merged.
  Propose a keep_canonical_name and list the names to merge from.
  Only propose merges you are confident about.

taxonomy_mappings: Semantic tag values that should be standardized.
  Map varied phrasings to a single canonical value per category.
  Example: "dread", "fear", "terror" → canonical "fear" in the "emotion" category.

inconsistencies: Narrative issues worth flagging for human review.
  Use severity: info | warning | error.
  Use category: entity_resolution | description_inconsistency | timeline_gap |
                taxonomy_change | cross_provider_discrepancy
  Be specific about what is wrong and what action to take.
"""


def _build_user_prompt(entities: list[dict], tag_values: dict[str, list[str]]) -> str:
    entity_lines = [
        f"  - {e['canonical_name']} ({e['entity_type']})"
        + (f" | aliases: {', '.join(filter(None, e.get('aliases') or []))}"
           if e.get("aliases") else "")
        for e in entities
    ]

    tag_lines = []
    for category, values in tag_values.items():
        tag_lines.append(f"  {category}: {', '.join(sorted(set(values)))}")

    return (
        f"ENTITIES ({len(entities)} total):\n" + "\n".join(entity_lines) + "\n\n"
        f"SEMANTIC TAG VALUES BY CATEGORY:\n" + "\n".join(tag_lines) + "\n\n"
        "Identify merge opportunities, taxonomy standardisations, and inconsistencies."
    )


# ── Entity merge application ───────────────────────────────────────────────

def _apply_entity_merges(conn, merges: list[EntityMergeProposal]) -> int:
    """
    Merge duplicate entities by re-pointing all FKs to the keep entity, then
    deleting the merged rows. Returns count of merges applied.
    """
    count = 0
    with conn.cursor() as cur:
        for proposal in merges:
            # Get the keep entity id
            cur.execute(
                "SELECT id FROM entities WHERE canonical_name = %s",
                (proposal.keep_canonical_name,)
            )
            row = cur.fetchone()
            if not row:
                logger.warning(
                    "Merge target '%s' not found in DB — skipping",
                    proposal.keep_canonical_name,
                )
                continue
            keep_id = row[0]

            for merge_from in proposal.merge_from_names:
                cur.execute(
                    "SELECT id FROM entities WHERE canonical_name = %s",
                    (merge_from,)
                )
                row = cur.fetchone()
                if not row:
                    logger.debug("Merge source '%s' not found — skipping", merge_from)
                    continue
                merge_id = row[0]

                # Add the merged name as an alias on the keep entity
                cur.execute("""
                    INSERT INTO entity_aliases (entity_id, alias, context)
                    VALUES (%s, %s, 'merged from duplicate')
                    ON CONFLICT (entity_id, alias) DO NOTHING
                """, (keep_id, merge_from))

                # Re-point scene appearances
                cur.execute("""
                    UPDATE entity_scene_appearances
                    SET entity_id = %s
                    WHERE entity_id = %s
                    ON CONFLICT (entity_id, scene_id) DO NOTHING
                """, (keep_id, merge_id))
                # Delete any conflicts (keep_id already has that scene)
                cur.execute("""
                    DELETE FROM entity_scene_appearances
                    WHERE entity_id = %s
                """, (merge_id,))

                # Re-point beat appearances
                cur.execute("""
                    UPDATE entity_beat_appearances
                    SET entity_id = %s
                    WHERE entity_id = %s
                    ON CONFLICT (entity_id, story_beat_id) DO NOTHING
                """, (keep_id, merge_id))
                cur.execute("""
                    DELETE FROM entity_beat_appearances
                    WHERE entity_id = %s
                """, (merge_id,))

                # Delete aliases
                cur.execute("DELETE FROM entity_aliases WHERE entity_id = %s", (merge_id,))

                # Delete the entity itself
                cur.execute("DELETE FROM entities WHERE id = %s", (merge_id,))

                count += 1
                logger.info("  Merged entity '%s' → '%s'", merge_from, proposal.keep_canonical_name)

    return count


# ── Tag data gathering ─────────────────────────────────────────────────────

def _get_tag_values(conn) -> dict[str, list[str]]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT DISTINCT category, value FROM semantic_tags ORDER BY category, value")
        result: dict[str, list[str]] = {}
        for row in cur.fetchall():
            result.setdefault(row["category"], []).append(row["value"])
    return result


# ── Report writing ─────────────────────────────────────────────────────────

def _write_report(response: Phase3Response, merge_count: int,
                  taxonomy_count: int, review_count: int) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "# Consistency Report",
        f"Generated: {now}",
        "",
        "## Summary",
        f"- Entity merges applied: {merge_count}",
        f"- Taxonomy mappings applied: {taxonomy_count}",
        f"- Review items created: {review_count}",
        "",
        "## Entity Merges",
    ]

    if response.entity_merges:
        for m in response.entity_merges:
            lines.append(f"- **{m.keep_canonical_name}** ← {', '.join(m.merge_from_names)}")
            lines.append(f"  *{m.reason}*")
    else:
        lines.append("None.")

    lines += ["", "## Taxonomy Standardisations"]
    if response.taxonomy_mappings:
        by_cat: dict[str, list[TaxonomyMapping]] = {}
        for tm in response.taxonomy_mappings:
            by_cat.setdefault(tm.category, []).append(tm)
        for cat, mappings in sorted(by_cat.items()):
            lines.append(f"### {cat.capitalize()}")
            for tm in mappings:
                lines.append(f"- `{tm.original_value}` → `{tm.canonical_value}`")
    else:
        lines.append("None.")

    lines += ["", "## Inconsistencies / Review Items"]
    if response.inconsistencies:
        for item in response.inconsistencies:
            severity_badge = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(item.severity, "")
            lines.append(f"### {severity_badge} {item.title} [{item.severity.upper()}]")
            lines.append(f"**Category:** {item.category}")
            lines.append(f"**Description:** {item.description}")
            lines.append(f"**Suggested action:** {item.suggested_action}")
            lines.append("")
    else:
        lines.append("None.")

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    logger.info("Consistency report written to %s", REPORT_PATH)


# ── Main phase entry point ─────────────────────────────────────────────────

def run_phase3(conn, ai: AIProvider, tracker: ProgressTracker) -> None:
    """
    Run Phase 3 (cross-book consistency). No book_number argument — operates globally.
    """
    logger.info("Phase 3 — Post-Processing & Consistency Validation")

    # Gather all entities and tag values
    entities = get_entities_summary(conn)
    tag_values = _get_tag_values(conn)

    if not entities:
        logger.warning("No entities found — did Phase 2 run?")
        return

    logger.info("  %d entities, tag categories: %s", len(entities), list(tag_values.keys()))
    tracker.set_items("Calling AI for consistency analysis...", total=1)

    user_prompt = _build_user_prompt(entities, tag_values)
    json_text, provider, model_id = ai.call(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        response_model=Phase3Response,
    )
    result: Phase3Response = ai.parse_response(json_text, Phase3Response)
    tracker.advance_item()

    logger.info(
        "  AI returned: %d merges, %d taxonomy mappings, %d inconsistencies [%s]",
        len(result.entity_merges),
        len(result.taxonomy_mappings),
        len(result.inconsistencies),
        provider,
    )

    # Apply entity merges
    merge_count = 0
    if result.entity_merges:
        tracker.set_items("Applying entity merges...", total=len(result.entity_merges))
        with transaction(conn):
            merge_count = _apply_entity_merges(conn, result.entity_merges)
        tracker.advance_item()

    # Apply taxonomy mappings
    taxonomy_count = 0
    if result.taxonomy_mappings:
        tracker.set_items("Applying taxonomy standardisation...", total=1)
        mappings = [
            {"category": tm.category, "original_value": tm.original_value,
             "canonical_value": tm.canonical_value}
            for tm in result.taxonomy_mappings
        ]
        with transaction(conn):
            taxonomy_count = update_canonical_tag_values(conn, mappings)
        logger.info("  Applied %d taxonomy updates", taxonomy_count)
        tracker.advance_item()

    # Insert inconsistencies as review items
    review_count = 0
    if result.inconsistencies:
        tracker.set_items("Creating review items...", total=len(result.inconsistencies))
        with transaction(conn):
            for flag in result.inconsistencies:
                insert_review_item(
                    conn,
                    category=flag.category,
                    severity=flag.severity,
                    title=flag.title,
                    description=flag.description,
                    suggested_action=flag.suggested_action,
                    scene_id=flag.affected_scene_id,
                    beat_id=flag.affected_beat_id,
                )
                review_count += 1
        tracker.advance_item()

    # Mark all chapters post_processed
    tracker.set_items("Marking chapters post-processed...", total=1)
    with transaction(conn):
        for book in BOOK_REGISTRY:
            book_id = get_book_id(conn, book["book_number"])
            if not book_id:
                continue
            chapters = get_chapters_for_book(conn, book_id)
            for ch in chapters:
                update_chapter_status(conn, ch["id"], "post_processed")
    tracker.advance_item()

    # Write report
    _write_report(result, merge_count, taxonomy_count, review_count)

    tracker.log(
        f"Phase 3 complete: {merge_count} merges, {taxonomy_count} taxonomy fixes, "
        f"{review_count} review items  [{provider}]",
        style="cyan",
    )
    logger.info("Phase 3 complete.")
