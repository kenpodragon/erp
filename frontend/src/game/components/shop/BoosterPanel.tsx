import React from 'react';
import type { ShopItemData } from './ShopItemCard';
import type { ActiveBooster } from '../../GameContext';

interface Props {
  boosterItems: ShopItemData[];
  activeBoosters: ActiveBooster[];
  balance: number;
  onPurchase: (item: ShopItemData) => void;
}

const BOOST_TYPE_LABELS: Record<string, string> = {
  xp: 'XP Boost',
  essence: 'Essence Boost',
  drop_rate: 'Drop Rate Boost',
};

const BOOST_TYPE_ICONS: Record<string, string> = {
  xp: '\u2B50',
  essence: '\u2728',
  drop_rate: '\uD83C\uDFAF',
};

const BoosterPanel: React.FC<Props> = ({ boosterItems, activeBoosters, balance, onPurchase }) => {
  if (boosterItems.length === 0) return null;

  // Group boosters by boost_type
  const byType: Record<string, ShopItemData[]> = {};
  for (const item of boosterItems) {
    const bt = item.item_metadata?.boost_type || 'xp';
    if (!byType[bt]) byType[bt] = [];
    byType[bt].push(item);
  }

  const activeMap = new Map(activeBoosters.map(b => [b.boostType, b]));

  return (
    <div className="booster-panel">
      <h3 className="booster-panel-title">{'\u26A1'} Boosters</h3>
      <div className="booster-panel-grid">
        {Object.entries(byType).map(([boostType, items]) => {
          const active = activeMap.get(boostType);
          return (
            <div key={boostType} className="booster-type-section">
              <div className="booster-type-header">
                <span className="booster-type-icon">{BOOST_TYPE_ICONS[boostType] || '\u26A1'}</span>
                <span className="booster-type-label">{BOOST_TYPE_LABELS[boostType] || boostType}</span>
                {active && (
                  <span className="booster-active-badge">
                    {active.magnitude}x &middot; {formatCountdown(active.remainingSeconds)}
                  </span>
                )}
              </div>
              <div className="booster-options">
                {items.map(item => {
                  const canAfford = balance >= item.price_shards;
                  return (
                    <button
                      key={item.id}
                      className={`booster-option-btn ${canAfford ? '' : 'cant-afford'}`}
                      onClick={() => onPurchase(item)}
                      title={item.description || item.name}
                    >
                      <span className="booster-opt-mag">{item.item_metadata?.magnitude}x</span>
                      <span className="booster-opt-dur">{formatDuration(item.item_metadata?.duration_seconds)}</span>
                      <span className="booster-opt-price">
                        <span className="spm-shard-icon">&#9670;</span>
                        {item.price_shards.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  if (h >= 1) return `${h}h`;
  return `${Math.floor(seconds / 60)}m`;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default BoosterPanel;
