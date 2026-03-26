"""Admin Character Management service package.

Modules:
  crud        — character editing, class reassignment, equipment validation
  items       — item crafting, inventory, item/artifact editing
  progression — stat breakdown, essence, progression editor, boss completions, skills
  timeline    — player activity timeline aggregation
"""

from services.character.crud import (
    edit_character, reassign_class, check_equipment_requirements,
)
from services.character.items import (
    get_item_components, craft_item_manual, craft_item_random,
    grant_crafted_item, get_character_inventory,
    edit_item, delete_item, edit_artifact,
)
from services.character.progression import (
    get_stat_breakdown, adjust_essence, get_essence_history,
    get_content_tree, set_progression, get_boss_completions, reset_boss_completions,
    get_character_skills, update_character_skills,
)
from services.character.timeline import get_player_timeline
