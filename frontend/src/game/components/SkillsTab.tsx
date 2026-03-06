import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import ActiveTrainingSimulator from './ActiveTrainingSimulator';
import './SkillsTab.css';

interface SkillAction {
  id: number;
  skill_id: number;
  name: string;
  display_name: string;
  lore_description: string;
  level_required: number;
  interval_ms: number;
  xp_per_action: number;
  sort_order: number;
}

interface SkillStatus {
  skill_id: number;
  skill_name: string;
  flavor_title: string;
  level: number;
  current_xp: number;
  next_level_xp: number;
  is_active_training: boolean;
  is_in_active_mode: boolean;
  action_started_at: string | null;
  active_action: {
    id: number;
    name: string;
    display_name: string;
    interval_ms: number;
    xp_per_action: number;
    level_required: number;
  } | null;
  is_unlocked: boolean;
  unlock_display_text: string | null;
  affinity_multiplier: number;
  prerequisites_met: boolean;
  prerequisites: Array<{
    type: string;
    ref_id: number;
    required: number;
    current: number;
    met: boolean;
    hint: string | null;
  }>;
}

interface TrainingStatusResponse {
  essence_pct: number;
  essence_balance: number;
  essence_capacity: number;
  essence_drain_per_tick: number;
  xp_rate_modifier: number;
  skills: SkillStatus[];
}

interface OfflineReport {
  offline_duration_seconds: number;
  cap_hours: number;
  skill_name: string;
  action_name: string;
  actions_completed: number;
  xp_earned: number;
  potential_xp: number;
  affinity_applied: boolean;
  old_level: number;
  new_level: number;
  levels_gained: number;
  new_actions_unlocked: string[];
  essence_consumed: number;
  remaining_essence: number;
  new_essence_pct: number;
  training_rate_status: number;
}

const SKILL_DESCRIPTIONS: Record<string, string> = {
  'Attack': 'Increases base click damage floor.',
  'Magic': 'Increases auto-DPS multiplier and gates hotbar skill unlocks.',
  'Lore': 'Reduces narrative time gates and increases Essence gain.',
  'Precision': 'Increases critical hit chance and multiplier.'
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const SkillsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TrainingStatusResponse | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [actions, setActions] = useState<SkillAction[]>([]);
  const [report, setReport] = useState<OfflineReport | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  
  // Per-tick animation states
  const [tickProgress, setLocalTickProgress] = useState(0);
  const [showTickXp, setShowTickXp] = useState<{ id: number, xp: number } | null>(null);
  const [lastTickTime, setLastTickTime] = useState<number>(Date.now());

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/game/training/status');
      const data = await response.json();
      setStatus(data);
      if (selectedSkillId === null && data.skills.length > 0) {
        // Default to first unlocked skill or just first skill
        const firstUnlocked = data.skills.find((s: SkillStatus) => s.is_unlocked);
        setSelectedSkillId(firstUnlocked ? firstUnlocked.skill_id : data.skills[0].skill_id);
      }
    } catch (err) {
      console.error('Failed to fetch training status:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSkillId]);

  const fetchActions = useCallback(async (skillId: number) => {
    try {
      const response = await api.get(`/api/game/training/actions/${skillId}`);
      const data = await response.json();
      setActions(data);
    } catch (err) {
      console.error('Failed to fetch skill actions:', err);
    }
  }, []);

  const checkOfflineReport = useCallback(async () => {
    try {
      const response = await api.get('/api/game/training/offline-report');
      const data = await response.json();
      if (data.has_report) {
        setReport(data.report);
        fetchStatus(); // Refresh status after report calculation
      }
    } catch (err) {
      console.error('Failed to check offline report:', err);
    }
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
    checkOfflineReport();
  }, [fetchStatus, checkOfflineReport]);

  useEffect(() => {
    if (selectedSkillId !== null) {
      fetchActions(selectedSkillId);
    }
  }, [selectedSkillId, fetchActions]);

  // Sync when leaving tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Trigger a background sync by just hitting the report endpoint (which applies calc)
        api.get('/api/game/training/offline-report');
      } else {
        // On return, refresh everything
        fetchStatus();
        checkOfflineReport();
        setLastTickTime(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchStatus, checkOfflineReport]);

  // Tick simulation effect
  useEffect(() => {
    if (!status || showSimulator) return;
    
    const activeSkill = status.skills.find(s => s.is_active_training);
    if (!activeSkill || !activeSkill.active_action) {
      setLocalTickProgress(0);
      return;
    }

    const intervalMs = activeSkill.active_action.interval_ms;
    const updateRate = 50; // 20fps for smooth bar
    
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickTime;
      
      if (elapsed >= intervalMs) {
        // Tick occurred!
        setLastTickTime(now);
        setLocalTickProgress(0);
        
        // Show +XP popup
        const effectiveXp = activeSkill.active_action!.xp_per_action * status.xp_rate_modifier * activeSkill.affinity_multiplier;
        setShowTickXp({ id: now, xp: effectiveXp });
        setTimeout(() => setShowTickXp(null), 1000);
        
        // Increment XP locally for visual feedback
        setStatus(prev => {
          if (!prev) return null;
          return {
            ...prev,
            skills: prev.skills.map(s => {
              if (s.skill_id === activeSkill.skill_id) {
                const newXp = s.current_xp + effectiveXp;
                // If we crossed a level boundary, it's better to refetch status to get new targets
                if (newXp >= s.next_level_xp) {
                  setTimeout(fetchStatus, 100);
                }
                return { ...s, current_xp: newXp };
              }
              return s;
            })
          };
        });
      } else {
        setLocalTickProgress((elapsed / intervalMs) * 100);
      }
    }, updateRate);

    return () => clearInterval(timer);
  }, [status, lastTickTime, showSimulator, fetchStatus]);

  const handleStartTraining = async (skillId: number, actionId: number) => {
    setIsSwitching(true);
    try {
      await api.post('/api/game/training/start', { skill_id: skillId, action_id: actionId });
      setLastTickTime(Date.now()); // Reset tick timer
      await fetchStatus();
    } catch (err) {
      console.error('Failed to start training:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleStopTraining = async () => {
    setIsSwitching(true);
    try {
      await api.post('/api/game/training/stop');
      await fetchStatus();
    } catch (err) {
      console.error('Failed to stop training:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleEnterActiveMode = async () => {
    setIsSwitching(true);
    try {
      await api.post('/api/game/training/active-mode/enter');
      setShowSimulator(true);
    } catch (err) {
      console.error('Failed to enter active mode:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleExitActiveMode = async (xpEarned: number) => {
    setIsSwitching(true);
    try {
      await api.post('/api/game/training/active-mode/exit', { xp_earned: xpEarned });
      setShowSimulator(false);
      setLastTickTime(Date.now()); // Reset tick timer
      await fetchStatus();
    } catch (err) {
      console.error('Failed to exit active mode:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  if (loading || !status) {
    return <div className="skills-tab-container">INITIALIZING AKASHIC SUBSYSTEMS...</div>;
  }

  const selectedSkill = status.skills.find(s => s.skill_id === selectedSkillId);
  const trainingSkill = status.skills.find(s => s.is_active_training);

  // Find highest unlocked action for base XP calculation in Active Mode
  const highestUnlockedAction = [...actions]
    .filter(a => selectedSkill && selectedSkill.level >= a.level_required)
    .sort((a, b) => b.xp_per_action - a.xp_per_action)[0];
  
  const effectiveBaseXp = highestUnlockedAction && status 
    ? (highestUnlockedAction.xp_per_action * status.xp_rate_modifier * (selectedSkill?.affinity_multiplier || 1.0))
    : 1;

  const potentialBaseXp = highestUnlockedAction
    ? (highestUnlockedAction.xp_per_action * (selectedSkill?.affinity_multiplier || 1.0))
    : 1;

  const getTimeToEmpty = () => {
    if (!status || status.essence_balance <= 0 || status.essence_drain_per_tick <= 0) return null;
    
    // Find active action to get interval
    const activeSkill = status.skills.find(s => s.is_active_training);
    if (!activeSkill || !activeSkill.active_action) return null;
    
    const ticksRemaining = status.essence_balance / status.essence_drain_per_tick;
    const secondsRemaining = ticksRemaining * (activeSkill.active_action.interval_ms / 1000);
    
    const h = Math.floor(secondsRemaining / 3600);
    const m = Math.floor((secondsRemaining % 3600) / 60);
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getEssenceTooltip = () => {
    if (!status) return '';
    const balance = Math.floor(status.essence_balance);
    const cap = status.essence_capacity;
    const timeStr = getTimeToEmpty() || 'N/A';
    
    return `Balance: ${balance.toLocaleString()} / ${cap.toLocaleString()}\nTime to Empty: ${timeStr}`;
  };

  return (
    <div className="skills-tab-container">
      {/* Header with Essence status */}
      <div className="skills-header">
        <div>
          <h1>SKILLS & CALIBRATION</h1>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>USER: ASPOLIN // SUBSYSTEM: PROGRESSION_v2.3</div>
        </div>
        <div className="essence-status" title={getEssenceTooltip()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            {status.essence_balance > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#ffaa00' }}>[ EMPTY IN: {getTimeToEmpty()} ]</span>
            )}
            <span>ESSENCE STABILITY: {(status.essence_pct * 100).toFixed(1)}%</span>
          </div>
          <div className="essence-bar-container">
            <div 
              className="essence-bar-fill" 
              style={{ 
                width: `${status.essence_pct * 100}%`,
                background: status.essence_pct < 0.15 ? '#ff3333' : status.essence_pct < 0.4 ? '#ffaa00' : '#00ff41'
              }} 
            />
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: '5px' }}>
            XP RATE: {(status.xp_rate_modifier * 100).toFixed(0)}% (DRAIN: {status.essence_drain_per_tick} / tick)
          </div>
        </div>
      </div>

      <div className="skills-main-layout">
        {/* Panel 1: Skill List */}
        <div className="skill-list-panel">
          {status.skills.map(skill => {
            const prereqBlocked = !skill.prerequisites_met;
            const isLocked = !skill.is_unlocked || prereqBlocked;
            const firstUnmet = skill.prerequisites?.find(p => !p.met);

            return (
              <div
                key={skill.skill_id}
                className={`skill-card ${selectedSkillId === skill.skill_id ? 'active' : ''} ${skill.is_active_training ? 'training' : ''} ${isLocked ? 'locked' : ''} ${prereqBlocked ? 'prereq-locked' : ''}`}
                onClick={() => !isLocked && setSelectedSkillId(skill.skill_id)}
                title={!skill.is_unlocked
                  ? skill.unlock_display_text || 'Locked'
                  : prereqBlocked && firstUnmet
                    ? firstUnmet.hint || `Requires ${firstUnmet.type} ≥ ${firstUnmet.required}`
                    : ''}
              >
                <div className="skill-card-header">
                  <span className="skill-name">{skill.skill_name}</span>
                  <span className="skill-level">LVL {skill.level}</span>
                </div>
                {!skill.is_unlocked ? (
                  <div style={{ fontSize: '0.6rem', color: '#ff3333' }}>[LOCKED]</div>
                ) : prereqBlocked ? (
                  <div style={{ fontSize: '0.55rem', color: '#cc6600' }}>
                    [PREREQ] {firstUnmet?.hint || `${firstUnmet?.type} ≥ ${firstUnmet?.required}`}
                  </div>
                ) : (
                  <div className="mini-xp-bar">
                    <div
                      className="mini-xp-fill"
                      style={{ width: `${(skill.current_xp / skill.next_level_xp) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Panel 2 & 3: Detail and Actions */}
        <div className="skill-detail-panel">
          {selectedSkill && (
            <>
              <div className="detail-header">
                <div className="detail-title-row">
                  <div style={{ position: 'relative' }}>
                    <div className="detail-flavor-title">{selectedSkill.flavor_title}</div>
                    <h2 className="detail-skill-name">{selectedSkill.skill_name}</h2>
                    <div className="detail-skill-description" style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px', fontStyle: 'italic' }}>
                      {SKILL_DESCRIPTIONS[selectedSkill.skill_name] || ''}
                    </div>
                    {/* +XP Tick Animation */}
                    {selectedSkill.is_active_training && showTickXp && (
                      <div className="tick-xp-popup" style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-60px',
                        color: '#00ff41',
                        fontWeight: 'bold',
                        animation: 'tickUp 1s ease-out forwards',
                        zIndex: 10
                      }}>
                        +{showTickXp.xp} XP
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem' }}>LEVEL {selectedSkill.level}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>RANK: {selectedSkill.level >= 99 ? 'MASTER' : 'INITIATE'}</div>
                  </div>
                </div>

                {/* Prerequisite display */}
                {selectedSkill.prerequisites && selectedSkill.prerequisites.length > 0 && (
                  <div style={{ marginTop: '6px', padding: '4px 6px', background: '#0f0f0f', border: '1px solid #333', borderRadius: '3px', fontSize: '0.7rem' }}>
                    <div style={{ color: selectedSkill.prerequisites_met ? '#00ff41' : '#cc6600', marginBottom: '3px', fontWeight: 'bold' }}>
                      {selectedSkill.prerequisites_met ? '✓ PREREQUISITES MET' : '✗ PREREQUISITES REQUIRED'}
                    </div>
                    {selectedSkill.prerequisites.map((p, i) => (
                      <div key={i} style={{ color: p.met ? '#338833' : '#cc4444', fontSize: '0.65rem', paddingLeft: '8px' }}>
                        {p.met ? '✓' : '✗'} {p.hint || `${p.type}: ${p.current}/${p.required}`}
                      </div>
                    ))}
                  </div>
                )}

                <div className="detail-xp-info">
                  <div className="large-xp-bar-container">
                    <div className="xp-text">
                      {selectedSkill.current_xp.toFixed(1)} / {selectedSkill.next_level_xp.toLocaleString()} XP
                    </div>
                    <div 
                      className="large-xp-bar-fill" 
                      style={{ width: `${(selectedSkill.current_xp / selectedSkill.next_level_xp) * 100}%` }} 
                    />
                  </div>
                </div>

                {selectedSkill.is_active_training && selectedSkill.active_action && (
                  <div className="active-action-status-bar">
                    <div className="active-action-text">
                      CALIBRATING: {selectedSkill.active_action.display_name} ({(selectedSkill.active_action.interval_ms / 1000).toFixed(1)}s interval)
                    </div>
                    <div className="tick-progress-container">
                      <div className="tick-progress-fill" style={{ width: `${tickProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="action-table-container">
                <table className="action-table">
                  <thead>
                    <tr>
                      <th>ACTION</th>
                      <th>LVL</th>
                      <th>INTERVAL</th>
                      <th>XP/TICK</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map(action => {
                      const isLocked = selectedSkill.level < action.level_required;
                      const isActive = selectedSkill.is_active_training && selectedSkill.active_action?.id === action.id;
                      
                      // Calculate effective XP: base * stability_rate * affinity
                      const effectiveXp = action.xp_per_action * status.xp_rate_modifier * selectedSkill.affinity_multiplier;
                      const showAffinity = selectedSkill.affinity_multiplier > 1.0;

                      return (
                        <tr 
                          key={action.id} 
                          className={`action-row ${isLocked ? 'locked' : ''} ${isActive ? 'active' : ''}`}
                          title={isLocked ? `Requires ${selectedSkill.skill_name} level ${action.level_required}` : ''}
                        >
                          <td className="action-name-cell">
                            {action.display_name}
                            <div style={{ fontSize: '0.65rem', fontWeight: 'normal', marginTop: '4px', opacity: 0.8 }}>
                              {action.lore_description}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>{action.level_required}</td>
                          <td className="action-interval-cell">{(action.interval_ms / 1000).toFixed(1)}s</td>
                          <td className="action-xp-cell">
                            +{action.xp_per_action} 
                            <span style={{ color: '#aaa', marginLeft: '4px', fontSize: '0.8em' }}>
                              ({effectiveXp > 0 ? `+${effectiveXp.toFixed(1)}` : '0'})
                            </span>
                            {showAffinity && <span style={{ color: '#ffff00', fontSize: '0.7em', marginLeft: '4px' }}>★</span>}
                          </td>
                          <td>
                            {isLocked ? (
                              <button className="action-btn" disabled>LOCKED</button>
                            ) : isActive ? (
                              <button 
                                className="action-btn stop-btn" 
                                onClick={handleStopTraining}
                                disabled={isSwitching}
                              >
                                STOP
                              </button>
                            ) : (
                              <button 
                                className="action-btn" 
                                onClick={() => handleStartTraining(selectedSkill.skill_id, action.id)}
                                disabled={isSwitching}
                              >
                                TRAIN
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              
              {/* Active Mode Button */}
              <div className="active-mode-button-container">
                <button 
                  className="active-mode-btn"
                  disabled={!selectedSkill.is_active_training || isSwitching}
                  onClick={handleEnterActiveMode}
                >
                  {selectedSkill.is_active_training ? `ENTER ACTIVE MODE: ${selectedSkill.skill_name}` : 'SELECT AN ACTION TO START'}
                </button>
                <div style={{ fontSize: '0.7rem', marginTop: '10px', opacity: 0.6 }}>
                  ACTIVE MODE INCREASES XP GAIN BY 3x BUT REQUIRES MANUAL INTERVENTION
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Mode Simulator */}
      {showSimulator && selectedSkill && (
        <ActiveTrainingSimulator 
          skill={selectedSkill} 
          effectiveBaseXp={effectiveBaseXp}
          potentialBaseXp={potentialBaseXp}
          onExit={handleExitActiveMode} 
        />
      )}

      {/* Offline Report Modal */}
      {report && (
        <div className="report-overlay">
          <div className="report-modal">
            <div className="report-header">
              <h2 style={{ margin: 0, letterSpacing: '4px' }}>TRAINING LOG: OFFLINE_RETURN</h2>
            </div>
            <div className="report-body">
              <div className="report-stat-row">
                <span className="report-stat-label">DURATION:</span>
                <span className="report-stat-value">{formatDuration(report.offline_duration_seconds)} / {report.cap_hours}h</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">SKILL:</span>
                <span className="report-stat-value">{report.skill_name}</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">ACTION:</span>
                <span className="report-stat-value">{report.action_name}</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">TICKS PROCESSED:</span>
                <span className="report-stat-value">{report.actions_completed.toLocaleString()}</span>
              </div>
              <div className="report-stat-row" style={{ color: '#00ff41', borderBottom: '1px solid #00ff41', marginTop: '10px' }}>
                <span className="report-stat-label">TOTAL XP EARNED:</span>
                <span className="report-stat-value">+{report.xp_earned.toLocaleString()} (+{report.potential_xp.toLocaleString()})</span>
              </div>
              <div className="report-stat-row">
                <span className="report-stat-label">LEVEL PROGRESS:</span>
                <span className="report-stat-value">LVL {report.old_level} &gt;&gt; LVL {report.new_level}</span>
              </div>
              {report.levels_gained > 0 && (
                <div style={{ color: '#ffff00', textAlign: 'center', margin: '15px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  CONGRATULATIONS! +{report.levels_gained} LEVELS GAINED
                </div>
              )}
              {report.new_actions_unlocked.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>NEW ACTIONS UNLOCKED:</div>
                  {report.new_actions_unlocked.map(act => (
                    <span key={act} className="unlocked-action-tag">&gt; {act}</span>
                  ))}
                </div>
              )}
              <div className="report-stat-row" style={{ marginTop: '15px', borderTop: '1px solid #333' }}>
                <span className="report-stat-label">ESSENCE CONSUMED:</span>
                <span className="report-stat-value">-{report.essence_consumed.toFixed(2)}</span>
              </div>
            </div>
            <div className="report-footer">
              <button className="close-report-btn" onClick={() => setReport(null)}>ACKNOWLEDGE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsTab;
