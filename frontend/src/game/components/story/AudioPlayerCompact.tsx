/**
 * AudioPlayerCompact — Streamlined version for the top header.
 */
import React, { useEffect, useRef, useState } from 'react';
import './AudioPlayerCompact.css';

const TRACKS: { key: string; label: string; src: string }[] = [
  { key: 'exploration', label: 'Exploration', src: '/music/exploration.wav' },
  { key: 'combat',      label: 'Combat',      src: '/music/combat.wav'      },
  { key: 'mystery',     label: 'Mystery',     src: '/music/mystery.wav'     },
  { key: 'boss',        label: 'Boss',        src: '/music/boss.wav'        },
];

const SPEEDS = [0.5, 1, 1.5, 2];

interface Props {
  chapterId?: number;
}

const AudioPlayerCompact: React.FC<Props> = ({ chapterId = 1 }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playingRef = useRef(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [speedIdx, setSpeedIdx] = useState(1);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.playbackRate = SPEEDS[speedIdx];
  }, [volume, speedIdx]);

  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    const onVisibility = () => {
      const el = audioRef.current;
      if (!el) return;
      if (document.hidden) {
        el.pause();
      } else if (playingRef.current) {
        el.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const handlePlayToggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => {});
      setPlaying(true);
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.src = TRACKS[trackIdx].src;
    el.load();
    if (playing) {
      el.play().catch(() => {});
    }
  }, [trackIdx]);

  const cycleTrack = (dir: 1 | -1) => {
    setTrackIdx(prev => (prev + dir + TRACKS.length) % TRACKS.length);
  };

  const track = TRACKS[trackIdx];

  return (
    <div className="audio-player-compact">
      <audio ref={audioRef} src={track.src} loop preload="metadata" />

      <div className={`audio-wave-mini ${playing ? 'audio-wave-mini--active' : ''}`}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="audio-wave-bar-mini" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      <div className="audio-controls-mini">
        <button className="audio-mini-btn" onClick={() => cycleTrack(-1)} title="Prev track">«</button>
        <button className="audio-mini-btn play-mini-btn" onClick={handlePlayToggle} title={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className="audio-mini-btn" onClick={() => cycleTrack(1)} title="Next track">»</button>
      </div>

      <span className="audio-mini-label">{track.label}</span>

      <input
        type="range"
        className="audio-mini-volume"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={e => setVolume(Number(e.target.value))}
        title={`Volume: ${Math.round(volume * 100)}%`}
      />
    </div>
  );
};

export default AudioPlayerCompact;
