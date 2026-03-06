import React from 'react';
import './Wiki.css';

const StatGuide: React.FC = () => (
  <div className="wiki-page">
    <h1>Stats Guide</h1>
    <section>
      <h2>Core Stats</h2>
      <p>Every character in Elysium Rising has a set of core stats that determine their effectiveness in combat and exploration.</p>
      <h3>Strength</h3>
      <p>Increases your base click damage. Each point of Strength adds a flat bonus to every click attack you perform.</p>
      <h3>Vitality</h3>
      <p>Determines your maximum HP. Higher Vitality means you can survive longer in boss fights and challenging encounters.</p>
      <h3>Agility</h3>
      <p>Affects your critical hit chance and dodge rate. Agile characters can land devastating blows and avoid incoming damage.</p>
      <h3>Intelligence</h3>
      <p>Boosts skill effectiveness and Essence gain. Intelligent characters progress faster and unlock stronger abilities.</p>
    </section>
    <section>
      <h2>Derived Stats</h2>
      <p>Some stats are calculated from your core stats, gear, and active buffs.</p>
      <h3>DPS (Damage Per Second)</h3>
      <p>Your total damage output per second, combining click damage and auto-DPS from skills.</p>
      <h3>Critical Rate</h3>
      <p>The percentage chance that any attack deals bonus damage. Base rate starts at 5% and scales with Agility.</p>
      <h3>Gold Multiplier</h3>
      <p>A multiplier applied to all gold earned from defeating enemies. Increases through upgrades and gear.</p>
    </section>
  </div>
);

export default StatGuide;
