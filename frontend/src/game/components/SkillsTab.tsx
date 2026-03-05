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
  } | null;
  is_unlocked: boolean;
  unlock_display_text: string | null;
}

interface TrainingStatusResponse {
  essence_pct: number;
  essence_balance: number;
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

const SkillsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TrainingStatusResponse | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [actions, setActions] = useState<SkillAction[]>([]);
  const [report, setReport] = useState<OfflineReport | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

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

  const handleStartTraining = async (skillId: number, actionId: number) => {
    setIsSwitching(true);
    try {
      await api.post('/api/game/training/start', { skill_id: skillId, action_id: actionId });
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

  return (
    <div className="skills-tab-container">
      {/* Header with Essence status */}
      <div className="skills-header">
        <div>
          <h1>SKILLS & CALIBRATION</h1>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>USER: ASPOLIN // SUBSYSTEM: PROGRESSION_v2.3</div>
        </div>
        <div className="essence-status">
          <div>ESSENCE STABILITY: {(status.essence_pct * 100).toFixed(1)}%</div>
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
            XP RATE: {(status.xp_rate_modifier * 100).toFixed(0)}% (DRAIN: 1/min)
          </div>
        </div>
      </div>

      <div className="skills-main-layout">
        {/* Panel 1: Skill List */}
        <div className="skill-list-panel">
          {status.skills.map(skill => (
            <div 
              key={skill.skill_id}
              className={`skill-card ${selectedSkillId === skill.skill_id ? 'active' : ''} ${skill.is_active_training ? 'training' : ''} ${!skill.is_unlocked ? 'locked' : ''}`}
              onClick={() => skill.is_unlocked && setSelectedSkillId(skill.skill_id)}
            >
              <div className="skill-card-header">
                <span className="skill-name">{skill.skill_name}</span>
                <span className="skill-level">LVL {skill.level}</span>
              </div>
              {!skill.is_unlocked ? (
                <div style={{ fontSize: '0.6rem', color: '#ff3333' }}>[LOCKED]</div>
              ) : (
                <div className="mini-xp-bar">
                  <div 
                    className="mini-xp-fill" 
                    style={{ width: `${(skill.current_xp / skill.next_level_xp) * 100}%` }} 
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Panel 2 & 3: Detail and Actions */}
        <div className="skill-detail-panel">
          {selectedSkill && (
            <>
              <div className="detail-header">
                <div className="detail-title-row">
                  <div>
                    <div className="detail-flavor-title">{selectedSkill.flavor_title}</div>
                    <h2 className="detail-skill-name">{selectedSkill.skill_name}</h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem' }}>LEVEL {selectedSkill.level}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>RANK: {selectedSkill.level >= 99 ? 'MASTER' : 'INITIATE'}</div>
                  </div>
                </div>

                <div className="detail-xp-info">
                  <div className="large-xp-bar-container">
                    <div className="xp-text">
                      {Math.floor(selectedSkill.current_xp).toLocaleString()} / {selectedSkill.next_level_xp.toLocaleString()} XP
                    </div>
                    <div 
                      className="large-xp-bar-fill" 
                      style={{ width: `${(selectedSkill.current_xp / selectedSkill.next_level_xp) * 100}%` }} 
                    />
                  </div>
                </div>

                {selectedSkill.is_active_training && selectedSkill.active_action && (
                  <div style={{ fontSize: '0.8rem', color: '#00ff41', border: '1px solid #00ff41', padding: '5px', background: 'rgba(0,255,65,0.1)' }}>
                    ACTIVE: {selectedSkill.active_action.display_name} ({(selectedSkill.active_action.interval_ms / 1000).toFixed(1)}s interval)
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
                      const isActive = selectedSkill.active_action?.id === action.id;
                      
                      return (
                        <tr key={action.id} className={`action-row ${isLocked ? 'locked' : ''} ${isActive ? 'active' : ''}`}>
                          <td className="action-name-cell">
                            {action.display_name}
                            <div style={{ fontSize: '0.65rem', fontWeight: 'normal', marginTop: '4px', opacity: 0.8 }}>
                              {action.lore_description}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>{action.level_required}</td>
                          <td className="action-interval-cell">{(action.interval_ms / 1000).toFixed(1)}s</td>
                          <td className="action-xp-cell">+{action.xp_per_action}</td>
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
                <span className="report-stat-value">{(report.offline_duration_seconds / 3600).toFixed(1)} / {report.cap_hours}h</span>
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
                <span className="report-stat-value">+{report.xp_earned.toLocaleString()} {report.affinity_applied && '(+25% AFFINITY)'}</span>
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
                <span className="report-stat-value">-{report.essence_consumed}</span>
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
