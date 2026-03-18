import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import GuideSidebar from './components/GuideSidebar';
import GuideContent from './components/GuideContent';
import { playerGuideData, type FAQEntry } from './content/playerGuideData';
import './PlayerGuide.css';

function searchEntries(query: string): FAQEntry[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];
  const results: FAQEntry[] = [];
  for (const section of playerGuideData) {
    for (const entry of section.entries) {
      const text = [entry.question, entry.answer.replace(/<[^>]+>/g, ''), ...entry.tags].join(' ').toLowerCase();
      if (text.includes(lower)) results.push(entry);
    }
  }
  return results;
}

const PlayerGuide: React.FC = () => {
  const location = useLocation();
  const hash = location.hash?.replace('#', '') || '';
  const [activeSection, setActiveSection] = useState<string>(hash || playerGuideData[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (hash) {
      setActiveSection(hash);
      setSearchQuery('');
    }
  }, [hash]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    return debouncedQuery ? searchEntries(debouncedQuery) : null;
  }, [debouncedQuery]);

  const handleSelectSection = useCallback((id: string) => {
    setActiveSection(id);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="guide-layout">
      <div className="guide-header">
        <h1>Player Guide</h1>
        <p>Everything you need to know about Elysium Rising — without the hand-holding.</p>
      </div>
      <div className="guide-body">
        <GuideSidebar
          sections={playerGuideData}
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <GuideContent
          sections={playerGuideData}
          activeSection={activeSection}
          searchResults={searchResults}
          searchQuery={debouncedQuery}
        />
      </div>
    </div>
  );
};

export default PlayerGuide;
