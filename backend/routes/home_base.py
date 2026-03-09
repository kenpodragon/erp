"""Home Base Hub routes (2.7) — Akashic Log, Relic Gallery, Leaderboard, Achievements."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from db import get_session
from auth import get_current_player
from models import (
    Player, PlayerCharacter, PlayerProgress, PlayerSettings,
    Book, Chapter, Scene, StoryBeat,
    StatDefinition,
    CuratedArtifact, PlayerArtifact,
    Achievement, PlayerAchievement, PlayerTitle, Title,
    LeaderboardCache,
)
from models.character_progression import CharacterStat, PlayerSceneRecord
from services.artifact_service import get_artifact_stat_totals
from services.leaderboard_service import (
    get_leaderboard, get_player_own_rank, VALID_CATEGORIES,
)
from services.achievement_service import (
    evaluate_achievements, update_achievement_progress,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/game/home-base", tags=["home-base"])


def _get_character_intelligence(session: Session, character_id: int) -> int:
    """Get the computed Intelligence stat for a character, or 0 if not computed."""
    stat_def = session.exec(
        select(StatDefinition).where(StatDefinition.name == "intelligence")
    ).first()
    if not stat_def:
        return 0
    char_stat = session.exec(
        select(CharacterStat)
        .where(CharacterStat.character_id == character_id)
        .where(CharacterStat.stat_id == stat_def.id)
    ).first()
    return char_stat.computed_total if char_stat else 0


@router.get("/akashic-log")
async def get_akashic_log(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Return the player's unlocked story beats organized as Book > Chapter > Scene > Beat hierarchy.
    Includes completion percentages, hidden lore eligibility, and "new" badge indicators.
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    character = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)
    ).first()
    if not character:
        return {"total_completion_pct": 0, "total_unlocked": 0, "total_beats": 0, "books": []}

    progress = session.exec(
        select(PlayerProgress).where(PlayerProgress.character_id == character.id)
    ).first()
    if not progress:
        p_book, p_chapter, p_scene, p_beat = 1, 1, 1, 0
    else:
        p_book = progress.book_number
        p_chapter = progress.chapter_number
        p_scene = progress.scene_number
        p_beat = progress.beat_number

    # Get Intelligence stat for hidden lore eligibility
    intelligence = _get_character_intelligence(session, character.id)

    # Get the "last visited" timestamp for "new" badge calculation
    settings = session.exec(
        select(PlayerSettings).where(PlayerSettings.player_id == player.id)
    ).first()
    last_visited = settings.akashic_last_visited_at if settings else None

    # Load all books, chapters, scenes, beats in bulk to avoid N+1
    books = session.exec(select(Book).order_by(Book.book_number.asc())).all()
    all_chapters = session.exec(select(Chapter).order_by(Chapter.sort_order.asc())).all()
    all_scenes = session.exec(
        select(Scene)
        .where(Scene.scene_type == "normal")
        .order_by(Scene.sort_order.asc())
    ).all()
    all_beats = session.exec(select(StoryBeat).order_by(StoryBeat.sort_order.asc())).all()

    # Get completed scene records for first_completed_at timestamps
    scene_records = session.exec(
        select(PlayerSceneRecord).where(PlayerSceneRecord.player_id == player.id)
    ).all()
    scene_record_map = {r.scene_id: r for r in scene_records}

    # Build lookup maps
    chapters_by_book = {}
    for ch in all_chapters:
        chapters_by_book.setdefault(ch.book_id, []).append(ch)

    scenes_by_chapter = {}
    for sc in all_scenes:
        scenes_by_chapter.setdefault(sc.chapter_id, []).append(sc)

    beats_by_scene = {}
    for bt in all_beats:
        beats_by_scene.setdefault(bt.scene_id, []).append(bt)

    total_beats = 0
    total_unlocked = 0
    book_list = []

    for book in books:
        book_chapters = chapters_by_book.get(book.id, [])
        chapter_list = []
        book_beat_total = 0
        book_beat_unlocked = 0

        for chapter in book_chapters:
            chapter_scenes = scenes_by_chapter.get(chapter.id, [])
            scene_list = []
            ch_beat_total = 0
            ch_beat_unlocked = 0

            for scene in chapter_scenes:
                scene_beats = beats_by_scene.get(scene.id, [])

                # Determine if this scene is completed (all beats unlocked)
                scene_completed = _is_scene_completed(
                    book.book_number, chapter.chapter_number, scene.scene_number,
                    p_book, p_chapter, p_scene,
                )
                # For in-progress scene, count beats up to current beat
                scene_in_progress = (
                    book.book_number == p_book
                    and chapter.chapter_number == p_chapter
                    and scene.scene_number == p_scene
                )

                scene_record = scene_record_map.get(scene.id)
                first_completed_at = (
                    scene_record.first_completed_at.isoformat()
                    if scene_record and scene_record.first_completed_at else None
                )

                beat_list = []
                for beat in scene_beats:
                    ch_beat_total += 1

                    # Beat is unlocked if scene is completed, or if in-progress and beat_number <= progress
                    beat_unlocked = False
                    if scene_completed:
                        beat_unlocked = True
                    elif scene_in_progress and beat.sort_order <= p_beat:
                        beat_unlocked = True

                    if beat_unlocked:
                        ch_beat_unlocked += 1

                    # Hidden lore eligibility
                    hidden_lore_unlocked = False
                    if (
                        beat_unlocked
                        and beat.hidden_lore_text
                        and beat.lore_intelligence_threshold is not None
                        and intelligence >= beat.lore_intelligence_threshold
                    ):
                        hidden_lore_unlocked = True

                    # "New" badge — beat completed after last visit
                    is_new = False
                    if beat_unlocked and last_visited and first_completed_at:
                        if scene_record and scene_record.first_completed_at:
                            is_new = scene_record.first_completed_at > last_visited

                    beat_data = {
                        "id": beat.id,
                        "sort_order": beat.sort_order,
                        "content": beat.raw_text if beat_unlocked else None,
                        "unlocked": beat_unlocked,
                        "has_hidden_lore": beat.hidden_lore_text is not None,
                        "hidden_lore_text": beat.hidden_lore_text if hidden_lore_unlocked else None,
                        "hidden_lore_unlocked": hidden_lore_unlocked,
                        "lore_intelligence_threshold": beat.lore_intelligence_threshold,
                        "is_new": is_new,
                    }
                    beat_list.append(beat_data)

                scene_list.append({
                    "id": scene.id,
                    "scene_number": scene.scene_number,
                    "title": scene.title,
                    "summary": scene.summary if scene_completed or scene_in_progress else None,
                    "completed": scene_completed,
                    "first_completed_at": first_completed_at,
                    "beats": beat_list,
                })

            ch_completion = round((ch_beat_unlocked / ch_beat_total) * 100, 1) if ch_beat_total else 0
            book_beat_total += ch_beat_total
            book_beat_unlocked += ch_beat_unlocked

            chapter_list.append({
                "id": chapter.id,
                "chapter_number": chapter.chapter_number,
                "title": chapter.title,
                "completion_pct": ch_completion,
                "unlocked_beats": ch_beat_unlocked,
                "total_beats": ch_beat_total,
                "scenes": scene_list,
            })

        book_completion = round((book_beat_unlocked / book_beat_total) * 100, 1) if book_beat_total else 0
        total_beats += book_beat_total
        total_unlocked += book_beat_unlocked

        book_list.append({
            "id": book.id,
            "book_number": book.book_number,
            "title": book.title,
            "completion_pct": book_completion,
            "unlocked_beats": book_beat_unlocked,
            "total_beats": book_beat_total,
            "chapters": chapter_list,
        })

    total_completion = round((total_unlocked / total_beats) * 100, 1) if total_beats else 0

    return {
        "total_completion_pct": total_completion,
        "total_unlocked": total_unlocked,
        "total_beats": total_beats,
        "books": book_list,
    }


@router.get("/artifacts")
async def get_artifacts(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Return owned artifacts (generated + curated) and silhouettes for undiscovered curated artifacts.
    Includes collection progress and aggregate stat bonuses.
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    character = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)
    ).first()
    if not character:
        return {
            "owned_artifacts": [],
            "curated_collection": {"total": 0, "owned": 0, "undiscovered": []},
            "generated_count": 0,
            "stat_total": {},
        }

    # Load owned artifacts
    owned = session.exec(
        select(PlayerArtifact).where(PlayerArtifact.character_id == character.id)
    ).all()

    owned_curated_ids = set()
    owned_artifacts = []
    generated_count = 0

    for art in owned:
        artifact_data = {
            "id": art.id,
            "type": art.artifact_type,
            "name": art.name,
            "rarity": art.rarity,
            "icon_sprite_key": art.icon_sprite_key,
            "stat_bonuses": art.stat_bonuses or {},
            "acquired_from": art.acquired_from,
            "acquired_at": art.acquired_at.isoformat() if art.acquired_at else None,
            "is_new": art.is_new,
        }
        if art.artifact_type == "curated":
            artifact_data["curated_artifact_id"] = art.curated_artifact_id
            # Load source_hint from curated artifact
            curated = session.get(CuratedArtifact, art.curated_artifact_id) if art.curated_artifact_id else None
            artifact_data["source_hint"] = curated.source_hint if curated else None
            artifact_data["lore_text"] = curated.lore_text if curated else None
            artifact_data["description"] = curated.description if curated else None
            owned_curated_ids.add(art.curated_artifact_id)
        else:
            artifact_data["artifact_code"] = art.artifact_code
            generated_count += 1

        owned_artifacts.append(artifact_data)

    # Build curated collection with undiscovered silhouettes
    all_curated = session.exec(
        select(CuratedArtifact).where(CuratedArtifact.is_active == True)
    ).all()

    undiscovered = []
    for ca in all_curated:
        if ca.id not in owned_curated_ids:
            undiscovered.append({
                "curated_artifact_id": ca.id,
                "name": "???",
                "source_hint": ca.source_hint,
                "source_type": ca.source_type,
                "silhouette": True,
            })

    # Stat totals
    stat_total = get_artifact_stat_totals(character.id, session)

    return {
        "owned_artifacts": owned_artifacts,
        "curated_collection": {
            "total": len(all_curated),
            "owned": len(owned_curated_ids),
            "undiscovered": undiscovered,
        },
        "generated_count": generated_count,
        "stat_total": stat_total,
    }


@router.post("/artifacts/mark-visited")
async def mark_artifacts_visited(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Clear is_new flag on all owned artifacts and update gallery_last_visited_at.
    Called when player opens the Relic Gallery.
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    character = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)
    ).first()
    if not character:
        return {"cleared": 0}

    # Clear is_new on all artifacts
    new_artifacts = session.exec(
        select(PlayerArtifact)
        .where(PlayerArtifact.character_id == character.id)
        .where(PlayerArtifact.is_new == True)
    ).all()

    for art in new_artifacts:
        art.is_new = False
        session.add(art)

    # Update gallery last visited
    settings = session.exec(
        select(PlayerSettings).where(PlayerSettings.player_id == player.id)
    ).first()
    if settings:
        settings.gallery_last_visited_at = datetime.now(timezone.utc)
        session.add(settings)

    session.commit()
    return {"cleared": len(new_artifacts)}


def _is_scene_completed(
    book_num: int, chapter_num: int, scene_num: int,
    p_book: int, p_chapter: int, p_scene: int,
) -> bool:
    """Check if a scene is fully completed based on linear player progress."""
    if book_num < p_book:
        return True
    if book_num == p_book:
        if chapter_num < p_chapter:
            return True
        if chapter_num == p_chapter and scene_num < p_scene:
            return True
    return False


# =============================================================================
# Leaderboard (2.7.3)
# =============================================================================

@router.get("/leaderboard/{category}")
async def get_leaderboard_endpoint(
    category: str,
    page: int = 1,
    per_page: int = 25,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Get cached leaderboard entries for a category with pagination."""
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}",
        )

    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    result = get_leaderboard(category, session, page=page, per_page=per_page)

    # Include player's own rank
    player_rank = get_player_own_rank(category, player.id, session)
    result["player_rank"] = player_rank

    return result


# =============================================================================
# Achievements (2.7.3)
# =============================================================================

@router.get("/achievements")
async def get_achievements(
    category: str = None,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Get all achievements with player progress. Optionally filter by category."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Update progress values
    update_achievement_progress(player.id, session)

    # Query achievements
    stmt = select(Achievement).where(Achievement.is_active == True)
    if category:
        stmt = stmt.where(Achievement.category == category)
    stmt = stmt.order_by(Achievement.category, Achievement.sort_order)
    all_achievements = session.exec(stmt).all()

    # Get player's achievement records
    player_achievements = session.exec(
        select(PlayerAchievement)
        .where(PlayerAchievement.player_id == player.id)
    ).all()
    pa_map = {pa.achievement_id: pa for pa in player_achievements}

    # Build response
    achievements = []
    category_counts: dict = {}
    total_completed = 0

    for ach in all_achievements:
        pa = pa_map.get(ach.id)
        completed = pa.is_completed if pa else False
        is_new = pa.is_new if pa else False
        progress = float(pa.progress_value) if pa else 0.0
        earned_at = pa.earned_at.isoformat() if pa and pa.earned_at else None

        # Category stats
        cat = ach.category
        if cat not in category_counts:
            category_counts[cat] = {"total": 0, "completed": 0}
        category_counts[cat]["total"] += 1
        if completed:
            category_counts[cat]["completed"] += 1
            total_completed += 1

        achievements.append({
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "category": cat,
            "icon_sprite_key": ach.icon_sprite_key,
            "tracking_type": ach.tracking_type,
            "threshold_value": float(ach.threshold_value),
            "parent_achievement_id": ach.parent_achievement_id,
            "reward_shards": ach.reward_shards,
            "reward_essence": ach.reward_essence,
            "reward_title_id": ach.reward_title_id,
            "sort_order": ach.sort_order,
            "is_completed": completed,
            "is_new": is_new,
            "progress_value": progress,
            "earned_at": earned_at,
        })

    return {
        "achievements": achievements,
        "total": len(all_achievements),
        "total_completed": total_completed,
        "category_counts": category_counts,
    }


@router.post("/achievements/mark-visited")
async def mark_achievements_visited(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Clear is_new flag on all completed achievements."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    new_achievements = session.exec(
        select(PlayerAchievement)
        .where(
            PlayerAchievement.player_id == player.id,
            PlayerAchievement.is_new == True,
        )
    ).all()

    for pa in new_achievements:
        pa.is_new = False
        session.add(pa)

    # Update achievements_last_visited_at
    settings = session.exec(
        select(PlayerSettings).where(PlayerSettings.player_id == player.id)
    ).first()
    if settings:
        settings.achievements_last_visited_at = datetime.now(timezone.utc)
        session.add(settings)

    session.commit()
    return {"cleared": len(new_achievements)}


# =============================================================================
# Titles (2.7.3)
# =============================================================================

@router.get("/titles")
async def get_player_titles(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Get all titles earned by the player."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    character = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)
    ).first()

    earned = session.exec(
        select(PlayerTitle).where(PlayerTitle.player_id == player.id)
    ).all()

    titles = []
    for pt in earned:
        title = session.get(Title, pt.title_id)
        if title:
            titles.append({
                "id": title.id,
                "name": title.name,
                "display_format": title.display_format,
                "earned_at": pt.earned_at.isoformat() if pt.earned_at else None,
                "equipped": character.equipped_title_id == title.id if character else False,
            })

    return {"titles": titles, "equipped_title_id": character.equipped_title_id if character else None}


@router.patch("/title")
async def equip_title(
    body: dict,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Equip or unequip a title. Pass title_id=null to unequip."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    character = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)
    ).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    title_id = body.get("title_id")

    if title_id is not None:
        # Verify player owns this title
        owned = session.exec(
            select(PlayerTitle).where(
                PlayerTitle.player_id == player.id,
                PlayerTitle.title_id == title_id,
            )
        ).first()
        if not owned:
            raise HTTPException(status_code=403, detail="Title not earned")

    character.equipped_title_id = title_id
    session.add(character)
    session.commit()

    title_name = None
    if title_id:
        title = session.get(Title, title_id)
        title_name = title.name if title else None

    return {"equipped_title_id": title_id, "equipped_title_name": title_name}


# =============================================================================
# Hub Summary (2.7.4)
# =============================================================================

@router.get("/summary")
async def get_hub_summary(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Consolidated hub summary with badge counts for new items across all terminals.
    Used by the hub navigation to show notification badges.
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    character = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)
    ).first()

    settings = session.exec(
        select(PlayerSettings).where(PlayerSettings.player_id == player.id)
    ).first()

    # New artifacts count
    new_artifacts = 0
    if character:
        new_artifacts = session.exec(
            select(func.count()).select_from(PlayerArtifact).where(
                PlayerArtifact.character_id == character.id,
                PlayerArtifact.is_new == True,
            )
        ).one()

    # New achievements count
    new_achievements = session.exec(
        select(func.count()).select_from(PlayerAchievement).where(
            PlayerAchievement.player_id == player.id,
            PlayerAchievement.is_new == True,
        )
    ).one()

    # Total achievements progress
    total_achievements = session.exec(
        select(func.count()).select_from(Achievement).where(Achievement.is_active == True)
    ).one()
    completed_achievements = session.exec(
        select(func.count()).select_from(PlayerAchievement).where(
            PlayerAchievement.player_id == player.id,
            PlayerAchievement.is_completed == True,
        )
    ).one()

    # Artifact collection progress
    total_curated = session.exec(
        select(func.count()).select_from(CuratedArtifact).where(
            CuratedArtifact.is_active == True
        )
    ).one()
    owned_curated = 0
    total_artifacts = 0
    if character:
        owned_curated = session.exec(
            select(func.count(PlayerArtifact.curated_artifact_id.distinct())).where(
                PlayerArtifact.character_id == character.id,
                PlayerArtifact.curated_artifact_id != None,
            )
        ).one()
        total_artifacts = session.exec(
            select(func.count()).select_from(PlayerArtifact).where(
                PlayerArtifact.character_id == character.id
            )
        ).one()

    # Akashic log new beats (estimate based on last visited)
    new_beats = 0
    if settings and settings.akashic_last_visited_at and character:
        from models.character_progression import PlayerSceneRecord
        new_beats = session.exec(
            select(func.count()).select_from(PlayerSceneRecord).where(
                PlayerSceneRecord.player_id == player.id,
                PlayerSceneRecord.first_completed_at > settings.akashic_last_visited_at,
            )
        ).one()

    return {
        "badges": {
            "akashic_log": new_beats,
            "relic_gallery": new_artifacts,
            "achievements": new_achievements,
            "total": new_beats + new_artifacts + new_achievements,
        },
        "progress": {
            "achievements": {"completed": completed_achievements, "total": total_achievements},
            "curated_artifacts": {"owned": owned_curated, "total": total_curated},
            "total_artifacts": total_artifacts,
        },
    }
