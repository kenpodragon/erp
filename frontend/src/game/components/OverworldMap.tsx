import React, { useEffect, useState } from 'react';
import './OverworldMap.css';
import { api } from '../../api';
import ChapterInfoPanel from './ChapterInfoPanel';
import { useGame } from '../GameContext';

interface Scene {
  id: number;
  chapter_id: number;
  name: string;
  title?: string;
  summary?: string;
  gameplay_data?: {
    required_time_seconds: number;
  } | null;
  boss_config?: {
    timer_seconds?: number;
    hp_multiplier?: number;
    interrupt_interval_min?: number;
    interrupt_interval_max?: number;
    interrupt_clicks_required?: number;
  } | null;
  sort_order: number;
  status?: 'locked' | 'available' | 'completed' | 'mastered' | 'in_progress';
  scene_type?: 'normal' | 'chapter_boss' | 'book_boss';
}

interface Chapter {
  id: number;
  book_id: number;
  chapter_number: number;
  title?: string;
  name?: string;
  sort_order: number;
  progress?: number; 
  scenes: Scene[];
}

interface BookData {
  id: number;
  title: string;
  author?: string;
  description?: string;
  status?: 'locked' | 'available' | 'completed';
  progress?: number;
  chapters: Chapter[];
  book_boss?: Scene | null;
}

const OverworldMap: React.FC = () => {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string | undefined>(undefined);

  const { enterScene, setVisualChapter } = useGame();

  const scrollToBook = (bookId: number) => {
    const element = document.getElementById(`book-section-${bookId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const res = await api.get('/api/game/map');
        if (res.ok) {
          const data = await res.json();
          setBooks(data);
        } else {
          setError('Failed to load map data');
        }
      } catch (err) {
        setError('Could not reach server');
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, []);

  if (loading) return <div className="placeholder-view">Loading Map...</div>;
  if (error) return <div className="placeholder-view" style={{ color: '#ff4444' }}>{error}</div>;

  return (
    <div className="overworld-map-wrapper">
      {/* Book Navigation Sidebar */}
      <aside className="book-nav-sidebar">
        <div className="book-nav-title">Chronicles</div>
        {books.map(book => (
          <button 
            key={book.id} 
            className={`book-nav-item ${book.status}`}
            onClick={() => scrollToBook(book.id)}
          >
            <div className="book-nav-info">
              <span className="book-num">#{book.id}</span>
              <span className="book-title-mini">{(book.title || '').split(':')[1] || book.title}</span>
            </div>
            <div className="book-nav-progress">
              <div className="progress-bar-mini">
                <div className="progress-fill" style={{ width: `${book.progress || 0}%` }} />
              </div>
              <span className="progress-text">{book.progress || 0}%</span>
            </div>
          </button>
        ))}
      </aside>

      <div className="overworld-map-content">
        <h2 className="map-title">Towers of Elysium</h2>
        <div className="chapters-list">
          {books.map(book => (
            <section key={book.id} id={`book-section-${book.id}`} className={`book-section ${book.status}`}>
              <h2 className="book-section-title">{book.title}</h2>
              <div className="book-chapters">
                {book.chapters.map((chapter) => (
                  <div key={chapter.id} className="chapter-row">
                    <div className="chapter-header">
                      <h3 className="chapter-name">{chapter.title || chapter.name}</h3>
                      <div className="chapter-progress-pill">
                        <span className="progress-value">{chapter.progress || 0}%</span>
                        <div className="progress-bar-mini">
                          <div className="progress-fill" style={{ width: `${chapter.progress || 0}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="scenes-horizontal">
                      {chapter.scenes.map((scene, index) => {
                        const isBossNode = scene.scene_type === 'chapter_boss' || scene.scene_type === 'book_boss';
                        const isBookBoss = scene.scene_type === 'book_boss';
                        return (
                          <React.Fragment key={scene.id}>
                            {/* Connector before boss node */}
                            {isBossNode && chapter.scenes.length > 1 && (
                              <div className={`node-connector ${scene.status !== 'locked' ? 'active' : ''}`} />
                            )}
                            <div
                              className={[
                                'scene-node',
                                scene.status || 'locked',
                                isBossNode ? 'scene-node--boss' : '',
                                isBookBoss ? 'scene-node--book-boss' : '',
                              ].filter(Boolean).join(' ')}
                              onClick={() => {
                                if (scene.status !== 'locked') {
                                  setSelectedScene(scene);
                                  setSelectedChapterTitle(chapter.title || chapter.name);
                                  setVisualChapter(chapter.chapter_number);
                                }
                              }}
                              title={isBossNode ? (isBookBoss ? 'Book Boss — Clear to advance to the next book' : 'Chapter Boss — Clear to advance to the next chapter') : undefined}
                            >
                              <div className="node-circle">
                                {isBossNode ? (
                                  <>
                                    <span className="boss-star-icon">{scene.status === 'mastered' ? '★' : '☆'}</span>
                                    {scene.status === 'available' && <span className="boss-available-pulse" />}
                                  </>
                                ) : (
                                  <>
                                    {(scene.status === 'completed' || scene.status === 'mastered') && <span className="check">✓</span>}
                                    {scene.status === 'locked' && <span className="lock">🔒</span>}
                                    {scene.status === 'in_progress' && <span className="pulse-dot" />}
                                    {scene.status === 'mastered' && <div className="mastery-star">★</div>}
                                  </>
                                )}
                              </div>
                              <div className="scene-label-container">
                                {isBossNode ? (
                                  <>
                                    <span className="boss-node-label">{isBookBoss ? 'BOOK BOSS' : 'BOSS'}</span>
                                    <span className="scene-name">{scene.title || (isBookBoss ? 'Book Boss' : 'Chapter Boss')}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="chapter-prefix">{(chapter.title || chapter.name || '').split(':')[0] || `Chapter ${chapter.chapter_number}`}</span>
                                    <span className="scene-number">{chapter.chapter_number}-{scene.sort_order}</span>
                                    <span className="scene-name">{scene.title || scene.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Standard connector between normal scenes */}
                            {!isBossNode && index < chapter.scenes.length - 1 && !chapter.scenes[index + 1]?.scene_type?.includes('boss') && (
                              <div className={`node-connector ${(chapter.scenes[index+1].status && chapter.scenes[index+1].status !== 'locked') ? 'active' : ''}`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Book Boss Row — Separate from chapters */}
              {book.book_boss && (
                <div className="book-boss-row">
                  <div className="book-boss-divider" />
                  <div className="book-boss-container">
                    <div
                      className={[
                        'scene-node',
                        'scene-node--boss',
                        'scene-node--book-boss',
                        book.book_boss.status || 'locked',
                      ].filter(Boolean).join(' ')}
                      onClick={() => {
                        if (book.book_boss && book.book_boss.status !== 'locked') {
                          setSelectedScene(book.book_boss);
                          setSelectedChapterTitle(book.title);
                          setVisualChapter(book.id * 10); // arbitrary unique chapter id for book boss
                        }
                      }}
                      title="Book Boss — Final trial of the current chronicle"
                    >
                      <div className="node-circle">
                        <span className="boss-star-icon">{book.book_boss.status === 'mastered' ? '★' : '☆'}</span>
                        {book.book_boss.status === 'available' && <span className="boss-available-pulse" />}
                      </div>
                      <div className="scene-label-container">
                        <span className="boss-node-label">FINAL BOOK BOSS</span>
                        <span className="scene-name">{book.book_boss.title || 'The Guardian'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="book-boss-divider" />
                </div>
              )}

              {book.status === 'locked' && (
                <div className="locked-book-placeholder">
                  Complete the previous book to unlock.
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
...

      {selectedScene && (
        <ChapterInfoPanel
          scene={selectedScene}
          chapterTitle={selectedChapterTitle}
          onClose={() => { setSelectedScene(null); setSelectedChapterTitle(undefined); }}
          onEnter={(id) => {
            enterScene(id.toString());
            setSelectedScene(null);
            setSelectedChapterTitle(undefined);
          }}
        />
      )}
    </div>
  );
};

export default OverworldMap;
