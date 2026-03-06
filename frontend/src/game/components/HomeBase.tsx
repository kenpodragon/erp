import React, { useState, useEffect } from 'react';
import './HomeBase.css';
import { api } from '../../api';
import InventoryPanel from './InventoryPanel';

interface HomeBaseProps {
  player: any;
  character: any;
}

const HomeBase: React.FC<HomeBaseProps> = ({ player, character }) => {
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);
  const [leaderboardType, setLeaderboardType] = useState('progression');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const [artRes, journalRes, rankRes] = await Promise.all([
          api.get('/api/game/artifacts'),
          api.get('/api/game/journal'),
          api.get(`/api/game/leaderboards?type=${leaderboardType}`)
        ]);

        if (artRes.ok) setArtifacts(await artRes.json());
        if (journalRes.ok) setJournal(await journalRes.json());
        if (rankRes.ok) setRankings(await rankRes.json());
      } catch (err) {
        console.error('Failed to fetch home base data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (character) fetchHomeData();
  }, [character, leaderboardType]);

  if (loading) return <div className="placeholder-view">Syncing with Central Intelligence...</div>;

  return (
    <div className="home-base-container">
      <header className="home-base-header">
        <h1>Home Base</h1>
        <p className="subtitle">Central Intelligence & Character Hub</p>
      </header>

      <div className="home-base-grid">
        {/* ── Section 1: The Akashic Log (Journal) ────────────────────── */}
        <section className="home-base-section terminal-log">
          <div className="section-header">
            <span className="terminal-icon">📟</span>
            <h2>The Akashic Log</h2>
          </div>
          <div className="terminal-screen">
            {journal.length === 0 ? (
              <div className="log-entry pending">
                <span className="log-text">No data stabilized. Complete scenes to uncover lore.</span>
              </div>
            ) : (
              journal.map((entry, idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-timestamp">[{entry.location}]</span>
                  <span className="log-text">{entry.title}: {entry.summary || 'Data corrupted.'}</span>
                </div>
              ))
            )}
            <div className="terminal-cursor" />
          </div>
        </section>

        {/* ── Section 2: Artifact Gallery ────────────────────────────── */}
        <section className="home-base-section artifacts-gallery">
          <div className="section-header">
            <span className="gallery-icon">🏺</span>
            <h2>Artifact Gallery</h2>
          </div>
          <div className="artifact-grid">
            {artifacts.map(art => (
              <div 
                key={art.id} 
                className={`artifact-slot ${art.unlocked ? 'collected' : 'missing'} ${art.rarity}`}
                onClick={() => art.unlocked && setSelectedArtifact(art)}
              >
                <div className="artifact-icon-placeholder" />
                <span className="artifact-name">{art.name}</span>
              </div>
            ))}
          </div>
          {selectedArtifact && (
            <div className="artifact-detail-overlay" onClick={() => setSelectedArtifact(null)}>
              <div className="artifact-card" onClick={e => e.stopPropagation()}>
                <h3>{selectedArtifact.name}</h3>
                <span className={`rarity-tag ${selectedArtifact.rarity}`}>{selectedArtifact.rarity}</span>
                <p className="lore-text">{selectedArtifact.lore_text || selectedArtifact.description}</p>
                <button className="btn-close" onClick={() => setSelectedArtifact(null)}>Close</button>
              </div>
            </div>
          )}
        </section>

        {/* ── Section 3: Tower Rankings (Leaderboard) ────────────────── */}
        <section className="home-base-section rankings">
          <div className="section-header">
            <span className="rank-icon">🏆</span>
            <h2>Tower Rankings</h2>
          </div>
          <div className="ranking-tabs">
            <button className={leaderboardType === 'progression' ? 'active' : ''} onClick={() => setLeaderboardType('progression')}>Progression</button>
            <button className={leaderboardType === 'essence' ? 'active' : ''} onClick={() => setLeaderboardType('essence')}>Essence</button>
          </div>
          <div className="ranking-list">
            {rankings.map((r, idx) => (
              <div key={idx} className={`ranking-row ${r.name === character?.character_name ? 'self' : ''}`}>
                <span className="rank-num">#{idx + 1}</span>
                <span className="rank-name">{r.name}</span>
                <span className="rank-value">{r.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Inventory ────────────────────────────────── */}
        <section className="home-base-section inventory-section">
          <div className="section-header">
            <h2>Equipment</h2>
          </div>
          <InventoryPanel />
        </section>

        {/* ── Section 5: System Actions ─────────────────────────────── */}
        <section className="home-base-section system-actions">
          <div className="section-header">
            <span className="system-icon">🛠️</span>
            <h2>System Controls</h2>
          </div>
          <div className="action-buttons">
            <button className="btn-secondary danger" onClick={async () => {
              if (window.confirm('WARNING: This will clear ALL progress. This action is permanent. Continue?')) {
                const res = await api.post('/api/players/me/reset');
                if (res.ok) window.location.reload();
              }
            }}>
              Wipe Character Data (Reset Progress)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
export default HomeBase;
