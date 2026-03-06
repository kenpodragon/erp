import { useEffect, useState } from 'react';
import './WelcomeModal.css';

interface ChangelogEntry {
  type: 'feature' | 'improvement' | 'fix';
  text: string;
}

interface ChangelogVersion {
  version: string;
  date: string;
  title: string;
  entries: ChangelogEntry[];
}

interface WelcomeModalProps {
  onClose: () => void;
  onStartTutorial: () => void;
}

const LS_KEY = 'last_seen_changelog_version';

export default function WelcomeModal({ onClose, onStartTutorial }: WelcomeModalProps) {
  const [changelog, setChangelog] = useState<ChangelogVersion | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/changelog.json');
        if (!res.ok) return;
        const data: ChangelogVersion[] = await res.json();
        if (cancelled || !data.length) return;

        const latest = data[0];
        const lastSeen = localStorage.getItem(LS_KEY);

        if (lastSeen !== latest.version) {
          setChangelog(latest);
          setVisible(true);
        }
      } catch {
        // Silently ignore — changelog is non-critical
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function handleDismiss() {
    if (changelog) {
      localStorage.setItem(LS_KEY, changelog.version);
    }
    setVisible(false);
    onClose();
  }

  function handleStartTutorial() {
    if (changelog) {
      localStorage.setItem(LS_KEY, changelog.version);
    }
    setVisible(false);
    onStartTutorial();
  }

  if (!visible || !changelog) return null;

  return (
    <div className="welcome-modal-overlay" onClick={handleDismiss}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <div className="welcome-modal-header">
          <div>
            <h2>{changelog.title}</h2>
            <div className="welcome-modal-version">
              v{changelog.version} &mdash; {changelog.date}
            </div>
          </div>
          <button
            className="welcome-modal-close"
            onClick={handleDismiss}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="welcome-modal-content">
          {changelog.entries.map((entry, i) => (
            <div className="welcome-entry" key={i}>
              <span className={`welcome-badge welcome-badge--${entry.type}`}>
                {entry.type}
              </span>
              <span className="welcome-entry-text">{entry.text}</span>
            </div>
          ))}
        </div>

        <div className="welcome-modal-footer">
          <button
            className="welcome-tutorial-link"
            onClick={handleStartTutorial}
          >
            Start Tutorial
          </button>
          <button className="welcome-dismiss-btn" onClick={handleDismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
