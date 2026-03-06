import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api';
import MusicManager from './story/MusicManager';
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
  affinity_multiplier: number;
}

interface Props {
  skill: SkillStatus;
  effectiveBaseXp: number;
  potentialBaseXp: number;
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

const ActiveTrainingSimulator: React.FC<Props> = ({ skill, effectiveBaseXp, potentialBaseXp, onExit }) => {
  const [enemyHp, setEnemyHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [wave, setWave] = useState(1);
  const [mobsInWave, setMobsInWave] = useState(1); // 1-10 are mobs, 11 is boss
  const [totalXp, setTotalXp] = useState(0);
  const [logs, setLogs] = useState<string[]>(["SIMULATOR INITIALIZED.", `TARGET SKILL: ${skill.skill_name}`, `STABILITY RATE: ${(effectiveBaseXp / potentialBaseXp * 100).toFixed(0)}%`]);
  const [popups, setXpPopups] = useState<{ id: number, x: number, y: number, val: number }[]>([]);
  const [isBoss, setIsBoss] = useState(false);
  
  const lastClickRef = useRef(0);

  const spawnEnemy = useCallback((w: number, m: number) => {
    const isB = m > 10;
    setIsBoss(isB);
    
    // Scaling HP: base 100, +25% per wave, boss is 10x
    const hp = Math.floor(100 * Math.pow(1.25, w - 1)) * (isB ? 10 : 1);
    setEnemyHp(hp);
    setMaxHp(hp);
    
    if (isB) {
      addLog(`WARNING: WAVE ${w} GUARDIAN DETECTED!`);
    } else {
      addLog(`WAVE ${w} [${m}/10]: TARGET ACQUIRED.`);
    }
  }, []);

  useEffect(() => {
    spawnEnemy(1, 1);
  }, [spawnEnemy]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 20));
  };

  const handleEnemyClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickRef.current < 100) return; // throttle
    lastClickRef.current = now;

    const dmg = 25; // player damage
    setEnemyHp(prev => {
      const next = prev - dmg;
      if (next <= 0) {
        // Kill
        const actualXp = isBoss ? effectiveBaseXp * wave * 5 : effectiveBaseXp * wave;
        const possibleXp = isBoss ? potentialBaseXp * wave * 5 : potentialBaseXp * wave;
        
        setTotalXp(x => x + actualXp);
        setXpPopups(p => [...p, { id: now, x: e.clientX, y: e.clientY, val: Number(actualXp.toFixed(1)) }]);
        setTimeout(() => setXpPopups(p => p.filter(item => item.id !== now)), 1000);
        
        addLog(`WAVE ${wave} (${isBoss ? 'BOSS' : `${mobsInWave}/10`}) Target Killed +${actualXp.toFixed(1)} XP (+${possibleXp.toFixed(1)} possible due to essence stability)`);

        let nextWave = wave;
        let nextMob = mobsInWave + 1;
        
        if (nextMob > 11) {
          nextMob = 1;
          nextWave += 1;
          addLog(`ZONE ${wave} CLEARED. ADVANCING TO WAVE ${nextWave}.`);
        }
        
        setWave(nextWave);
        setMobsInWave(nextMob);
        spawnEnemy(nextWave, nextMob);
        return 0;
      }
      return next;
    });
  };

  const sprites = ASCII_ENEMIES[skill.skill_name] || ASCII_ENEMIES['Attack'];
  const currentSprite = sprites[(wave + mobsInWave) % sprites.length];

  return (
    <div className="training-simulator-overlay">
      <MusicManager musicState="combat" sceneId={null} archetype="training_grounds" />
      <div className="scanline" />
      
      <div className="simulator-header">
        <div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>ACTIVE_TRAINING_SIMULATOR_v1.1</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SKILL: {skill.skill_name}</div>
          <div style={{ fontSize: '0.8rem', color: '#00ff41' }}>CALIBRATING: {skill.active_action?.display_name}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>TOTAL XP ACCRUED</div>
          <div style={{ fontSize: '1.5rem', color: '#ffff00' }}>+{totalXp.toLocaleString()} XP</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>WAVE {wave} [{isBoss ? 'BOSS' : `${mobsInWave}/10`}]</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>UNIT XP: {effectiveBaseXp * wave}{isBoss ? ' (x5 BOSS)' : ''}</div>
        </div>
      </div>

      <div className="simulator-main">
        <div className="combat-area">
          <div className="sim-stats">
            <div>SESSION_TIME: {new Date().toLocaleTimeString()}</div>
            <div>STABILITY_ADJUSTED_BASE: {effectiveBaseXp}</div>
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
