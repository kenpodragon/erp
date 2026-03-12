import React from 'react';
import type { ShopItemData } from './ShopItemCard';

export interface BundleData {
  id: number;
  bundle_key: string;
  name: string;
  description: string | null;
  price_shards: number;
  original_price_shards: number;
  discount_pct: number;
  icon_path: string | null;
  is_featured: boolean;
  is_limited_time: boolean;
  available_until: string | null;
  items: BundleContentItem[];
  owned: boolean;
  all_items_owned: boolean;
}

export interface BundleContentItem {
  id: number;
  name: string;
  category: string;
  owned: boolean;
}

type PurchaseTarget =
  | { type: 'item'; item: ShopItemData }
  | { type: 'bundle'; bundle: BundleData };

interface Props {
  target: PurchaseTarget;
  balance: number;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ShopPurchaseModal: React.FC<Props> = ({ target, balance, loading, onConfirm, onCancel }) => {
  const isItem = target.type === 'item';
  const name = isItem ? target.item.name : target.bundle.name;
  const price = isItem ? target.item.price_shards : target.bundle.price_shards;
  const canAfford = balance >= price;
  const isBooster = isItem && target.item.category === 'booster';
  const deficit = price - balance;

  return (
    <div className="spm-overlay" onClick={onCancel}>
      <div className="spm-modal" onClick={e => e.stopPropagation()}>
        <h2 className="spm-title">Confirm Purchase</h2>
        <div className="spm-item-name">{name}</div>

        {isBooster && (
          <div className="spm-warning">
            This booster activates immediately upon purchase. If you already have an active booster
            of this type, the remaining time will be extended.
          </div>
        )}

        {!isItem && (
          <div className="spm-bundle-contents">
            <div className="spm-bundle-label">Bundle Contents:</div>
            {target.bundle.items.map(bi => (
              <div key={bi.id} className={`spm-bundle-item ${bi.owned ? 'already-owned' : ''}`}>
                <span>{bi.name}</span>
                {bi.owned && <span className="spm-owned-tag">Owned</span>}
              </div>
            ))}
            {target.bundle.items.some(bi => bi.owned) && (
              <div className="spm-partial-warning">
                You already own some items in this bundle. You will not receive duplicates,
                but the bundle price is not adjusted.
              </div>
            )}
          </div>
        )}

        <div className="spm-price-row">
          <span className="spm-label">Price:</span>
          <span className="spm-price">
            <span className="spm-shard-icon">&#9670;</span>
            {price.toLocaleString()}
          </span>
        </div>

        {!isItem && target.bundle.original_price_shards > target.bundle.price_shards && (
          <div className="spm-discount-row">
            <span className="spm-original-price">
              <span className="spm-shard-icon">&#9670;</span>
              {target.bundle.original_price_shards.toLocaleString()}
            </span>
            <span className="spm-discount-badge">-{target.bundle.discount_pct}%</span>
          </div>
        )}

        <div className="spm-balance-row">
          <span className="spm-label">Your Balance:</span>
          <span className={`spm-balance ${!canAfford ? 'insufficient' : ''}`}>
            <span className="spm-shard-icon">&#9670;</span>
            {balance.toLocaleString()}
          </span>
        </div>

        {!canAfford && (
          <div className="spm-deficit">
            You need <span className="spm-shard-icon">&#9670;</span>{deficit.toLocaleString()} more shards.
          </div>
        )}

        <div className="spm-actions">
          <button
            className="spm-btn spm-btn-confirm"
            onClick={onConfirm}
            disabled={!canAfford || loading}
          >
            {loading ? 'Purchasing...' : canAfford ? 'Purchase' : 'Insufficient Shards'}
          </button>
          <button className="spm-btn spm-btn-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopPurchaseModal;
