import React from 'react';
import './Wiki.css';

const HowToPlay: React.FC = () => (
  <div className="wiki-page">
    <h1>How to Play</h1>
    <section>
      <h2>Getting Started</h2>
      <p>Welcome to Elysium Rising! You are a Vessel — a soul bound to the Towers of Elysium. Your journey begins at the Hub, where you can navigate to different areas of the game.</p>
      <h3>The Hub</h3>
      <p>The Hub is your central navigation point. Use the sidebar tabs to access different game systems: Map, Skills, Home Base, Shop, Chat, and Leaderboard.</p>
      <h3>Story Mode</h3>
      <p>Click on a scene node on the Map to enter Story Mode. Here you'll battle enemies through click combat while the narrative unfolds. Defeat all waves and complete the narrative to clear a scene.</p>
    </section>
    <section>
      <h2>Core Loop</h2>
      <p>1. Enter a scene from the Map</p>
      <p>2. Click to deal damage and defeat enemies</p>
      <p>3. Earn gold to buy session upgrades</p>
      <p>4. Complete the scene to earn Essence</p>
      <p>5. Use Essence for permanent progression</p>
    </section>
  </div>
);

export default HowToPlay;
