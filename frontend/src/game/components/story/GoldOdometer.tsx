/**
 * GoldOdometer — Animated digit-flip gold counter.
 *
 * Shows the current session gold with a roll animation when the value
 * increases, and coin pop/fly VFX via short CSS keyframes.
 */
import React, { useEffect, useRef, useState } from 'react';
import { formatGold } from '../../utils/numbers';
import './GoldOdometer.css';

interface Props {
  gold: number;
  forceUpdate?: boolean;
}

interface CoinPop {
  id: number;
  left: string;
}

let _coinId = 0;

const GoldOdometer: React.FC<Props> = ({ gold, forceUpdate }) => {
  const prevGold = useRef(gold);
  const [displayStr, setDisplayStr] = useState(formatGold(gold));
  const [rolling, setRolling] = useState(false);
  const [coins, setCoins] = useState<CoinPop[]>([]);

  useEffect(() => {
    if (gold === prevGold.current) return;
    const gained = gold > prevGold.current;
    prevGold.current = gold;
    setDisplayStr(formatGold(gold));

    // Normal gain with VFX
    if (gained && !forceUpdate) {
      setRolling(true);
      setTimeout(() => setRolling(false), 300);

      // Spawn 1-2 coin pops
      const newCoins: CoinPop[] = Array.from({ length: Math.min(2, Math.ceil(Math.random() * 2)) }, () => ({
        id: ++_coinId,
        left: `${30 + Math.random() * 40}%`,
      }));
      setCoins(prev => [...prev, ...newCoins]);
      setTimeout(() => {
        setCoins(prev => prev.filter(c => !newCoins.find(n => n.id === c.id)));
      }, 700);
    }
    
    // Jump without VFX if forceUpdate is true (or if gold decreased)
  }, [gold, forceUpdate]);

  return (
    <div className="gold-odometer">
      <span className="gold-icon">&#9733;</span>
      <span className={`gold-value ${rolling ? 'gold-value--roll' : ''}`}>
        {displayStr}
      </span>

      {/* Coin pop VFX */}
      {coins.map(c => (
        <span key={c.id} className="gold-coin-pop" style={{ left: c.left }}>
          +&#9733;
        </span>
      ))}
    </div>
  );
};

export default GoldOdometer;
