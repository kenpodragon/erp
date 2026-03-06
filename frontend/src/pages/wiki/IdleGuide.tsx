import React from 'react';
import './Wiki.css';

const IdleGuide: React.FC = () => (
  <div className="wiki-page">
    <h1>Idle Training Guide</h1>
    <section>
      <h2>What is Idle Training?</h2>
      <p>Idle Training allows your character to continue progressing even when you are away from the game. Once unlocked, your character passively trains skills and accumulates resources over time.</p>
    </section>
    <section>
      <h2>How It Works</h2>
      <p>When you leave a scene or close the game, your character enters idle mode. Upon returning, you will receive a summary of all resources earned during your absence.</p>
      <h3>Offline Earnings</h3>
      <p>Offline earnings are calculated based on your auto-DPS, active skill levels, and any idle multipliers you have unlocked.</p>
      <h3>Essence Drain</h3>
      <p>While idle training, a small portion of your earned Essence may be consumed to fuel passive skill leveling. This trade-off ensures meaningful choices in how you allocate your progression resources.</p>
    </section>
    <section>
      <h2>Maximizing Idle Gains</h2>
      <p>Level up your skills to increase auto-DPS, which directly affects idle earnings.</p>
      <p>Equip gear that boosts idle multipliers for greater offline rewards.</p>
      <p>Advance through the story to unlock higher-level idle training zones with better returns.</p>
    </section>
  </div>
);

export default IdleGuide;
