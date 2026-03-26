import type { Character, CharacterInventory } from './usePlayerData'

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#e040fb',
  cosmic: '#ffd700',
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface PlayerCharacterCardProps {
  char: Character
  inventory: CharacterInventory | undefined
  isExpanded: boolean
  essence: number | undefined
  onToggleInventory: (characterId: number) => void
  onEditCharacter: (charId: number) => void
  onCraftItem: (charId: number, level: number) => void
  onAdjustEssence: (charId: number, charName: string) => void
  onEditProgression: (char: Character) => void
  onEditSkills: (charId: number, charName: string, className: string) => void
  onEditItem: (itemId: number, characterId: number, isArtifact: boolean, artifactType?: 'generated' | 'curated') => void
}

export default function PlayerCharacterCard({
  char,
  inventory,
  isExpanded,
  essence,
  onToggleInventory,
  onEditCharacter,
  onCraftItem,
  onAdjustEssence,
  onEditProgression,
  onEditSkills,
  onEditItem,
}: PlayerCharacterCardProps) {
  return (
    <div className="character-card enhanced">
      <div className="char-header">
        <span className="char-name">{char.character_name}</span>
        <span className="char-level">Level {char.level}</span>
      </div>
      <div className="char-class">{char.class?.name || 'Unknown Class'}</div>
      <div className="char-stats">
        <span>STR: {char.strength}</span>
        <span>AGI: {char.agility}</span>
        <span>INT: {char.intelligence}</span>
      </div>
      {essence !== undefined && (
        <div className="char-essence">
          Essence: {essence.toLocaleString()}
        </div>
      )}
      <div className="char-footer">
        Created: {new Date(char.created_at).toLocaleDateString()}
      </div>

      {/* Action Buttons */}
      <div className="char-actions">
        <button className="btn-char-action" onClick={() => onEditCharacter(char.id)}>Edit Character</button>
        <button className="btn-char-action" onClick={() => onCraftItem(char.id, char.level)}>Craft Item</button>
        <button className="btn-char-action" onClick={() => onAdjustEssence(char.id, char.character_name)}>Adjust Essence</button>
        <button className="btn-char-action" onClick={() => onEditProgression(char)}>Edit Progression</button>
        <button className="btn-char-action" onClick={() => onEditSkills(char.id, char.character_name, char.class?.name || '')}>Edit Skills</button>
      </div>

      {/* Collapsible Inventory */}
      <div className="char-inventory-toggle" onClick={() => onToggleInventory(char.id)}>
        {isExpanded ? '▾' : '▸'} Inventory {inventory ? `(${inventory.bag_count}/${inventory.bag_capacity} bag, ${inventory.artifacts.length} artifacts)` : ''}
      </div>

      {isExpanded && inventory && (
        <div className="char-inventory">
          {/* Equipped Items */}
          <div className="inv-section">
            <div className="inv-section-label">Equipped</div>
            {inventory.equipped.length === 0 ? (
              <div className="inv-empty">No items equipped</div>
            ) : (
              inventory.equipped.map(item => (
                <div
                  key={item.inventory_id}
                  className="inv-item clickable"
                  onClick={() => onEditItem(item.item_id, char.id, false)}
                  style={{ borderLeftColor: RARITY_COLORS[item.rarity] || '#aaa' }}
                >
                  <span className="inv-item-name" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                  <span className="inv-item-slot">{item.equipped_slot}</span>
                </div>
              ))
            )}
          </div>

          {/* Bag Items */}
          <div className="inv-section">
            <div className="inv-section-label">Bag ({inventory.bag_count}/{inventory.bag_capacity})</div>
            {inventory.bag.length === 0 ? (
              <div className="inv-empty">Bag is empty</div>
            ) : (
              inventory.bag.map(item => (
                <div
                  key={item.inventory_id}
                  className="inv-item clickable"
                  onClick={() => onEditItem(item.item_id, char.id, false)}
                  style={{ borderLeftColor: RARITY_COLORS[item.rarity] || '#aaa' }}
                >
                  <span className="inv-item-name" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                  <span className="inv-item-rarity">{item.rarity}</span>
                </div>
              ))
            )}
          </div>

          {/* Artifacts */}
          <div className="inv-section">
            <div className="inv-section-label">Artifacts ({inventory.artifacts.length})</div>
            {inventory.artifacts.length === 0 ? (
              <div className="inv-empty">No artifacts</div>
            ) : (
              inventory.artifacts.map(art => (
                <div
                  key={art.id}
                  className="inv-item clickable"
                  onClick={() => onEditItem(art.id, char.id, true, art.artifact_type)}
                  style={{ borderLeftColor: RARITY_COLORS[art.rarity] || '#aaa' }}
                >
                  <span className="inv-item-name" style={{ color: RARITY_COLORS[art.rarity] }}>{art.name}</span>
                  <span className="inv-item-rarity">{art.rarity}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
