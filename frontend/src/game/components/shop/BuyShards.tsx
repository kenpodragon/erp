import React from 'react';
import PackageCard from './PackageCard';
import type { ShardPackage } from './ShopTab';
import './BuyShards.css';

interface BuyShardsProps {
  packages: ShardPackage[];
  firstPurchaseAvailable: boolean;
  hasActiveDispute: boolean;
  onPurchase: (pkg: ShardPackage) => void;
  currentBalance: number;
}

const BuyShards: React.FC<BuyShardsProps> = ({
  packages,
  firstPurchaseAvailable,
  hasActiveDispute,
  onPurchase,
  currentBalance,
}) => {
  return (
    <div className="buy-shards">
      {/* Dispute warning */}
      {hasActiveDispute && (
        <div className="dispute-banner">
          <span className="dispute-icon">&#9888;</span>
          <div>
            <strong>Purchases Disabled</strong>
            <p>You have an active payment dispute. Purchases are disabled until it is resolved. Please contact support for assistance.</p>
          </div>
        </div>
      )}

      {/* First purchase bonus banner */}
      {firstPurchaseAvailable && !hasActiveDispute && (
        <div className="first-purchase-banner">
          <span className="fp-badge">2x SHARDS</span>
          <span className="fp-text">
            First-time buyer bonus! Your first purchase receives <strong>double shards</strong>.
          </span>
        </div>
      )}

      {/* Package grid */}
      <div className="packages-grid">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            package_={pkg}
            firstPurchaseAvailable={firstPurchaseAvailable}
            disabled={hasActiveDispute || pkg.purchases_remaining === 0}
            onClick={() => onPurchase(pkg)}
          />
        ))}
      </div>

      {packages.length === 0 && (
        <div className="no-packages">
          <p>No shard packages are currently available.</p>
        </div>
      )}

      {/* Legal footer */}
      <div className="shop-legal">
        <p className="age-disclaimer">You must be 18 or older to make purchases.</p>
        <p className="legal-text">
          All purchases are final. Elysium Shards are digital goods with no real-world monetary value.
        </p>
      </div>
    </div>
  );
};

export default BuyShards;
