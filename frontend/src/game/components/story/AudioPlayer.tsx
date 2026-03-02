/**
 * AudioPlayer — HTML5 background music player for Story Mode.
 *
 * Features:
 *  - Loops the current track (exploration/combat/mystery/boss)
 *  - Speed controls: 0.5×, 1×, 1.5×, 2×
 *  - Volume slider
 *  - Restart button
 *  - Progress bar with seek functionality
 *  - Visual waveform (CSS bar animation)
 *  - Auto-pause when tab is hidden
 */
import React, { useEffect, useRef, useState } from 'react';
import './AudioPlayer.css';

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

const AudioPlayer: React.FC<Props> = ({ chapterId = 1 }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playingRef = useRef(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Apply volume + speed
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.playbackRate = SPEEDS[speedIdx];
  }, [volume, speedIdx]);

  useEffect(() => { playingRef.current = playing; }, [playing]);

  // Auto-pause/resume when tab focus changes
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

  const handleRestart = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    if (!playing) {
      el.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleSeek = (val: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = val;
    setCurrentTime(val);
  };

  // Handle track src changes
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

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const track = TRACKS[trackIdx];

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={track.src}
        loop
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
      />

      <div className={`audio-wave ${playing ? 'audio-wave--active' : ''}`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="audio-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      <button className="audio-btn" onClick={() => cycleTrack(-1)} title="Previous track">&#9664;</button>
      <span className="audio-track-label">{track.label}</span>
      <button className="audio-btn" onClick={() => cycleTrack(1)} title="Next track">&#9654;</button>

      <button
        className={`audio-btn audio-play-btn ${playing ? 'audio-play-btn--active' : ''}`}
        onClick={handlePlayToggle}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '⏸' : '▶'}
      </button>

      <button className="audio-btn" onClick={handleRestart} title="Restart track">↺</button>

      <div className="audio-progress-container">
        <span className="audio-time-label">{formatTime(currentTime)}</span>
        <input
          type="range"
          className="audio-progress-bar"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={e => handleSeek(Number(e.target.value))}
        />
        <span className="audio-time-label">{formatTime(duration)}</span>
      </div>

      <button
        className="audio-btn audio-speed-btn"
        onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
        title="Playback speed"
      >
        {SPEEDS[speedIdx]}×
      </button>

      <input
        type="range"
        className="audio-volume"
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

export default AudioPlayer;
