import React from 'react';
import type { MarketplaceListing } from './BazaarTab';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800',
  cosmic: '#ff4081',
};

interface Props {
  listing: MarketplaceListing;
  shardBalance: number;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const BazaarPurchaseModal: React.FC<Props> = ({ listing, shardBalance, loading, onConfirm, onCancel }) => {
  const canAfford = shardBalance >= listing.price_shards;
  const balanceAfter = shardBalance - listing.price_shards;
  const deficit = listing.price_shards - shardBalance;
  const rarityColor = RARITY_COLORS[listing.item_rarity] || '#aaa';
  const stats = listing.item_stats || {};
  const statEntries = Object.entries(stats);

  return (
    <div className="bpm-overlay" onClick={onCancel}>
      <div className="bpm-modal" onClick={e => e.stopPropagation()}>
        <h3 className="bpm-title">Confirm Purchase</h3>

        {/* Item details */}
        <div className="bpm-item-name" style={{ color: rarityColor }}>
          {listing.item_name}
        </div>
        <div className="bpm-item-rarity" style={{ color: rarityColor }}>
          {listing.item_rarity}
        </div>

        {/* Stats */}
        {statEntries.length > 0 && (
          <div className="bpm-item-stats">
            {statEntries.map(([key, val]) => (
              <div key={key} className="bpm-stat-row">
                <span className="bpm-stat-key">{key}</span>
                <span className="bpm-stat-val">+{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Seller */}
        <div className="bpm-seller">
          Seller: {listing.seller_alias || 'Anonymous'}
        </div>

        {/* Price breakdown */}
        <div className="bpm-price-section">
          <div className="bpm-price-row">
            <span className="bpm-label">Price</span>
            <span className="bpm-price">
              <span className="bpm-shard-icon">&#9670;</span>
              {listing.price_shards.toLocaleString()}
            </span>
          </div>
          <div className="bpm-price-row">
            <span className="bpm-label">Your Balance</span>
            <span className={`bpm-balance ${!canAfford ? 'insufficient' : ''}`}>
              <span className="bpm-shard-icon">&#9670;</span>
              {shardBalance.toLocaleString()}
            </span>
          </div>
          {canAfford && (
            <div className="bpm-price-row">
              <span className="bpm-label">After Purchase</span>
              <span className="bpm-balance-after">
                <span className="bpm-shard-icon">&#9670;</span>
                {balanceAfter.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Insufficient balance */}
        {!canAfford && (
          <div className="bpm-deficit">
            You need <span className="bpm-shard-icon">&#9670;</span> {deficit.toLocaleString()} more shards.{' '}
            <button
              className="bpm-buy-shards-link"
              onClick={() => {
                onCancel();
                window.dispatchEvent(new CustomEvent('shop-switch-tab', { detail: 'buy' }));
              }}
            >
              Buy Shards
            </button>
          </div>
        )}

        {/* Warning */}
        <div className="bpm-warning">
          All marketplace sales are final.
        </div>

        {/* Actions */}
        <div className="bpm-actions">
          <button
            className="bpm-btn bpm-btn-confirm"
            disabled={!canAfford || loading}
            onClick={onConfirm}
          >
            {loading ? 'Processing...' : 'Confirm Purchase'}
          </button>
          <button
            className="bpm-btn bpm-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BazaarPurchaseModal;
