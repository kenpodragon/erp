/**
 * InventoryReplaceModal — Shown when bag is full and player wants to keep a drop.
 * Displays the new item vs current bag items in FIFO order.
 * Player can swap (discard old, keep new) or cancel.
 */
import React, { useState } from 'react';
import { api } from '../../../api';
import ItemCard from './ItemCard';
import type { ItemData } from './ItemCard';
import './InventoryReplaceModal.css';

interface Props {
  newItem: ItemData;
  storedItems: ItemData[];
  onComplete: () => void;
  onCancel: () => void;
}

const InventoryReplaceModal: React.FC<Props> = ({ newItem, storedItems, onComplete, onCancel }) => {
  const [selectedReplace, setSelectedReplace] = useState<ItemData | null>(null);
  const [swapping, setSwapping] = useState(false);

  const handleSwap = async () => {
    if (!selectedReplace?.inventory_id) return;
    setSwapping(true);
    try {
      // Step 1: Discard the selected old item
      const discardRes = await api.delete(`/api/game/inventory/${selectedReplace.inventory_id}`);
      if (!discardRes.ok) {
        alert('Failed to discard item');
        setSwapping(false);
        return;
      }

      // Step 2: Keep the new drop (now there's room)
      const keepRes = await api.post('/api/game/inventory/keep-drop', { item_id: newItem.item_id });
      if (keepRes.ok) {
        onComplete();
      } else {
        const err = await keepRes.json();
        alert(typeof err.detail === 'string' ? err.detail : 'Failed to keep item');
      }
    } catch {
      alert('Swap failed');
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="replace-modal-backdrop">
      <div className="replace-modal">
        <div className="replace-title">BAG FULL — CHOOSE REPLACEMENT</div>
        <div className="replace-divider" />

        <div className="replace-comparison">
          <div className="replace-col replace-col--new">
            <div className="replace-col-label">NEW ITEM</div>
            <ItemCard item={newItem} />
          </div>

          <div className="replace-arrow">&#8644;</div>

          <div className="replace-col replace-col--old">
            <div className="replace-col-label">DISCARD ONE</div>
            <div className="replace-old-list">
              {storedItems.map(item => (
                <ItemCard
                  key={item.inventory_id}
                  item={item}
                  compact
                  selected={selectedReplace?.inventory_id === item.inventory_id}
                  onClick={() => setSelectedReplace(item)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="replace-actions">
          <button
            className="replace-btn replace-btn--swap"
            onClick={handleSwap}
            disabled={!selectedReplace || swapping}
          >
            {swapping ? 'Swapping...' : selectedReplace ? `Discard "${selectedReplace.name}" & Keep New` : 'Select an item to replace'}
          </button>
          <button className="replace-btn replace-btn--cancel" onClick={onCancel}>
            Dismiss Drop
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryReplaceModal;
