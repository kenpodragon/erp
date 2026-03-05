import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api';
import './ActiveTrainingSimulator.css';

interface SkillStatus {
  skill_id: number;
  skill_name: string;
  level: number;
  current_xp: number;
  next_level_xp: number;
  active_action: {
    id: number;
    name: string;
    display_name: string;
    interval_ms: number;
    xp_per_action: number;
  } | null;
}

interface Props {
  skill: SkillStatus;
  onExit: (xpEarned: number) => void;
}

const ASCII_ENEMIES: Record<string, string[]> = {
  'Attack': [
    "  (o o)  \n  /| |\\  \n   / \\   ",
    "  <O O>  \n  --| |--\n   / \\   ",
    "  [X X]  \n  --| |--\n  _/_ \\_ "
  ],
  'Magic': [
    "   .---.  \n  / o o \\ \n  \\  -  / \n   '---'  ",
    "  ( @ @ ) \n   ) - (  \n  (     ) ",
    "   /\\_/\\  \n  ( >.< ) \n   )   (  \n  (___ __)"
  ],
  'Lore': [
    "  _______ \n |       |\n |  ? ?  |\n |_______|",
    "   .---.  \n  /     \\ \n |  (!)  |\n  \\     / \n   '---'  ",
    "  _______ \n | AKASH |\n |  LOG  |\n |_______|"
  ],
  'Precision': [
    "  [0 0]  \n  -| |-  \n  /   \\  ",
    "  <-> <-> \n     |    \n    / \\   ",
    "  |DEBUG| \n  |01010| \n  |_____| "
  ]
};

const ActiveTrainingSimulator: React.FC<Props> = ({ skill, onExit }) => {
  const [enemyHp, setEnemyHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [wave, setWave] = useState(1);
  const [totalXp, setTotalXp] = useState(0);
  const [logs, setLogs] = useState<string[]>(["SIMULATOR INITIALIZED.", `TARGET SKILL: ${skill.skill_name}`]);
  const [popups, setXpPopups] = useState<{ id: number, x: number, y: number, val: number }[]>([]);
  const [isBoss, setIsBoss] = useState(false);
  
  const xpPerKill = (skill.active_action?.xp_per_action || 10) * 3;
  const lastClickRef = useRef(0);

  const spawnEnemy = useCallback((w: number) => {
    const bossInterval = 10;
    const isB = w % bossInterval === 0;
    setIsBoss(isB);
    const hp = Math.floor(100 * Math.pow(1.1, w - 1)) * (isB ? 5 : 1);
    setEnemyHp(hp);
    setMaxHp(hp);
    addLog(isB ? `WARNING: ZONE GUARDIAN DETECTED AT WAVE ${w}!` : `WAVE ${w}: NEW TARGET ACQUIRED.`);
  }, []);

  useEffect(() => {
    spawnEnemy(1);
  }, [spawnEnemy]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 20));
  };

  const handleEnemyClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickRef.current < 100) return; // simple throttle
    lastClickRef.current = now;

    const dmg = 20; // fixed dmg for mini-game
    setEnemyHp(prev => {
      const next = prev - dmg;
      if (next <= 0) {
        // Kill
        setTotalXp(x => x + xpPerKill);
        setXpPopups(p => [...p, { id: now, x: e.clientX, y: e.clientY, val: xpPerKill }]);
        setTimeout(() => setXpPopups(p => p.filter(item => item.id !== now)), 1000);
        
        const nextWave = wave + 1;
        setWave(nextWave);
        spawnEnemy(nextWave);
        return 0;
      }
      return next;
    });
  };

  const sprites = ASCII_ENEMIES[skill.skill_name] || ASCII_ENEMIES['Attack'];
  const currentSprite = sprites[wave % sprites.length];

  return (
    <div className="training-simulator-overlay">
      <div className="scanline" />
      
      <div className="simulator-header">
        <div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>ACTIVE_TRAINING_SIMULATOR_v1.0</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SKILL: {skill.skill_name}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>TOTAL XP ACCRUED</div>
          <div style={{ fontSize: '1.5rem', color: '#ffff00' }}>+{totalXp.toLocaleString()} XP</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>WAVE {wave}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>MULTIPLIER: 3.0x (ACTIVE)</div>
        </div>
      </div>

      <div className="simulator-main">
        <div className="combat-area">
          <div className="sim-stats">
            <div>SESSION_TIME: {new Date().toLocaleTimeString()}</div>
            <div>ACTION: {skill.active_action?.display_name}</div>
          </div>

          {isBoss && <div className="boss-warning">BOSS WAVE</div>}

          <div className="enemy-container" onClick={handleEnemyClick}>
            <div className="enemy-sprite-ascii">{currentSprite}</div>
            <div className="enemy-hp-bar-outer">
              <div className="enemy-hp-bar-inner" style={{ width: `${(enemyHp / maxHp) * 100}%`, background: isBoss ? '#ff3333' : '#00ff41' }} />
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.8rem' }}>
              {isBoss ? 'ZONE GUARDIAN' : 'TRAINING CONSTRUCT'} [HP: {Math.max(0, enemyHp)}/{maxHp}]
            </div>
          </div>

          {popups.map(p => (
            <div key={p.id} className="xp-popup" style={{ left: p.x, top: p.y }}>
              +{p.val} XP
            </div>
          ))}
        </div>

        <div className="log-area">
          {logs.map((log, i) => (
            <div key={i} style={{ opacity: 1 - (i * 0.05), marginBottom: '4px' }}>
              {`> ${log}`}
            </div>
          ))}
        </div>
      </div>

      <div className="sim-exit-container">
        <button className="sim-exit-btn" onClick={() => onExit(totalXp)}>
          TERMINATE SIMULATION & SYNC XP
        </button>
        <div style={{ fontSize: '0.7rem', marginTop: '10px', opacity: 0.6 }}>
          ALL ACCRUED XP WILL BE APPLIED TO YOUR CHARACTER ONCE SYNCED.
        </div>
      </div>
    </div>
  );
};

export default ActiveTrainingSimulator;
