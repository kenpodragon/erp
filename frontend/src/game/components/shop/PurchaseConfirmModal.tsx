import React from 'react';
import type { ShardPackage } from './ShopTab';
import './PurchaseConfirmModal.css';

interface PurchaseConfirmModalProps {
  package_: ShardPackage;
  firstPurchaseAvailable: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PurchaseConfirmModal: React.FC<PurchaseConfirmModalProps> = ({
  package_: pkg,
  firstPurchaseAvailable,
  onConfirm,
  onCancel,
}) => {
  const effectiveShards = firstPurchaseAvailable ? pkg.total_shards * 2 : pkg.total_shards;

  return (
    <div className="pcm-overlay" onClick={onCancel}>
      <div className="pcm-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="pcm-title">Confirm Purchase</h2>

        <div className="pcm-package-name">{pkg.name}</div>

        <div className="pcm-details">
          <div className="pcm-row">
            <span className="pcm-label">Price:</span>
            <span className="pcm-value">{pkg.price_display}</span>
          </div>
          <div className="pcm-row">
            <span className="pcm-label">You will receive:</span>
            <span className="pcm-value pcm-shards">
              <span className="pcm-shard-icon">&#9670;</span>
              {effectiveShards.toLocaleString()}
            </span>
          </div>
          {firstPurchaseAvailable && (
            <div className="pcm-bonus-note">
              Includes 2x first-purchase bonus!
            </div>
          )}
        </div>

        <div className="pcm-actions">
          <button className="pcm-btn pcm-btn-confirm" onClick={onConfirm}>
            Proceed to Payment
          </button>
          <button className="pcm-btn pcm-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>

        <div className="pcm-legal">
          <p>You must be 18 or older to make purchases.</p>
          <p>All purchases are final. Elysium Shards are digital goods with no real-world monetary value.</p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseConfirmModal;
