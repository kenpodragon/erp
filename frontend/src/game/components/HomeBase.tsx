import React, { useState, useEffect } from 'react';
import './HomeBase.css';
import { api } from '../../api';
import AkashicLog from './AkashicLog';
import RelicGallery from './RelicGallery';
import HallOfEchoes from './HallOfEchoes';
import AchievementMatrix from './AchievementMatrix';
import EthericRegistry from './story/EthericRegistry';
import DiscoveryLibrary from './story/DiscoveryLibrary';

interface HomeBaseProps {
  player: any;
  character: any;
}

interface HubBadges {
  akashic_log: number;
  relic_gallery: number;
  achievements: number;
  total: number;
}

interface HubProgress {
  achievements: { completed: number; total: number };
  curated_artifacts: { owned: number; total: number };
  total_artifacts: number;
}

type HubTab = 'akashic' | 'relics' | 'echoes' | 'achievements' | 'registry' | 'discovery';

const TAB_CONFIG: { id: HubTab; label: string; badgeKey?: keyof HubBadges }[] = [
  { id: 'akashic', label: 'Akashic Log', badgeKey: 'akashic_log' },
  { id: 'relics', label: 'Relic Gallery', badgeKey: 'relic_gallery' },
  { id: 'echoes', label: 'Hall of Echoes' },
  { id: 'achievements', label: 'Achievements', badgeKey: 'achievements' },
  { id: 'registry', label: 'Etheric Registry' },
  { id: 'discovery', label: 'Discovery Library' },
];

const HomeBase: React.FC<HomeBaseProps> = ({ player, character }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HubTab>('akashic');
  const [badges, setBadges] = useState<HubBadges>({ akashic_log: 0, relic_gallery: 0, achievements: 0, total: 0 });
  const [hubProgress, setHubProgress] = useState<HubProgress | null>(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/game/home-base/summary');
        if (res.ok) {
          const summary = await res.json();
          setBadges(summary.badges);
          setHubProgress(summary.progress);
        }
      } catch (err) {
        console.error('Failed to fetch home base data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (character) fetchHomeData();
  }, [character]);

  if (loading) return <div className="placeholder-view">Syncing with Central Intelligence...</div>;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'akashic':
        return <AkashicLog />;
      case 'relics':
        return <RelicGallery />;
      case 'echoes':
        return <HallOfEchoes currentPlayerId={player?.id} />;
      case 'achievements':
        return <AchievementMatrix />;
      case 'registry':
        return <EthericRegistry />;
      case 'discovery':
        return <DiscoveryLibrary />;
    }
  };

  return (
    <div className="home-base-container hb-terminal">
      <header className="home-base-header">
        <div className="hb-header-row">
          <h1>Home Base</h1>
          {badges.total > 0 && (
            <span className="hb-badge-total">{badges.total} new</span>
          )}
        </div>
        <p className="subtitle">Central Intelligence & Character Hub</p>
        {hubProgress && (
          <div className="hb-progress-bar-row">
            <span className="hb-progress-label">
              Achievements {hubProgress.achievements.completed}/{hubProgress.achievements.total}
            </span>
            <span className="hb-progress-sep">|</span>
            <span className="hb-progress-label">
              Relics {hubProgress.curated_artifacts.owned}/{hubProgress.curated_artifacts.total}
            </span>
          </div>
        )}
      </header>

      <nav className="hb-tab-bar">
        {TAB_CONFIG.map(tab => {
          const badge = tab.badgeKey ? badges[tab.badgeKey] : 0;
          return (
            <button
              key={tab.id}
              className={`hb-tab ${activeTab === tab.id ? 'hb-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {typeof badge === 'number' && badge > 0 && (
                <span className="hb-tab-badge">{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hb-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};
export default HomeBase;
