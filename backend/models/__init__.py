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
    AdminWhitelistEmail, AdminWhitelistIP, AdminEssenceAdjustment,
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
from models.discovery import PlayerEntityDiscovery, PlayerDiscoveryLog
from models.chat import ChatChannel
from models.home_base import (
    CuratedArtifact, CuratedArtifactTier, ArtifactTypeBase, ArtifactPrefix,
    ArtifactSuffix, PlayerArtifact, Title, Achievement, PlayerAchievement,
    PlayerTitle, LeaderboardCache, ShardTransaction,
)
from models.payments import ShardPackage, PaymentOrder, StripeWebhookEvent
from models.subscriptions import PlayerSubscription, SubscriptionStipendLog
from models.shop import ShopItem, ShopBundle, ShopBundleItem, PlayerShopItem, PlayerActiveBooster
from models.donation import Donation
from models.marketplace import MarketplaceListing, MarketplaceTrade, MarketplaceNotification, MarketplacePriceHistory
from models.finance import AdminShardAdjustment
from models.asset_registry import AssetRegistryEntry

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
    "AdminWhitelistEmail", "AdminWhitelistIP", "AdminEssenceAdjustment",
    "GameConfig", "PlayerStorySession", "SessionUpgrade",
    "PlayerMetaProgression", "DevContentAudit",
    "CharacterSkillLevel", "EntitySceneAppearance", "BossCompletion",
    "IdleSkillStatContribution", "ClassStatAffinity", "CharacterStat",
    "PlayerSceneRecord", "SkillPrerequisite",
    "AttackType", "EntityAttackType", "TypeBaseAttackType",
    "Atmosphere", "AudioConfig",
    "PlayerEntityDiscovery", "PlayerDiscoveryLog",
    "ChatChannel",
    "CuratedArtifact", "CuratedArtifactTier", "ArtifactTypeBase", "ArtifactPrefix",
    "ArtifactSuffix", "PlayerArtifact", "Title", "Achievement", "PlayerAchievement",
    "PlayerTitle", "LeaderboardCache", "ShardTransaction",
    "ShardPackage", "PaymentOrder", "StripeWebhookEvent",
    "PlayerSubscription", "SubscriptionStipendLog",
    "ShopItem", "ShopBundle", "ShopBundleItem", "PlayerShopItem", "PlayerActiveBooster",
    "Donation",
    "MarketplaceListing", "MarketplaceTrade", "MarketplaceNotification", "MarketplacePriceHistory",
    "AdminShardAdjustment",
    "AssetRegistryEntry",
]
