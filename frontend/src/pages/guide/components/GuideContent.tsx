import React from 'react';
import GuideScreenshot from './GuideScreenshot';
import type { FAQSection, FAQEntry } from '../content/playerGuideData';

interface Props {
  sections: FAQSection[];
  activeSection: string | null;
  searchResults: FAQEntry[] | null;
  searchQuery: string;
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

const GuideContent: React.FC<Props> = ({ sections, activeSection, searchResults, searchQuery }) => {
  if (searchResults) {
    return (
      <div className="guide-content">
        <h2 className="guide-content-title">
          Search results for &ldquo;{searchQuery}&rdquo; ({searchResults.length})
        </h2>
        {searchResults.length === 0 && (
          <p className="guide-no-results">No matches found. Try a different search term.</p>
        )}
        {searchResults.map((entry) => (
          <div key={entry.id} className="guide-entry" id={entry.id}>
            <h3 dangerouslySetInnerHTML={{ __html: highlightMatch(entry.question, searchQuery) }} />
            <div className="guide-answer" dangerouslySetInnerHTML={{ __html: entry.answer }} />
            {entry.screenshot && (
              <GuideScreenshot src={entry.screenshot} alt={entry.screenshotAlt || entry.question} />
            )}
          </div>
        ))}
      </div>
    );
  }

  const section = sections.find((s) => s.id === activeSection) || sections[0];
  if (!section) return null;

  return (
    <div className="guide-content">
      <h2 className="guide-content-title">
        <span className="guide-section-icon">{section.icon}</span> {section.title}
      </h2>
      {section.entries.map((entry) => (
        <div key={entry.id} className="guide-entry" id={entry.id}>
          <h3>{entry.question}</h3>
          <div className="guide-answer" dangerouslySetInnerHTML={{ __html: entry.answer }} />
          {entry.screenshot && (
            <GuideScreenshot src={entry.screenshot} alt={entry.screenshotAlt || entry.question} />
          )}
        </div>
      ))}
    </div>
  );
};

export default GuideContent;
