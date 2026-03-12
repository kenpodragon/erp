import React from 'react';

interface Props {
  slotsUsed: number;
  maxSlots: number;
  nextPermitCost: number | null;
}

const BazaarPermitUpsell: React.FC<Props> = ({ slotsUsed, maxSlots, nextPermitCost }) => {
  if (maxSlots >= 10) return null;

  const fillPct = maxSlots > 0 ? Math.min((slotsUsed / maxSlots) * 100, 100) : 0;

  return (
    <div className="permit-upsell">
      <span className="permit-upsell-label">{slotsUsed}/{maxSlots} slots</span>
      <div className="permit-upsell-bar">
        <div className="permit-upsell-bar-fill" style={{ width: `${fillPct}%` }} />
      </div>
      {nextPermitCost != null && (
        <>
          <span className="permit-upsell-cost">
            Next: &#9670; {nextPermitCost.toLocaleString()}
          </span>
          <button className="permit-upsell-btn">Upgrade</button>
        </>
      )}
    </div>
  );
};

export default BazaarPermitUpsell;
