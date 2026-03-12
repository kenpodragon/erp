import React from 'react';
import type { MarketplaceListing } from './BazaarTab';

interface Props {
  listing: MarketplaceListing;
  shardBalance: number;
  isOwn: boolean;
  onBuy: (listing: MarketplaceListing) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800',
  cosmic: '#ff4081',
};

const ListingCard: React.FC<Props> = ({ listing, shardBalance, isOwn, onBuy }) => {
  const rarityColor = RARITY_COLORS[listing.item_rarity] || '#aaa';
  const canAfford = shardBalance >= listing.price_shards;
  const canBuy = !isOwn && canAfford;
  const stats = listing.item_stats || {};
  const statEntries = Object.entries(stats);

  return (
    <div
      className={`listing-card ${isOwn ? 'own' : ''}`}
      style={{ borderColor: isOwn ? '#555' : undefined }}
    >
      {/* Item Name + Rarity */}
      <div className="listing-card-name" style={{ color: rarityColor }}>
        {listing.item_name}
      </div>

      <span
        className="listing-card-rarity"
        style={{
          backgroundColor: rarityColor + '22',
          color: rarityColor,
          borderColor: rarityColor + '44',
        }}
      >
        {listing.item_rarity}
      </span>

      {/* Stats */}
      {statEntries.length > 0 && (
        <div className="listing-card-stats">
          {statEntries.slice(0, 3).map(([key, val]) => (
            <span key={key} className="listing-card-stat">
              {key}: +{val}
            </span>
          ))}
          {statEntries.length > 3 && (
            <span className="listing-card-stat-more">+{statEntries.length - 3} more</span>
          )}
        </div>
      )}

      {listing.gear_slot && (
        <div className="listing-card-slot">{listing.gear_slot}</div>
      )}

      {/* Price */}
      <div className="listing-card-price">
        <span className="listing-card-shard-icon">&#9670;</span>
        <span className={`listing-card-price-value ${!canAfford && !isOwn ? 'cant-afford' : ''}`}>
          {listing.price_shards.toLocaleString()}
        </span>
      </div>

      {/* Comparable prices */}
      {(listing.comparable_min != null || listing.comparable_max != null) && (
        <div className="listing-card-comparable">
          Range: {listing.comparable_min?.toLocaleString() ?? '?'} &ndash; {listing.comparable_max?.toLocaleString() ?? '?'}
        </div>
      )}

      {/* Seller */}
      <div className="listing-card-seller">
        {isOwn ? (
          <span className="listing-card-own-label">Your Listing</span>
        ) : (
          <span>Seller: {listing.seller_alias || 'Anonymous'}</span>
        )}
      </div>

      {/* Buy Button */}
      {!isOwn && (
        <button
          className={`listing-card-buy-btn ${canBuy ? '' : 'disabled'}`}
          disabled={!canBuy}
          onClick={() => onBuy(listing)}
        >
          {canAfford ? 'Buy Now' : 'Insufficient Shards'}
        </button>
      )}
    </div>
  );
};

export default ListingCard;
