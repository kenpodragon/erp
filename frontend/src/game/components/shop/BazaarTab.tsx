import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import BrowseListings from './BrowseListings';
import MyListings from './MyListings';
import NPCVendor from './NPCVendor';
import TradeHistory from './TradeHistory';
import TradeNotificationOverlay from './TradeNotificationOverlay';
import ClaimModal from './ClaimModal';
import './BazaarTab.css';

export interface MarketplaceListing {
  id: number;
  seller_id: number;
  seller_alias: string;
  item_type: 'artifact' | 'equipment';
  item_name: string;
  item_rarity: string;
  item_stats: Record<string, number>;
  gear_slot: string | null;
  price_shards: number;
  comparable_min: number | null;
  comparable_max: number | null;
  listed_at: string;
  is_own: boolean;
}

export interface TradeNotification {
  id: number;
  type: 'sold' | 'expired' | 'removed';
  item_name: string;
  item_rarity: string;
  price_shards: number | null;
  buyer_alias: string | null;
  created_at: string;
}

export interface PendingClaim {
  trade_id: number;
  item_name: string;
  item_rarity: string;
  item_stats: Record<string, number>;
}

export interface InventoryItem {
  id: number;
  name: string;
  rarity: string;
  stats: Record<string, number>;
  gear_slot: string | null;
}

interface Props {
  onPlayerUpdate: () => void;
}

type BazaarSubTab = 'browse' | 'my-listings' | 'vendor' | 'history';

const BazaarTab: React.FC<Props> = ({ onPlayerUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState<BazaarSubTab>('browse');
  const [shardBalance, setShardBalance] = useState(0);
  const [notifications, setNotifications] = useState<TradeNotification[]>([]);
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const [claimInventory, setClaimInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch notifications and balance in parallel
      const [notifRes, balanceRes] = await Promise.all([
        api.get('/api/marketplace/notifications'),
        api.get('/api/marketplace/balance'),
      ]);

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setShardBalance(balanceData.shard_balance || 0);
        if (balanceData.pending_claim) {
          setPendingClaim(balanceData.pending_claim);
          setClaimInventory(balanceData.inventory || []);
        }
      }
    } catch {
      setError('Failed to load the Bazaar. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleDismissNotifications = async (ids: number[]) => {
    try {
      await api.post('/api/marketplace/notifications/read', { notification_ids: ids });
      setNotifications([]);
    } catch {
      // Silently fail — notifications will show again next visit
    }
  };

  const handleClaimResolve = async (tradeId: number, action: 'replace' | 'discard', replaceItemId?: number) => {
    try {
      const res = await api.post('/api/marketplace/claim', {
        trade_id: tradeId,
        action,
        replace_item_id: replaceItemId,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Claim failed');
      }
      setPendingClaim(null);
      onPlayerUpdate();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleBalanceChange = (newBalance: number) => {
    setShardBalance(newBalance);
    onPlayerUpdate();
  };

  if (loading) {
    return (
      <div className="bazaar-loading">
        <div className="shop-spinner"></div>
        <p>Loading Dreamwalker's Bazaar...</p>
      </div>
    );
  }

  return (
    <div className="bazaar-tab">
      {/* Notifications overlay */}
      {notifications.length > 0 && (
        <TradeNotificationOverlay
          notifications={notifications}
          onDismiss={() => handleDismissNotifications(notifications.map(n => n.id))}
        />
      )}

      {/* Claim modal */}
      {pendingClaim && (
        <ClaimModal
          pendingClaim={pendingClaim}
          inventory={claimInventory}
          onResolve={handleClaimResolve}
        />
      )}

      {/* Bazaar Header */}
      <div className="bazaar-header">
        <div className="bazaar-balance">
          <span className="bazaar-shard-icon">&#9670;</span>
          <span className="bazaar-shard-amount">{shardBalance.toLocaleString()}</span>
          <span className="bazaar-shard-label">Shards</span>
        </div>
        <button className="bazaar-btn-buy-shards" onClick={() => {
          // Navigate to Buy Shards tab — dispatch custom event for parent
          window.dispatchEvent(new CustomEvent('shop-switch-tab', { detail: 'buy' }));
        }}>
          Buy More Shards
        </button>
      </div>

      {error && <div className="bazaar-inline-error">{error}</div>}

      {/* Sub-tab navigation */}
      <div className="bazaar-subtabs">
        <button
          className={`bazaar-subtab-btn ${activeSubTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('browse')}
        >
          Browse
        </button>
        <button
          className={`bazaar-subtab-btn ${activeSubTab === 'my-listings' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('my-listings')}
        >
          My Listings
        </button>
        <button
          className={`bazaar-subtab-btn ${activeSubTab === 'vendor' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('vendor')}
        >
          NPC Vendor
        </button>
        <button
          className={`bazaar-subtab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          Trade History
        </button>
      </div>

      {/* Sub-tab content */}
      <div className="bazaar-content">
        {activeSubTab === 'browse' && (
          <BrowseListings
            shardBalance={shardBalance}
            onBalanceChange={handleBalanceChange}
          />
        )}
        {activeSubTab === 'my-listings' && (
          <MyListings onBalanceChange={handleBalanceChange} />
        )}
        {activeSubTab === 'vendor' && (
          <NPCVendor
            shardBalance={shardBalance}
            onBalanceChange={handleBalanceChange}
          />
        )}
        {activeSubTab === 'history' && (
          <TradeHistory />
        )}
      </div>
    </div>
  );
};

export default BazaarTab;
