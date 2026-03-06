import React from 'react';
import './Wiki.css';

const EffectsGuide: React.FC = () => (
  <div className="wiki-page">
    <h1>Effects Guide</h1>
    <section>
      <h2>Buffs</h2>
      <p>Buffs are temporary positive effects that enhance your character's abilities. They can be gained from skills, items, or completing special objectives.</p>
      <h3>Common Buffs</h3>
      <p><strong>Attack Up:</strong> Increases your click damage by a percentage for a limited duration.</p>
      <p><strong>Haste:</strong> Increases your auto-DPS rate, making idle damage tick faster.</p>
      <p><strong>Fortune:</strong> Boosts gold earned from enemy kills.</p>
      <p><strong>Shield:</strong> Absorbs a set amount of incoming damage before breaking.</p>
    </section>
    <section>
      <h2>Debuffs</h2>
      <p>Debuffs are negative effects inflicted by enemies or environmental hazards.</p>
      <h3>Common Debuffs</h3>
      <p><strong>Weaken:</strong> Reduces your click damage temporarily.</p>
      <p><strong>Slow:</strong> Decreases auto-DPS rate.</p>
      <p><strong>Curse:</strong> Reduces Essence earned from scene completion.</p>
    </section>
    <section>
      <h2>Status Effects</h2>
      <p>Some abilities and items apply persistent status effects.</p>
      <p><strong>Burn:</strong> Deals damage over time to the target.</p>
      <p><strong>Freeze:</strong> Briefly stuns the target, preventing actions.</p>
      <p><strong>Poison:</strong> Deals stacking damage over time.</p>
    </section>
    <section>
      <h2>Dark Ritual</h2>
      <p>The Dark Ritual is a powerful mechanic accessible from the Global Header. When activated, it provides a massive but temporary power boost at the cost of a health drain. Managing the Dark Ritual bar is key to advanced play.</p>
    </section>
  </div>
);

export default EffectsGuide;
