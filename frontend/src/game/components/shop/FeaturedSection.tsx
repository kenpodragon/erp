import React, { useState, useEffect } from 'react';
import type { ShopItemData } from './ShopItemCard';

interface Props {
  items: ShopItemData[];
  onPurchase: (item: ShopItemData) => void;
  balance: number;
}

const FeaturedSection: React.FC<Props> = ({ items, onPurchase, balance }) => {
  if (items.length === 0) return null;

  const limitedTime = items.filter(i => i.is_limited_time && i.available_until);
  const featured = items.filter(i => i.is_featured && !i.is_limited_time);

  return (
    <div className="featured-section">
      {featured.length > 0 && (
        <>
          <h3 className="featured-heading">{'\u2B50'} Featured</h3>
          <div className="featured-grid">
            {featured.map(item => (
              <FeaturedItemCard key={item.id} item={item} balance={balance} onPurchase={onPurchase} />
            ))}
          </div>
        </>
      )}
      {limitedTime.length > 0 && (
        <>
          <h3 className="featured-heading limited">{'\u23F3'} Limited Time</h3>
          <div className="featured-grid">
            {limitedTime.map(item => (
              <FeaturedItemCard key={item.id} item={item} balance={balance} onPurchase={onPurchase} limited />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const FeaturedItemCard: React.FC<{
  item: ShopItemData;
  balance: number;
  onPurchase: (item: ShopItemData) => void;
  limited?: boolean;
}> = ({ item, balance, onPurchase, limited }) => {
  const canAfford = balance >= item.price_shards;
  const isBooster = item.category === 'booster';
  const disabled = item.owned && !isBooster;

  return (
    <div
      className={`featured-card ${limited ? 'limited-time' : ''} ${disabled ? 'owned' : ''}`}
      onClick={() => !disabled && onPurchase(item)}
      tabIndex={0}
      role="button"
    >
      <div className="featured-card-name">{item.name}</div>
      {item.description && <div className="featured-card-desc">{item.description}</div>}
      {limited && item.available_until && (
        <CountdownTimer until={item.available_until} />
      )}
      <div className={`featured-card-status ${disabled ? 'owned' : canAfford ? 'buyable' : 'cant-afford'}`}>
        {disabled ? 'Owned' : <><span className="spm-shard-icon">&#9670;</span>{item.price_shards.toLocaleString()}</>}
      </div>
    </div>
  );
};

const CountdownTimer: React.FC<{ until: string }> = ({ until }) => {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(until).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [until]);

  return <div className="featured-countdown">{remaining} left</div>;
};

export default FeaturedSection;
