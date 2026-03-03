"""Game content routes."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session
from auth import get_current_player
from models import (
    CharacterClass, PlayerCharacter, PlayerProgress, PlayerEssence,
    Book, Chapter, Scene, StoryBeat, SceneGameplayData,
    Entity, EntityGameplayData, StatDefinition,
    Artifact, PlayerCollection, BossCompletion,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/classes")
def get_classes(session: Session = Depends(get_session)):
    """
    Public endpoint — return available character classes.
    FR-4.11
    """
    classes = session.exec(select(CharacterClass).where(CharacterClass.is_available == True)).all()
    return classes


@router.get("/map")
async def get_game_map(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Return the full book, chapter, and scene hierarchy with real player progress states.
    Boss nodes (chapter_boss, book_boss) are appended at the end of their chapter's scene list.
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    if not character:
        return []

    progress = session.exec(select(PlayerProgress).where(PlayerProgress.character_id == character.id)).first()
    if not progress:
        p_book, p_chapter, p_scene, p_beat = 1, 1, 1, 1
    else:
        p_book, p_chapter, p_scene, p_beat = progress.book_number, progress.chapter_number, progress.scene_number, progress.beat_number

    # Pre-load all boss completions for this player to avoid N+1 queries
    completed_boss_scene_ids = set(
        session.exec(
            select(BossCompletion.scene_id).where(BossCompletion.player_id == player.id)
        ).all()
    )

    books = session.exec(select(Book).order_by(Book.book_number.asc())).all()
    result = []

    for book in books:
        chapters = session.exec(
            select(Chapter)
            .where(Chapter.book_id == book.id)
            .order_by(Chapter.sort_order.asc())
        ).all()

        book_total_scenes = 0
        book_completed_scenes = 0
        all_book_normal_mastered = True
        all_book_chapter_bosses_mastered = True
        chapter_list = []
        book_boss_scene = None

        for chapter in chapters:
            all_scenes = session.exec(
                select(Scene)
                .where(Scene.chapter_id == chapter.id)
                .order_by(Scene.sort_order.asc())
            ).all()

            # Split normal vs chapter_boss vs book_boss scenes
            normal_scenes = [s for s in all_scenes if s.scene_type == 'normal']
            chapter_bosses = [s for s in all_scenes if s.scene_type == 'chapter_boss']
            book_bosses    = [s for s in all_scenes if s.scene_type == 'book_boss']

            # Capture book boss if it exists in this chapter (usually the last chapter)
            if book_bosses:
                book_boss_scene = book_bosses[0]

            scene_list = []
            chapter_completed_count = 0
            all_chapter_normal_mastered = True

            for scene in normal_scenes:
                book_total_scenes += 1

                # Determine status based on linear player_progress
                if book.book_number < p_book:
                    status = "mastered"
                elif book.book_number == p_book and chapter.chapter_number < p_chapter:
                    status = "mastered"
                elif book.book_number == p_book and chapter.chapter_number == p_chapter and scene.scene_number < p_scene:
                    status = "mastered"
                elif book.book_number == p_book and chapter.chapter_number == p_chapter and scene.scene_number == p_scene:
                    status = "in_progress" if p_beat > 1 else "available"
                else:
                    status = "locked"

                if status == "mastered":
                    chapter_completed_count += 1
                    book_completed_scenes += 1
                else:
                    all_chapter_normal_mastered = False

                gp_data = session.exec(select(SceneGameplayData).where(SceneGameplayData.scene_id == scene.id)).first()
                scene_list.append({
                    **scene.model_dump(),
                    "status": status,
                    "summary": scene.summary,
                    "gameplay_data": gp_data.model_dump() if gp_data else None,
                })

            if not all_chapter_normal_mastered:
                all_book_normal_mastered = False

            # Append chapter boss nodes at end of scene list
            for boss_scene in chapter_bosses:
                if boss_scene.id in completed_boss_scene_ids:
                    boss_status = "mastered"
                elif all_chapter_normal_mastered:
                    # Current chapter is finished, check if we are on this chapter or past it
                    if book.book_number < p_book or chapter.chapter_number < p_chapter:
                        boss_status = "mastered" # should be in completed_boss_scene_ids but fallback
                    elif book.book_number == p_book and chapter.chapter_number == p_chapter:
                        boss_status = "available"
                    else:
                        boss_status = "locked"
                else:
                    boss_status = "locked"

                if boss_status != "mastered":
                    all_book_chapter_bosses_mastered = False

                scene_list.append({
                    **boss_scene.model_dump(),
                    "status": boss_status,
                    "summary": boss_scene.summary,
                    "gameplay_data": None,
                })

            chapter_progress = round((chapter_completed_count / len(normal_scenes)) * 100) if normal_scenes else 0

            chapter_list.append({
                **chapter.model_dump(),
                "progress": chapter_progress,
                "scenes": scene_list,
            })

        # Process book boss if found
        book_boss_data = None
        if book_boss_scene:
            if book_boss_scene.id in completed_boss_scene_ids:
                bb_status = "mastered"
            elif all_book_normal_mastered and all_book_chapter_bosses_mastered:
                bb_status = "available"
            else:
                bb_status = "locked"
            
            book_boss_data = {
                **book_boss_scene.model_dump(),
                "status": bb_status,
                "summary": book_boss_scene.summary,
                "gameplay_data": None,
            }

        book_progress = round((book_completed_scenes / book_total_scenes) * 100) if book_total_scenes else 0

        book_status = "available" if book.book_number <= p_book else "locked"
        if book_progress == 100:
            book_status = "completed"

        result.append({
            **book.model_dump(),
            "status": book_status,
            "progress": book_progress,
            "chapters": chapter_list,
            "book_boss": book_boss_data,
        })
    return result


@router.post("/debug/advance")
async def advance_progress(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    DEBUG: Advance to the next beat or scene.
    """
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    progress = session.exec(select(PlayerProgress).where(PlayerProgress.character_id == character.id)).first()
    if not progress:
        progress = PlayerProgress(
            player_id=player.id,
            character_id=character.id,
            book_number=1,
            chapter_number=1,
            scene_number=1,
            beat_number=1
        )
        session.add(progress)
    
    # Logic to move to next beat
    progress.beat_number += 1
    
    # If beat > 10, move to next scene (hardcoded for Rule of 4)
    if progress.beat_number > 4:
        progress.beat_number = 1
        progress.scene_number += 1
        
    if progress.scene_number > 4:
        progress.scene_number = 1
        progress.chapter_number += 1
        
    if progress.chapter_number > 4:
        progress.chapter_number = 1
        progress.book_number += 1
        
    progress.updated_at = datetime.now(timezone.utc)
    session.add(progress)
    session.commit()
    session.refresh(progress)
    
    return progress


@router.get("/stat-definitions")
async def get_stat_definitions(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Return all available stat definitions for entities/classes.
    """
    stats = session.exec(select(StatDefinition)).all()
    return stats


@router.get("/scenes/{scene_id}")
async def get_scene_details(
    scene_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Return detailed scene info including story beats and enemies.
    """
    scene = session.get(Scene, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    beats = session.exec(
        select(StoryBeat)
        .where(StoryBeat.scene_id == scene_id)
        .order_by(StoryBeat.sort_order.asc())
    ).all()

    return {
        **scene.model_dump(),
        "gameplay_data": scene.gameplay_data.model_dump() if scene.gameplay_data else None,
        "story_beats": [b.model_dump() for b in beats]
    }


@router.get("/artifacts")
async def get_artifacts(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Return all artifacts and highlight those owned by the current character.
    """
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()

    all_artifacts = session.exec(select(Artifact)).all()
    if not character:
        return [{"artifact": a, "unlocked": False} for a in all_artifacts]

    unlocked_ids = session.exec(
        select(PlayerCollection.artifact_id).where(PlayerCollection.character_id == character.id)
    ).all()

    return [
        {
            **a.model_dump(),
            "unlocked": a.id in unlocked_ids
        } for a in all_artifacts
    ]


@router.get("/leaderboards")
async def get_leaderboards(
    type: str = "progression",
    limit: int = 10,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Return rankings based on progression or essence.
    """
    if type == "essence":
        stmt = (
            select(PlayerCharacter.character_name, PlayerEssence.current_balance)
            .join(PlayerEssence, PlayerCharacter.id == PlayerEssence.character_id)
            .order_by(PlayerEssence.current_balance.desc())
            .limit(limit)
        )
        rankings = session.exec(stmt).all()
        return [{"name": r[0], "value": f"{int(r[1]):,} Essence"} for r in rankings]
    else:
        stmt = (
            select(PlayerCharacter.character_name, PlayerProgress.book_number, PlayerProgress.chapter_number, PlayerProgress.scene_number)
            .join(PlayerProgress, PlayerCharacter.id == PlayerProgress.character_id)
            .order_by(PlayerProgress.book_number.desc(), PlayerProgress.chapter_number.desc(), PlayerProgress.scene_number.desc())
            .limit(limit)
        )
        rankings = session.exec(stmt).all()
        return [{"name": r[0], "value": f"Book {r[1]} - {r[2]}-{r[3]}"} for r in rankings]


@router.get("/journal")
async def get_journal(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Return scene summaries for all scenes completed by the player.
    """
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    if not character:
        return []

    progress = session.exec(select(PlayerProgress).where(PlayerProgress.character_id == character.id)).first()
    if not progress:
        return []

    completed_scenes = session.exec(
        select(Scene)
        .join(Chapter, Scene.chapter_id == Chapter.id)
        .where(Chapter.book_id <= progress.book_number)
        .where((Chapter.chapter_number < progress.chapter_number) |
               ((Chapter.chapter_number == progress.chapter_number) & (Scene.scene_number < progress.scene_number)))
        .order_by(Chapter.chapter_number.asc(), Scene.scene_number.asc())
    ).all()

    return [
        {
            "id": s.id,
            "location": f"Chapter {s.chapter.chapter_number}",
            "title": s.title,
            "summary": s.summary,
            "created_at": s.created_at.isoformat() if s.created_at else None
        } for s in completed_scenes
    ]


@router.get("/enemies/encountered")
async def get_encountered_enemies(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Return all unique enemies encountered by the player so far.
    """
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    if not character:
        return []

    enemies = session.exec(
        select(Entity, EntityGameplayData)
        .join(EntityGameplayData, Entity.id == EntityGameplayData.entity_id)
        .where(Entity.entity_type == "enemy")
    ).all()

    return [
        {
            **e.model_dump(),
            "gameplay_data": gd.model_dump()
        } for e, gd in enemies
    ]
