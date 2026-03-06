/**
 * ItemCard — displays a dream item with rarity-colored border, stats, and requirement overlay.
 */
import React from 'react';
import './ItemCard.css';

export interface ItemData {
  item_id: number;
  inventory_id?: number;
  name: string;
  rarity: string;
  item_type: string;
  base_stats: Record<string, number>;
  item_code?: string;
  item_level: number;
  min_char_level: number;
  stat_requirements?: Record<string, number>;
  gear_slot_id?: number;
  is_equipped?: boolean;
  equipped_slot?: string;
  meets_requirements?: boolean;
  description?: string;
}

interface Props {
  item: ItemData;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
  showRequirements?: boolean;
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  cosmic: 'Cosmic',
};

const ItemCard: React.FC<Props> = ({
  item,
  compact = false,
  selected = false,
  onClick,
  showRequirements = true,
}) => {
  const meetsReqs = item.meets_requirements !== false;
  const statEntries = Object.entries(item.base_stats || {});

  return (
    <div
      className={`item-card item-card--${item.rarity} ${selected ? 'item-card--selected' : ''} ${!meetsReqs ? 'item-card--locked' : ''} ${compact ? 'item-card--compact' : ''}`}
      onClick={onClick}
    >
      <div className="item-card-header">
        <span className="item-card-name">{item.name}</span>
        <span className={`item-card-rarity item-card-rarity--${item.rarity}`}>
          {RARITY_LABELS[item.rarity] || item.rarity}
        </span>
      </div>

      <div className="item-card-type">
        {item.item_type} &middot; Lv.{item.item_level}
      </div>

      {!compact && statEntries.length > 0 && (
        <div className="item-card-stats">
          {statEntries.map(([stat, val]) => (
            <div key={stat} className="item-card-stat">
              <span className="item-card-stat-name">{stat.toUpperCase()}</span>
              <span className="item-card-stat-value">+{val}</span>
            </div>
          ))}
        </div>
      )}

      {!meetsReqs && showRequirements && (
        <div className="item-card-req-overlay">
          <span className="item-card-req-label">REQUIRES</span>
          {item.min_char_level > 0 && (
            <span className="item-card-req">Lv. {item.min_char_level}</span>
          )}
          {item.stat_requirements && Object.entries(item.stat_requirements).map(([stat, val]) => (
            <span key={stat} className="item-card-req">{stat.toUpperCase()} {val}</span>
          ))}
        </div>
      )}

      {item.is_equipped && (
        <div className="item-card-equipped-badge">EQUIPPED</div>
      )}
    </div>
  );
};

export default ItemCard;
