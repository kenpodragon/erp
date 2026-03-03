/**
 * NarrativeBlock — WPM-timed paragraph-by-paragraph text reveal.
 *
 * Fetches story beats from the backend, then reveals each block after
 * `display_delay_seconds` based on the user's WPM setting.
 */
import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../../api';
import './NarrativeBlock.css';

interface Beat {
  id: number;
  beat_number: number;
  sort_order: number;
  text: string;
  word_count: number;
  display_delay_seconds: number;
  intensity: number | null;
  pacing: string | null;
  image_path: string | null;
}

interface Props {
  sceneId: number;
  onComplete: () => void;
  wpm: number;
  onWpmChange?: (newWpm: number) => void;
  fontSize?: number;
  onFontSizeChange?: (newSize: number) => void;
  disabled?: boolean;
}

const NarrativeBlock: React.FC<Props> = ({ sceneId, onComplete, wpm = 200, onWpmChange, fontSize = 14, onFontSizeChange, disabled = false }) => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReReading, setIsReReading] = useState(false);
  
  // Local slider state
  const [localWpm, setLocalWpm] = useState(wpm);
  const [localFontSize, setLocalFontSize] = useState(fontSize);

  const scrollRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setLocalWpm(wpm);
  }, [wpm]);

  useEffect(() => {
    setLocalFontSize(fontSize);
  }, [fontSize]);

  const startNarrativeReveal = (beatsData: Beat[], startFromIdx = 0) => {
    completedRef.current = false;
    setVisibleCount(startFromIdx);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    let cumulativeMs = 0;
    beatsData.forEach((beat, idx) => {
      if (idx < startFromIdx) return;

      const t = setTimeout(() => {
        setVisibleCount(idx + 1);
      }, cumulativeMs);
      timersRef.current.push(t);

      let delayMs = (beat.word_count / Math.max(wpm, 50)) * 60 * 1000;
      if (delayMs < 500) delayMs = 500;
      cumulativeMs += delayMs;
    });

    const finalT = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
        setIsReReading(false);
      }
    }, cumulativeMs + 500);
    timersRef.current.push(finalT);
  };

  useEffect(() => {
    completedRef.current = false;
    setVisibleCount(0);
    setLoading(true);
    setIsReReading(false);

    api.get(`/api/game/story/scenes/${sceneId}/narrative`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.beats && data.beats.length > 0) {
          setBeats(data.beats);
          if (disabled) {
            setVisibleCount(data.beats.length);
            completedRef.current = true;
          } else {
            startNarrativeReveal(data.beats);
          }
        } else {
          const fallback = [{
            id: 0, beat_number: 1, sort_order: 1,
            text: "No narrative discovered for this sector of the Tower...",
            word_count: 10, display_delay_seconds: 2, intensity: null, pacing: null, image_path: null
          }];
          setBeats(fallback);
          setVisibleCount(1);
          completedRef.current = true;
          onComplete();
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => { 
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [sceneId, disabled, wpm]); // Re-run if WPM changes

  useEffect(() => {
    if (scrollRef.current && visibleCount > 0) {
      const container = scrollRef.current;
      const paragraphs = container.querySelectorAll('.narrative-paragraph');
      const lastChild = paragraphs[visibleCount - 1] as HTMLElement;
      
      if (lastChild) {
        // Auto-scroll so the TOP of the newest text is at the TOP of the scroll window
        const targetScroll = lastChild.offsetTop - container.offsetTop;
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  }, [visibleCount]);

  const handleReRead = () => {
    setIsReReading(true);
    startNarrativeReveal(beats);
  };

  const handleWpmSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalWpm(Number(e.target.value));
  };

  const handleWpmSliderMouseUp = () => {
    onWpmChange?.(localWpm);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(e.target.value);
    setLocalFontSize(newSize);
    onFontSizeChange?.(newSize);
  };

  if (loading) {
    return (
      <aside className="narrative-block loading">
        <span className="narrative-loading-dot" />
      </aside>
    );
  }

  const showAll = disabled && !isReReading;

  return (
    <aside className="narrative-col-inner" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div 
        className="narrative-block no-select" 
        ref={scrollRef}
      >
        <div className="narrative-protection-overlay" />
        {beats.slice(0, showAll ? beats.length : visibleCount).map((beat, idx) => {
          const isCurrent = idx === (showAll ? beats.length - 1 : visibleCount - 1);
          return (
            <div
              key={`${beat.id}_${idx}`}
              className={`narrative-paragraph ${isCurrent ? 'narrative-paragraph--current' : 'narrative-paragraph--faded'}`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {beat.image_path ? (
                <img
                  src={beat.image_path}
                  alt={`Story beat ${beat.beat_number}`}
                  className="narrative-image"
                  draggable={false}
                  onContextMenu={e => e.preventDefault()}
                />
              ) : (
                <p>{beat.text}</p>
              )}
            </div>
          );
        })}

        {!showAll && visibleCount < beats.length && (
          <div className="narrative-incoming">
            <span className="narrative-ellipsis">&#8230;</span>
          </div>
        )}

        {(showAll || (visibleCount >= beats.length && beats.length > 0)) && (
          <div className="narrative-complete-tag">— End of Scene Narrative —</div>
        )}
      </div>
      
      <div className="narrative-controls">
        <div className="narrative-sliders-row">
          <div className="wpm-slider-wrap">
            <label>WPM: {localWpm}</label>
            <input 
              type="range" min="150" max="600" step="10" 
              value={localWpm} 
              onChange={handleWpmSliderChange}
              onMouseUp={handleWpmSliderMouseUp}
            />
          </div>

          <div className="wpm-slider-wrap">
            <label>FONT SIZE: {localFontSize}px</label>
            <input 
              type="range" min="8" max="28" step="1" 
              value={localFontSize}
              onChange={handleFontSizeChange}
            />
          </div>
        </div>

        {disabled && !isReReading && (
          <button className="narrative-reread-btn" onClick={handleReRead}>
            📖 Re-read Story
          </button>
        )}
      </div>
    </aside>
  );
};

export default NarrativeBlock;
