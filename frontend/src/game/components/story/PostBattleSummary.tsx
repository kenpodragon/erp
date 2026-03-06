/**
 * PostBattleSummary — Modal shown when both narrative and waves are complete.
 *
 * Displays:
 *  - Gold earned this session (animated count-up)
 *  - Elysium Essence earned (delayed reveal)
 *  - Zones Cleared count
 *  - Achievement results with dice animation
 *  - Dropped items with keep/dismiss actions
 *  - Two choices: Continue (Farm Mode) or Return to Hub
 */
import React, { useEffect, useState, useCallback } from 'react';
import type { StorySession } from '../../GameContext';
import { formatGold, formatNumber } from '../../utils/numbers';
import { api } from '../../../api';
import ItemCard from './ItemCard';
import type { ItemData } from './ItemCard';
import InventoryReplaceModal from './InventoryReplaceModal';
import './PostBattleSummary.css';

interface SummaryStats {
  session_gold: number;
  essence_earned: number;
  converted_essence: number;
  total_character_essence: number;
  current_zone: number;
  dark_ritual_multiplier: number;
}

interface AchievementResult {
  achievement_id: string;
  display: string;
  met: boolean;
  rolled: boolean;
}

interface DroppedItem {
  item_id: number;
  name: string;
  rarity: string;
  item_type: string;
  base_stats: Record<string, number>;
  item_code: string;
  item_level: number;
  min_char_level: number;
  stat_requirements: Record<string, number>;
  gear_slot_id: number;
}

interface Props {
  session: StorySession;
  onContinue: () => void;
  onReturnToHub: (completeData?: any) => void;
  playSFX?: (key: string, opts?: { pan?: number }) => void;
  reduceMotion?: boolean;
}

const PostBattleSummary: React.FC<Props> = ({ session, onContinue, onReturnToHub, playSFX, reduceMotion = false }) => {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [countGold, setCountGold] = useState(0);
  const [showRewards, setShowRewards] = useState(false);

  // Loot state
  const [completing, setCompleting] = useState(false);
  const [completeData, setCompleteData] = useState<any>(null);
  const [achievements, setAchievements] = useState<AchievementResult[]>([]);
  const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);
  const [showLoot, setShowLoot] = useState(false);
  const [dicePhase, setDicePhase] = useState<'idle' | 'rolling' | 'done'>('idle');
  const [currentAchIdx, setCurrentAchIdx] = useState(-1);
  const [keptItems, setKeptItems] = useState<Set<number>>(new Set());
  const [dismissedItems, setDismissedItems] = useState<Set<number>>(new Set());
  const [replaceState, setReplaceState] = useState<{ item: ItemData; storedItems: ItemData[] } | null>(null);

  useEffect(() => {
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
            converted_essence: data.converted_essence ?? 0,
            total_character_essence: data.total_character_essence ?? 0,
            current_zone: data.current_zone ?? session.currentZone,
            dark_ritual_multiplier: data.dark_ritual_multiplier ?? session.darkRitualMultiplier,
          });

          if (reduceMotion) {
            // Instant reveal when reduce motion is active
            setCountGold(goldVal);
            setShowRewards(true);
          } else {
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
        }
      } catch {
        setShowRewards(true);
      }
      setFetching(false);
    };

    fetchSummary();
  }, [session.sessionId, session.sessionGold, session.currentZone, session.darkRitualMultiplier]);

  const handleReturnToHub = useCallback(async () => {
    setCompleting(true);
    try {
      const res = await api.post(`/api/game/story/session/${session.sessionId}/complete`);
      if (res.ok) {
        const data = await res.json();
        setCompleteData(data);

        const achs = data.achievement_results || [];
        const drops = data.dropped_items || [];
        setAchievements(achs);
        setDroppedItems(drops);

        if (achs.length > 0) {
          setShowLoot(true);
          setDicePhase('rolling');
          // Animate through achievements sequentially
          for (let i = 0; i < achs.length; i++) {
            await new Promise(r => setTimeout(r, 800));
            setCurrentAchIdx(i);
            if (achs[i].met && achs[i].rolled) {
              playSFX?.('sfx_item_drop');
            }
          }
          await new Promise(r => setTimeout(r, 600));
          setDicePhase('done');
          if (drops.length > 0) playSFX?.('sfx_achievement');
        } else {
          // No achievements configured — skip loot phase
          onReturnToHub(data);
        }
      } else {
        onReturnToHub();
      }
    } catch {
      onReturnToHub();
    } finally {
      setCompleting(false);
    }
  }, [session.sessionId, onReturnToHub]);

  const handleKeepItem = async (itemId: number) => {
    try {
      const res = await api.post('/api/game/inventory/keep-drop', { item_id: itemId });
      if (res.ok) {
        setKeptItems(prev => new Set(prev).add(itemId));
      } else if (res.status === 409) {
        // Bag full — show replacement UI
        const err = await res.json();
        const detail = err.detail;
        const drop = droppedItems.find(d => d.item_id === itemId);
        if (drop && detail?.stored_items) {
          const dropAsItem: ItemData = {
            item_id: drop.item_id,
            name: drop.name,
            rarity: drop.rarity,
            item_type: drop.item_type,
            base_stats: drop.base_stats,
            item_code: drop.item_code,
            item_level: drop.item_level,
            min_char_level: drop.min_char_level,
            stat_requirements: drop.stat_requirements,
            gear_slot_id: drop.gear_slot_id,
          };
          setReplaceState({ item: dropAsItem, storedItems: detail.stored_items });
        }
      } else {
        const err = await res.json();
        alert(typeof err.detail === 'string' ? err.detail : err.detail?.message || 'Failed to keep item');
      }
    } catch { /* ignore */ }
  };

  const handleDismissItem = async (itemId: number) => {
    try {
      await api.post('/api/game/inventory/dismiss-drop', { item_id: itemId });
      setDismissedItems(prev => new Set(prev).add(itemId));
    } catch { /* ignore */ }
  };

  const allItemsHandled = droppedItems.length > 0 &&
    droppedItems.every(d => keptItems.has(d.item_id) || dismissedItems.has(d.item_id));

  const handleFinishLoot = () => {
    onReturnToHub(completeData);
  };

  const displayGold = stats?.session_gold ?? session.sessionGold;
  const displayEssence = stats?.essence_earned ?? Math.floor(session.sessionGold * 0.01);
  const displayConverted = stats?.converted_essence ?? 0;
  const displayZones = stats?.current_zone ?? session.currentZone;
  const displayDR = stats?.dark_ritual_multiplier ?? session.darkRitualMultiplier;

  // Loot phase view
  if (showLoot) {
    return (
      <div className="post-battle-backdrop">
        <div className="post-battle-modal post-battle-modal--loot">
          <div className="post-battle-title">DREAM FORGE</div>
          <div className="post-battle-divider" />

          {/* Achievement dice results */}
          <div className="loot-achievements">
            {achievements.map((ach, idx) => {
              const revealed = idx <= currentAchIdx;
              const rolling = dicePhase === 'rolling' && idx === currentAchIdx;
              return (
                <div
                  key={ach.achievement_id || idx}
                  className={`loot-ach-row ${revealed ? 'loot-ach--revealed' : 'loot-ach--hidden'} ${rolling ? 'loot-ach--rolling' : ''}`}
                >
                  <span className="loot-ach-display">{ach.display || `Challenge ${idx + 1}`}</span>
                  {revealed && (
                    <span className={`loot-ach-result ${ach.met ? (ach.rolled ? 'loot-ach--success' : 'loot-ach--miss') : 'loot-ach--fail'}`}>
                      {ach.met ? (ach.rolled ? 'DROP!' : 'No drop') : 'Not met'}
                    </span>
                  )}
                  {rolling && <span className="loot-dice-spin">&#9860;</span>}
                </div>
              );
            })}
          </div>

          {/* Dropped items */}
          {dicePhase === 'done' && droppedItems.length > 0 && (
            <>
              <div className="post-battle-divider" />
              <div className="loot-items-section">
                <div className="loot-items-label">ITEMS FORGED</div>
                {droppedItems.map(drop => {
                  const kept = keptItems.has(drop.item_id);
                  const dismissed = dismissedItems.has(drop.item_id);
                  const itemData: ItemData = {
                    item_id: drop.item_id,
                    name: drop.name,
                    rarity: drop.rarity,
                    item_type: drop.item_type,
                    base_stats: drop.base_stats,
                    item_code: drop.item_code,
                    item_level: drop.item_level,
                    min_char_level: drop.min_char_level,
                    stat_requirements: drop.stat_requirements,
                    gear_slot_id: drop.gear_slot_id,
                  };
                  return (
                    <div key={drop.item_id} className={`loot-item-entry ${kept ? 'loot-item--kept' : ''} ${dismissed ? 'loot-item--dismissed' : ''}`}>
                      <ItemCard item={itemData} compact />
                      {!kept && !dismissed && (
                        <div className="loot-item-actions">
                          <button className="loot-btn loot-btn--keep" onClick={() => handleKeepItem(drop.item_id)}>
                            Keep
                          </button>
                          <button className="loot-btn loot-btn--dismiss" onClick={() => handleDismissItem(drop.item_id)}>
                            Dismiss
                          </button>
                        </div>
                      )}
                      {kept && <span className="loot-item-status loot-item-status--kept">KEPT</span>}
                      {dismissed && <span className="loot-item-status loot-item-status--dismissed">DISMISSED</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Yaldabaoth fail message when no drops */}
          {dicePhase === 'done' && droppedItems.length === 0 && (
            <div className="loot-fail">
              <div className="loot-fail-icon">&#9729;</div>
              <div className="loot-fail-text">
                Yaldabaoth's grasp tightens... No items materialized.
              </div>
            </div>
          )}

          {dicePhase === 'done' && (
            <button
              className="post-battle-btn post-battle-btn--hub"
              onClick={handleFinishLoot}
              disabled={droppedItems.length > 0 && !allItemsHandled}
            >
              {droppedItems.length > 0 && !allItemsHandled ? 'Handle all items first' : 'Return to Hub'}
            </button>
          )}
        </div>

        {replaceState && (
          <InventoryReplaceModal
            newItem={replaceState.item}
            storedItems={replaceState.storedItems}
            onComplete={() => {
              setKeptItems(prev => new Set(prev).add(replaceState.item.item_id));
              setReplaceState(null);
            }}
            onCancel={() => {
              setDismissedItems(prev => new Set(prev).add(replaceState.item.item_id));
              setReplaceState(null);
            }}
          />
        )}
      </div>
    );
  }

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
              <span className="post-battle-stat-label">Converted Essence</span>
              <span className="post-battle-stat-value post-battle-stat-value--essence">
                ◆ {formatNumber(displayConverted)}
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
            onClick={handleReturnToHub}
            disabled={completing}
            title="Claim Essence and return to the hub. Session closes."
          >
            {completing ? 'Completing...' : '⌂ Return to Hub'}
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
