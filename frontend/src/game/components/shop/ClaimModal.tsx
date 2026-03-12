import React, { useState } from 'react';
import type { PendingClaim, InventoryItem } from './BazaarTab';

interface Props {
  pendingClaim: PendingClaim;
  inventory: InventoryItem[];
  onResolve: (tradeId: number, action: 'replace' | 'discard', replaceItemId?: number) => void;
}

const ClaimModal: React.FC<Props> = ({ pendingClaim, inventory, onResolve }) => {
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [processing, setProcessing] = useState(false);

  const stats = pendingClaim.item_stats || {};
  const statEntries = Object.entries(stats);

  const handleReplace = async () => {
    if (selectedItem == null) return;
    setProcessing(true);
    await onResolve(pendingClaim.trade_id, 'replace', selectedItem);
    setProcessing(false);
  };

  const handleDiscard = async () => {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    setProcessing(true);
    await onResolve(pendingClaim.trade_id, 'discard');
    setProcessing(false);
  };

  return (
    <div className="claim-overlay">
      <div className="claim-modal">
        <h3 className="claim-title">Inventory Full</h3>
        <p className="claim-desc">
          You purchased <strong>{pendingClaim.item_name}</strong> ({pendingClaim.item_rarity}),
          but your inventory is full. Choose an action:
        </p>

        {/* New item stats */}
        {statEntries.length > 0 && (
          <div className="claim-new-item-stats">
            <span className="claim-stats-label">New Item Stats:</span>
            {statEntries.map(([key, val]) => (
              <span key={key} className="claim-stat">{key}: +{val}</span>
            ))}
          </div>
        )}

        {/* Replace option */}
        <div className="claim-section">
          <h4 className="claim-section-title">Replace an Existing Item</h4>
          <p className="claim-section-desc">
            Select an item to destroy and replace with the new item.
          </p>
          <div className="claim-inventory-list">
            {inventory.map(item => (
              <div
                key={item.id}
                className={`claim-inventory-item ${selectedItem === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedItem(item.id)}
              >
                <span className="claim-inv-name">{item.name}</span>
                <span className="claim-inv-rarity">{item.rarity}</span>
                {item.gear_slot && <span className="claim-inv-slot">{item.gear_slot}</span>}
              </div>
            ))}
          </div>
          <button
            className="claim-btn claim-btn-replace"
            disabled={selectedItem == null || processing}
            onClick={handleReplace}
          >
            {processing ? 'Processing...' : 'Replace Selected Item'}
          </button>
        </div>

        {/* Discard option */}
        <div className="claim-section claim-section-danger">
          <h4 className="claim-section-title">Discard New Item</h4>
          {!confirmDiscard ? (
            <button
              className="claim-btn claim-btn-discard"
              disabled={processing}
              onClick={handleDiscard}
            >
              Discard Item
            </button>
          ) : (
            <div className="claim-discard-confirm">
              <p className="claim-discard-warning">
                Are you sure? This will permanently destroy the purchased item. No refund will be issued.
              </p>
              <div className="claim-discard-actions">
                <button
                  className="claim-btn claim-btn-discard-confirm"
                  disabled={processing}
                  onClick={handleDiscard}
                >
                  {processing ? 'Processing...' : 'Yes, Discard Forever'}
                </button>
                <button
                  className="claim-btn claim-btn-cancel"
                  onClick={() => setConfirmDiscard(false)}
                  disabled={processing}
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimModal;
