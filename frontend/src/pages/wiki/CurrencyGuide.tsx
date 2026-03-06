import React from 'react';
import './Wiki.css';

const CurrencyGuide: React.FC = () => (
  <div className="wiki-page">
    <h1>Currency Guide</h1>
    <section>
      <h2>Gold</h2>
      <p>Gold is the primary session currency earned by defeating enemies in Story Mode. It is used to purchase temporary session upgrades that boost your power during a scene.</p>
      <p>Gold resets when you leave a scene. Spend it freely to maximize your combat effectiveness within each run.</p>
    </section>
    <section>
      <h2>Essence</h2>
      <p>Essence is the permanent progression currency earned by completing scenes. It persists across sessions and is used for permanent character upgrades.</p>
      <h3>Earning Essence</h3>
      <p>You earn Essence upon completing a scene for the first time. Replaying scenes may yield reduced Essence rewards.</p>
      <h3>Spending Essence</h3>
      <p>Essence can be spent on permanent stat increases, skill unlocks, and other character progression systems.</p>
    </section>
    <section>
      <h2>Premium Currency</h2>
      <p>Premium currency can be purchased through the in-game shop. It is used for cosmetic items, convenience features, and other optional enhancements that do not affect competitive balance.</p>
    </section>
  </div>
);

export default CurrencyGuide;
