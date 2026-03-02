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
  fontSize?: number;
  disabled?: boolean;
}

const NarrativeBlock: React.FC<Props> = ({ sceneId, onComplete, wpm = 200, fontSize = 14, disabled = false }) => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    completedRef.current = false;
    setVisibleCount(0);
    setLoading(true);

    api.get(`/api/game/story/scenes/${sceneId}/narrative`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.beats && data.beats.length > 0) {
          setBeats(data.beats);
          if (disabled) {
            setVisibleCount(data.beats.length);
            completedRef.current = true;
          }
        } else {
          // Fallback if no narrative exists for this scene
          setBeats([{
            id: 0,
            beat_number: 1,
            sort_order: 1,
            text: "No narrative discovered for this sector of the Tower...",
            word_count: 10,
            display_delay_seconds: 2,
            intensity: null,
            pacing: null,
            image_path: null
          }]);
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
  }, [sceneId, disabled, onComplete]);

  // Schedule each beat to appear after its delay
  useEffect(() => {
    if (loading || beats.length === 0 || disabled || completedRef.current) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    let cumulativeMs = 0;

    beats.forEach((beat, idx) => {
      let delayMs = (beat.word_count / wpm) * 60 * 1000;
      if (delayMs < 2000) delayMs = 2000;

      cumulativeMs += delayMs;
      
      const t = setTimeout(() => {
        setVisibleCount(prev => Math.max(prev, idx + 1));
      }, cumulativeMs);
      timersRef.current.push(t);
    });

    const finalT = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, cumulativeMs + 500);
    timersRef.current.push(finalT);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [beats, loading, onComplete, wpm, disabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  if (loading) {
    return (
      <aside className="narrative-block loading">
        <span className="narrative-loading-dot" />
      </aside>
    );
  }

  return (
    <aside 
      className="narrative-block" 
      ref={scrollRef}
    >
      {beats.slice(0, visibleCount).map((beat, idx) => {
        const isCurrent = idx === visibleCount - 1;
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

      {visibleCount < beats.length && (
        <div className="narrative-incoming">
          <span className="narrative-ellipsis">&#8230;</span>
        </div>
      )}

      {visibleCount >= beats.length && beats.length > 0 && (
        <div className="narrative-complete-tag">— End of Scene Narrative —</div>
      )}
    </aside>
  );
};

export default NarrativeBlock;
