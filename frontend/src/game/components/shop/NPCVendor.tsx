import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import './BazaarSell.css';

interface PlayerItem {
  id: number;
  name: string;
  rarity: string;
  stats: Record<string, number>;
  gear_slot: string | null;
  item_type: 'artifact' | 'equipment';
  is_equipped: boolean;
  is_listed: boolean;
  is_curated: boolean;
  essence_value: number;
}

interface SalvagePreview {
  total_essence: number;
  items: Array<{ item_type: string; item_ref_id: number; essence: number }>;
}

interface SalvageResult {
  total_essence: number;
  new_essence_balance: number;
}

interface Props {
  shardBalance: number;
  onBalanceChange: (newBalance: number) => void;
}

const RARITY_CLASS: Record<string, string> = {
  common: 'rarity-common',
  uncommon: 'rarity-uncommon',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary',
  cosmic: 'rarity-cosmic',
};

type SelectedKey = `${'artifact' | 'equipment'}-${number}`;

function itemKey(item: PlayerItem): SelectedKey {
  return `${item.item_type}-${item.id}`;
}

const NPCVendor: React.FC<Props> = ({ onBalanceChange }) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [items, setItems] = useState<PlayerItem[]>([]);
  const [currentEssence, setCurrentEssence] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<SelectedKey>>(new Set());
  const [singlePreviewItem, setSinglePreviewItem] = useState<PlayerItem | null>(null);
  const [bulkPreview, setBulkPreview] = useState<SalvagePreview | null>(null);
  const [salvageResult, setSalvageResult] = useState<SalvageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvaging, setSalvaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Double-confirm state for curated artifacts
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const [pendingSalvage, setPendingSalvage] = useState<Array<{ item_type: string; item_ref_id: number }> | null>(null);
  const [hasCuratedInPending, setHasCuratedInPending] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [artRes, eqRes, essRes] = await Promise.all([
        api.get('/api/game/artifacts'),
        api.get('/api/game/inventory'),
        api.get('/api/marketplace/essence-balance'),
      ]);

      const playerItems: PlayerItem[] = [];

      if (artRes.ok) {
        const data = await artRes.json();
        (data.artifacts || data || []).forEach((a: any) => {
          playerItems.push({
            id: a.id,
            name: a.name,
            rarity: a.rarity || 'common',
            stats: a.stats || a.stat_bonuses || {},
            gear_slot: a.gear_slot || null,
            item_type: 'artifact',
            is_equipped: a.is_equipped || false,
            is_listed: a.marketplace_listing_id != null,
            is_curated: a.is_curated || false,
            essence_value: a.essence_value || 0,
          });
        });
      }

      if (eqRes.ok) {
        const data = await eqRes.json();
        (data.equipment || data.items || data || []).forEach((e: any) => {
          playerItems.push({
            id: e.id,
            name: e.name,
            rarity: e.rarity || 'common',
            stats: e.stats || e.stat_bonuses || {},
            gear_slot: e.gear_slot || e.slot || null,
            item_type: 'equipment',
            is_equipped: e.is_equipped || false,
            is_listed: e.marketplace_listing_id != null,
            is_curated: false,
            essence_value: e.essence_value || 0,
          });
        });
      }

      if (essRes.ok) {
        const data = await essRes.json();
        setCurrentEssence(data.essence_balance ?? data.essence ?? 0);
      }

      setItems(playerItems);
    } catch {
      setError('Failed to load your items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Quick-select helpers
  const selectByFilter = (filter: (i: PlayerItem) => boolean) => {
    const newSet = new Set(selectedItems);
    items.forEach(item => {
      if (!item.is_listed && filter(item) && !item.is_curated) {
        newSet.add(itemKey(item));
      }
    });
    setSelectedItems(newSet);
  };

  const handleQuickSelect = (type: string) => {
    switch (type) {
      case 'common':
        selectByFilter(i => i.rarity === 'common');
        break;
      case 'uncommon':
        selectByFilter(i => i.rarity === 'uncommon');
        break;
      case 'rare':
        selectByFilter(i => i.rarity === 'rare');
        break;
      case 'equipment':
        selectByFilter(i => i.item_type === 'equipment');
        break;
      case 'artifacts':
        selectByFilter(i => i.item_type === 'artifact');
        break;
      case 'none':
        setSelectedItems(new Set());
        break;
    }
  };

  const toggleItem = (item: PlayerItem) => {
    if (item.is_listed) return;
    const key = itemKey(item);
    const newSet = new Set(selectedItems);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedItems(newSet);
  };

  // Build salvage payload from selected
  const buildSalvagePayload = (): Array<{ item_type: string; item_ref_id: number }> => {
    return Array.from(selectedItems).map(key => {
      const [type, id] = key.split('-');
      return { item_type: type, item_ref_id: parseInt(id) };
    });
  };

  // Calculate running total for bulk
  const selectedTotal = items
    .filter(i => selectedItems.has(itemKey(i)))
    .reduce((sum, i) => sum + i.essence_value, 0);

  const selectedCount = selectedItems.size;

  // Check if selection contains curated items
  const selectionHasCurated = items.some(
    i => selectedItems.has(itemKey(i)) && i.is_curated
  );

  // Single item click
  const handleSingleClick = (item: PlayerItem) => {
    if (item.is_listed) return;
    setSinglePreviewItem(item);
  };

  // Start salvage flow (single or bulk)
  const startSalvage = (payload: Array<{ item_type: string; item_ref_id: number }>, hasCurated: boolean) => {
    setPendingSalvage(payload);
    setHasCuratedInPending(hasCurated);
    if (hasCurated) {
      setConfirmStep(1);
    } else {
      executeSalvage(payload);
    }
  };

  const handleSingleSalvage = () => {
    if (!singlePreviewItem) return;
    const payload = [{ item_type: singlePreviewItem.item_type, item_ref_id: singlePreviewItem.id }];
    startSalvage(payload, singlePreviewItem.is_curated);
  };

  const handleBulkSalvage = async () => {
    const payload = buildSalvagePayload();
    if (payload.length === 0) return;

    // Fetch preview first
    try {
      setSalvaging(true);
      const res = await api.post('/api/marketplace/salvage-preview', { items: payload });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Preview failed');
      }
      const preview: SalvagePreview = await res.json();
      setBulkPreview(preview);
      startSalvage(payload, selectionHasCurated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSalvaging(false);
    }
  };

  const executeSalvage = async (payload: Array<{ item_type: string; item_ref_id: number }>) => {
    setSalvaging(true);
    setError(null);
    try {
      const res = await api.post('/api/marketplace/salvage-bulk', { items: payload });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Salvage failed');
      }
      const result: SalvageResult = await res.json();
      setSalvageResult(result);
      setCurrentEssence(result.new_essence_balance);
      setSelectedItems(new Set());
      setSinglePreviewItem(null);
      setBulkPreview(null);
      setConfirmStep(0);
      setPendingSalvage(null);

      // Refresh items
      await fetchItems();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSalvaging(false);
    }
  };

  const handleConfirmStep = () => {
    if (confirmStep === 1) {
      setConfirmStep(2);
    } else if (confirmStep === 2 && pendingSalvage) {
      executeSalvage(pendingSalvage);
    }
  };

  const cancelConfirm = () => {
    setConfirmStep(0);
    setPendingSalvage(null);
  };

  const formatStats = (stats: Record<string, number>): string => {
    return Object.entries(stats)
      .slice(0, 3)
      .map(([k, v]) => `${k}: +${v}`)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="npc-vendor-loading">
        <div className="shop-spinner"></div>
        <p>Loading NPC Vendor...</p>
      </div>
    );
  }

  const nonListedItems = items.filter(i => !i.is_listed || mode === 'bulk');

  return (
    <div className="npc-vendor">
      {/* Header */}
      <div className="npc-vendor-header">
        <h2 className="npc-vendor-title">NPC VENDOR — SALVAGE ITEMS FOR ESSENCE</h2>
        <div className="npc-vendor-essence">
          <span className="npc-vendor-essence-icon">&#9733;</span>
          <span className="npc-vendor-essence-amount">{currentEssence.toLocaleString()}</span>
          <span className="npc-vendor-essence-label">Essence</span>
        </div>
      </div>

      {error && <div className="npc-vendor-error">{error}</div>}

      {/* Salvage result */}
      {salvageResult && (
        <div className="npc-vendor-result">
          <div className="npc-vendor-result-title">Salvage Complete!</div>
          <div className="npc-vendor-result-amount">
            +{salvageResult.total_essence.toLocaleString()} Essence
          </div>
          <button
            className="npc-vendor-mode-btn"
            style={{ marginTop: '0.5rem' }}
            onClick={() => setSalvageResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="npc-vendor-mode-toggle">
        <button
          className={`npc-vendor-mode-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => { setMode('single'); setSelectedItems(new Set()); setSinglePreviewItem(null); }}
        >
          Single
        </button>
        <button
          className={`npc-vendor-mode-btn ${mode === 'bulk' ? 'active' : ''}`}
          onClick={() => { setMode('bulk'); setSinglePreviewItem(null); }}
        >
          Bulk Salvage
        </button>
      </div>

      {/* Bulk quick-select */}
      {mode === 'bulk' && (
        <div className="npc-vendor-quick-select">
          <button className="npc-vendor-quick-btn" onClick={() => handleQuickSelect('common')}>All Common</button>
          <button className="npc-vendor-quick-btn" onClick={() => handleQuickSelect('uncommon')}>All Uncommon</button>
          <button className="npc-vendor-quick-btn" onClick={() => handleQuickSelect('rare')}>All Rare</button>
          <button className="npc-vendor-quick-btn" onClick={() => handleQuickSelect('equipment')}>All Equipment</button>
          <button className="npc-vendor-quick-btn" onClick={() => handleQuickSelect('artifacts')}>All Artifacts</button>
          <button className="npc-vendor-quick-btn" onClick={() => handleQuickSelect('none')}>None</button>
        </div>
      )}

      {/* Item grid */}
      {nonListedItems.length === 0 ? (
        <div className="npc-vendor-empty">You have no items to salvage.</div>
      ) : (
        <div className="npc-vendor-item-grid">
          {items.map(item => {
            const key = itemKey(item);
            const isSelected = mode === 'bulk' ? selectedItems.has(key) : singlePreviewItem?.id === item.id && singlePreviewItem?.item_type === item.item_type;

            return (
              <div
                key={key}
                className={`npc-vendor-item ${isSelected ? 'selected' : ''} ${item.is_listed ? 'listed' : ''}`}
                onClick={() => mode === 'single' ? handleSingleClick(item) : toggleItem(item)}
                title={item.is_listed ? 'Currently listed on the Bazaar' : ''}
              >
                {mode === 'bulk' && !item.is_listed && (
                  <input
                    type="checkbox"
                    className="npc-vendor-item-checkbox"
                    checked={selectedItems.has(key)}
                    onChange={() => toggleItem(item)}
                    onClick={e => e.stopPropagation()}
                  />
                )}
                <div className={`npc-vendor-item-name ${RARITY_CLASS[item.rarity] || ''}`}>
                  {item.name}
                </div>
                <div className="npc-vendor-item-type">{item.item_type}</div>
                {Object.keys(item.stats).length > 0 && (
                  <div className="npc-vendor-item-stats">{formatStats(item.stats)}</div>
                )}
                <div className="npc-vendor-item-essence">
                  {item.essence_value.toLocaleString()} Essence
                </div>
                {item.is_listed && (
                  <span className="npc-vendor-item-listed-tag">Listed</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Single mode preview */}
      {mode === 'single' && singlePreviewItem && (
        <div className="npc-vendor-single-preview">
          <div className={`npc-vendor-single-preview-name ${RARITY_CLASS[singlePreviewItem.rarity] || ''}`}>
            {singlePreviewItem.name}
          </div>
          <div className="npc-vendor-single-preview-essence">
            +{singlePreviewItem.essence_value.toLocaleString()} Essence
          </div>
          <button
            className="npc-vendor-single-confirm-btn"
            disabled={salvaging}
            onClick={handleSingleSalvage}
          >
            {salvaging ? 'Salvaging...' : 'Salvage'}
          </button>
        </div>
      )}

      {/* Bulk mode footer */}
      {mode === 'bulk' && (
        <div className="npc-vendor-bulk-footer">
          <div className="npc-vendor-bulk-total">
            Selected: {selectedCount} items{' '}
            <span className="npc-vendor-bulk-total-value">
              {selectedTotal.toLocaleString()} Essence
            </span>
          </div>
          <button
            className="npc-vendor-bulk-btn"
            disabled={selectedCount === 0 || salvaging}
            onClick={handleBulkSalvage}
          >
            {salvaging ? 'Salvaging...' : `Salvage ${selectedCount} Items`}
          </button>
        </div>
      )}

      {/* Double-confirm for curated artifacts */}
      {confirmStep > 0 && (
        <div className="npc-vendor-confirm-overlay" onClick={cancelConfirm}>
          <div className="npc-vendor-confirm-modal" onClick={e => e.stopPropagation()}>
            {confirmStep === 1 && (
              <>
                <h3 className="npc-vendor-confirm-title">Warning: Curated Artifact</h3>
                <p className="npc-vendor-confirm-text">
                  Your selection contains one or more curated artifacts. These are rare items that cannot be re-obtained easily.
                </p>
                <div className="npc-vendor-confirm-warning">
                  Are you sure you want to destroy curated artifacts? This action cannot be undone.
                </div>
                <div className="npc-vendor-confirm-actions">
                  <button className="npc-vendor-confirm-btn destroy" onClick={handleConfirmStep}>
                    Yes, Continue
                  </button>
                  <button className="npc-vendor-confirm-btn back" onClick={cancelConfirm}>
                    Go Back
                  </button>
                </div>
              </>
            )}
            {confirmStep === 2 && (
              <>
                <h3 className="npc-vendor-confirm-title">Final Confirmation</h3>
                <p className="npc-vendor-confirm-text">
                  This is your last chance. Salvaged curated artifacts are gone forever.
                </p>
                <div className="npc-vendor-confirm-warning">
                  Type of action: PERMANENT DESTRUCTION
                </div>
                <div className="npc-vendor-confirm-actions">
                  <button
                    className="npc-vendor-confirm-btn destroy"
                    disabled={salvaging}
                    onClick={handleConfirmStep}
                  >
                    {salvaging ? 'Destroying...' : 'Destroy Forever'}
                  </button>
                  <button className="npc-vendor-confirm-btn back" onClick={cancelConfirm}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NPCVendor;
