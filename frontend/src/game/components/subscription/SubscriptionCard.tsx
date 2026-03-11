import './SubscriptionCard.css';

interface Props {
  planKey: string;
  price: string;
  subPrice?: string;
  label: string;
  badge?: string;
  onSubscribe: (planKey: string) => void;
  disabled?: boolean;
}

export function SubscriptionCard({ planKey, price, subPrice, label, badge, onSubscribe, disabled }: Props) {
  return (
    <div className={`sub-card ${badge ? 'sub-card-featured' : ''}`}>
      {badge && <div className="sub-card-badge">{badge}</div>}
      <h3 className="sub-card-label">{label}</h3>
      <div className="sub-card-price">{price}</div>
      {subPrice && <div className="sub-card-subprice">{subPrice}</div>}
      <button
        className="sub-card-btn"
        onClick={() => onSubscribe(planKey)}
        disabled={disabled}
      >
        Subscribe
      </button>
    </div>
  );
}
