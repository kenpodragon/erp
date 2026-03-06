/**
 * GoldOdometer — Animated digit-flip gold counter.
 *
 * Shows the current session gold with a roll animation when the value
 * increases, and a floating +XXX delta text.
 */
import React, { useEffect, useRef, useState } from 'react';
import { formatGold } from '../../utils/numbers';
import './GoldOdometer.css';

interface Props {
  gold: number;
  forceUpdate?: boolean;
  cpsValid?: boolean;
  reduceMotion?: boolean;
}

const GoldOdometer: React.FC<Props> = ({ gold, forceUpdate, cpsValid = true, reduceMotion = false }) => {
  const prevGold = useRef(gold);
  const [displayStr, setDisplayStr] = useState(formatGold(gold));
  const [rolling, setRolling] = useState(false);
  const [delta, setDelta] = useState<number>(0);
  const [showDelta, setShowDelta] = useState(false);
  const deltaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (gold === prevGold.current) return;
    const diff = gold - prevGold.current;
    
    if (diff > 0 && !forceUpdate) {
      if (!reduceMotion) {
        setDelta(prev => prev + diff);
        setShowDelta(true);
        setRolling(true);
        setTimeout(() => setRolling(false), 300);
      }

      if (deltaTimeout.current) clearTimeout(deltaTimeout.current);
      deltaTimeout.current = setTimeout(() => {
        setShowDelta(false);
        setDelta(0);
      }, 1500);
    } else {
      setDelta(0);
      setShowDelta(false);
    }

    prevGold.current = gold;
    setDisplayStr(formatGold(gold));
  }, [gold, forceUpdate]);

  return (
    <div className={`gold-odometer ${!cpsValid ? 'gold-odometer--cps-warning' : ''}`}>
      <span className="gold-icon">&#9733;</span>
      <span className={`gold-value ${rolling ? 'gold-value--roll' : ''}`}>
        {displayStr}
      </span>

      {showDelta && delta > 0 && (
        <span className="gold-delta-flyout">
          +{formatGold(delta)}
        </span>
      )}
    </div>
  );
};

export default GoldOdometer;
