import React from 'react';

interface Props {
  amountCents: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const DonationConfirmModal: React.FC<Props> = ({ amountCents, onConfirm, onCancel }) => {
  return (
    <div className="donation-modal-overlay" onClick={onCancel}>
      <div className="donation-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Donation</h3>
        <p className="donation-modal-amount">
          You are donating <strong>${(amountCents / 100).toFixed(2)}</strong> to support Elysium Rising.
        </p>
        <p className="donation-modal-disclaimer">
          This is a one-time donation. No shards or in-game currency will be granted.
        </p>
        <p className="donation-modal-thanks">Thank you for your generosity!</p>
        <div className="donation-modal-actions">
          <button className="donate-confirm-btn" onClick={onConfirm}>
            Confirm Donation
          </button>
          <button className="donate-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationConfirmModal;
