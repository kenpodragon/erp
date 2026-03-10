import React from 'react';
import type { ShardPackage } from './ShopTab';
import './PackageCard.css';

interface PackageCardProps {
  package_: ShardPackage;
  firstPurchaseAvailable: boolean;
  disabled: boolean;
  onClick: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({
  package_: pkg,
  firstPurchaseAvailable,
  disabled,
  onClick,
}) => {
  const effectiveShards = firstPurchaseAvailable ? pkg.total_shards * 2 : pkg.total_shards;

  return (
    <div
      className={`package-card ${pkg.is_best_value ? 'best-value' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
    >
      {/* Best value badge */}
      {pkg.is_best_value && (
        <div className="best-value-badge">BEST VALUE</div>
      )}

      {/* First purchase badge */}
      {firstPurchaseAvailable && (
        <div className="first-purchase-badge">2x SHARDS!</div>
      )}

      {/* Package name */}
      <h3 className="package-name">{pkg.name}</h3>

      {/* Shard amount */}
      <div className="package-shards">
        <span className="shard-diamond">&#9670;</span>
        <span className="shard-count">{effectiveShards.toLocaleString()}</span>
      </div>

      {/* Bonus badge */}
      {pkg.bonus_pct > 0 && (
        <div className="bonus-badge">+{pkg.bonus_pct}% Bonus</div>
      )}

      {/* First purchase original amount */}
      {firstPurchaseAvailable && (
        <div className="original-amount">
          Base: {pkg.total_shards.toLocaleString()} &#9670;
        </div>
      )}

      {/* Price */}
      <div className="package-price">{pkg.price_display}</div>

      {/* Limited remaining */}
      {pkg.purchases_remaining !== null && (
        <div className={`purchases-remaining ${pkg.purchases_remaining === 0 ? 'sold-out' : ''}`}>
          {pkg.purchases_remaining === 0 ? 'Sold Out' : `${pkg.purchases_remaining} remaining`}
        </div>
      )}
    </div>
  );
};

export default PackageCard;
