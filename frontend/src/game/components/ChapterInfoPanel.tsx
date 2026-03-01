import React from 'react';
import './ChapterInfoPanel.css';

interface StoryBeat {
  id: number;
  beat_number: number;
  content_text: string;
}
interface Scene {
  id: number;
  name: string;
  gameplay_data?: {
    required_time_seconds: number;
  } | null;
  story_beats?: StoryBeat[];
}

interface ChapterInfoPanelProps {
  scene: Scene;
  onClose: () => void;
  onEnter: (sceneId: number) => void;
}

const ChapterInfoPanel: React.FC<ChapterInfoPanelProps> = ({ scene, onClose, onEnter }) => {
  const formatTime = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '0m';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="chapter-info-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{scene.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="panel-body">
          <div className="scene-meta">
            <div className="meta-item">
              <span className="label">Estimated Duration:</span>
              <span className="value">{formatTime(scene.gameplay_data?.required_time_seconds)}</span>
            </div>
            <div className="meta-item">
              <span className="label">Type:</span>
...
              <span className="value">Narrative Combat</span>
            </div>
          </div>

          <div className="lore-preview">
            <p>
              "The air here is thick with the scent of ozone and ancient decay. 
              The Lower Towers haven't seen a living soul in centuries..."
            </p>
          </div>

          <div className="rewards-preview">
            <h4>Potential Rewards</h4>
            <div className="reward-icons">
              <span title="Elysium Essence">✨ Essence</span>
              <span title="Scrap Metal">🔩 Resources</span>
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <button className="enter-scene-btn" onClick={() => onEnter(scene.id)}>
            Enter Story Mode
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChapterInfoPanel;
