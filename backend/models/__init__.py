"""
SQLModel ORM models for ERP.

Re-exports all models for backward compatibility.
Import from here: `from models import Player, Chapter, ...`
"""

from models.player import Player, PlayerSettings, CharacterClass, PlayerCharacter
from models.progress import PlayerProgress, PlayerEssence
from models.support import SupportTicket, SupportReply, SupportAttachment
from models.narrative import Book, Chapter, Scene, StoryBeat, Location
from models.gameplay import (
    SceneGameplayData, Entity, EntityGameplayData,
    Skill, SkillAction, StatDefinition, BenefitEffectData,
)
from models.inventory import (
    GearSlot, ItemPrefix, ItemQuality, ItemLoreTag, ItemTypeBase, ItemSuffix,
    InventoryItem, PlayerInventory, Artifact, PlayerCollection,
)
from models.admin import (
    ServerConfig, AdminAuditLog, ActivityEvent,
    AdminWhitelistEmail, AdminWhitelistIP,
)
from models.story_mode import (
    GameConfig, PlayerStorySession, SessionUpgrade,
    PlayerMetaProgression, DevContentAudit,
    CharacterSkillLevel, EntitySceneAppearance, BossCompletion,
)
from models.character_progression import (
    IdleSkillStatContribution, ClassStatAffinity, CharacterStat,
    PlayerSceneRecord, SkillPrerequisite,
)
from models.attack_types import AttackType, EntityAttackType, TypeBaseAttackType
from models.audio import Atmosphere, AudioConfig

__all__ = [
    "Player", "PlayerSettings", "CharacterClass", "PlayerCharacter",
    "PlayerProgress", "PlayerEssence",
    "SupportTicket", "SupportReply", "SupportAttachment",
    "Book", "Chapter", "Scene", "StoryBeat", "Location",
    "SceneGameplayData", "Entity", "EntityGameplayData",
    "Skill", "SkillAction", "StatDefinition", "BenefitEffectData",
    "GearSlot", "ItemPrefix", "ItemQuality", "ItemLoreTag", "ItemTypeBase", "ItemSuffix",
    "InventoryItem", "PlayerInventory", "Artifact", "PlayerCollection",
    "ServerConfig", "AdminAuditLog", "ActivityEvent",
    "AdminWhitelistEmail", "AdminWhitelistIP",
    "GameConfig", "PlayerStorySession", "SessionUpgrade",
    "PlayerMetaProgression", "DevContentAudit",
    "CharacterSkillLevel", "EntitySceneAppearance", "BossCompletion",
    "IdleSkillStatContribution", "ClassStatAffinity", "CharacterStat",
    "PlayerSceneRecord", "SkillPrerequisite",
    "AttackType", "EntityAttackType", "TypeBaseAttackType",
    "Atmosphere", "AudioConfig",
]
