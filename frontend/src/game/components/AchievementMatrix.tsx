import React, { useState, useEffect, useMemo } from 'react';
import './AchievementMatrix.css';
import { api } from '../../api';

// ── Types ──────────────────────────────────────────────────────────────────

interface AchievementEntry {
  id: number;
  name: string;
  description: string;
  category: string;
  icon_sprite_key: string;
  tracking_type: string;
  threshold_value: number;
  parent_achievement_id: number | null;
  reward_shards: number;
  reward_essence: number;
  reward_title_id: number | null;
  sort_order: number;
  is_completed: boolean;
  is_new: boolean;
  progress_value: number;
  earned_at: string | null;
}

interface CategoryCount {
  total: number;
  completed: number;
}

interface AchievementData {
  achievements: AchievementEntry[];
  total: number;
  total_completed: number;
  category_counts: Record<string, CategoryCount>;
}

const CATEGORY_LABELS: Record<string, string> = {
  combat: 'Combat',
  narrative: 'Narrative',
  economics: 'Economics',
  idle: 'Idle',
  discovery: 'Discovery',
};

const CATEGORY_ORDER = ['combat', 'narrative', 'economics', 'idle', 'discovery'];

// ── Component ──────────────────────────────────────────────────────────────

const AchievementMatrix: React.FC = () => {
  const [data, setData] = useState<AchievementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/game/home-base/achievements');
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        setData(json);

        // Mark visited
        api.post('/api/game/home-base/achievements/mark-visited');
      } catch {
        setError('Failed to load achievement data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredAchievements = useMemo(() => {
    if (!data) return [];
    let list = [...data.achievements];
    if (activeCategory !== 'all') {
      list = list.filter(a => a.category === activeCategory);
    }
    // Sort: completed last, then by sort_order
    list.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return a.sort_order - b.sort_order;
    });
    return list;
  }, [data, activeCategory]);

  const activeCounts = useMemo(() => {
    if (!data || activeCategory === 'all') return null;
    return data.category_counts[activeCategory] || { total: 0, completed: 0 };
  }, [data, activeCategory]);

  const activePct = useMemo(() => {
    if (!activeCounts || activeCounts.total === 0) return 0;
    return Math.round((activeCounts.completed / activeCounts.total) * 100);
  }, [activeCounts]);

  if (loading) return <div className="am-loading">Scanning achievement archive...</div>;
  if (error || !data) return <div className="am-error">{error || 'No data.'}</div>;

  const newCount = data.achievements.filter(a => a.is_new).length;

  // Determine available categories from data
  const availableCategories = CATEGORY_ORDER.filter(
    cat => data.category_counts[cat]
  );

  return (
    <div className="achievement-matrix">
      {/* Header */}
      <div className="am-header">
        <h2 className="am-title">Achievement Matrix</h2>
        <div className="am-summary">
          <span className="am-summary-count">{data.total_completed}</span> / {data.total} completed
          {newCount > 0 && <span className="am-new-count">{newCount} new</span>}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="am-tabs">
        <button
          className={`am-tab ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
          <span className="am-tab-count">
            {data.total_completed}/{data.total}
          </span>
        </button>
        {availableCategories.map(cat => {
          const counts = data.category_counts[cat];
          return (
            <button
              key={cat}
              className={`am-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat] || cat}
              <span className="am-tab-count">
                {counts.completed}/{counts.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category progress bar */}
      {activeCounts && (
        <div className="am-category-progress">
          <div className="am-cat-bar">
            <div className="am-cat-fill" style={{ width: `${activePct}%` }} />
          </div>
          <span className="am-cat-pct">{activePct}%</span>
        </div>
      )}

      {/* Achievement Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="am-empty">No achievements in this category.</div>
      ) : (
        <div className="am-grid">
          {filteredAchievements.map(ach => {
            const progressPct = ach.threshold_value > 0
              ? Math.min(100, (ach.progress_value / ach.threshold_value) * 100)
              : 0;
            const hasRewards = ach.reward_shards > 0 || ach.reward_essence > 0 || ach.reward_title_id;

            return (
              <div
                key={ach.id}
                className={`am-card ${ach.is_completed ? 'completed' : ''} ${
                  ach.parent_achievement_id && !ach.is_completed && ach.progress_value === 0
                    ? 'locked'
                    : ''
                }`}
              >
                <div className="am-card-icon" />
                <div className="am-card-body">
                  <span className="am-card-name">{ach.name}</span>
                  <span className="am-card-desc">{ach.description}</span>

                  {/* Progress bar */}
                  {!ach.is_completed && (
                    <div className="am-progress-wrap">
                      <div className="am-progress-bar">
                        <div
                          className="am-progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="am-progress-text">
                        {Math.round(ach.progress_value)}/{Math.round(ach.threshold_value)}
                      </span>
                    </div>
                  )}

                  {ach.is_completed && (
                    <div className="am-progress-wrap">
                      <div className="am-progress-bar">
                        <div className="am-progress-fill" style={{ width: '100%' }} />
                      </div>
                      <span className="am-progress-text">Complete</span>
                    </div>
                  )}

                  {/* Rewards */}
                  {hasRewards && (
                    <div className="am-rewards">
                      {ach.reward_shards > 0 && (
                        <span className="am-reward shards">{ach.reward_shards} Shards</span>
                      )}
                      {ach.reward_essence > 0 && (
                        <span className="am-reward essence">{ach.reward_essence} Essence</span>
                      )}
                      {ach.reward_title_id && (
                        <span className="am-reward title">Title</span>
                      )}
                    </div>
                  )}

                  {/* Earned date */}
                  {ach.earned_at && (
                    <span className="am-earned-date">
                      Earned {new Date(ach.earned_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {ach.is_new && <span className="am-new-badge">NEW</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AchievementMatrix;
