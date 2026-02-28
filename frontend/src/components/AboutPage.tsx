import React from 'react';
import { Link } from 'react-router-dom';
import './Pages.css';

export const AboutPage: React.FC = () => {
  return (
    <div className="page">
      <div className="page-hero">
        <h1 className="page-title">About Elysium Rising</h1>
        <p className="page-subtitle">A new breed of browser-based MMORPG</p>
      </div>

      <div className="page-content">
        <section className="page-section">
          <h2>What Is Elysium Rising?</h2>
          <p>
            Elysium Rising is an incremental MMORPG set in the dark fantasy universe of the
            <em> Towers of Elysium</em> book trilogy by Stephen Salaka. Unlike traditional
            browser games, Elysium Rising merges interactive gameplay with immersive audiobook
            narration — your progression through the story literally unlocks new game content,
            enemies, abilities, and lore.
          </p>
          <p>
            Every click generates Elysium Essence, the raw power that fuels your character's growth.
            Every chapter listened reveals new story beats and boss encounters. Every choice you make
            shapes your path through the Towers.
          </p>
        </section>

        <section className="page-section">
          <h2>The World</h2>
          <p>
            In a shattered reality where colossal towers of obsidian pierce the sky, ancient gods
            have fallen silent and creatures of nightmare roam unchecked. The Towers appeared without
            warning, rewriting the laws of physics and magic alike. Entire civilizations crumbled
            in their shadow.
          </p>
          <p>
            But within the chaos, a prophecy endures. An Ascending One will rise — a soul strong
            enough to climb the Towers, face the horrors within, and either claim the throne of
            Elysium or seal the doom of all worlds. That soul is you.
          </p>
        </section>

        <section className="page-section">
          <h2>Choose Your Path</h2>
          <div className="class-overview-grid">
            <div className="class-overview-card">
              <h3>The Sentinel</h3>
              <p>Unyielding guardians forged in the crucible of the First Tower. Masters of defense and raw strength, Sentinels stand between the darkness and those they protect.</p>
            </div>
            <div className="class-overview-card">
              <h3>The Arcanist</h3>
              <p>Wielders of the forbidden energies that bleed from the Towers themselves. Their intellect is their weapon, bending reality with arcane formulas that would shatter lesser minds.</p>
            </div>
            <div className="class-overview-card">
              <h3>The Wanderer</h3>
              <p>Swift shadows who learned to survive in the ruins between Towers. Wanderers strike with precision and vanish before retaliation, turning the chaos of battle to their advantage.</p>
            </div>
            <div className="class-overview-card">
              <h3>The Invoker</h3>
              <p>Channelers of the old gods' fading power. While others fight with steel and sorcery, Invokers call upon divine echoes — healing allies and smiting enemies with righteous fury.</p>
            </div>
          </div>
        </section>

        <section className="page-section">
          <h2>Features</h2>
          <ul className="feature-list">
            <li><strong>Narrative-Driven Progression</strong> — Every chapter of the Towers of Elysium books maps to in-game levels, enemies, and story beats.</li>
            <li><strong>Incremental Mechanics</strong> — Click to generate Essence, unlock auto-clicker upgrades, and watch your power grow even while offline.</li>
            <li><strong>Immersive Audio</strong> — Stream the audiobook as you play. The narration syncs with your gameplay progression.</li>
            <li><strong>Competitive Leaderboards</strong> — Race other players through chapters, compete for speedrun records, and climb global rankings.</li>
            <li><strong>Achievements &amp; Collections</strong> — Unlock lore entries, rare items, and character milestones as you ascend.</li>
            <li><strong>Free to Play</strong> — Jump in and start your ascent at no cost. Premium options are cosmetic and convenience only.</li>
          </ul>
        </section>

        <section className="page-section" style={{ textAlign: 'center' }}>
          <h2>Ready to Begin?</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            The Towers are waiting. Choose your class. Name your hero. Begin the ascent.
          </p>
          <Link to="/" className="page-cta-link">Return to Home</Link>
        </section>
      </div>
    </div>
  );
};
