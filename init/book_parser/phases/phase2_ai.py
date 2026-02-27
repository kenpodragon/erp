"""
Phase 2: AI Semantic Extraction.

For each chapter (in order) for each scene:
  1. Build a prompt with the scene text + all known entities/locations as context.
  2. Ask AI to extract: entities, location, beat→entity assignments, semantic tags.
  3. Validate minimum entity requirements (≥1/beat, ≥3/scene, ≥10/chapter).
     If minimums not met, re-prompt requesting creative generation for the gap.
  4. Persist all extracted data to DB.
  5. Mark chapter processing_status = 'ai_extracted'.
"""
from __future__ import annotations
import json
import logging
from typing import Optional

from config import (
    BOOK_BY_NUMBER, MIN_ENTITIES_PER_BEAT, MIN_ENTITIES_PER_SCENE,
    MIN_ENTITIES_PER_CHAPTER,
)
from core.ai_provider import AIProvider
from core.db import (
    get_book_id, get_chapters_for_book, get_scenes_for_chapter, get_beats_for_scene,
    get_entities_summary, get_location_by_name, get_entity_by_name,
    upsert_entity, upsert_entity_alias, upsert_entity_scene_appearance,
    upsert_entity_beat_appearance,
    upsert_location, upsert_location_alias, upsert_location_scene_appearance,
    update_scene_location, insert_semantic_tag,
    update_chapter_status, transaction,
)
from core.display import ProgressTracker
from core.models import (
    Phase2Response, EntityExtraction, LocationExtraction, SemanticTag,
    BeatEntityGroup,
)

logger = logging.getLogger("book_parser.phase2")

# ── Prompts ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a narrative data extractor for a fantasy novel. Your role is to analyse
a single scene and return structured JSON describing every notable entity, the scene's location,
per-beat entity assignments, and semantic tags.

ENTITY RULES:
- Entities include: characters, creatures, objects of significance, environmental forces,
  emotional manifestations, groups, or other narrative elements.
- Every STORY BEAT must have at least {min_per_beat} entity.
- Every SCENE must have at least {min_per_scene} unique entities (cumulative across all beats).
- Every CHAPTER must have at least {min_per_chapter} unique entities (cumulative across all scenes).
- If the text does not provide enough entities to meet minimums, CREATIVELY GENERATE additional ones
  that fit the narrative context (e.g., "The Weight of Silence", "Forgotten Darkness", "Ambient Dread").
  Mark these with is_generated=true.
- Every scene must include at least one CHARACTER entity (at minimum the protagonist, if present).
- For entities already seen in previous scenes: set is_new=false and populate only *_delta fields
  for anything that changed. Leave delta fields null if nothing changed.
- For brand-new entities: set is_new=true and populate base_* fields from the text.

LOCATION RULES:
- Identify the primary location for this scene.
- If new: populate base_* sensory fields. If revisited: populate *_delta fields for changes only.

SEMANTIC TAG RULES:
- Tags have a category (emotion | theme | sensory) and a free-form value.
- Assign tags at the beat level (beat_number field).
- Aim for 2–4 tags per beat. Include at least one from each category across the scene.
- The optional 'notes' field captures nuance the structured tag alone can't express.
""".format(
    min_per_beat=MIN_ENTITIES_PER_BEAT,
    min_per_scene=MIN_ENTITIES_PER_SCENE,
    min_per_chapter=MIN_ENTITIES_PER_CHAPTER,
)


def _build_user_prompt(scene_text: str, beats: list[dict],
                       known_entities: list[dict], chapter_entity_count: int) -> str:
    beat_map = "\n".join(
        f"  Beat {b['beat_number']}: {b['summary'] or '(no summary)'}"
        for b in beats
    )

    known_summary = ""
    if known_entities:
        lines = [
            f"  - {e['canonical_name']} ({e['entity_type']})"
            + (f" aliases: {', '.join(e['aliases'])}" if e.get("aliases") else "")
            for e in known_entities[:60]  # cap context size
        ]
        known_summary = "KNOWN ENTITIES (already in database — use canonical names):\n" + "\n".join(lines)
    else:
        known_summary = "KNOWN ENTITIES: None yet (this is the first scene)."

    return (
        f"Chapter entity count so far: {chapter_entity_count}\n\n"
        f"BEATS IN THIS SCENE:\n{beat_map}\n\n"
        f"{known_summary}\n\n"
        f"SCENE TEXT:\n{scene_text}\n\n"
        "Extract all entities, the location, beat-entity assignments, and semantic tags."
    )


def _build_retry_prompt(scene_text: str, beats: list[dict],
                        existing_response: Phase2Response,
                        missing_beats: list[int], extra_needed: int) -> str:
    existing_names = [e.canonical_name for e in existing_response.entities]
    return (
        f"Your previous extraction was valid but does not meet the minimum entity requirements.\n\n"
        f"Missing beats (need ≥{MIN_ENTITIES_PER_BEAT} entity each): {missing_beats}\n"
        f"Additional entities needed for scene/chapter minimums: {extra_needed}\n\n"
        f"Current entities: {existing_names}\n\n"
        "Please AUGMENT your response by creatively generating additional entities that fit the "
        "narrative context. They must be plausible within a dark fantasy setting. Mark them with "
        "is_generated=true. Return the COMPLETE updated JSON (all entities, not just additions).\n\n"
        f"SCENE TEXT:\n{scene_text}"
    )


# ── Minimum-entity validation ─────────────────────────────────────────────

def _check_minimums(response: Phase2Response, beats: list[dict],
                    chapter_entity_names: set[str]) -> tuple[list[int], int]:
    """
    Returns (missing_beat_numbers, extra_entities_needed_for_scene_chapter).
    """
    beat_entity_map: dict[int, int] = {}
    for bg in response.beat_entities:
        beat_entity_map[bg.beat_number] = len(bg.entity_assignments)

    missing_beats = [
        b["beat_number"]
        for b in beats
        if beat_entity_map.get(b["beat_number"], 0) < MIN_ENTITIES_PER_BEAT
    ]

    scene_names = {e.canonical_name for e in response.entities}
    # For scene minimum we consider unique entities in this scene's response
    scene_count = len(scene_names)
    # For chapter minimum we consider the union of all prior + current
    chapter_total = len(chapter_entity_names | scene_names)

    extra_for_scene = max(0, MIN_ENTITIES_PER_SCENE - scene_count)
    extra_for_chapter = max(0, MIN_ENTITIES_PER_CHAPTER - chapter_total)
    extra_needed = max(extra_for_scene, extra_for_chapter)

    return missing_beats, extra_needed


# ── Persistence helpers ───────────────────────────────────────────────────

def _persist_entities(conn, scene_id: int, response: Phase2Response,
                      ai_provider: str, ai_model_id: str) -> dict[str, int]:
    """Persist all entities for one scene. Returns {canonical_name: entity_id}."""
    name_to_id: dict[str, int] = {}

    for entity in response.entities:
        entity_id = upsert_entity(
            conn,
            canonical_name=entity.canonical_name,
            entity_type=entity.entity_type,
            is_generated=entity.is_generated,
            base_description=entity.base_description if entity.is_new else None,
            base_emotional_state=entity.base_emotional_state if entity.is_new else None,
            base_sounds=entity.base_sounds if entity.is_new else None,
            base_smells=entity.base_smells if entity.is_new else None,
            base_equipment=entity.base_equipment if entity.is_new else None,
            base_abilities=entity.base_abilities if entity.is_new else None,
            first_scene_id=scene_id if entity.is_new else None,
            ai_provider=ai_provider,
            ai_model_id=ai_model_id,
        )
        name_to_id[entity.canonical_name] = entity_id

        for alias in entity.aliases:
            upsert_entity_alias(conn, entity_id, alias, context=None)

        upsert_entity_scene_appearance(
            conn,
            entity_id=entity_id,
            scene_id=scene_id,
            role=entity.role,
            is_present=entity.is_present,
            description_delta=entity.description_delta,
            emotional_state_delta=entity.emotional_state_delta,
            equipment_delta=entity.equipment_delta,
            exit_reason=entity.exit_reason,
            entry_context=entity.entry_context,
            relationships=entity.relationships,
            ai_provider=ai_provider,
            ai_model_id=ai_model_id,
        )

    return name_to_id


def _persist_beat_entities(conn, beats: list[dict],
                           response: Phase2Response,
                           name_to_id: dict[str, int]) -> None:
    """Write entity_beat_appearances for all beats."""
    beat_number_to_id = {b["beat_number"]: b["id"] for b in beats}

    for bg in response.beat_entities:
        beat_id = beat_number_to_id.get(bg.beat_number)
        if not beat_id:
            logger.warning("beat_number %d not found in DB beats — skipping", bg.beat_number)
            continue
        for assignment in bg.entity_assignments:
            entity_id = name_to_id.get(assignment.entity_name)
            if not entity_id:
                logger.warning(
                    "Entity '%s' in beat_entities not found in entity list — skipping",
                    assignment.entity_name,
                )
                continue
            upsert_entity_beat_appearance(
                conn,
                entity_id=entity_id,
                beat_id=beat_id,
                role=assignment.role,
                is_primary=assignment.is_primary,
                beat_context=assignment.beat_context,
            )


def _persist_location(conn, scene_id: int, location: Optional[LocationExtraction],
                      ai_provider: str, ai_model_id: str) -> None:
    if not location:
        return

    location_id = upsert_location(
        conn,
        canonical_name=location.canonical_name,
        location_type=location.location_type,
        base_visual=location.base_visual if location.is_new else None,
        base_auditory=location.base_auditory if location.is_new else None,
        base_olfactory=location.base_olfactory if location.is_new else None,
        base_tactile=location.base_tactile if location.is_new else None,
        base_atmosphere=location.base_atmosphere if location.is_new else None,
        first_scene_id=scene_id if location.is_new else None,
        ai_provider=ai_provider,
        ai_model_id=ai_model_id,
    )

    upsert_location_scene_appearance(
        conn,
        location_id=location_id,
        scene_id=scene_id,
        visual_delta=location.visual_delta,
        auditory_delta=location.auditory_delta,
        olfactory_delta=location.olfactory_delta,
        tactile_delta=location.tactile_delta,
        atmosphere_delta=location.atmosphere_delta,
        ai_provider=ai_provider,
        ai_model_id=ai_model_id,
    )

    update_scene_location(conn, scene_id, location_id)


def _persist_tags(conn, beats: list[dict], response: Phase2Response,
                  ai_provider: str, ai_model_id: str) -> None:
    beat_number_to_id = {b["beat_number"]: b["id"] for b in beats}
    for tag in response.semantic_tags:
        beat_id = beat_number_to_id.get(tag.beat_number)
        if not beat_id:
            logger.warning("Tag references unknown beat_number %d — skipping", tag.beat_number)
            continue
        insert_semantic_tag(conn, beat_id, tag.category, tag.value, tag.notes,
                            ai_provider, ai_model_id)


# ── Main phase entry point ─────────────────────────────────────────────────

def run_phase2(conn, book_number: int, ai: AIProvider,
               tracker: ProgressTracker,
               resume_after_chapter: Optional[int] = None) -> None:
    """
    Run Phase 2 for a single book. Chapters must already have scenes/beats from Phase 1.
    """
    book_meta = BOOK_BY_NUMBER.get(book_number)
    if not book_meta:
        raise ValueError(f"Unknown book number: {book_number}")

    book_id = get_book_id(conn, book_number)
    if not book_id:
        raise RuntimeError(
            f"Book {book_number} not found in DB. Run Phase 1 first."
        )

    chapters = get_chapters_for_book(conn, book_id)
    if not chapters:
        logger.warning("Book %d has no chapters in DB — nothing to do.", book_number)
        return

    logger.info("Phase 2 — Book %d: %s (%d chapters)", book_number, book_meta["title"], len(chapters))
    tracker.set_book(book_number, book_meta["title"], phase=2)
    tracker.set_chapters(len(chapters))

    for chapter in chapters:
        ch_id = chapter["id"]
        ch_num = chapter["chapter_number"]
        ch_title = chapter["title"] or f"Chapter {ch_num}"

        if resume_after_chapter is not None and ch_num <= resume_after_chapter:
            logger.debug("Skipping chapter %d (already processed)", ch_num)
            tracker.advance_chapter()
            continue

        tracker.advance_chapter(ch_title)
        logger.info("  Chapter %d: %s", ch_num, ch_title)

        scenes = get_scenes_for_chapter(conn, ch_id)
        if not scenes:
            logger.warning("  Chapter %d has no scenes — skipping (run Phase 1 first)", ch_num)
            continue

        # Known entities at start of chapter (for context injection + minimum tracking)
        known_entities = get_entities_summary(conn)
        chapter_entity_names: set[str] = {e["canonical_name"] for e in known_entities}

        tracker.set_items("Extracting entities/locations/tags", total=len(scenes))

        for scene in scenes:
            scene_id = scene["id"]
            scene_num = scene["scene_number"]
            scene_text = scene["raw_text"] or ""

            beats = get_beats_for_scene(conn, scene_id)
            if not beats:
                logger.warning(
                    "  Scene %d.%d has no beats — skipping", ch_num, scene_num
                )
                tracker.advance_item()
                continue

            logger.debug("    Scene %d (%d beats)", scene_num, len(beats))

            user_prompt = _build_user_prompt(
                scene_text, beats, known_entities, len(chapter_entity_names)
            )

            # First AI call
            json_text, provider, model_id = ai.call(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                response_model=Phase2Response,
            )
            result: Phase2Response = ai.parse_response(json_text, Phase2Response)

            # Check minimums; retry once if needed
            missing_beats, extra_needed = _check_minimums(result, beats, chapter_entity_names)
            if missing_beats or extra_needed > 0:
                logger.info(
                    "    Minimum check failed (missing beats: %s, extra needed: %d) — retrying",
                    missing_beats, extra_needed,
                )
                retry_prompt = _build_retry_prompt(
                    scene_text, beats, result, missing_beats, extra_needed
                )
                json_text2, provider2, model_id2 = ai.call(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=retry_prompt,
                    response_model=Phase2Response,
                )
                result = ai.parse_response(json_text2, Phase2Response)
                provider, model_id = provider2, model_id2
                # Log if still failing (we accept and flag rather than infinite retry)
                missing2, extra2 = _check_minimums(result, beats, chapter_entity_names)
                if missing2 or extra2 > 0:
                    logger.warning(
                        "    Still below minimums after retry (scene %d.%d) — accepting anyway",
                        ch_num, scene_num,
                    )

            # Persist in a single transaction per scene
            with transaction(conn):
                name_to_id = _persist_entities(conn, scene_id, result, provider, model_id)
                _persist_beat_entities(conn, beats, result, name_to_id)
                _persist_location(conn, scene_id, result.location, provider, model_id)
                _persist_tags(conn, beats, result, provider, model_id)

            # Update known entities for next scene context
            new_names = {e.canonical_name for e in result.entities}
            chapter_entity_names |= new_names
            known_entities = get_entities_summary(conn)  # refresh for next scene

            tracker.advance_item()
            logger.debug(
                "    Scene %d: %d entities, location=%s, %d tags [%s]",
                scene_num,
                len(result.entities),
                result.location.canonical_name if result.location else "none",
                len(result.semantic_tags),
                provider,
            )

        # Mark chapter done
        with transaction(conn):
            update_chapter_status(conn, ch_id, "ai_extracted")

        tracker.log(
            f"Chapter {ch_num} ({ch_title}): {len(scenes)} scenes processed [{provider}]",
            style="green",
        )

    logger.info("Phase 2 complete for Book %d", book_number)
