import React, { useRef } from 'react';
import type { FAQSection } from '../content/playerGuideData';

interface Props {
  sections: FAQSection[];
  activeSection: string | null;
  onSelectSection: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const GuideSidebar: React.FC<Props> = ({ sections, activeSection, onSelectSection, searchQuery, onSearchChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="guide-sidebar">
      <div className="guide-search">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search the guide..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="guide-search-clear" onClick={() => { onSearchChange(''); inputRef.current?.focus(); }}>
            &times;
          </button>
        )}
      </div>
      <nav className="guide-nav">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`guide-nav-item ${activeSection === s.id && !searchQuery ? 'active' : ''}`}
            onClick={() => { onSearchChange(''); onSelectSection(s.id); }}
          >
            <span className="guide-nav-icon">{s.icon}</span>
            <span className="guide-nav-label">{s.title}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default GuideSidebar;
