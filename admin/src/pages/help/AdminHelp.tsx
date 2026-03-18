import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import HelpSidebar from './components/HelpSidebar';
import HelpContent from './components/HelpContent';
import { adminHelpData, type HelpEntry } from './content/adminHelpData';
import './AdminHelp.css';

function searchEntries(query: string): HelpEntry[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];
  const results: HelpEntry[] = [];
  for (const section of adminHelpData) {
    for (const entry of section.entries) {
      const text = [entry.question, entry.answer.replace(/<[^>]+>/g, ''), ...entry.tags].join(' ').toLowerCase();
      if (text.includes(lower)) results.push(entry);
    }
  }
  return results;
}

const AdminHelp: React.FC = () => {
  const location = useLocation();
  const hash = location.hash?.replace('#', '') || '';
  const [activeSection, setActiveSection] = useState<string>(hash || adminHelpData[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (hash) { setActiveSection(hash); setSearchQuery(''); }
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
    <div className="admin-help-layout">
      <div className="admin-help-header">
        <h1>Admin Help</h1>
        <p>Quick reference for managing Elysium Rising.</p>
      </div>
      <div className="admin-help-body">
        <HelpSidebar
          sections={adminHelpData}
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <HelpContent
          sections={adminHelpData}
          activeSection={activeSection}
          searchResults={searchResults}
          searchQuery={debouncedQuery}
        />
      </div>
    </div>
  );
};

export default AdminHelp;
