import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './AkashicLog.css';
import { api } from '../../api';

// ── Types ──────────────────────────────────────────────────────────────────

interface Beat {
  id: number;
  sort_order: number;
  content: string | null;
  unlocked: boolean;
  has_hidden_lore: boolean;
  hidden_lore_text: string | null;
  hidden_lore_unlocked: boolean;
  lore_intelligence_threshold: number | null;
  is_new: boolean;
}

interface SceneData {
  id: number;
  scene_number: number;
  title: string | null;
  summary: string | null;
  completed: boolean;
  first_completed_at: string | null;
  beats: Beat[];
}

interface ChapterData {
  id: number;
  chapter_number: number;
  title: string | null;
  completion_pct: number;
  unlocked_beats: number;
  total_beats: number;
  scenes: SceneData[];
}

interface BookData {
  id: number;
  book_number: number;
  title: string;
  completion_pct: number;
  unlocked_beats: number;
  total_beats: number;
  chapters: ChapterData[];
}

interface AkashicLogData {
  total_completion_pct: number;
  total_unlocked: number;
  total_beats: number;
  books: BookData[];
}

// ── Component ──────────────────────────────────────────────────────────────

const AkashicLog: React.FC = () => {
  const [data, setData] = useState<AkashicLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBook, setExpandedBook] = useState<number | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [expandedBeat, setExpandedBeat] = useState<number | null>(null);

  useEffect(() => {
    const fetchLog = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/game/home-base/akashic-log');
        if (!res.ok) throw new Error('Failed to fetch Akashic Log');
        const json = await res.json();
        setData(json);

        // Auto-expand first book
        if (json.books?.length > 0) {
          setExpandedBook(json.books[0].id);
        }

        // Mark as visited — clears "new" badges on next load
        api.patch('/api/players/me/settings', { akashic_last_visited_at: true });
      } catch (err) {
        setError('Failed to load Akashic Log data.');
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, []);

  // ── Search filtering ───────────────────────────────────────────────────

  const highlightText = useCallback((text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="akashic-highlight">{part}</mark> : part
    );
  }, []);

  const filteredData = useMemo(() => {
    if (!data || !searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();

    const filteredBooks: BookData[] = [];
    for (const book of data.books) {
      const filteredChapters: ChapterData[] = [];
      for (const chapter of book.chapters) {
        const filteredScenes: SceneData[] = [];
        for (const scene of chapter.scenes) {
          const filteredBeats = scene.beats.filter(beat => {
            if (!beat.unlocked || !beat.content) return false;
            if (beat.content.toLowerCase().includes(q)) return true;
            if (beat.hidden_lore_unlocked && beat.hidden_lore_text?.toLowerCase().includes(q)) return true;
            return false;
          });
          if (filteredBeats.length > 0) {
            filteredScenes.push({ ...scene, beats: filteredBeats });
          }
        }
        if (filteredScenes.length > 0) {
          filteredChapters.push({ ...chapter, scenes: filteredScenes });
        }
      }
      if (filteredChapters.length > 0) {
        filteredBooks.push({ ...book, chapters: filteredChapters });
      }
    }

    return {
      ...data,
      books: filteredBooks,
    };
  }, [data, searchQuery]);

  const matchCount = useMemo(() => {
    if (!filteredData || !searchQuery.trim()) return 0;
    let count = 0;
    for (const book of filteredData.books) {
      for (const chapter of book.chapters) {
        for (const scene of chapter.scenes) {
          count += scene.beats.length;
        }
      }
    }
    return count;
  }, [filteredData, searchQuery]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="akashic-loading">Synchronizing with the Akashic Record...</div>;
  }

  if (error || !data) {
    return <div className="akashic-error">{error || 'No data available.'}</div>;
  }

  const displayData = filteredData || data;

  return (
    <div className="akashic-log">
      {/* Header */}
      <div className="akashic-header">
        <div className="akashic-title-row">
          <h2 className="akashic-title">The Akashic Log</h2>
          <span className="akashic-total-pct">{data.total_completion_pct}%</span>
        </div>
        <div className="akashic-progress-bar">
          <div className="akashic-progress-fill" style={{ width: `${data.total_completion_pct}%` }} />
        </div>
        <span className="akashic-count">{data.total_unlocked} / {data.total_beats} entries deciphered</span>
      </div>

      {/* Search */}
      <div className="akashic-search">
        <input
          type="text"
          placeholder="Search lore entries..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="akashic-search-input"
        />
        {searchQuery && (
          <span className="akashic-search-count">
            {matchCount} result{matchCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Book list */}
      <div className="akashic-books">
        {displayData.books.length === 0 && searchQuery ? (
          <div className="akashic-empty">No entries match "{searchQuery}"</div>
        ) : displayData.books.length === 0 ? (
          <div className="akashic-empty">No lore data stabilized. Complete scenes to uncover the record.</div>
        ) : (
          displayData.books.map(book => (
            <div key={book.id} className="akashic-book">
              <button
                className={`akashic-book-header ${expandedBook === book.id ? 'expanded' : ''}`}
                onClick={() => setExpandedBook(expandedBook === book.id ? null : book.id)}
              >
                <span className="akashic-expand-icon">{expandedBook === book.id ? '\u25BC' : '\u25B6'}</span>
                <span className="akashic-book-title">{book.title}</span>
                <span className="akashic-book-pct">{book.completion_pct}%</span>
              </button>

              {expandedBook === book.id && (
                <div className="akashic-chapters">
                  {book.chapters.map(chapter => (
                    <div key={chapter.id} className="akashic-chapter">
                      <button
                        className={`akashic-chapter-header ${expandedChapter === chapter.id ? 'expanded' : ''}`}
                        onClick={() => setExpandedChapter(expandedChapter === chapter.id ? null : chapter.id)}
                      >
                        <span className="akashic-expand-icon">{expandedChapter === chapter.id ? '\u25BC' : '\u25B6'}</span>
                        <span className="akashic-chapter-title">{chapter.title || `Chapter ${chapter.chapter_number}`}</span>
                        <div className="akashic-chapter-bar">
                          <div className="akashic-chapter-fill" style={{ width: `${chapter.completion_pct}%` }} />
                        </div>
                        <span className="akashic-chapter-pct">{chapter.completion_pct}%</span>
                      </button>

                      {expandedChapter === chapter.id && (
                        <div className="akashic-scenes">
                          {chapter.scenes.map(scene => (
                            <div key={scene.id} className="akashic-scene">
                              <button
                                className={`akashic-scene-header ${expandedScene === scene.id ? 'expanded' : ''}`}
                                onClick={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}
                              >
                                <span className="akashic-scene-title">
                                  {scene.title || `Scene ${scene.scene_number}`}
                                </span>
                                {scene.completed && <span className="akashic-check" title="Completed">{'\u2713'}</span>}
                                {scene.beats.some(b => b.is_new) && (
                                  <span className="akashic-new-badge">NEW</span>
                                )}
                              </button>

                              {expandedScene === scene.id && (
                                <div className="akashic-beats">
                                  {scene.beats.map(beat => (
                                    <div
                                      key={beat.id}
                                      className={`akashic-beat ${beat.unlocked ? 'unlocked' : 'locked'} ${beat.is_new ? 'new' : ''}`}
                                      onClick={() => beat.unlocked && setExpandedBeat(expandedBeat === beat.id ? null : beat.id)}
                                    >
                                      <div className="akashic-beat-header">
                                        {beat.is_new && <span className="akashic-new-dot" />}
                                        <span className="akashic-beat-label">
                                          {beat.unlocked ? `Entry ${beat.sort_order}` : `[ENCRYPTED]`}
                                        </span>
                                        {beat.has_hidden_lore && (
                                          <span className={`akashic-lore-icon ${beat.hidden_lore_unlocked ? 'unlocked' : 'locked'}`}>
                                            {beat.hidden_lore_unlocked ? '\u{1F513}' : '\u{1F512}'}
                                          </span>
                                        )}
                                      </div>

                                      {beat.unlocked && expandedBeat === beat.id && (
                                        <div className="akashic-beat-detail">
                                          <p className="akashic-beat-content">
                                            {searchQuery ? highlightText(beat.content || '', searchQuery) : beat.content}
                                          </p>

                                          {beat.has_hidden_lore && (
                                            <div className={`akashic-hidden-lore ${beat.hidden_lore_unlocked ? 'revealed' : 'gated'}`}>
                                              {beat.hidden_lore_unlocked ? (
                                                <>
                                                  <span className="akashic-lore-label">Hidden Knowledge</span>
                                                  <p className="akashic-lore-text">
                                                    {searchQuery
                                                      ? highlightText(beat.hidden_lore_text || '', searchQuery)
                                                      : beat.hidden_lore_text}
                                                  </p>
                                                </>
                                              ) : (
                                                <span className="akashic-lore-gated">
                                                  Requires Intelligence {beat.lore_intelligence_threshold} to decipher
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AkashicLog;
