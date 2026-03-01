"""
Database layer for the Book Agent Reader.
All PostgreSQL operations via psycopg2. Callers must pass a connection.
"""
from __future__ import annotations
import os
import logging
from contextlib import contextmanager
from typing import Generator, Optional

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("book_parser.db")


# ── Connection ─────────────────────────────────────────────────────────────

def get_connection() -> psycopg2.extensions.connection:
    """Open and return a psycopg2 connection."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set in environment")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


@contextmanager
def transaction(conn) -> Generator:
    """Context manager that commits on success, rolls back on error."""
    try:
        yield
        conn.commit()
    except Exception:
        conn.rollback()
        raise


# ── Books ──────────────────────────────────────────────────────────────────

def get_or_create_book(conn, book_number: int, title: str, source_file: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM books WHERE book_number = %s",
            (book_number,)
        )
        row = cur.fetchone()
        if row:
            return row[0]
        cur.execute(
            "INSERT INTO books (book_number, title, source_file) VALUES (%s, %s, %s) RETURNING id",
            (book_number, title, source_file)
        )
        return cur.fetchone()[0]


def get_book_id(conn, book_number: int) -> Optional[int]:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM books WHERE book_number = %s", (book_number,))
        row = cur.fetchone()
        return row[0] if row else None


# ── Chapters ───────────────────────────────────────────────────────────────

def upsert_chapter(conn, book_id: int, chapter_number: int, title: Optional[str],
                   raw_text: str, sort_order: int) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO chapters (book_id, chapter_number, title, raw_text, sort_order, processing_status)
            VALUES (%s, %s, %s, %s, %s, 'not_started')
            ON CONFLICT (book_id, chapter_number)
            DO UPDATE SET title = EXCLUDED.title, raw_text = EXCLUDED.raw_text, sort_order = EXCLUDED.sort_order,
                          updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (book_id, chapter_number, title, raw_text, sort_order))
        return cur.fetchone()[0]


def get_chapters_for_book(conn, book_id: int) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, chapter_number, title, sort_order, processing_status
            FROM chapters WHERE book_id = %s ORDER BY sort_order
        """, (book_id,))
        return [dict(r) for r in cur.fetchall()]


def update_chapter_status(conn, chapter_id: int, status: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE chapters SET processing_status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (status, chapter_id)
        )


# ── Scenes ─────────────────────────────────────────────────────────────────

def upsert_scene(conn, chapter_id: int, scene_number: int, title: Optional[str],
                 summary: Optional[str], raw_text: str, sort_order: int,
                 has_hard_break: bool) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO scenes (chapter_id, scene_number, title, summary, raw_text, sort_order, has_hard_break)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (chapter_id, scene_number)
            DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary,
                          raw_text = EXCLUDED.raw_text, sort_order = EXCLUDED.sort_order,
                          has_hard_break = EXCLUDED.has_hard_break, updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (chapter_id, scene_number, title, summary, raw_text, sort_order, has_hard_break))
        return cur.fetchone()[0]


def update_scene_location(conn, scene_id: int, location_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE scenes SET primary_location_id = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (location_id, scene_id)
        )


def get_scenes_for_chapter(conn, chapter_id: int) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, scene_number, title, raw_text, sort_order
            FROM scenes WHERE chapter_id = %s ORDER BY sort_order
        """, (chapter_id,))
        return [dict(r) for r in cur.fetchall()]


# ── Story Beats ────────────────────────────────────────────────────────────

def upsert_story_beat(conn, scene_id: int, beat_number: int, summary: Optional[str],
                      raw_text: str, sort_order: int, intensity: Optional[int],
                      pacing: Optional[str], timeline_context: str = "present") -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO story_beats (scene_id, beat_number, summary, raw_text, sort_order,
                                     intensity, pacing, timeline_context)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (scene_id, beat_number)
            DO UPDATE SET summary = EXCLUDED.summary, raw_text = EXCLUDED.raw_text,
                          sort_order = EXCLUDED.sort_order, intensity = EXCLUDED.intensity,
                          pacing = EXCLUDED.pacing, timeline_context = EXCLUDED.timeline_context,
                          updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (scene_id, beat_number, summary, raw_text, sort_order,
              intensity, pacing, timeline_context))
        return cur.fetchone()[0]


def get_beats_for_scene(conn, scene_id: int) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, beat_number, summary, sort_order
            FROM story_beats WHERE scene_id = %s ORDER BY sort_order
        """, (scene_id,))
        return [dict(r) for r in cur.fetchall()]


# ── Locations ──────────────────────────────────────────────────────────────

def upsert_location(conn, canonical_name: str, location_type: str,
                    base_visual: Optional[str], base_auditory: Optional[str],
                    base_olfactory: Optional[str], base_tactile: Optional[str],
                    base_atmosphere: Optional[str], first_scene_id: Optional[int],
                    ai_provider: str, ai_model_id: str) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO locations (canonical_name, location_type, base_visual, base_auditory,
                                   base_olfactory, base_tactile, base_atmosphere,
                                   first_appearance_scene_id, ai_provider, ai_model_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (canonical_name)
            DO UPDATE SET location_type = EXCLUDED.location_type,
                          base_visual = COALESCE(locations.base_visual, EXCLUDED.base_visual),
                          base_auditory = COALESCE(locations.base_auditory, EXCLUDED.base_auditory),
                          base_olfactory = COALESCE(locations.base_olfactory, EXCLUDED.base_olfactory),
                          base_tactile = COALESCE(locations.base_tactile, EXCLUDED.base_tactile),
                          base_atmosphere = COALESCE(locations.base_atmosphere, EXCLUDED.base_atmosphere),
                          updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (canonical_name, location_type, base_visual, base_auditory,
              base_olfactory, base_tactile, base_atmosphere,
              first_scene_id, ai_provider, ai_model_id))
        return cur.fetchone()[0]


def upsert_location_alias(conn, location_id: int, alias: str, context: Optional[str]) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO location_aliases (location_id, alias, context)
            VALUES (%s, %s, %s)
            ON CONFLICT (location_id, alias) DO NOTHING
        """, (location_id, alias, context))


def upsert_location_scene_appearance(conn, location_id: int, scene_id: int,
                                     visual_delta: Optional[str], auditory_delta: Optional[str],
                                     olfactory_delta: Optional[str], tactile_delta: Optional[str],
                                     atmosphere_delta: Optional[str],
                                     ai_provider: str, ai_model_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO location_scene_appearances
                (location_id, scene_id, visual_delta, auditory_delta, olfactory_delta,
                 tactile_delta, atmosphere_delta, ai_provider, ai_model_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (location_id, scene_id)
            DO UPDATE SET visual_delta = EXCLUDED.visual_delta,
                          auditory_delta = EXCLUDED.auditory_delta,
                          olfactory_delta = EXCLUDED.olfactory_delta,
                          tactile_delta = EXCLUDED.tactile_delta,
                          atmosphere_delta = EXCLUDED.atmosphere_delta,
                          updated_at = CURRENT_TIMESTAMP
        """, (location_id, scene_id, visual_delta, auditory_delta,
              olfactory_delta, tactile_delta, atmosphere_delta, ai_provider, ai_model_id))


def get_location_by_name(conn, canonical_name: str) -> Optional[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM locations WHERE canonical_name = %s", (canonical_name,))
        row = cur.fetchone()
        return dict(row) if row else None


# ── Entities ───────────────────────────────────────────────────────────────

def upsert_entity(conn, canonical_name: str, entity_type: str, is_generated: bool,
                  base_description: Optional[str] = None, 
                  base_emotional_state: Optional[str] = None,
                  base_sounds: Optional[str] = None, base_smells: Optional[str] = None,
                  base_equipment: Optional[str] = None, base_abilities: Optional[str] = None,
                  boss_text_references: Optional[str] = None,
                  boss_action_quote: Optional[str] = None,
                  boss_variant_differences: Optional[str] = None,
                  first_scene_id: Optional[int] = None, 
                  ai_provider: str = "", ai_model_id: str = "") -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO entities (canonical_name, entity_type, is_generated, base_description,
                                  base_emotional_state, base_sounds, base_smells, base_equipment,
                                  base_abilities, boss_text_references, boss_action_quote,
                                  boss_variant_differences, first_appearance_scene_id, 
                                  ai_provider, ai_model_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (canonical_name)
            DO UPDATE SET entity_type = EXCLUDED.entity_type,
                          base_description = COALESCE(entities.base_description, EXCLUDED.base_description),
                          boss_text_references = COALESCE(entities.boss_text_references, EXCLUDED.boss_text_references),
                          boss_action_quote = COALESCE(entities.boss_action_quote, EXCLUDED.boss_action_quote),
                          boss_variant_differences = COALESCE(entities.boss_variant_differences, EXCLUDED.boss_variant_differences),
                          updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (canonical_name, entity_type, is_generated, base_description, base_emotional_state,
              base_sounds, base_smells, base_equipment, base_abilities,
              boss_text_references, boss_action_quote, boss_variant_differences,
              first_scene_id, ai_provider, ai_model_id))
        return cur.fetchone()[0]


def upsert_entity_alias(conn, entity_id: int, alias: str, context: Optional[str]) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO entity_aliases (entity_id, alias, context)
            VALUES (%s, %s, %s)
            ON CONFLICT (entity_id, alias) DO NOTHING
        """, (entity_id, alias, context))


def upsert_entity_scene_appearance(conn, entity_id: int, scene_id: int, role: str,
                                   is_present: bool = True, 
                                   description_delta: Optional[str] = None,
                                   emotional_state_delta: Optional[str] = None,
                                   equipment_delta: Optional[str] = None,
                                   exit_reason: Optional[str] = None, 
                                   entry_context: Optional[str] = None,
                                   relationships: Optional[str] = None,
                                   ai_provider: str = "", ai_model_id: str = "") -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO entity_scene_appearances
                (entity_id, scene_id, role, is_present, description_delta, emotional_state_delta,
                 equipment_delta, exit_reason, entry_context, relationships, ai_provider, ai_model_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (entity_id, scene_id)
            DO UPDATE SET role = EXCLUDED.role, is_present = EXCLUDED.is_present,
                          description_delta = EXCLUDED.description_delta,
                          emotional_state_delta = EXCLUDED.emotional_state_delta,
                          equipment_delta = EXCLUDED.equipment_delta,
                          exit_reason = EXCLUDED.exit_reason,
                          entry_context = EXCLUDED.entry_context,
                          relationships = EXCLUDED.relationships,
                          updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (entity_id, scene_id, role, is_present, description_delta, emotional_state_delta,
              equipment_delta, exit_reason, entry_context, relationships, ai_provider, ai_model_id))
        return cur.fetchone()[0]


def upsert_entity_beat_appearance(conn, entity_id: int, beat_id: int, role: str,
                                  is_primary: bool, beat_context: Optional[str]) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO entity_beat_appearances (entity_id, story_beat_id, role, is_primary, beat_context)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (entity_id, story_beat_id)
            DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary,
                          beat_context = EXCLUDED.beat_context
        """, (entity_id, beat_id, role, is_primary, beat_context))


def get_entity_by_name(conn, canonical_name: str) -> Optional[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM entities WHERE canonical_name = %s", (canonical_name,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_entities_summary(conn) -> list[dict]:
    """Return all entities with their aliases — used as context for Phase 2 prompts."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT e.id, e.canonical_name, e.entity_type,
                   ARRAY_AGG(ea.alias) FILTER (WHERE ea.alias IS NOT NULL) AS aliases
            FROM entities e
            LEFT JOIN entity_aliases ea ON ea.entity_id = e.id
            GROUP BY e.id ORDER BY e.canonical_name
        """)
        return [dict(r) for r in cur.fetchall()]


# ── Semantic Tags ──────────────────────────────────────────────────────────

def insert_semantic_tag(conn, beat_id: int, category: str, value: str,
                        notes: Optional[str], ai_provider: str, ai_model_id: str) -> None:
    with conn.cursor() as cur:
        # Allow multiple tags per beat/category (different values)
        cur.execute("""
            INSERT INTO semantic_tags (story_beat_id, category, value, notes, ai_provider, ai_model_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (beat_id, category, value, notes, ai_provider, ai_model_id))


def update_canonical_tag_values(conn, mappings: list[dict]) -> int:
    """Apply taxonomy standardization from Phase 3. Returns count updated."""
    count = 0
    with conn.cursor() as cur:
        for m in mappings:
            cur.execute("""
                UPDATE semantic_tags SET canonical_value = %s
                WHERE category = %s AND LOWER(value) = LOWER(%s)
            """, (m["canonical_value"], m["category"], m["original_value"]))
            count += cur.rowcount
    return count


# ── Processing Runs ────────────────────────────────────────────────────────

def start_processing_run(conn, book_id: int, phase: int) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO processing_runs (book_id, phase, status)
            VALUES (%s, %s, 'running')
            RETURNING id
        """, (book_id, phase))
        return cur.fetchone()[0]


def update_processing_run(conn, run_id: int, status: str,
                          last_chapter_id: Optional[int] = None,
                          claude_tokens: int = 0, gemini_tokens: int = 0,
                          error_message: Optional[str] = None) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE processing_runs
            SET status = %s, ended_at = CASE WHEN %s IN ('completed','stopped_token_limit','failed')
                                             THEN CURRENT_TIMESTAMP ELSE ended_at END,
                last_completed_chapter_id = COALESCE(%s, last_completed_chapter_id),
                claude_tokens_used = claude_tokens_used + %s,
                gemini_tokens_used = gemini_tokens_used + %s,
                error_message = %s
            WHERE id = %s
        """, (status, status, last_chapter_id, claude_tokens, gemini_tokens, error_message, run_id))


def get_incomplete_run(conn) -> Optional[dict]:
    """Return the most recent run that did not complete normally."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT pr.*, b.book_number, b.title AS book_title,
                   c.chapter_number AS last_chapter_number
            FROM processing_runs pr
            JOIN books b ON b.id = pr.book_id
            LEFT JOIN chapters c ON c.id = pr.last_completed_chapter_id
            WHERE pr.status IN ('running', 'stopped_token_limit')
            ORDER BY pr.created_at DESC
            LIMIT 1
        """)
        row = cur.fetchone()
        return dict(row) if row else None


# ── Global Status Query ────────────────────────────────────────────────────

def get_processing_status(conn) -> dict:
    """
    Returns a nested dict: {book_number: {phase: {"done": int, "total": int}}}
    where done = chapters completed for that phase or beyond.
    """
    from config import PHASE_DONE_STATUS, BOOK_REGISTRY, STATUS_ORDER

    result: dict = {}
    for book in BOOK_REGISTRY:
        bn = book["book_number"]
        result[bn] = {}
        book_id = get_book_id(conn, bn)
        if not book_id:
            for phase in range(1, 5):
                result[bn][phase] = {"done": 0, "total": 0}
            continue

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM chapters WHERE book_id = %s", (book_id,))
            total = cur.fetchone()[0]

        for phase in range(1, 5):
            done_status = PHASE_DONE_STATUS[phase]
            # Find all statuses that are >= done_status in order
            threshold_idx = STATUS_ORDER.index(done_status)
            valid_statuses = STATUS_ORDER[threshold_idx:]
            
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT COUNT(*) FROM chapters
                    WHERE book_id = %s AND processing_status IN %s
                """, (book_id, tuple(valid_statuses)))
                done = cur.fetchone()[0]
            result[bn][phase] = {"done": done, "total": total}

    return result


def get_next_action(conn) -> Optional[tuple[int, int]]:
    """
    Determine the next (phase, book_number) to process.
    Phase 1 must be done for all books before Phase 2 starts, etc.
    Returns None if everything is complete.
    """
    from config import PHASE_DONE_STATUS, BOOK_REGISTRY

    status = get_processing_status(conn)

    for phase in range(1, 5):
        for book in BOOK_REGISTRY:
            bn = book["book_number"]
            info = status[bn][phase]
            if info["total"] == 0 or info["done"] < info["total"]:
                return (phase, bn)

    return None


# ── Review Items ───────────────────────────────────────────────────────────

def insert_review_item(conn, category: str, severity: str, title: str,
                       description: str, suggested_action: str,
                       entity_id: Optional[int] = None,
                       location_id: Optional[int] = None,
                       scene_id: Optional[int] = None,
                       beat_id: Optional[int] = None) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO review_items (category, severity, title, description, suggested_action,
                                      affected_entity_id, affected_location_id,
                                      affected_scene_id, affected_beat_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (category, severity, title, description, suggested_action,
              entity_id, location_id, scene_id, beat_id))
        return cur.fetchone()[0]


def get_pending_review_items(conn) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM review_items
            WHERE review_status = 'pending_review'
            ORDER BY
                CASE severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
                id
        """)
        return [dict(r) for r in cur.fetchall()]


def update_review_item(conn, item_id: int, review_status: str,
                       reviewer_notes: Optional[str]) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE review_items
            SET review_status = %s, reviewer_notes = %s, reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (review_status, reviewer_notes, item_id))


def get_review_summary(conn) -> dict:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT review_status, COUNT(*) AS count
            FROM review_items GROUP BY review_status
        """)
        return {r["review_status"]: r["count"] for r in cur.fetchall()}


# ── Clear DB ───────────────────────────────────────────────────────────────

def get_table_counts(conn) -> dict:
    tables = ["books", "chapters", "scenes", "story_beats", "entities",
              "locations", "semantic_tags", "entity_beat_appearances",
              "entity_scene_appearances", "location_scene_appearances",
              "processing_runs", "review_items"]
    counts = {}
    with conn.cursor() as cur:
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            counts[t] = cur.fetchone()[0]
    return counts


def clear_all_book_tables(conn) -> dict:
    """
    Clear all book-processing tables in dependency order using DELETE.
    Returns the counts that existed before clearing.
    """
    counts = get_table_counts(conn)
    tables = [
        "review_items",
        "processing_runs",
        "semantic_tags",
        "entity_beat_appearances",
        "entity_scene_appearances",
        "location_scene_appearances",
        "entity_aliases",
        "location_aliases",
        "story_beats",
        "scenes",
        "entities",
        "locations",
        "chapters",
        "books"
    ]
    with conn.cursor() as cur:
        for table in tables:
            cur.execute(f"DELETE FROM {table}")
    return counts
