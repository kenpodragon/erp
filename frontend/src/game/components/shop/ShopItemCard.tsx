import React from 'react';

export interface ShopItemData {
  id: number;
  item_key: string;
  name: string;
  description: string | null;
  category: string;
  price_shards: number;
  icon_path: string | null;
  class_restriction: number | null;
  class_restriction_name?: string | null;
  is_featured: boolean;
  is_limited_time: boolean;
  available_until: string | null;
  owned: boolean;
  equipped: boolean;
  item_metadata: Record<string, any> | null;
}

interface Props {
  item: ShopItemData;
  balance: number;
  onPurchase: (item: ShopItemData) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  skin: '\u2694',     // crossed swords
  flair: '\u2728',    // sparkles
  badge: '\u2B50',    // star
  avatar: '\uD83D\uDC64', // bust
  booster: '\u26A1',  // lightning
};

const ShopItemCard: React.FC<Props> = ({ item, balance, onPurchase }) => {
  const canAfford = balance >= item.price_shards;
  const isBooster = item.category === 'booster';

  let statusLabel: string;
  let statusClass: string;
  if (item.equipped) {
    statusLabel = 'Equipped';
    statusClass = 'equipped';
  } else if (item.owned && !isBooster) {
    statusLabel = 'Owned';
    statusClass = 'owned';
  } else if (!canAfford) {
    statusLabel = `\u25C6 ${item.price_shards.toLocaleString()}`;
    statusClass = 'cant-afford';
  } else {
    statusLabel = `\u25C6 ${item.price_shards.toLocaleString()}`;
    statusClass = 'buyable';
  }

  const handleClick = () => {
    if (item.equipped) return;
    if (item.owned && !isBooster) return;
    onPurchase(item);
  };

  return (
    <div
      className={`shop-item-card ${statusClass} ${item.is_featured ? 'featured' : ''}`}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      tabIndex={0}
      role="button"
      aria-label={`${item.name} - ${statusLabel}`}
    >
      <div className="sic-icon">
        {item.icon_path
          ? <img src={item.icon_path} alt={item.name} className="sic-icon-img" />
          : <span className="sic-icon-fallback">{CATEGORY_ICONS[item.category] || '\u25C6'}</span>
        }
      </div>
      <div className="sic-name">{item.name}</div>
      {item.description && <div className="sic-desc">{item.description}</div>}
      {item.class_restriction_name && (
        <div className="sic-class-tag">{item.class_restriction_name} Only</div>
      )}
      {isBooster && item.item_metadata && (
        <div className="sic-booster-info">
          {item.item_metadata.magnitude}x {item.item_metadata.boost_type?.toUpperCase()} &middot; {formatDuration(item.item_metadata.duration_seconds)}
        </div>
      )}
      <div className={`sic-status ${statusClass}`}>
        {statusLabel}
      </div>
    </div>
  );
};

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  if (h >= 1) return `${h}h`;
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

export default ShopItemCard;
