/**
 * NarrativeReveal — Post-boss cinematic lore reveal screen.
 *
 * Shown after defeating a chapter boss or book boss.
 * Displays transition_lore_text from the DB with a cinematic scrolling animation,
 * lists any unlocks, and provides a "Continue" button.
 */
import React, { useEffect, useState } from 'react';
import './NarrativeReveal.css';

interface NarrativeRevealProps {
  loreText: string;
  bossType: 'chapter_boss' | 'book_boss';
  chapterTitle?: string;
  unlocks?: string[];
  onContinue: () => void;
}

const NarrativeReveal: React.FC<NarrativeRevealProps> = ({
  loreText,
  bossType,
  chapterTitle,
  unlocks = [],
  onContinue,
}) => {
  const [visible, setVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  const isBook = bossType === 'book_boss';
  const title = isBook ? 'Book Complete' : 'Chapter Complete';
  const subtitle = chapterTitle ? `— ${chapterTitle} —` : '';

  useEffect(() => {
    // Staged reveal: backdrop → title → text → continue button
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => setTextVisible(true), 800);
    const t3 = setTimeout(() => setShowContinue(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className={`narrative-reveal ${visible ? 'narrative-reveal--visible' : ''} ${isBook ? 'narrative-reveal--book' : ''}`}>
      {/* Star particles */}
      <div className="narrative-reveal__stars">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="nr-star"
            style={{
              left:              `${Math.random() * 100}%`,
              top:               `${Math.random() * 100}%`,
              animationDelay:    `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              width:             `${1 + Math.random() * 2}px`,
              height:            `${1 + Math.random() * 2}px`,
            }}
          />
        ))}
      </div>

      <div className="narrative-reveal__content">
        {/* Title */}
        <div className={`nr-title ${visible ? 'nr-title--in' : ''}`}>
          <span className="nr-star-icon">{isBook ? '✦' : '★'}</span>
          <h1>{title}</h1>
          <span className="nr-star-icon">{isBook ? '✦' : '★'}</span>
        </div>

        {subtitle && (
          <div className={`nr-subtitle ${visible ? 'nr-subtitle--in' : ''}`}>{subtitle}</div>
        )}

        {/* Separator */}
        <div className={`nr-separator ${visible ? 'nr-separator--in' : ''}`}>
          <span className="nr-sep-line" />
          <span className="nr-sep-glyph">{isBook ? '⬡' : '◆'}</span>
          <span className="nr-sep-line" />
        </div>

        {/* Lore text scroll */}
        <div className={`nr-lore-scroll ${textVisible ? 'nr-lore-scroll--in' : ''}`}>
          <p className="nr-lore-text">{loreText}</p>
        </div>

        {/* Unlocks */}
        {unlocks.length > 0 && (
          <div className={`nr-unlocks ${showContinue ? 'nr-unlocks--in' : ''}`}>
            <h3 className="nr-unlocks-title">Unlocked</h3>
            <ul className="nr-unlocks-list">
              {unlocks.map((u, i) => (
                <li key={i} className="nr-unlock-item">
                  <span className="nr-unlock-icon">✦</span> {u}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Continue button */}
        {showContinue && (
          <button className="nr-continue-btn" onClick={onContinue}>
            Continue Your Journey →
          </button>
        )}
      </div>
    </div>
  );
};

export default NarrativeReveal;
