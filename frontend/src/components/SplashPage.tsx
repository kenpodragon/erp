import React from 'react';
import { Link } from 'react-router-dom';
import './Splash.css';

interface SplashPageProps {
  onLogin: () => void;
}

export const SplashPage: React.FC<SplashPageProps> = ({ onLogin }) => {
  return (
    <div className="splash">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="splash-hero">
        <div className="hero-particles" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 6}s`,
            }} />
          ))}
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-elysium">Elysium</span>
            <span className="title-rising">Rising</span>
          </h1>
          <p className="hero-tagline">
            In a world where forgotten gods stir and ancient towers pierce the heavens,
            one soul must ascend — or all will fall to darkness.
          </p>
          <button className="cta-button" onClick={onLogin}>
            Begin Your Ascent
          </button>
          <p className="hero-sub">Sign in with Google to start your journey</p>
        </div>

        <div className="hero-fade" />
      </section>

      {/* ── About the Game ───────────────────────────────────────────── */}
      <section className="splash-section" id="about">
        <h2 className="section-title">About the Game</h2>
        <div className="section-divider" />
        <div className="about-grid">
          <div className="about-card">
            <div className="about-icon">&#9876;</div>
            <h3>Incremental MMORPG</h3>
            <p>
              Build power through every click and strategic choice. Your character grows stronger
              even when you're away, accumulating Elysium Essence that fuels your ascent through
              the Towers.
            </p>
          </div>
          <div className="about-card">
            <div className="about-icon">&#9839;</div>
            <h3>Audio-Driven Narrative</h3>
            <p>
              Experience the <em>Towers of Elysium</em> trilogy through immersive audio narration.
              Every chapter you hear unlocks new battles, lore, and progression — the story
              literally powers your journey.
            </p>
          </div>
          <div className="about-card">
            <div className="about-icon">&#9733;</div>
            <h3>Competitive & Social</h3>
            <p>
              Climb global leaderboards, compete in chapter speedruns, and earn achievements.
              Chat with fellow ascenders, form rivalries, and prove you are the strongest
              soul in Elysium.
            </p>
          </div>
        </div>
      </section>

      {/* ── The Story ────────────────────────────────────────────────── */}
      <section className="splash-section splash-section-dark" id="story">
        <h2 className="section-title">The Story</h2>
        <div className="section-divider" />
        <div className="story-block">
          <p>
            The Towers appeared without warning — colossal spires of obsidian and light that
            shattered the sky and rewrote the laws of reality. From their depths, creatures of
            nightmare poured into a world unprepared for war. Civilizations crumbled. Heroes fell.
            The old gods went silent.
          </p>
          <p>
            But in the ruins, a prophecy endures: <em>"When the last Tower opens its gates,
            the Ascending One shall either claim the throne of Elysium or seal the doom of all
            worlds."</em> You are that soul. Your choices, your strength, and your courage will
            determine the fate of everything.
          </p>
          <p className="story-cta-text">
            Three books. Hundreds of chapters. One destiny. Will you rise?
          </p>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="splash-section" id="how">
        <h2 className="section-title">How It Works</h2>
        <div className="section-divider" />
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Click &amp; Conquer</h3>
            <p>Tap to generate Elysium Essence — the raw energy that fuels your character's growth. Unlock auto-clicker upgrades for passive power.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Listen &amp; Progress</h3>
            <p>Stream the Towers of Elysium audiobook as you play. Each chapter listened unlocks new story beats, enemies, and boss encounters.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Fight &amp; Ascend</h3>
            <p>Battle chapter bosses born from the book's darkest moments. Strengthen your character with loot, level-ups, and class abilities.</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Compete &amp; Dominate</h3>
            <p>Race through chapters on the leaderboards. Earn achievements. Prove you're the strongest soul to ever challenge the Towers.</p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="splash-section splash-cta-section">
        <h2 className="cta-headline">The Towers Await</h2>
        <p className="cta-sub">Create your character. Choose your class. Begin the ascent.</p>
        <button className="cta-button" onClick={onLogin}>
          Begin Your Ascent
        </button>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="splash-footer">
        <div className="footer-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <a href="mailto:support@elysiumrising.com">Contact Support</a>
        </div>
        <p className="footer-copy">&copy; {new Date().getFullYear()} Elysium Rising. All rights reserved.</p>
      </footer>
    </div>
  );
};
