import React from 'react';
import './Wiki.css';

const CombatGuide: React.FC = () => (
  <div className="wiki-page">
    <h1>Combat Guide</h1>
    <section>
      <h2>Click Combat</h2>
      <p>Combat in Elysium Rising is driven by clicking. Each click deals damage to the current enemy based on your click damage stat.</p>
      <h3>Waves</h3>
      <p>Each scene consists of multiple waves of enemies. Defeat all enemies in a wave to advance to the next. Clear all waves to complete the scene.</p>
      <h3>Auto-DPS</h3>
      <p>As you level up skills, you gain passive auto-DPS that continuously damages enemies even when you are not clicking. This is the foundation of idle progression.</p>
    </section>
    <section>
      <h2>Session Upgrades</h2>
      <p>During a scene, you earn gold that can be spent on temporary session upgrades. These upgrades reset when you leave the scene.</p>
      <p>Upgrades include click damage boosts, auto-DPS multipliers, critical hit enhancements, and gold gain bonuses.</p>
      <p>Use the x1, x10, x100, or MAX buttons to purchase upgrades in bulk.</p>
    </section>
    <section>
      <h2>Boss Fights</h2>
      <p>At the end of each chapter, you will face a powerful boss. Bosses have a countdown timer and require you to deal enough damage before time runs out.</p>
      <h3>Interrupts</h3>
      <p>During boss fights, special interrupt events will appear. Successfully completing these events deals massive bonus damage to the boss.</p>
      <p><strong>Click Burst:</strong> Rapidly click to fill a progress bar before it expires.</p>
      <p><strong>Target Zone:</strong> Click on a glowing circle that appears at a random position on screen.</p>
      <p><strong>Whack Sequence:</strong> Click three sequential pop-up zones in order.</p>
    </section>
    <section>
      <h2>Skills Hotbar</h2>
      <p>You have 9 active skill slots on your hotbar. Skills have cooldowns and provide various combat effects such as burst damage, healing, or temporary buffs.</p>
    </section>
  </div>
);

export default CombatGuide;
