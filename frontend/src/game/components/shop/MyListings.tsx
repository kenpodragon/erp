import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../api';
import BazaarPermitUpsell from './BazaarPermitUpsell';
import CreateListingModal from './CreateListingModal';
import PriceAdjustModal from './PriceAdjustModal';
import './BazaarSell.css';

interface ActiveListing {
  id: number;
  item_type: 'artifact' | 'equipment';
  item_name: string;
  item_rarity: string;
  price_shards: number;
  listed_at: string;
  expires_at: string;
}

interface HistoryEntry {
  id: number;
  item_name: string;
  item_rarity: string;
  price_shards: number;
  status: 'sold' | 'expired' | 'cancelled' | 'active';
  completed_at: string | null;
  listed_at: string;
}

interface Props {
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

function getExpiryInfo(expiresAt: string): { text: string; className: string } {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diffMs = expiry - now;

  if (diffMs <= 0) return { text: 'Expired', className: 'critical' };

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const text = `${hours}h ${minutes}m remaining`;

  if (hours < 2) return { text, className: 'critical' };
  if (hours < 6) return { text, className: 'urgent' };
  return { text, className: '' };
}

const MyListings: React.FC<Props> = ({ onBalanceChange }) => {
  const [activeListings, setActiveListings] = useState<ActiveListing[]>([]);
  const [listingHistory, setListingHistory] = useState<HistoryEntry[]>([]);
  const [slotsUsed, setSlotsUsed] = useState(0);
  const [maxSlots, setMaxSlots] = useState(3);
  const [nextPermitCost, setNextPermitCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [adjustListing, setAdjustListing] = useState<ActiveListing | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Refresh expiry countdowns every minute
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, setTick] = useState(0);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/marketplace/my-listings');
      if (!res.ok) throw new Error('Failed to load listings');
      const data = await res.json();
      setActiveListings(data.active_listings || []);
      setListingHistory(data.listing_history || []);
      setSlotsUsed(data.slots_used ?? 0);
      setMaxSlots(data.max_slots ?? 3);
      setNextPermitCost(data.next_permit_cost ?? null);
    } catch {
      setError('Failed to load your listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Tick every 60s to refresh countdowns
  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 60000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCancelListing = async (listingId: number) => {
    setCancellingId(listingId);
    try {
      const res = await api.post('/api/marketplace/cancel', { listing_id: listingId });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to cancel listing');
      }
      const data = await res.json();
      if (data.shard_balance != null) {
        onBalanceChange(data.shard_balance);
      }
      await fetchListings();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancellingId(null);
    }
  };

  const handleCreated = async () => {
    setShowCreateModal(false);
    await fetchListings();
  };

  const handleAdjusted = async () => {
    setAdjustListing(null);
    await fetchListings();
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="my-listings-loading">
        <div className="shop-spinner"></div>
        <p>Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="my-listings">
      {/* Header */}
      <div className="my-listings-header">
        <h2 className="my-listings-title">
          MY LISTINGS ({slotsUsed} / {maxSlots} slots used)
        </h2>
        <button
          className="my-listings-btn-create"
          disabled={slotsUsed >= maxSlots}
          onClick={() => setShowCreateModal(true)}
        >
          + Create Listing
        </button>
      </div>

      {/* Permit upsell */}
      <BazaarPermitUpsell
        slotsUsed={slotsUsed}
        maxSlots={maxSlots}
        nextPermitCost={nextPermitCost}
      />

      {error && <div className="my-listings-error">{error}</div>}

      {/* Active listings */}
      {activeListings.length === 0 ? (
        <div className="my-listings-empty">
          You have no active listings. Create one to start selling!
        </div>
      ) : (
        <div className="active-listings-grid">
          {activeListings.map(listing => {
            const tax = Math.floor(listing.price_shards * 0.05);
            const proceeds = listing.price_shards - tax;
            const expiry = getExpiryInfo(listing.expires_at);

            return (
              <div key={listing.id} className="active-listing-card">
                <div className="active-listing-info">
                  <div className={`active-listing-name ${RARITY_CLASS[listing.item_rarity] || ''}`}>
                    {listing.item_name}
                  </div>
                  <div className="active-listing-price-row">
                    <span className="active-listing-price">
                      &#9670; {listing.price_shards.toLocaleString()}
                    </span>
                    <span className="active-listing-proceeds">
                      (You receive: {proceeds.toLocaleString()} after 5% tax)
                    </span>
                  </div>
                  <div className={`active-listing-expiry ${expiry.className}`}>
                    {expiry.text}
                  </div>
                </div>
                <div className="active-listing-actions">
                  <button
                    className="active-listing-btn adjust"
                    onClick={() => setAdjustListing(listing)}
                  >
                    Adjust Price
                  </button>
                  <button
                    className="active-listing-btn cancel"
                    disabled={cancellingId === listing.id}
                    onClick={() => handleCancelListing(listing.id)}
                  >
                    {cancellingId === listing.id ? 'Cancelling...' : 'Cancel Listing'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Listing history */}
      {listingHistory.length > 0 && (
        <div className="listing-history">
          <h3 className="listing-history-title">Listing History</h3>
          <table className="listing-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Item</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {listingHistory.map(entry => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.completed_at || entry.listed_at)}</td>
                  <td>
                    <span className={`listing-status-badge ${entry.status}`}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </td>
                  <td className={RARITY_CLASS[entry.item_rarity] || ''}>
                    {entry.item_name}
                  </td>
                  <td>&#9670; {entry.price_shards.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create listing modal */}
      {showCreateModal && (
        <CreateListingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Price adjust modal */}
      {adjustListing && (
        <PriceAdjustModal
          listing={adjustListing}
          onClose={() => setAdjustListing(null)}
          onAdjusted={handleAdjusted}
        />
      )}
    </div>
  );
};

export default MyListings;
