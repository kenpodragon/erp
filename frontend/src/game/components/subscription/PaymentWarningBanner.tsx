import './PaymentWarningBanner.css';

interface Props {
  graceDeadline: string | null;
}

export function PaymentWarningBanner({ graceDeadline }: Props) {
  const deadline = graceDeadline ? new Date(graceDeadline) : null;
  const now = new Date();
  const hoursLeft = deadline ? Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 3600000)) : null;

  return (
    <div className="payment-warning-banner">
      <span className="payment-warning-icon">⚠</span>
      <div className="payment-warning-text">
        <strong>Payment failed</strong> — please update your payment method.
        {deadline && (
          <span className="payment-warning-deadline">
            {' '}Benefits active until {deadline.toLocaleDateString()}
            {hoursLeft !== null && hoursLeft <= 48 && ` (${hoursLeft}h remaining)`}
          </span>
        )}
      </div>
    </div>
  );
}
