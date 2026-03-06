import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import './DiscoveryLibrary.css';

type TabKey = 'skills' | 'prefixes' | 'suffixes' | 'qualities' | 'effects';

interface LibraryEntry {
  id: number;
  name: string;
  description: string | null;
  is_new: boolean;
  category?: string;
}

interface LibraryResponse {
  skills: LibraryEntry[];
  prefixes: LibraryEntry[];
  suffixes: LibraryEntry[];
  qualities: LibraryEntry[];
  effects: LibraryEntry[];
}

const TAB_LABELS: Record<TabKey, string> = {
  skills: 'Skills',
  prefixes: 'Prefixes',
  suffixes: 'Suffixes',
  qualities: 'Qualities',
  effects: 'Effects',
};

const DiscoveryLibrary: React.FC = () => {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('skills');
  const [loading, setLoading] = useState(true);
  const [hasNew, setHasNew] = useState<Record<TabKey, boolean>>({
    skills: false,
    prefixes: false,
    suffixes: false,
    qualities: false,
    effects: false,
  });

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/game/registry/library');
      if (res.ok) {
        const result: LibraryResponse = await res.json();
        setData(result);
        // Track which tabs have new entries
        const newFlags: Record<TabKey, boolean> = {
          skills: result.skills.some((e) => e.is_new),
          prefixes: result.prefixes.some((e) => e.is_new),
          suffixes: result.suffixes.some((e) => e.is_new),
          qualities: result.qualities.some((e) => e.is_new),
          effects: result.effects.some((e) => e.is_new),
        };
        setHasNew(newFlags);
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleTabChange = async (tab: TabKey) => {
    setActiveTab(tab);
    // Clear new badges for this tab on the server
    if (data && hasNew[tab]) {
      try {
        await api.patch('/api/game/registry/clear-new', { category: tab });
        setHasNew((prev) => ({ ...prev, [tab]: false }));
        // Mark entries as not new locally
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [tab]: prev[tab].map((e) => ({ ...e, is_new: false })),
          };
        });
      } catch {
        // Silently fail — badges will be cleared next visit
      }
    }
  };

  const entries = data ? data[activeTab] : [];

  return (
    <div className="discovery-library">
      <h2 className="library-title">Discovery Library</h2>

      <div className="library-tabs">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            className={`library-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {TAB_LABELS[tab]}
            {hasNew[tab] && <span className="tab-new-dot" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="library-loading">Loading...</div>
      ) : (
        <div className="library-list">
          {entries.length === 0 ? (
            <div className="library-empty">No discoveries yet.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="library-entry">
                <div className="entry-header">
                  <span className="entry-name">{entry.name}</span>
                  {entry.is_new && <span className="entry-new-badge">New</span>}
                </div>
                {entry.description && (
                  <p className="entry-description">{entry.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DiscoveryLibrary;
