/**
 * InventoryPanel — Home Base inventory UI.
 * All 16 gear slots + bag slots with equip/unequip actions + paper doll preview.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics, Text } from 'pixi.js';
import { api } from '../../api';
import ItemCard from './story/ItemCard';
import type { ItemData } from './story/ItemCard';
import PaperDollRenderer from './shared/PaperDollRenderer';
import type { CharacterVisualData } from './shared/PaperDollRenderer';
import './InventoryPanel.css';

extend({ Container, Graphics, Text });

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

const DOLL_CANVAS_WIDTH = 160;
const DOLL_CANVAS_HEIGHT = 200;

const DEFAULT_CHARACTER_VISUAL: CharacterVisualData = {
  character_id: 0,
  level: 1,
  aura_tier: null,
  equipped_layers: [],
  unequipped_layers: [],
};

const InventoryPanel: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [characterVisual, setCharacterVisual] = useState<CharacterVisualData>(DEFAULT_CHARACTER_VISUAL);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get('/api/game/inventory');
      if (res.ok) {
        const data = await res.json();
        // Sort gear_slots by sort_order to ensure all 16 display in order
        if (data.gear_slots) {
          data.gear_slots.sort((a: GearSlot, b: GearSlot) => a.sort_order - b.sort_order);
        }
        setInventory(data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCharacterVisual = useCallback(async () => {
    try {
      const res = await api.get('/api/game/character/visuals');
      if (res.ok) {
        setCharacterVisual(await res.json());
      }
    } catch { /* use default */ }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchCharacterVisual();
  }, [fetchInventory, fetchCharacterVisual]);

  const handleEquip = async (inventoryId: number) => {
    setActionLoading(true);
    try {
      const res = await api.post('/api/game/inventory/equip', { inventory_id: inventoryId });
      if (res.ok) {
        await fetchInventory();
        await fetchCharacterVisual();
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
        await fetchCharacterVisual();
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

      <div className="inventory-equipped-section">
        {/* Paper doll preview */}
        <div className="inventory-paperdoll">
          <div className="inventory-section-label">CHARACTER PREVIEW</div>
          <div className="paperdoll-canvas-wrapper">
            <Application
              width={DOLL_CANVAS_WIDTH}
              height={DOLL_CANVAS_HEIGHT}
              background={0x08080f}
              antialias
            >
              <PaperDollRenderer
                character={characterVisual}
                x={DOLL_CANVAS_WIDTH / 2}
                y={DOLL_CANVAS_HEIGHT - 30}
                state="idle"
                facingRight={true}
                scale={1.5}
              />
            </Application>
          </div>
        </div>

        {/* All 16 gear slots */}
        <div className="inventory-equipped">
          <div className="inventory-section-label">EQUIPPED ({inventory.gear_slots.length} SLOTS)</div>
          <div className="equipped-slots-grid">
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
