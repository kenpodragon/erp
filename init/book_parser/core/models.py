"""
Pydantic models for validating AI JSON responses in all phases.
"""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Phase 1: Text Extraction & Structural Splitting ───────────────────────

class BeatStructure(BaseModel):
    beat_number: int
    summary: str = Field(description="One-line summary of what happens in this beat")
    start_para_idx: int = Field(description="Index of first paragraph (0-based) in this beat")
    end_para_idx: int = Field(description="Index of last paragraph (inclusive) in this beat")
    pacing: str = Field(default="action", description="slow-burn | action | dialogue-heavy | contemplative | transitional")
    intensity: int = Field(default=3, ge=1, le=5, description="Dramatic intensity 1-5")
    timeline_context: Literal["present", "flashback", "dream", "vision", "future"] = "present"


class SceneStructure(BaseModel):
    scene_number: int
    title: str = Field(description="Short evocative title for this scene")
    summary: str = Field(description="2-3 sentence summary of scene events")
    start_para_idx: int
    end_para_idx: int
    triggered_by_hard_break: bool = Field(default=False, description="True if this scene boundary was a hard break marker like ***")
    beats: list[BeatStructure]


class Phase1Response(BaseModel):
    scenes: list[SceneStructure]


# ── Phase 2: AI Semantic Extraction ───────────────────────────────────────

class MiniBossExtension(BaseModel):
    source_entity_name: str = Field(description="The canonical_name of the base entity this boss is a variant of")
    boss_name: str = Field(description="The unique name for this boss variant (e.g. 'Gorgon Queen')")
    additional_description: str = Field(description="Physical traits, aura, and presence")
    text_references: str = Field(description="Specific lines or actions from the text that justify their boss status")
    action_or_quote: str = Field(description="A signature move, iconic action, or dialogue/quote")
    variant_differences: str = Field(description="How this version is significantly more dangerous or distinct from the base entity")


class EntityExtraction(BaseModel):
    canonical_name: str = Field(description="The definitive name for this entity")
    entity_type: Literal["character", "creature", "object", "environment", "manifestation", "group", "other"]
    is_new: bool = Field(description="True if this entity has not appeared in any prior scene this book")
    role: Literal["ally", "enemy", "neutral", "unknown", "mini-boss", "big-boss"] = Field(default="unknown")
    is_present: bool = Field(default=True, description="False if entity is only mentioned, not physically present")
    aliases: Optional[list[str]] = Field(default_factory=list, description="Other names used for this entity in this scene")
    is_generated: bool = Field(default=False, description="True if AI created this entity to meet minimum count requirements, not from text")

    # Base fields — populate only when is_new=True
    base_description: Optional[str] = None
    base_emotional_state: Optional[str] = None
    base_sounds: Optional[str] = None
    base_smells: Optional[str] = None
    base_equipment: Optional[str] = None
    base_abilities: Optional[str] = None

    # Delta fields — populate when is_new=False and something changed
    description_delta: Optional[str] = None
    emotional_state_delta: Optional[str] = None
    equipment_delta: Optional[str] = None

    # Scene context
    entry_context: Optional[str] = None
    exit_reason: Optional[str] = None
    relationships: Optional[str] = Field(default=None, description="Relationships to other entities in this scene")


class BeatEntityAssignment(BaseModel):
    entity_name: str = Field(description="Must match canonical_name of an entity in this response")
    role: Literal["ally", "enemy", "neutral", "unknown", "mini-boss", "big-boss"]
    is_primary: bool = Field(default=False, description="True if this is the main threat or focus of the beat")
    beat_context: Optional[str] = Field(default=None, description="What this entity does in this beat")


class BeatEntityGroup(BaseModel):
    beat_number: int
    entity_assignments: list[BeatEntityAssignment]


class LocationExtraction(BaseModel):
    canonical_name: str
    is_new: bool
    location_type: Literal["interior", "exterior", "transitional", "other"] = "other"

    # Base fields — when is_new=True
    base_visual: Optional[str] = None
    base_auditory: Optional[str] = None
    base_olfactory: Optional[str] = None
    base_tactile: Optional[str] = None
    base_atmosphere: Optional[str] = None

    # Delta fields — when is_new=False and something changed
    visual_delta: Optional[str] = None
    auditory_delta: Optional[str] = None
    olfactory_delta: Optional[str] = None
    tactile_delta: Optional[str] = None
    atmosphere_delta: Optional[str] = None


class SemanticTag(BaseModel):
    beat_number: int
    category: Literal["emotion", "theme", "sensory"]
    value: str = Field(description="The tag value (e.g. 'fear', 'betrayal', 'auditory')")
    notes: Optional[str] = Field(default=None, description="Nuance that the structured tag alone can't capture")


class Phase2Response(BaseModel):
    entities: list[EntityExtraction]
    location: Optional[LocationExtraction] = None
    beat_entities: list[BeatEntityGroup]
    semantic_tags: list[SemanticTag]
    mini_boss: Optional[MiniBossExtension] = Field(default=None, description="Detailed info if this scene has a mini-boss")


class BigBossExtension(BaseModel):
    source_entity_name: str = Field(description="The name of the most prominent antagonist in the entire chapter")
    boss_name: str = Field(description="Evocative title for the chapter boss (e.g. 'The Sentinel of Shadows')")
    additional_description: str
    text_references: str
    action_or_quote: str
    variant_differences: str


class ChapterBossResponse(BaseModel):
    big_boss: Optional[BigBossExtension] = None


# ── Phase 3: Consistency & Standardization ────────────────────────────────

class EntityMergeProposal(BaseModel):
    keep_canonical_name: str = Field(description="The canonical name to keep")
    merge_from_names: list[str] = Field(description="Names that should be merged into keep_canonical_name")
    reason: str


class TaxonomyMapping(BaseModel):
    original_value: str
    canonical_value: str
    category: Literal["emotion", "theme", "sensory"]


class InconsistencyFlag(BaseModel):
    severity: Literal["info", "warning", "error"]
    category: Literal["entity_resolution", "description_inconsistency", "timeline_gap", "taxonomy_change", "cross_provider_discrepancy"]
    title: str
    description: str
    suggested_action: str
    affected_entity_name: Optional[str] = None
    affected_location_name: Optional[str] = None
    affected_scene_id: Optional[int] = None
    affected_beat_id: Optional[int] = None


class Phase3Response(BaseModel):
    entity_merges: list[EntityMergeProposal]
    taxonomy_mappings: list[TaxonomyMapping]
    inconsistencies: list[InconsistencyFlag]
