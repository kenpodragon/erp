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
  gameplay_data?: {
    required_time_seconds: number;
  } | null;
  sort_order: number;
  status?: 'locked' | 'available' | 'completed' | 'mastered';
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
}

const OverworldMap: React.FC = () => {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

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
                      {chapter.scenes.map((scene, index) => (
                        <React.Fragment key={scene.id}>
                          <div 
                            className={`scene-node ${scene.status || 'locked'}`}
                            onClick={() => {
                              if (scene.status !== 'locked') {
                                setSelectedScene(scene);
                                setVisualChapter(chapter.chapter_number);
                              }
                            }}
                          >
                            <div className="node-circle">
                              {(scene.status === 'completed' || scene.status === 'mastered') && <span className="check">✓</span>}
                              {scene.status === 'locked' && <span className="lock">🔒</span>}
                              {scene.status === 'in_progress' && <span className="pulse-dot" />}
                              {scene.status === 'mastered' && <div className="mastery-star">★</div>}
                            </div>
                            <div className="scene-label-container">
                              <span className="chapter-prefix">{(chapter.title || chapter.name || '').split(':')[0] || `Chapter ${chapter.chapter_number}`}</span>
                              <span className="scene-number">{chapter.chapter_number}-{scene.sort_order}</span>
                              <span className="scene-name">{scene.title || scene.name}</span>
                            </div>
                          </div>
                          {index < chapter.scenes.length - 1 && (
                            <div className={`node-connector ${(chapter.scenes[index+1].status && chapter.scenes[index+1].status !== 'locked') ? 'active' : ''}`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
          onClose={() => setSelectedScene(null)} 
          onEnter={(id) => {
            enterScene(id.toString());
            setSelectedScene(null);
          }}
        />
      )}
    </div>
  );
};

export default OverworldMap;
