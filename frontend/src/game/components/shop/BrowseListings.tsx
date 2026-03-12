import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import ListingCard from './ListingCard';
import BazaarPurchaseModal from './BazaarPurchaseModal';
import type { MarketplaceListing } from './BazaarTab';

interface Props {
  shardBalance: number;
  onBalanceChange: (newBalance: number) => void;
}

interface Filters {
  item_type: string;
  rarity: string;
  gear_slot: string;
  min_price: string;
  max_price: string;
  search: string;
  sort: string;
}

const ITEM_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'equipment', label: 'Equipment' },
];

const RARITIES = [
  { value: '', label: 'All Rarities' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'cosmic', label: 'Cosmic' },
];

const GEAR_SLOTS = [
  { value: '', label: 'All Slots' },
  { value: 'head', label: 'Head' },
  { value: 'chest', label: 'Chest' },
  { value: 'legs', label: 'Legs' },
  { value: 'feet', label: 'Feet' },
  { value: 'hands', label: 'Hands' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'offhand', label: 'Off-hand' },
  { value: 'accessory', label: 'Accessory' },
];

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low \u2192 High' },
  { value: 'price_desc', label: 'Price: High \u2192 Low' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'recent', label: 'Recently Listed' },
];

const PAGE_SIZE = 20;

const BrowseListings: React.FC<Props> = ({ shardBalance, onBalanceChange }) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [filters, setFilters] = useState<Filters>({
    item_type: '',
    rarity: '',
    gear_slot: '',
    min_price: '',
    max_price: '',
    search: '',
    sort: 'recent',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchaseTarget, setPurchaseTarget] = useState<MarketplaceListing | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.item_type) params.set('item_type', filters.item_type);
      if (filters.rarity) params.set('rarity', filters.rarity);
      if (filters.gear_slot) params.set('gear_slot', filters.gear_slot);
      if (filters.min_price) params.set('min_price', filters.min_price);
      if (filters.max_price) params.set('max_price', filters.max_price);
      if (filters.search) params.set('search', filters.search);
      if (filters.sort) params.set('sort', filters.sort);
      params.set('page', page.toString());
      params.set('page_size', PAGE_SIZE.toString());

      const res = await api.get(`/api/marketplace/browse?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load listings');
      const data = await res.json();
      setListings(data.listings || []);
      setTotalPages(data.total_pages || 1);
    } catch {
      setError('Failed to load marketplace listings.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchListings();
    }
  };

  const handleBuy = (listing: MarketplaceListing) => {
    setPurchaseTarget(listing);
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseTarget) return;
    setPurchasing(true);
    setError(null);
    try {
      const res = await api.post('/api/marketplace/buy', { listing_id: purchaseTarget.id });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Purchase failed');
      }
      const data = await res.json();
      onBalanceChange(data.new_balance ?? shardBalance - purchaseTarget.price_shards);
      setPurchaseTarget(null);
      fetchListings(); // Refresh
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="browse-listings">
      {/* Filter Bar */}
      <div className="browse-filter-bar">
        <div className="browse-filter-row">
          <select
            className="browse-filter-select"
            value={filters.item_type}
            onChange={e => handleFilterChange('item_type', e.target.value)}
          >
            {ITEM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            className="browse-filter-select"
            value={filters.rarity}
            onChange={e => handleFilterChange('rarity', e.target.value)}
          >
            {RARITIES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {filters.item_type === 'equipment' && (
            <select
              className="browse-filter-select"
              value={filters.gear_slot}
              onChange={e => handleFilterChange('gear_slot', e.target.value)}
            >
              {GEAR_SLOTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}

          <select
            className="browse-filter-select"
            value={filters.sort}
            onChange={e => handleFilterChange('sort', e.target.value)}
          >
            {SORT_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="browse-filter-row">
          <div className="browse-price-range">
            <input
              className="browse-price-input"
              type="number"
              placeholder="Min price"
              value={filters.min_price}
              onChange={e => handleFilterChange('min_price', e.target.value)}
              min={0}
            />
            <span className="browse-price-sep">&ndash;</span>
            <input
              className="browse-price-input"
              type="number"
              placeholder="Max price"
              value={filters.max_price}
              onChange={e => handleFilterChange('max_price', e.target.value)}
              min={0}
            />
          </div>

          <input
            className="browse-search-input"
            type="text"
            placeholder="Search items..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            onKeyDown={handleSearchKeyDown}
          />

          <button className="browse-search-btn" onClick={() => { setPage(1); fetchListings(); }}>
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="bazaar-inline-error">{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="bazaar-loading">
          <div className="shop-spinner"></div>
          <p>Loading listings...</p>
        </div>
      )}

      {/* Listings Grid */}
      {!loading && listings.length === 0 && (
        <div className="browse-empty">No listings found. Try adjusting your filters.</div>
      )}

      {!loading && listings.length > 0 && (
        <>
          <div className="browse-listings-grid">
            {listings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                shardBalance={shardBalance}
                isOwn={listing.is_own}
                onBuy={handleBuy}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="browse-pagination">
            <button
              className="browse-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              &laquo; Prev
            </button>
            <span className="browse-page-info">
              Page {page} of {totalPages}
            </span>
            <button
              className="browse-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next &raquo;
            </button>
          </div>
        </>
      )}

      {/* Purchase Modal */}
      {purchaseTarget && (
        <BazaarPurchaseModal
          listing={purchaseTarget}
          shardBalance={shardBalance}
          loading={purchasing}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setPurchaseTarget(null)}
        />
      )}
    </div>
  );
};

export default BrowseListings;
