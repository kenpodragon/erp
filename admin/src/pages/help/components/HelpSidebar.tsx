import React, { useRef } from 'react';
import type { HelpSection } from '../content/adminHelpData';

interface Props {
  sections: HelpSection[];
  activeSection: string | null;
  onSelectSection: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const HelpSidebar: React.FC<Props> = ({ sections, activeSection, onSelectSection, searchQuery, onSearchChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="help-sidebar">
      <div className="help-search">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search help..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="help-search-clear" onClick={() => { onSearchChange(''); inputRef.current?.focus(); }}>
            &times;
          </button>
        )}
      </div>
      <nav className="help-nav">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`help-nav-item ${activeSection === s.id && !searchQuery ? 'active' : ''}`}
            onClick={() => { onSearchChange(''); onSelectSection(s.id); }}
          >
            <span className="help-nav-icon">{s.icon}</span>
            <span className="help-nav-label">{s.title}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default HelpSidebar;
