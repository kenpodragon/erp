/**
 * InventoryPanel — Home Base inventory UI.
 * 3 equipped slots + 10 bag slots with equip/unequip actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import ItemCard from './story/ItemCard';
import type { ItemData } from './story/ItemCard';
import './InventoryPanel.css';

interface GearSlot {
  id: number;
  name: string;
  display_name: string;
  sort_order: number;
}

interface InventoryState {
  equipped: ItemData[];
  stored: ItemData[];
  gear_slots: GearSlot[];
  bag_capacity: number;
  bag_used: number;
}

const InventoryPanel: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get('/api/game/inventory');
      if (res.ok) {
        setInventory(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleEquip = async (inventoryId: number) => {
    setActionLoading(true);
    try {
      const res = await api.post('/api/game/inventory/equip', { inventory_id: inventoryId });
      if (res.ok) {
        await fetchInventory();
        setSelectedItem(null);
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to equip item');
      }
    } catch { /* ignore */ } finally {
      setActionLoading(false);
    }
  };

  const handleUnequip = async (inventoryId: number) => {
    setActionLoading(true);
    try {
      const res = await api.post('/api/game/inventory/unequip', { inventory_id: inventoryId });
      if (res.ok) {
        await fetchInventory();
        setSelectedItem(null);
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to unequip item');
      }
    } catch { /* ignore */ } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async (inventoryId: number) => {
    if (!window.confirm('Discard this item permanently?')) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/api/game/inventory/${inventoryId}`);
      if (res.ok) {
        await fetchInventory();
        setSelectedItem(null);
      }
    } catch { /* ignore */ } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="inventory-loading">Loading inventory...</div>;
  if (!inventory) return <div className="inventory-empty">No inventory data.</div>;

  const equippedBySlot: Record<string, ItemData> = {};
  for (const item of inventory.equipped) {
    if (item.equipped_slot) equippedBySlot[item.equipped_slot] = item;
  }

  return (
    <div className="inventory-panel">
      <div className="inventory-title">EQUIPMENT & INVENTORY</div>

      <div className="inventory-equipped">
        <div className="inventory-section-label">EQUIPPED</div>
        <div className="equipped-slots">
          {inventory.gear_slots.map(slot => {
            const equipped = equippedBySlot[slot.name];
            return (
              <div key={slot.id} className="equipped-slot">
                <div className="equipped-slot-label">{slot.display_name}</div>
                {equipped ? (
                  <ItemCard
                    item={equipped}
                    compact
                    selected={selectedItem?.inventory_id === equipped.inventory_id}
                    onClick={() => setSelectedItem(equipped)}
                  />
                ) : (
                  <div className="equipped-slot-empty">Empty</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="inventory-bag">
        <div className="inventory-section-label">
          BAG ({inventory.bag_used}/{inventory.bag_capacity})
        </div>
        <div className="bag-grid">
          {inventory.stored.map(item => (
            <ItemCard
              key={item.inventory_id}
              item={item}
              compact
              selected={selectedItem?.inventory_id === item.inventory_id}
              onClick={() => setSelectedItem(item)}
            />
          ))}
          {Array.from({ length: inventory.bag_capacity - inventory.stored.length }, (_, i) => (
            <div key={`empty-${i}`} className="bag-slot-empty" />
          ))}
        </div>
      </div>

      {selectedItem && (
        <div className="inventory-detail">
          <ItemCard item={selectedItem} />
          <div className="inventory-actions">
            {selectedItem.is_equipped ? (
              <button
                className="inv-btn inv-btn--unequip"
                onClick={() => handleUnequip(selectedItem.inventory_id!)}
                disabled={actionLoading}
              >
                Unequip
              </button>
            ) : (
              <>
                {selectedItem.gear_slot_id && selectedItem.meets_requirements !== false && (
                  <button
                    className="inv-btn inv-btn--equip"
                    onClick={() => handleEquip(selectedItem.inventory_id!)}
                    disabled={actionLoading}
                  >
                    Equip
                  </button>
                )}
                <button
                  className="inv-btn inv-btn--discard"
                  onClick={() => handleDiscard(selectedItem.inventory_id!)}
                  disabled={actionLoading}
                >
                  Discard
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPanel;
