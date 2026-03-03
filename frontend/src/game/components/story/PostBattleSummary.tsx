/**
 * PostBattleSummary — Modal shown when both narrative and waves are complete.
 *
 * Displays:
 *  - Gold earned this session (animated count-up)
 *  - Elysium Essence earned (delayed reveal)
 *  - Zones Cleared count
 *  - Two choices: Continue (Farm Mode) or Return to Hub
 */
import React, { useEffect, useState } from 'react';
import type { StorySession } from '../../GameContext';
import { formatGold, formatNumber } from '../../utils/numbers';
import { api } from '../../../api';
import './PostBattleSummary.css';

interface SummaryStats {
  session_gold: number;
  essence_earned: number;
  current_zone: number;
  dark_ritual_multiplier: number;
}

interface Props {
  session: StorySession;
  onContinue: () => void;
  onReturnToHub: () => void;
}

const PostBattleSummary: React.FC<Props> = ({ session, onContinue, onReturnToHub }) => {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [countGold, setCountGold] = useState(0);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    // Fetch server-calculated summary (doesn't close the session yet)
    const fetchSummary = async () => {
      setFetching(true);
      try {
        const res = await api.get(`/api/game/story/session/${session.sessionId}`);
        if (res.ok) {
          const data = await res.json();
          const goldVal = data.session_gold ?? session.sessionGold;
          setStats({
            session_gold: goldVal,
            essence_earned: data.essence_earned ?? Math.floor(session.sessionGold * 0.01),
            current_zone: data.current_zone ?? session.currentZone,
            dark_ritual_multiplier: data.dark_ritual_multiplier ?? session.darkRitualMultiplier,
          });
          
          // Animate gold count up
          const duration = 1000;
          const startTime = Date.now();
          const tick = () => {
            const now = Date.now();
            const progress = Math.min(1, (now - startTime) / duration);
            setCountGold(Math.floor(progress * goldVal));
            if (progress < 1) requestAnimationFrame(tick);
            else {
              setTimeout(() => setShowRewards(true), 300);
            }
          };
          requestAnimationFrame(tick);
        }
      } catch { 
        setShowRewards(true); 
      }
      setFetching(false);
    };

    fetchSummary();
  }, [session.sessionId, session.sessionGold, session.currentZone, session.darkRitualMultiplier]);

  const displayGold = stats?.session_gold ?? session.sessionGold;
  const displayEssence = stats?.essence_earned ?? Math.floor(session.sessionGold * 0.01);
  const displayZones = stats?.current_zone ?? session.currentZone;
  const displayDR = stats?.dark_ritual_multiplier ?? session.darkRitualMultiplier;

  return (
    <div className="post-battle-backdrop">
      <div className="post-battle-modal">
        <div className="post-battle-title">SCENE COMPLETE</div>

        <div className="post-battle-divider" />

        {fetching ? (
          <div className="post-battle-loading">Tallying rewards...</div>
        ) : (
          <div className="post-battle-stats">
            <div className="post-battle-stat">
              <span className="post-battle-stat-label">Gold Earned</span>
              <span className="post-battle-stat-value post-battle-stat-value--gold">
                ★ {formatGold(showRewards ? displayGold : countGold)}
              </span>
            </div>

            <div className={`post-battle-stat ${showRewards ? 'post-battle-reward--show' : 'post-battle-reward--hide'}`}>
              <span className="post-battle-stat-label">Elysium Essence</span>
              <span className="post-battle-stat-value post-battle-stat-value--essence">
                ◆ {formatNumber(displayEssence)}
              </span>
            </div>

            <div className={`post-battle-stat ${showRewards ? 'post-battle-reward--show' : 'post-battle-reward--hide'}`}>
              <span className="post-battle-stat-label">Zones Cleared</span>
              <span className="post-battle-stat-value">{displayZones}</span>
            </div>

            {displayDR > 1.0 && showRewards && (
              <div className="post-battle-stat post-battle-stat--ritual post-battle-reward--show">
                <span className="post-battle-stat-label">Dark Ritual</span>
                <span className="post-battle-stat-value post-battle-stat-value--ritual">
                  ×{displayDR.toFixed(3)} Chapter Buff
                </span>
              </div>
            )}
          </div>
        )}

        <div className="post-battle-divider" />

        <div className={`post-battle-actions ${showRewards ? 'post-battle-reward--show' : 'post-battle-reward--hide'}`}>
          <button
            className="post-battle-btn post-battle-btn--continue"
            onClick={onContinue}
            title="Stay and keep farming gold. Session remains open."
          >
            &#9654; Continue (Farm Mode)
          </button>
          <button
            className="post-battle-btn post-battle-btn--hub"
            onClick={onReturnToHub}
            title="Claim Essence and return to the hub. Session closes."
          >
            &#8962; Return to Hub
          </button>
        </div>

        <div className="post-battle-hint">
          Farm Mode: keep earning gold without advancing the story.
        </div>
      </div>
    </div>
  );
};

export default PostBattleSummary;
