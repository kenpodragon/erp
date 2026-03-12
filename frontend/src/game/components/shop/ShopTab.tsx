import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import BuyShards from './BuyShards';
import PackageCard from './PackageCard';
import PurchaseConfirmModal from './PurchaseConfirmModal';
import PaymentStatus from './PaymentStatus';
import TransactionHistory from './TransactionHistory';
import EmporiumTab from './EmporiumTab';
import SupportUsTab from './SupportUsTab';
import BazaarTab from './BazaarTab';
import './ShopTab.css';

export interface ShardPackage {
  id: number;
  tier_key: string;
  name: string;
  price_cents: number;
  price_display: string;
  base_shards: number;
  bonus_pct: number;
  total_shards: number;
  is_best_value: boolean;
  max_purchases: number | null;
  purchases_remaining: number | null;
}

interface Player {
  id: number;
  alias: string | null;
  google_display_name: string | null;
}

interface ShopTabProps {
  player: Player | null;
  onPlayerUpdate: () => void;
}

type ShopSubTab = 'buy' | 'emporium' | 'support' | 'bazaar';

const ShopTab: React.FC<ShopTabProps> = ({ player, onPlayerUpdate }) => {
  const [subTab, setSubTab] = useState<ShopSubTab>('buy');
  const [packages, setPackages] = useState<ShardPackage[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [firstPurchaseAvailable, setFirstPurchaseAvailable] = useState(false);
  const [hasActiveDispute, setHasActiveDispute] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Purchase confirmation modal
  const [confirmPackage, setConfirmPackage] = useState<ShardPackage | null>(null);

  // Post-checkout polling
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  // Load packages on mount
  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/payments/packages');
      if (!res.ok) throw new Error('Failed to load shop data');
      const data = await res.json();
      setPackages(data.packages || []);
      setCurrentBalance(data.current_balance || 0);
      setFirstPurchaseAvailable(data.first_purchase_available ?? false);
      setHasActiveDispute(data.has_active_dispute ?? false);
    } catch (err) {
      setError('Failed to load the shop. Please try again.');
      console.error('Shop fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (player?.id) {
      fetchPackages();
    }
  }, [player?.id, fetchPackages]);

  // Check URL for post-checkout session_id
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      setCheckoutSessionId(sessionId);
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handlePurchase = async (pkg: ShardPackage) => {
    setConfirmPackage(pkg);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmPackage) return;
    try {
      const res = await api.post('/api/payments/checkout', { package_id: confirmPackage.id });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Checkout failed');
      }
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout. Please try again.');
    } finally {
      setConfirmPackage(null);
    }
  };

  const handlePaymentComplete = (shards: number, balance: number) => {
    setCurrentBalance(balance);
    setCheckoutSessionId(null);
    fetchPackages(); // Refresh to update purchases_remaining etc.
    onPlayerUpdate();
  };

  const handlePaymentTimeout = () => {
    setCheckoutSessionId(null);
  };

  return (
    <div className="shop-tab">
      {/* Payment status polling overlay */}
      {checkoutSessionId && (
        <PaymentStatus
          sessionId={checkoutSessionId}
          onComplete={handlePaymentComplete}
          onTimeout={handlePaymentTimeout}
        />
      )}

      {/* Shop Header */}
      <div className="shop-header">
        <h1 className="shop-title">Elysium Shop</h1>
        <div className="shop-balance">
          Current Balance: <span className="shard-icon">&#9670;</span>{' '}
          <span className="shard-amount">{currentBalance.toLocaleString()}</span> Shards
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="shop-tabs">
        <button
          className={`shop-tab-btn ${subTab === 'buy' ? 'active' : ''}`}
          onClick={() => setSubTab('buy')}
        >
          Buy Shards
        </button>
        <button
          className={`shop-tab-btn ${subTab === 'emporium' ? 'active' : ''}`}
          onClick={() => setSubTab('emporium')}
        >
          Elysium Emporium
        </button>
        <button
          className={`shop-tab-btn ${subTab === 'support' ? 'active' : ''}`}
          onClick={() => setSubTab('support')}
        >
          Support Us
        </button>
        <button
          className={`shop-tab-btn ${subTab === 'bazaar' ? 'active' : ''}`}
          onClick={() => setSubTab('bazaar')}
        >
          Dreamwalker's Bazaar
        </button>
      </div>

      {/* Tab content */}
      <div className="shop-content">
        {error && (
          <div className="shop-error">
            <p>{error}</p>
            <button onClick={fetchPackages}>Retry</button>
          </div>
        )}

        {loading && !error && (
          <div className="shop-loading">
            <div className="shop-spinner"></div>
            <p>Loading shop...</p>
          </div>
        )}

        {!loading && !error && subTab === 'buy' && (
          <>
            <BuyShards
              packages={packages}
              firstPurchaseAvailable={firstPurchaseAvailable}
              hasActiveDispute={hasActiveDispute}
              onPurchase={handlePurchase}
              currentBalance={currentBalance}
            />
            <div className="shop-divider"></div>
            <TransactionHistory />
          </>
        )}

        {subTab === 'emporium' && (
          <EmporiumTab
            onPlayerUpdate={() => { fetchPackages(); onPlayerUpdate(); }}
            onSwitchToBuy={() => setSubTab('buy')}
          />
        )}

        {subTab === 'support' && <SupportUsTab />}

        {subTab === 'bazaar' && (
          <BazaarTab onPlayerUpdate={() => { fetchPackages(); onPlayerUpdate(); }} />
        )}
      </div>

      {/* Purchase confirmation modal */}
      {confirmPackage && (
        <PurchaseConfirmModal
          package_={confirmPackage}
          firstPurchaseAvailable={firstPurchaseAvailable}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setConfirmPackage(null)}
        />
      )}
    </div>
  );
};

export default ShopTab;
