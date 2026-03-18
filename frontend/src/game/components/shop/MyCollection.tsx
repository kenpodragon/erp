import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import AssetIcon from '../AssetIcon';

interface CollectionItem {
  id: number;
  shop_item_id: number;
  name: string;
  category: string;
  description: string | null;
  icon_asset_key: string | null;
  equipped: boolean;
  class_restriction_name: string | null;
}

interface CollectionData {
  items: CollectionItem[];
  equipped: {
    skin: number | null;
    flair: number | null;
    badge: number | null;
    avatar: number | null;
  };
}

interface Props {
  onEquipChange: () => void;
}

const SLOT_LABELS: Record<string, string> = {
  skin: 'Skin',
  flair: 'Flair',
  badge: 'Badge',
  avatar: 'Avatar',
};

const MyCollection: React.FC<Props> = ({ onEquipChange }) => {
  const [data, setData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/shop/collection');
      if (!res.ok) throw new Error('Failed to load collection');
      setData(await res.json());
    } catch {
      setError('Failed to load your collection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollection(); }, []);

  const handleEquip = async (itemId: number) => {
    setActionLoading(itemId);
    setError(null);
    try {
      const res = await api.post('/api/shop/equip', { item_id: itemId });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Equip failed');
      }
      await fetchCollection();
      onEquipChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnequip = async (slot: string) => {
    setActionLoading(-1);
    setError(null);
    try {
      const res = await api.post('/api/shop/unequip', { slot });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Unequip failed');
      }
      await fetchCollection();
      onEquipChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="collection-loading">Loading collection...</div>;
  if (!data || data.items.length === 0) {
    return (
      <div className="collection-empty">
        <p>You don't own any cosmetics yet.</p>
        <p>Purchase items from the shop to see them here!</p>
      </div>
    );
  }

  // Group items by category
  const byCategory: Record<string, CollectionItem[]> = {};
  for (const item of data.items) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  return (
    <div className="my-collection">
      <h3 className="collection-title">My Collection</h3>
      {error && <div className="collection-error">{error}</div>}

      {/* Currently equipped summary */}
      <div className="equipped-summary">
        {Object.entries(SLOT_LABELS).map(([slot, label]) => {
          const equippedId = data.equipped[slot as keyof typeof data.equipped];
          const equippedItem = equippedId ? data.items.find(i => i.shop_item_id === equippedId) : null;
          return (
            <div key={slot} className="equipped-slot">
              <span className="equipped-slot-label">{label}:</span>
              {equippedItem ? (
                <>
                  <span className="equipped-slot-name">{equippedItem.name}</span>
                  <button
                    className="equipped-unequip-btn"
                    onClick={() => handleUnequip(slot)}
                    disabled={actionLoading !== null}
                  >
                    Unequip
                  </button>
                </>
              ) : (
                <span className="equipped-slot-empty">None</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Item grid grouped by category */}
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="collection-category">
          <h4 className="collection-cat-label">{SLOT_LABELS[cat] || cat}s</h4>
          <div className="collection-grid">
            {items.map(item => (
              <div key={item.id} className={`collection-item ${item.equipped ? 'equipped' : ''}`}>
                <div className="collection-item-icon">
                  {item.icon_asset_key
                    ? <AssetIcon assetKey={item.icon_asset_key} category="ui_icon" alt={item.name} fallback={<span className="collection-item-icon-fallback">{'\u25C6'}</span>} />
                    : <span className="collection-item-icon-fallback">{'\u25C6'}</span>
                  }
                </div>
                <div className="collection-item-name">{item.name}</div>
                {item.class_restriction_name && (
                  <div className="collection-item-class">{item.class_restriction_name}</div>
                )}
                {item.equipped ? (
                  <button
                    className="collection-btn equipped-btn"
                    onClick={() => handleUnequip(item.category)}
                    disabled={actionLoading !== null}
                  >
                    Equipped
                  </button>
                ) : (
                  <button
                    className="collection-btn equip-btn"
                    onClick={() => handleEquip(item.shop_item_id)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === item.shop_item_id ? 'Equipping...' : 'Equip'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyCollection;
