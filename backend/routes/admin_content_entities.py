"""Admin Content Editor routes for 5.2.2 — Entities, Entity-Scenes,
Entity-Beats, Story Beats, and Semantic Tags.

Separate router file to avoid conflicts with the 5.2.1 admin_content.py
(Books, Chapters, Scenes, Backgrounds, Wave Configs).
"""

import logging
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlmodel import Session

from db import get_session
from auth import get_current_admin, get_client_ip
from audit import write_audit_log
from services import admin_content_entity_service as svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/content", tags=["admin-content-entities"])


# ===================================================================
# Pydantic request / response schemas
# ===================================================================

# --- Entities ---

class EntityCreate(BaseModel):
    canonical_name: str
    entity_type_id: int
    entity_family_id: Optional[int] = None
    is_generated: bool = False
    base_description: Optional[str] = None
    base_emotional_state: Optional[str] = None
    base_sounds: Optional[str] = None
    base_smells: Optional[str] = None
    base_equipment: Optional[str] = None
    base_abilities: Optional[str] = None
    boss_text_references: Optional[str] = None
    boss_action_quote: Optional[str] = None
    boss_variant_differences: Optional[str] = None
    first_appearance_scene_id: Optional[int] = None


class EntityUpdate(BaseModel):
    canonical_name: Optional[str] = None
    entity_type_id: Optional[int] = None
    entity_family_id: Optional[int] = None
    is_generated: Optional[bool] = None
    base_description: Optional[str] = None
    base_emotional_state: Optional[str] = None
    base_sounds: Optional[str] = None
    base_smells: Optional[str] = None
    base_equipment: Optional[str] = None
    base_abilities: Optional[str] = None
    boss_text_references: Optional[str] = None
    boss_action_quote: Optional[str] = None
    boss_variant_differences: Optional[str] = None
    first_appearance_scene_id: Optional[int] = None


class GameplayDataUpsert(BaseModel):
    sprite_key: Optional[str] = None
    base_hp: int = 0
    base_gold: int = 0
    appearance_rate: float = 1.0
    stat_block: Optional[Any] = None
    unique_boss_theme_id: Optional[int] = None
    death_sfx_key: Optional[str] = None


class AttackTypeAssignment(BaseModel):
    attack_type_id: int
    is_primary: bool = False


class AliasCreate(BaseModel):
    alias: str
    context: Optional[str] = None


# --- Entity-Scene ---

class EntitySceneCreate(BaseModel):
    entity_id: int
    scene_id: int
    role: Optional[str] = None
    is_present: bool = True
    description_delta: Optional[str] = None
    emotional_state_delta: Optional[str] = None
    equipment_delta: Optional[str] = None
    exit_reason: Optional[str] = None
    entry_context: Optional[str] = None
    relationships: Optional[str] = None


class EntitySceneBulkItem(BaseModel):
    entity_id: int
    scene_id: int
    role: Optional[str] = None
    is_present: bool = True
    description_delta: Optional[str] = None
    emotional_state_delta: Optional[str] = None
    equipment_delta: Optional[str] = None
    exit_reason: Optional[str] = None
    entry_context: Optional[str] = None
    relationships: Optional[str] = None


class EntitySceneBulkCreate(BaseModel):
    items: list[EntitySceneBulkItem]


class EntitySceneCopy(BaseModel):
    source_scene_id: int
    target_scene_id: int


class EntitySceneUpdate(BaseModel):
    role: Optional[str] = None
    is_present: Optional[bool] = None
    description_delta: Optional[str] = None
    emotional_state_delta: Optional[str] = None
    equipment_delta: Optional[str] = None
    exit_reason: Optional[str] = None
    entry_context: Optional[str] = None
    relationships: Optional[str] = None


# --- Entity-Beat ---

class EntityBeatCreate(BaseModel):
    entity_id: int
    story_beat_id: int
    role: Optional[str] = None
    is_primary: bool = False
    beat_context: Optional[str] = None


class EntityBeatBulkCreate(BaseModel):
    items: list[EntityBeatCreate]


class EntityBeatUpdate(BaseModel):
    role: Optional[str] = None
    is_primary: Optional[bool] = None
    beat_context: Optional[str] = None


# --- Story Beats ---

class BeatCreate(BaseModel):
    scene_id: int
    beat_number: int
    sort_order: int
    summary: Optional[str] = None
    raw_text: Optional[str] = None
    location_id: Optional[int] = None
    intensity: Optional[int] = None
    pacing: Optional[str] = None
    timeline_context: Optional[str] = "present"
    hidden_lore_text: Optional[str] = None
    lore_intelligence_threshold: Optional[int] = None
    content_image_path: Optional[str] = None
    audio_path: Optional[str] = None
    audio_duration_seconds: int = 0


class BeatUpdate(BaseModel):
    beat_number: Optional[int] = None
    sort_order: Optional[int] = None
    summary: Optional[str] = None
    raw_text: Optional[str] = None
    location_id: Optional[int] = None
    intensity: Optional[int] = None
    pacing: Optional[str] = None
    timeline_context: Optional[str] = None
    hidden_lore_text: Optional[str] = None
    lore_intelligence_threshold: Optional[int] = None
    content_image_path: Optional[str] = None
    audio_path: Optional[str] = None
    audio_duration_seconds: Optional[int] = None


class BeatReorder(BaseModel):
    scene_id: int
    beat_ids: list[int]


# --- Semantic Tags ---

class SemanticTagCreate(BaseModel):
    story_beat_id: int
    category: str
    value: str
    canonical_value: Optional[str] = None
    notes: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model_id: Optional[str] = None


class SemanticTagBulkItem(BaseModel):
    category: str
    value: str
    canonical_value: Optional[str] = None
    notes: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model_id: Optional[str] = None


class SemanticTagBulkCreate(BaseModel):
    story_beat_id: int
    tags: list[SemanticTagBulkItem]


class SemanticTagUpdate(BaseModel):
    category: Optional[str] = None
    value: Optional[str] = None
    canonical_value: Optional[str] = None
    notes: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model_id: Optional[str] = None


class SemanticTagRename(BaseModel):
    category: str
    old_value: str
    new_value: str


# ===================================================================
# Entity endpoints
# ===================================================================

@router.get("/entities")
def list_entities(
    request: Request,
    entity_type_id: Optional[int] = Query(None),
    entity_family_id: Optional[int] = Query(None),
    has_gameplay: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.list_entities(
        session,
        entity_type_id=entity_type_id,
        entity_family_id=entity_family_id,
        has_gameplay=has_gameplay,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/entities/families")
def get_entity_families(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.get_entity_families(session)


@router.get("/entities/{entity_id}")
def get_entity(
    entity_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.get_entity_detail(session, entity_id)


@router.post("/entities", status_code=201)
def create_entity(
    body: EntityCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    result = svc.create_entity(session, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_created",
        target_type="entity",
        target_id=str(result["id"]),
        details={"canonical_name": result["canonical_name"]},
        ip_address=get_client_ip(request),
    )
    return result


@router.patch("/entities/{entity_id}")
def update_entity(
    entity_id: int,
    body: EntityUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, detail="No fields to update")
    result = svc.update_entity(session, entity_id, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_updated",
        target_type="entity",
        target_id=str(entity_id),
        details={"fields": list(data.keys())},
        ip_address=get_client_ip(request),
    )
    return result


@router.delete("/entities/{entity_id}", status_code=204)
def delete_entity(
    entity_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    svc.delete_entity(session, entity_id)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_deleted",
        target_type="entity",
        target_id=str(entity_id),
        ip_address=get_client_ip(request),
    )
    return None


@router.put("/entities/{entity_id}/gameplay")
def upsert_gameplay(
    entity_id: int,
    body: GameplayDataUpsert,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    result = svc.upsert_gameplay_data(session, entity_id, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_gameplay_upserted",
        target_type="entity_gameplay_data",
        target_id=str(entity_id),
        ip_address=get_client_ip(request),
    )
    return result


@router.delete("/entities/{entity_id}/gameplay", status_code=204)
def delete_gameplay(
    entity_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    svc.delete_gameplay_data(session, entity_id)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_gameplay_deleted",
        target_type="entity_gameplay_data",
        target_id=str(entity_id),
        ip_address=get_client_ip(request),
    )
    return None


@router.put("/entities/{entity_id}/attack-types")
def replace_attack_types(
    entity_id: int,
    body: list[AttackTypeAssignment],
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    assignments = [a.model_dump() for a in body]
    result = svc.replace_attack_types(session, entity_id, assignments)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_attack_types_replaced",
        target_type="entity_attack_types",
        target_id=str(entity_id),
        details={"count": len(assignments)},
        ip_address=get_client_ip(request),
    )
    return result


@router.post("/entities/{entity_id}/aliases", status_code=201)
def add_alias(
    entity_id: int,
    body: AliasCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    result = svc.add_alias(session, entity_id, body.alias, body.context)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_alias_added",
        target_type="entity_alias",
        target_id=str(result["id"]),
        details={"entity_id": entity_id, "alias": body.alias},
        ip_address=get_client_ip(request),
    )
    return result


@router.delete("/entities/{entity_id}/aliases/{alias_id}", status_code=204)
def remove_alias(
    entity_id: int,
    alias_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    svc.remove_alias(session, entity_id, alias_id)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_alias_removed",
        target_type="entity_alias",
        target_id=str(alias_id),
        details={"entity_id": entity_id},
        ip_address=get_client_ip(request),
    )
    return None


# ===================================================================
# Entity-Scene Mapper endpoints
# ===================================================================

@router.get("/entity-scenes")
def list_entity_scenes(
    request: Request,
    scene_id: Optional[int] = Query(None),
    entity_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.list_entity_scenes(
        session, scene_id=scene_id, entity_id=entity_id, page=page, page_size=page_size,
    )


@router.post("/entity-scenes", status_code=201)
def create_entity_scene(
    body: EntitySceneCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    result = svc.create_entity_scene(session, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_scene_created",
        target_type="entity_scene_appearance",
        target_id=str(result["id"]),
        details={"entity_id": body.entity_id, "scene_id": body.scene_id},
        ip_address=get_client_ip(request),
    )
    return result


@router.post("/entity-scenes/bulk")
def bulk_create_entity_scenes(
    body: EntitySceneBulkCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    items = [i.model_dump() for i in body.items]
    result = svc.bulk_create_entity_scenes(session, items)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_scenes_bulk_created",
        target_type="entity_scene_appearance",
        target_id="bulk",
        details=result,
        ip_address=get_client_ip(request),
    )
    return result


@router.post("/entity-scenes/copy")
def copy_entity_scenes(
    body: EntitySceneCopy,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    result = svc.copy_entity_scenes(session, body.source_scene_id, body.target_scene_id)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_scenes_copied",
        target_type="entity_scene_appearance",
        target_id=f"{body.source_scene_id}->{body.target_scene_id}",
        details=result,
        ip_address=get_client_ip(request),
    )
    return result


@router.patch("/entity-scenes/{esa_id}")
def update_entity_scene(
    esa_id: int,
    body: EntitySceneUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, detail="No fields to update")
    result = svc.update_entity_scene(session, esa_id, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_scene_updated",
        target_type="entity_scene_appearance",
        target_id=str(esa_id),
        details={"fields": list(data.keys())},
        ip_address=get_client_ip(request),
    )
    return result


@router.delete("/entity-scenes/{esa_id}", status_code=204)
def delete_entity_scene(
    esa_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    svc.delete_entity_scene(session, esa_id)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_scene_deleted",
        target_type="entity_scene_appearance",
        target_id=str(esa_id),
        ip_address=get_client_ip(request),
    )
    return None


# ===================================================================
# Entity-Beat Mapper endpoints
# ===================================================================

@router.get("/entity-beats")
def list_entity_beats(
    request: Request,
    story_beat_id: Optional[int] = Query(None),
    entity_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.list_entity_beats(
        session, story_beat_id=story_beat_id, entity_id=entity_id, page=page, page_size=page_size,
    )


@router.post("/entity-beats", status_code=201)
def create_entity_beat(
    body: EntityBeatCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    result = svc.create_entity_beat(session, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_beat_created",
        target_type="entity_beat_appearance",
        target_id=str(result["id"]),
        details={"entity_id": body.entity_id, "story_beat_id": body.story_beat_id},
        ip_address=get_client_ip(request),
    )
    return result


@router.post("/entity-beats/bulk")
def bulk_create_entity_beats(
    body: EntityBeatBulkCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    items = [i.model_dump() for i in body.items]
    result = svc.bulk_create_entity_beats(session, items)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_beats_bulk_created",
        target_type="entity_beat_appearance",
        target_id="bulk",
        details=result,
        ip_address=get_client_ip(request),
    )
    return result


@router.patch("/entity-beats/{eba_id}")
def update_entity_beat(
    eba_id: int,
    body: EntityBeatUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, detail="No fields to update")
    result = svc.update_entity_beat(session, eba_id, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_beat_updated",
        target_type="entity_beat_appearance",
        target_id=str(eba_id),
        details={"fields": list(data.keys())},
        ip_address=get_client_ip(request),
    )
    return result


@router.delete("/entity-beats/{eba_id}", status_code=204)
def delete_entity_beat(
    eba_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    svc.delete_entity_beat(session, eba_id)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="entity_beat_deleted",
        target_type="entity_beat_appearance",
        target_id=str(eba_id),
        ip_address=get_client_ip(request),
    )
    return None


# ===================================================================
# Story Beat endpoints
# ===================================================================

@router.get("/beats")
def list_beats(
    request: Request,
    scene_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.list_beats(session, scene_id=scene_id, page=page, page_size=page_size)


@router.get("/beats/{beat_id}")
def get_beat(
    beat_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.get_beat_detail(session, beat_id)


@router.post("/beats", status_code=201)
def create_beat(
    body: BeatCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    result = svc.create_beat(session, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="beat_created",
        target_type="story_beat",
        target_id=str(result["id"]),
        details={"scene_id": body.scene_id, "beat_number": body.beat_number},
        ip_address=get_client_ip(request),
    )
    return result


@router.patch("/beats/reorder")
def reorder_beats(
    body: BeatReorder,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    result = svc.reorder_beats(session, body.scene_id, body.beat_ids)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="beats_reordered",
        target_type="story_beat",
        target_id=f"scene_{body.scene_id}",
        details={"beat_ids": body.beat_ids},
        ip_address=get_client_ip(request),
    )
    return result


@router.patch("/beats/{beat_id}")
def update_beat(
    beat_id: int,
    body: BeatUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, detail="No fields to update")
    result = svc.update_beat(session, beat_id, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="beat_updated",
        target_type="story_beat",
        target_id=str(beat_id),
        details={"fields": list(data.keys())},
        ip_address=get_client_ip(request),
    )
    return result


@router.delete("/beats/{beat_id}", status_code=204)
def delete_beat(
    beat_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    svc.delete_beat(session, beat_id)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="beat_deleted",
        target_type="story_beat",
        target_id=str(beat_id),
        ip_address=get_client_ip(request),
    )
    return None


# ===================================================================
# Semantic Tag endpoints
# ===================================================================

@router.get("/semantic-tags")
def list_semantic_tags(
    request: Request,
    story_beat_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.list_semantic_tags(
        session, story_beat_id=story_beat_id, category=category, page=page, page_size=page_size,
    )


@router.get("/semantic-tags/analytics")
def semantic_tag_analytics(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return svc.semantic_tag_analytics(session)


@router.post("/semantic-tags", status_code=201)
def create_semantic_tag(
    body: SemanticTagCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    result = svc.create_semantic_tag(session, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="semantic_tag_created",
        target_type="semantic_tag",
        target_id=str(result["id"]),
        details={"category": body.category, "value": body.value},
        ip_address=get_client_ip(request),
    )
    return result


@router.post("/semantic-tags/bulk")
def bulk_create_semantic_tags(
    body: SemanticTagBulkCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    tags = [t.model_dump() for t in body.tags]
    result = svc.bulk_create_semantic_tags(session, body.story_beat_id, tags)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="semantic_tags_bulk_created",
        target_type="semantic_tag",
        target_id=f"beat_{body.story_beat_id}",
        details=result,
        ip_address=get_client_ip(request),
    )
    return result


@router.patch("/semantic-tags/rename")
def rename_semantic_tag_value(
    body: SemanticTagRename,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    result = svc.rename_semantic_tag_value(session, body.category, body.old_value, body.new_value)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="semantic_tag_value_renamed",
        target_type="semantic_tag",
        target_id=f"{body.category}:{body.old_value}",
        details={"new_value": body.new_value, **result},
        ip_address=get_client_ip(request),
    )
    return result


@router.patch("/semantic-tags/{tag_id}")
def update_semantic_tag(
    tag_id: int,
    body: SemanticTagUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, detail="No fields to update")
    result = svc.update_semantic_tag(session, tag_id, data)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="semantic_tag_updated",
        target_type="semantic_tag",
        target_id=str(tag_id),
        details={"fields": list(data.keys())},
        ip_address=get_client_ip(request),
    )
    return result


@router.delete("/semantic-tags/{tag_id}", status_code=204)
def delete_semantic_tag(
    tag_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    svc.delete_semantic_tag(session, tag_id)
    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="semantic_tag_deleted",
        target_type="semantic_tag",
        target_id=str(tag_id),
        ip_address=get_client_ip(request),
    )
    return None
