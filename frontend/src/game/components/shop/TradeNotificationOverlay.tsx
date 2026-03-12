import React from 'react';
import type { TradeNotification } from './BazaarTab';

interface Props {
  notifications: TradeNotification[];
  onDismiss: () => void;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  sold: '\u2714',      // checkmark
  expired: '\u23F0',   // timer
  removed: '\u2716',   // cross
};

const NOTIFICATION_LABELS: Record<string, string> = {
  sold: 'Sold',
  expired: 'Expired',
  removed: 'Removed',
};

const TradeNotificationOverlay: React.FC<Props> = ({ notifications, onDismiss }) => {
  return (
    <div className="tno-overlay">
      <div className="tno-panel">
        <h3 className="tno-title">Marketplace Notifications</h3>

        <div className="tno-list">
          {notifications.map(notif => (
            <div key={notif.id} className={`tno-item tno-item-${notif.type}`}>
              <span className="tno-icon">{NOTIFICATION_ICONS[notif.type] || '?'}</span>
              <div className="tno-item-content">
                <span className="tno-item-name">{notif.item_name}</span>
                <span className="tno-item-status">
                  {NOTIFICATION_LABELS[notif.type] || notif.type}
                  {notif.type === 'sold' && notif.price_shards != null && (
                    <> for <span className="tno-shard-icon">&#9670;</span> {notif.price_shards.toLocaleString()}</>
                  )}
                  {notif.type === 'sold' && notif.buyer_alias && (
                    <> to {notif.buyer_alias}</>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button className="tno-dismiss-btn" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default TradeNotificationOverlay;
