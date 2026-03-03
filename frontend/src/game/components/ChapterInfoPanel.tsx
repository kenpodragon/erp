import React from 'react';
import './ChapterInfoPanel.css';

interface StoryBeat {
  id: number;
  beat_number: number;
  content_text: string;
}

interface BossConfig {
  timer_seconds?: number;
  hp_multiplier?: number;
  interrupt_interval_min?: number;
  interrupt_interval_max?: number;
  interrupt_clicks_required?: number;
}

interface Scene {
  id: number;
  name: string;
  title?: string;
  summary?: string;
  scene_type?: 'normal' | 'chapter_boss' | 'book_boss';
  boss_config?: BossConfig | null;
  gameplay_data?: {
    required_time_seconds: number;
  } | null;
  story_beats?: StoryBeat[];
}

interface ChapterInfoPanelProps {
  scene: Scene;
  chapterTitle?: string;
  onClose: () => void;
  onEnter: (sceneId: number) => void;
}

const ChapterInfoPanel: React.FC<ChapterInfoPanelProps> = ({ scene, chapterTitle, onClose, onEnter }) => {
  const isBoss = scene.scene_type === 'chapter_boss' || scene.scene_type === 'book_boss';
  const isBookBoss = scene.scene_type === 'book_boss';

  const formatTime = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
  };

  const bossLore = isBookBoss
    ? `The final guardian of this entire book stands before you. It has absorbed the strength of every chapter you have survived. Defeat it to break through to the next volume of the Tower.`
    : `You stand at the threshold of "${chapterTitle || 'this chapter'}". The guardian that remains will not yield. You cannot advance until it falls.`;

  const displayTitle = isBoss
    ? (isBookBoss ? 'Book Boss' : 'Chapter Boss')
    : (scene.title || scene.name);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`chapter-info-panel ${isBoss ? 'chapter-info-panel--boss' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className={`panel-header ${isBoss ? 'panel-header--boss' : ''}`}>
          <h2>{displayTitle}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="panel-body">
          {isBoss && (
            <div className="boss-gate-warning">
              ⚠ Required to advance — you cannot progress until this is cleared.
            </div>
          )}

          <div className="scene-meta">
            <div className="meta-item">
              <span className="label">Estimated Duration:</span>
              <span className="value">
                {isBoss
                  ? formatTime(scene.boss_config?.timer_seconds)
                  : formatTime(scene.gameplay_data?.required_time_seconds)}
              </span>
            </div>
            <div className="meta-item">
              <span className="label">Type:</span>
              <span className={`value ${isBoss ? 'value--boss' : ''}`}>
                {isBookBoss ? 'Book Boss Battle' : isBoss ? 'Boss Battle' : 'Narrative Combat'}
              </span>
            </div>
          </div>

          <div className={`lore-preview ${isBoss ? 'lore-preview--boss' : ''}`}>
            <p>
              {isBoss
                ? bossLore
                : (scene.summary || '"The Akashic records for this sector are heavily encrypted. Data reconstruction in progress..."')}
            </p>
          </div>

          <div className="rewards-preview">
            <h4>Potential Rewards</h4>
            <div className="reward-icons">
              {isBoss ? (
                <>
                  <span title="Chapter/Book Unlock">{isBookBoss ? '📖 Next Book Unlocked' : '📜 Next Chapter Unlocked'}</span>
                  <span title="Narrative Reveal">✨ Narrative Reveal</span>
                </>
              ) : (
                <>
                  <span title="Elysium Essence">✨ Essence</span>
                  <span title="Scrap Metal">🔩 Resources</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <button
            className={`enter-scene-btn ${isBoss ? 'enter-scene-btn--boss' : ''}`}
            onClick={() => onEnter(scene.id)}
          >
            {isBoss ? (isBookBoss ? 'Challenge Book Boss' : 'Challenge Chapter Boss') : 'Enter Story Mode'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChapterInfoPanel;
