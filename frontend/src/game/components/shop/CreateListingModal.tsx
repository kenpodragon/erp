import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

interface ItemOption {
  id: number;
  name: string;
  rarity: string;
  stats: Record<string, number>;
  gear_slot: string | null;
  is_equipped: boolean;
  is_listed: boolean;
  item_type: 'artifact' | 'equipment';
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const RARITY_CLASS: Record<string, string> = {
  common: 'rarity-common',
  uncommon: 'rarity-uncommon',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary',
  cosmic: 'rarity-cosmic',
};

const CreateListingModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [selectedItemType, setSelectedItemType] = useState<'artifact' | 'equipment'>('artifact');
  const [artifacts, setArtifacts] = useState<ItemOption[]>([]);
  const [equipment, setEquipment] = useState<ItemOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [price, setPrice] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const [artRes, eqRes] = await Promise.all([
          api.get('/api/game/artifacts'),
          api.get('/api/game/inventory'),
        ]);

        if (artRes.ok) {
          const data = await artRes.json();
          const items: ItemOption[] = (data.artifacts || data || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            rarity: a.rarity || 'common',
            stats: a.stats || a.stat_bonuses || {},
            gear_slot: a.gear_slot || null,
            is_equipped: a.is_equipped || false,
            is_listed: a.marketplace_listing_id != null,
            item_type: 'artifact' as const,
          }));
          setArtifacts(items);
        }

        if (eqRes.ok) {
          const data = await eqRes.json();
          const items: ItemOption[] = (data.equipment || data.items || data || []).map((e: any) => ({
            id: e.id,
            name: e.name,
            rarity: e.rarity || 'common',
            stats: e.stats || e.stat_bonuses || {},
            gear_slot: e.gear_slot || e.slot || null,
            is_equipped: e.is_equipped || false,
            is_listed: e.marketplace_listing_id != null,
            item_type: 'equipment' as const,
          }));
          setEquipment(items);
        }
      } catch {
        setError('Failed to load your items.');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const currentItems = selectedItemType === 'artifact' ? artifacts : equipment;
  const availableItems = currentItems.filter(i => !i.is_listed);

  const tax = Math.floor(price * 0.05);
  const proceeds = price - tax;

  const formatStats = (stats: Record<string, number>): string => {
    return Object.entries(stats)
      .map(([k, v]) => `${k}: +${v}`)
      .join(', ');
  };

  const handleConfirm = async () => {
    if (!selectedItem || price < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/api/marketplace/list', {
        item_type: selectedItem.item_type,
        item_ref_id: selectedItem.id,
        price_shards: price,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create listing');
      }
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="clm-overlay" onClick={onClose}>
      <div className="clm-modal" onClick={e => e.stopPropagation()}>
        <h2 className="clm-title">Create Listing</h2>

        {/* Item type toggle */}
        <div className="clm-type-toggle">
          <button
            className={`clm-type-btn ${selectedItemType === 'artifact' ? 'active' : ''}`}
            onClick={() => { setSelectedItemType('artifact'); setSelectedItem(null); }}
          >
            Artifacts
          </button>
          <button
            className={`clm-type-btn ${selectedItemType === 'equipment' ? 'active' : ''}`}
            onClick={() => { setSelectedItemType('equipment'); setSelectedItem(null); }}
          >
            Equipment
          </button>
        </div>

        {/* Item picker */}
        {loading ? (
          <div className="clm-empty-items">Loading items...</div>
        ) : availableItems.length === 0 ? (
          <div className="clm-empty-items">No {selectedItemType}s available to list.</div>
        ) : (
          <div className="clm-item-grid">
            {availableItems.map(item => (
              <div
                key={`${item.item_type}-${item.id}`}
                className={`clm-item-card ${selectedItem?.id === item.id && selectedItem?.item_type === item.item_type ? 'selected' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className={`clm-item-card-name ${RARITY_CLASS[item.rarity] || ''}`}>
                  {item.name}
                </div>
                <div className="clm-item-card-stats">
                  {Object.keys(item.stats).length > 0 ? formatStats(item.stats) : item.rarity}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price input */}
        {selectedItem && (
          <>
            {selectedItem.is_equipped && (
              <div className="clm-equipped-warning">
                This item is currently equipped. Listing it will unequip it.
              </div>
            )}

            <div className="clm-price-section">
              <label className="clm-price-label">Price (Shards)</label>
              <input
                className="clm-price-input"
                type="number"
                min={1}
                value={price}
                onChange={e => setPrice(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <div className="clm-tax-preview">
                You will receive {proceeds.toLocaleString()} Shards after the 5% Bazaar tax.
              </div>
            </div>
          </>
        )}

        {error && <div className="clm-error">{error}</div>}

        <div className="clm-actions">
          <button
            className="clm-btn clm-btn-confirm"
            disabled={!selectedItem || price < 1 || submitting}
            onClick={handleConfirm}
          >
            {submitting ? 'Listing...' : 'Confirm Listing'}
          </button>
          <button className="clm-btn clm-btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateListingModal;
