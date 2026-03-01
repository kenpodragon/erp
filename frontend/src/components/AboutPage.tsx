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
            Elysium Rising is an incremental MMORPG set in the sci-fi cosmic horror universe of the
            <em> <a href='https://does-god-exist.org/towers-of-elysium/'>Towers of Elysium</a></em> book trilogy by Stephen Salaka. Unlike traditional
            browser games, Elysium Rising merges interactive gameplay with immersive audiobook
            narration — your progression through the story literally unlocks new game content,
            enemies, abilities, and lore.
          </p>
          <p>
            Every click generates Elysium Essence, the raw power that fuels your character's growth.
            Every chapter listened reveals new story beats and boss encounters. Every choice you make
            shapes your path through the layers of Etheris.
          </p>
        </section>

        <section className="page-section">
          <h2>The World</h2>
          <p>
            Reality is not what it seems. Etheris — the world you know — is a constructed prison,
            built to contain a cosmic parasite called Yaldabaoth. Beneath the surface of everyday life,
            the Eternal Engine hums, recycling souls through loops of memory and forgetting. NPCs walk
            among us. Resets erase what we've learned. The divine sparks within each soul are slowly consumed.
          </p>
          <p>
            But a resistance exists beyond the prison walls — cosmic beings fighting to free the trapped
            souls within. They need awakened warriors: those who can see through the simulation, remember
            who they truly are, and fight back against the system that keeps everyone asleep.
          </p>
        </section>

        <section className="page-section">
          <h2>Choose Your Path</h2>
          <div className="class-overview-grid">
            <div className="class-overview-card">
              <h3>The Engineer</h3>
              <p>Those who hear the Eternal Engine's rhythm and bend its mechanisms to their will. Engineers rebuild what the prison unmakes, constructing shields and weapons from the substrate's own architecture.</p>
            </div>
            <div className="class-overview-card">
              <h3>The Conduit</h3>
              <p>Channels of raw cosmic energy flowing from beyond the prison walls. Conduits manipulate reality itself, warping the Akashic Flow to unmake enemies and rewrite the rules of engagement.</p>
            </div>
            <div className="class-overview-card">
              <h3>The Drifter</h3>
              <p>Memory-walkers who navigate the spaces between realities. Drifters slip through cracks in Etheris, striking from impossible angles and vanishing before the system can register their presence.</p>
            </div>
            <div className="class-overview-card">
              <h3>The Vessel</h3>
              <p>Those who channel the remnant power of cosmic entities — fragments of the Thirteen, echoes of elder gods. Vessels wield divine fury and existential dread in equal measure.</p>
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

        <section className="page-section">
          <h2>Legal & Policy</h2>
          <p>Review our official documentation and agreements:</p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
            <Link to="/terms" className="nav-link" style={{ border: '1px solid #333', padding: '0.5rem 1rem', borderRadius: '4px' }}>Terms of Service</Link>
            <Link to="/privacy" className="nav-link" style={{ border: '1px solid #333', padding: '0.5rem 1rem', borderRadius: '4px' }}>Privacy Policy</Link>
            <Link to="/license" className="nav-link" style={{ border: '1px solid #333', padding: '0.5rem 1rem', borderRadius: '4px' }}>License</Link>
          </div>
        </section>

        <section className="page-section" style={{ textAlign: 'center' }}>
          <h2>Ready to Begin?</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            The prison is waiting. Choose your class. Name your character. Begin the awakening.
          </p>
          <Link to="/" className="btn-secondary">Enter the Tower</Link>
        </section>
      </div>
    </div>
  );
};
