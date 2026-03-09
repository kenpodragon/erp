import React, { useState, useEffect, useCallback } from 'react';
import './HallOfEchoes.css';
import { api } from '../../api';

// ── Types ──────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  player_id: number;
  player_alias: string;
  character_class: string | null;
  character_level: number | null;
  equipped_title: string | null;
  metric_value: number;
  badge_tier: string | null;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  per_page: number;
  player_rank: LeaderboardEntry | null;
}

interface SkillMilestone {
  skill_id: number;
  skill_name: string;
  level: number;
}

type Category = 'vanguard' | 'alchemist' | 'swift' | 'scholar';
type ViewMode = 'leaderboard' | 'milestones';

const CATEGORIES: { key: Category; label: string; desc: string }[] = [
  { key: 'vanguard', label: 'Vanguard', desc: 'Furthest narrative progression' },
  { key: 'alchemist', label: 'Alchemist', desc: 'Most essence earned' },
  { key: 'swift', label: 'Swift', desc: 'Fastest boss clear times' },
  { key: 'scholar', label: 'Scholar', desc: 'Most lore entries unlocked' },
];

const MILESTONE_THRESHOLDS = [25, 50, 75, 99];
const MILESTONE_REWARDS = [100, 500, 2000, 10000];

const PER_PAGE = 25;

// ── Metric Formatting ──────────────────────────────────────────────────────

function formatMetric(value: number, category: Category): string {
  if (category === 'vanguard') {
    const book = Math.floor(value / 10000);
    const chapter = Math.floor((value % 10000) / 100);
    const scene = value % 100;
    return `B${book} Ch${chapter} S${scene}`;
  }
  if (category === 'alchemist') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return Math.round(value).toLocaleString();
  }
  if (category === 'swift') {
    const m = Math.floor(value / 60);
    const s = value % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  return value.toLocaleString();
}

// ── Component ──────────────────────────────────────────────────────────────

interface HallOfEchoesProps {
  currentPlayerId?: number;
}

const HallOfEchoes: React.FC<HallOfEchoesProps> = ({ currentPlayerId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('leaderboard');
  const [category, setCategory] = useState<Category>('vanguard');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestoneSkills, setMilestoneSkills] = useState<SkillMilestone[]>([]);
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  const fetchData = useCallback(async (cat: Category, pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/api/game/home-base/leaderboard/${cat}?page=${pg}&per_page=${PER_PAGE}`
      );
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch {
      setError('Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMilestones = useCallback(async () => {
    setMilestoneLoading(true);
    try {
      const res = await api.get('/api/game/training/skills');
      if (res.ok) {
        const body = await res.json();
        setMilestoneSkills(
          (body.skills || []).map((s: any) => ({
            skill_id: s.skill_id,
            skill_name: s.skill_name,
            level: s.level,
          }))
        );
      }
    } catch {
      // Silently fail — milestones are optional
    } finally {
      setMilestoneLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'leaderboard') {
      fetchData(category, page);
    } else {
      fetchMilestones();
    }
  }, [viewMode, category, page, fetchData, fetchMilestones]);

  const switchCategory = (cat: Category) => {
    setCategory(cat);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / PER_PAGE) : 0;
  const catInfo = CATEGORIES.find(c => c.key === category);

  // Check if player rank is visible in current page
  const playerInPage = data?.entries.some(e => e.player_id === currentPlayerId);

  return (
    <div className="hall-of-echoes">
      <div className="hoe-header">
        <h2 className="hoe-title">Hall of Echoes</h2>
      </div>

      {/* View Tabs */}
      <div className="hoe-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`hoe-tab ${viewMode === 'leaderboard' && category === cat.key ? 'active' : ''}`}
            onClick={() => { setViewMode('leaderboard'); switchCategory(cat.key); }}
          >
            {cat.label}
          </button>
        ))}
        <button
          className={`hoe-tab ${viewMode === 'milestones' ? 'active' : ''}`}
          onClick={() => setViewMode('milestones')}
        >
          Milestones
        </button>
      </div>

      {viewMode === 'leaderboard' && (
        <>
          {catInfo && <div className="hoe-category-desc">{catInfo.desc}</div>}

          {/* Content */}
          {loading && <div className="hoe-loading">Synchronizing tower records...</div>}
          {error && <div className="hoe-error">{error}</div>}

          {!loading && !error && data && (
            <>
              {data.entries.length === 0 ? (
                <div className="hoe-empty">No rankings recorded yet.</div>
              ) : (
                <div className="hoe-table">
                  {data.entries.map(entry => (
                    <div
                      key={entry.rank}
                      className={`hoe-row ${entry.player_id === currentPlayerId ? 'self' : ''}`}
                    >
                      <span className="hoe-rank">#{entry.rank}</span>
                      <span className={`hoe-badge ${entry.badge_tier || 'none'}`} />
                      <div className="hoe-player-info">
                        <span className="hoe-alias">{entry.player_alias}</span>
                        <span className="hoe-subtitle">
                          {entry.character_class || 'Unknown'}
                          {entry.equipped_title && (
                            <> &middot; <span className="hoe-title-badge">{entry.equipped_title}</span></>
                          )}
                        </span>
                      </div>
                      <span className="hoe-level">Lv.{entry.character_level || 1}</span>
                      <span className="hoe-metric">
                        {formatMetric(entry.metric_value, category)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Player's own rank if not on current page */}
              {!playerInPage && data.player_rank && (
                <div className="hoe-own-rank">
                  <div className="hoe-own-label">Your Rank</div>
                  <div className="hoe-row self">
                    <span className="hoe-rank">#{data.player_rank.rank}</span>
                    <span className={`hoe-badge ${data.player_rank.badge_tier || 'none'}`} />
                    <div className="hoe-player-info">
                      <span className="hoe-alias">{data.player_rank.player_alias}</span>
                      <span className="hoe-subtitle">
                        {data.player_rank.character_class || 'Unknown'}
                      </span>
                    </div>
                    <span className="hoe-level">Lv.{data.player_rank.character_level || 1}</span>
                    <span className="hoe-metric">
                      {formatMetric(data.player_rank.metric_value, category)}
                    </span>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="hoe-pagination">
                  <button
                    className="hoe-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Prev
                  </button>
                  <span className="hoe-page-info">Page {page} of {totalPages}</span>
                  <button
                    className="hoe-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {viewMode === 'milestones' && (
        <>
          <div className="hoe-category-desc">Idle skill level milestones — earn Essence rewards at each tier</div>
          {milestoneLoading ? (
            <div className="hoe-loading">Loading milestones...</div>
          ) : milestoneSkills.length === 0 ? (
            <div className="hoe-empty">No idle skills available yet.</div>
          ) : (
            <div className="hoe-milestone-grid">
              {/* Header row */}
              <div className="hoe-ms-header-cell">Skill</div>
              {MILESTONE_THRESHOLDS.map((t, i) => (
                <div key={t} className="hoe-ms-header-cell">
                  Lv.{t}
                  <span className="hoe-ms-reward">{MILESTONE_REWARDS[i]} Ess</span>
                </div>
              ))}

              {/* Skill rows */}
              {milestoneSkills.map(skill => (
                <React.Fragment key={skill.skill_id}>
                  <div className="hoe-ms-skill-name">{skill.skill_name}</div>
                  {MILESTONE_THRESHOLDS.map(threshold => {
                    const completed = skill.level >= threshold;
                    const pct = Math.min(100, Math.round((skill.level / threshold) * 100));
                    return (
                      <div
                        key={threshold}
                        className={`hoe-ms-cell ${completed ? 'hoe-ms-complete' : ''}`}
                      >
                        {completed ? (
                          <span className="hoe-ms-check">&#10003;</span>
                        ) : (
                          <span className="hoe-ms-progress">{pct}%</span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HallOfEchoes;
