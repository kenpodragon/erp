import React, { useState } from 'react';
import { api } from '../../../api';

interface ListingData {
  id: number;
  item_name: string;
  price_shards: number;
}

interface Props {
  listing: ListingData;
  onClose: () => void;
  onAdjusted: () => void;
}

const PriceAdjustModal: React.FC<Props> = ({ listing, onClose, onAdjusted }) => {
  const [newPrice, setNewPrice] = useState(listing.price_shards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tax = Math.floor(newPrice * 0.05);
  const proceeds = newPrice - tax;

  const handleSubmit = async () => {
    if (newPrice < 1) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/marketplace/adjust-price', {
        listing_id: listing.id,
        new_price: newPrice,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to adjust price');
      }
      onAdjusted();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pam-overlay" onClick={onClose}>
      <div className="pam-modal" onClick={e => e.stopPropagation()}>
        <h2 className="pam-title">Adjust Price</h2>

        <div className="pam-current-price">
          <span className="pam-label">Current Price</span>
          <span className="pam-value">&#9670; {listing.price_shards.toLocaleString()}</span>
        </div>

        <div className="pam-price-section">
          <label className="pam-price-label">New Price (Shards)</label>
          <input
            className="pam-price-input"
            type="number"
            min={1}
            value={newPrice}
            onChange={e => setNewPrice(Math.max(1, parseInt(e.target.value) || 1))}
          />
          {newPrice >= 1 && (
            <div className="pam-proceeds">
              You will receive {proceeds.toLocaleString()} Shards after the 5% Bazaar tax.
            </div>
          )}
        </div>

        {error && <div className="pam-error">{error}</div>}

        <div className="pam-actions">
          <button
            className="pam-btn pam-btn-confirm"
            disabled={loading || newPrice < 1 || newPrice === listing.price_shards}
            onClick={handleSubmit}
          >
            {loading ? 'Updating...' : 'Update Price'}
          </button>
          <button className="pam-btn pam-btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceAdjustModal;
