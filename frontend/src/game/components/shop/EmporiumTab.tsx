import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import { useGame } from '../../GameContext';
import ShopCategoryFilter from './ShopCategoryFilter';
import ShopItemCard from './ShopItemCard';
import type { ShopItemData } from './ShopItemCard';
import ShopPurchaseModal from './ShopPurchaseModal';
import type { BundleData } from './ShopPurchaseModal';
import BoosterPanel from './BoosterPanel';
import BundleCard from './BundleCard';
import FeaturedSection from './FeaturedSection';
import MyCollection from './MyCollection';
import './EmporiumTab.css';

interface CatalogApiResponse {
  current_balance: number;
  items: ShopItemData[];
  featured: ShopItemData[];
  limited_time: ShopItemData[];
  bundles: BundleData[];
  boosters_catalog: ShopItemData[];
  boosters: Record<string, { active: boolean; magnitude?: number; remaining_seconds?: number }>;
}

interface CatalogResponse {
  balance: number;
  items: ShopItemData[];
  bundles: BundleData[];
  active_boosters: Array<{
    boost_type: string;
    magnitude: number;
    remaining_seconds: number;
    duration_seconds: number;
  }>;
}

interface Props {
  onPlayerUpdate: () => void;
  onSwitchToBuy: () => void;
}

type PurchaseTarget =
  | { type: 'item'; item: ShopItemData }
  | { type: 'bundle'; bundle: BundleData };

const EmporiumTab: React.FC<Props> = ({ onPlayerUpdate, onSwitchToBuy }) => {
  const { state } = useGame();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [showCollection, setShowCollection] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<PurchaseTarget | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/shop/catalog');
      if (!res.ok) throw new Error('Failed to load catalog');
      const raw = await res.json();
      // Normalize: backend splits items/featured/limited_time/boosters_catalog; frontend expects flat items[]
      const data: CatalogResponse = raw.balance != null ? raw : {
        balance: raw.current_balance,
        items: [
          ...(raw.items || []),
          ...(raw.featured || []),
          ...(raw.limited_time || []),
          ...(raw.boosters_catalog || []).map((b: ShopItemData) => ({ ...b, is_owned: false, is_equipped: false, is_featured: false })),
        ],
        bundles: raw.bundles || [],
        active_boosters: Object.entries(raw.boosters || {})
          .filter(([, v]: [string, any]) => v.active)
          .map(([k, v]: [string, any]) => ({
            boost_type: k,
            magnitude: v.magnitude,
            remaining_seconds: v.remaining_seconds,
            duration_seconds: v.remaining_seconds,
          })),
      };
      setCatalog(data);
    } catch {
      setError('Failed to load the Emporium. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const handlePurchaseItem = async () => {
    if (!purchaseTarget) return;
    setPurchasing(true);
    setError(null);
    try {
      let res: Response;
      if (purchaseTarget.type === 'item') {
        res = await api.post('/api/shop/purchase', { item_id: purchaseTarget.item.id });
      } else {
        res = await api.post('/api/shop/purchase-bundle', { bundle_id: purchaseTarget.bundle.id });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Purchase failed');
      }
      setPurchaseTarget(null);
      await fetchCatalog();
      onPlayerUpdate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="emporium-loading">
        <div className="shop-spinner"></div>
        <p>Loading Emporium...</p>
      </div>
    );
  }

  if (error && !catalog) {
    return (
      <div className="shop-error">
        <p>{error}</p>
        <button onClick={fetchCatalog}>Retry</button>
      </div>
    );
  }

  if (!catalog) return null;

  const balance = catalog.balance;
  const allItems = catalog.items;
  const bundles = catalog.bundles;
  const activeBoosters = (catalog.active_boosters || []).map(b => ({
    boostType: b.boost_type as 'xp' | 'essence' | 'drop_rate',
    magnitude: b.magnitude,
    remainingSeconds: b.remaining_seconds,
    durationSeconds: b.duration_seconds,
    activatedAt: '',
  }));

  // Filter items by category
  const filteredItems = category === 'all'
    ? allItems.filter(i => i.category !== 'booster')
    : category === 'booster'
      ? allItems.filter(i => i.category === 'booster')
      : allItems.filter(i => i.category === category);

  const boosterItems = allItems.filter(i => i.category === 'booster');
  const featuredItems = allItems.filter(i => i.is_featured || i.is_limited_time);

  return (
    <div className="emporium-tab">
      {/* Emporium Header */}
      <div className="emporium-header">
        <div className="emporium-balance">
          <span className="emporium-shard-icon">&#9670;</span>
          <span className="emporium-shard-amount">{balance.toLocaleString()}</span>
          <span className="emporium-shard-label">Shards</span>
        </div>
        <div className="emporium-header-actions">
          <button className="emporium-btn-secondary" onClick={onSwitchToBuy}>
            Buy More Shards
          </button>
          <button
            className={`emporium-btn-secondary ${showCollection ? 'active' : ''}`}
            onClick={() => setShowCollection(!showCollection)}
          >
            {showCollection ? 'Back to Shop' : 'My Collection'}
          </button>
        </div>
      </div>

      {error && <div className="emporium-inline-error">{error}</div>}

      {showCollection ? (
        <MyCollection onEquipChange={() => { fetchCatalog(); onPlayerUpdate(); }} />
      ) : (
        <>
          {/* Featured + Limited Time */}
          <FeaturedSection items={featuredItems} balance={balance} onPurchase={item => setPurchaseTarget({ type: 'item', item })} />

          {/* Category Filter */}
          <ShopCategoryFilter selected={category} onChange={setCategory} />

          {/* Category: Boosters */}
          {(category === 'all' || category === 'booster') && (
            <BoosterPanel
              boosterItems={boosterItems}
              activeBoosters={activeBoosters}
              balance={balance}
              onPurchase={item => setPurchaseTarget({ type: 'item', item })}
            />
          )}

          {/* Category: Bundles */}
          {(category === 'all' || category === 'bundle') && bundles.length > 0 && (
            <div className="emporium-bundles">
              <h3 className="emporium-section-title">{'\uD83C\uDF81'} Bundles</h3>
              <div className="bundle-grid">
                {bundles.map(b => (
                  <BundleCard key={b.id} bundle={b} balance={balance}
                    onPurchase={bundle => setPurchaseTarget({ type: 'bundle', bundle })} />
                ))}
              </div>
            </div>
          )}

          {/* Item Grid (non-booster, non-bundle) */}
          {category !== 'booster' && category !== 'bundle' && (
            <div className="emporium-items">
              {filteredItems.length === 0 ? (
                <div className="emporium-empty">No items in this category.</div>
              ) : (
                <div className="emporium-item-grid">
                  {filteredItems.map(item => (
                    <ShopItemCard key={item.id} item={item} balance={balance}
                      onPurchase={item => setPurchaseTarget({ type: 'item', item })} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Purchase Modal */}
      {purchaseTarget && (
        <ShopPurchaseModal
          target={purchaseTarget}
          balance={balance}
          loading={purchasing}
          onConfirm={handlePurchaseItem}
          onCancel={() => setPurchaseTarget(null)}
        />
      )}
    </div>
  );
};

export default EmporiumTab;
