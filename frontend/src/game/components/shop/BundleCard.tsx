import React from 'react';
import type { BundleData } from './ShopPurchaseModal';

interface Props {
  bundle: BundleData;
  balance: number;
  onPurchase: (bundle: BundleData) => void;
}

const BundleCard: React.FC<Props> = ({ bundle, balance, onPurchase }) => {
  const canAfford = balance >= bundle.price_shards;
  const someOwned = bundle.items.some(i => i.owned);

  return (
    <div
      className={`bundle-card ${bundle.owned ? 'owned' : ''} ${bundle.is_featured ? 'featured' : ''}`}
      onClick={() => !bundle.owned && onPurchase(bundle)}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !bundle.owned) onPurchase(bundle); }}
      tabIndex={0}
      role="button"
      aria-label={`${bundle.name} bundle - ${bundle.owned ? 'Owned' : `${bundle.price_shards} shards`}`}
    >
      <div className="bundle-header">
        <span className="bundle-name">{bundle.name}</span>
        {bundle.discount_pct > 0 && !bundle.owned && (
          <span className="bundle-discount">-{bundle.discount_pct}%</span>
        )}
      </div>
      {bundle.description && <div className="bundle-desc">{bundle.description}</div>}
      <div className="bundle-contents-list">
        {bundle.items.map(bi => (
          <span key={bi.id} className={`bundle-content-tag ${bi.owned ? 'already-owned' : ''}`}>
            {bi.name} {bi.owned && '\u2713'}
          </span>
        ))}
      </div>
      <div className="bundle-footer">
        {bundle.owned ? (
          <span className="bundle-status owned">Owned</span>
        ) : (
          <div className="bundle-price-row">
            {bundle.original_price_shards > bundle.price_shards && (
              <span className="bundle-original-price">
                <span className="spm-shard-icon">&#9670;</span>{bundle.original_price_shards.toLocaleString()}
              </span>
            )}
            <span className={`bundle-price ${canAfford ? '' : 'cant-afford'}`}>
              <span className="spm-shard-icon">&#9670;</span>{bundle.price_shards.toLocaleString()}
            </span>
          </div>
        )}
        {someOwned && !bundle.owned && (
          <span className="bundle-partial-note">You own some items</span>
        )}
      </div>
    </div>
  );
};

export default BundleCard;
