import React, { useState } from 'react';
import type { HelpSection, HelpEntry } from '../content/adminHelpData';

function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

interface ScreenshotProps { src: string; alt: string; }

const HelpScreenshot: React.FC<ScreenshotProps> = ({ src, alt }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="help-screenshot" onClick={() => setOpen(true)}>
        <img src={`/help/${src}`} alt={alt} loading="lazy" />
        <span className="help-screenshot-hint">Click to enlarge</span>
      </div>
      {open && (
        <div className="help-lightbox" onClick={() => setOpen(false)}>
          <img src={`/help/${src}`} alt={alt} />
          <button className="help-lightbox-close">&times;</button>
        </div>
      )}
    </>
  );
};

interface Props {
  sections: HelpSection[];
  activeSection: string | null;
  searchResults: HelpEntry[] | null;
  searchQuery: string;
}

const HelpContent: React.FC<Props> = ({ sections, activeSection, searchResults, searchQuery }) => {
  if (searchResults) {
    return (
      <div className="help-content">
        <h2 className="help-content-title">
          Search results for &ldquo;{searchQuery}&rdquo; ({searchResults.length})
        </h2>
        {searchResults.length === 0 && (
          <p className="help-no-results">No matches found. Try a different term.</p>
        )}
        {searchResults.map((entry) => (
          <div key={entry.id} className="help-entry">
            <h3 dangerouslySetInnerHTML={{ __html: highlightMatch(entry.question, searchQuery) }} />
            <div className="help-answer" dangerouslySetInnerHTML={{ __html: entry.answer }} />
            {entry.screenshot && <HelpScreenshot src={entry.screenshot} alt={entry.screenshotAlt || entry.question} />}
          </div>
        ))}
      </div>
    );
  }

  const section = sections.find((s) => s.id === activeSection) || sections[0];
  if (!section) return null;

  return (
    <div className="help-content">
      <h2 className="help-content-title">
        <span className="help-section-icon">{section.icon}</span> {section.title}
      </h2>
      {section.entries.map((entry) => (
        <div key={entry.id} className="help-entry">
          <h3>{entry.question}</h3>
          <div className="help-answer" dangerouslySetInnerHTML={{ __html: entry.answer }} />
          {entry.screenshot && <HelpScreenshot src={entry.screenshot} alt={entry.screenshotAlt || entry.question} />}
        </div>
      ))}
    </div>
  );
};

export default HelpContent;
