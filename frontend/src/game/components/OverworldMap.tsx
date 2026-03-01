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
  required_time_seconds: number;
  sort_order: number;
  status?: 'locked' | 'available' | 'completed' | 'mastered';
}

interface Chapter {
  id: number;
  name: string;
  title?: string;
  sort_order: number;
  progress?: number; // 0-100 percentage
  scenes: Scene[];
}

const OverworldMap: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const { enterScene } = useGame();

  // Mocking book IDs for now as we transition
  const books = [
    { id: 1, title: 'Book 1: The Ascent', status: 'available' },
    { id: 2, title: 'Book 2: The Core', status: 'locked' },
    { id: 3, title: 'Book 3: The Beyond', status: 'locked' },
  ];

  const enrichedBooks = books.map(book => {
    // Chapters 1-4 = Book 1, 5-8 = Book 2, etc.
    const bookChapters = chapters.filter(ch => ch.id >= (book.id - 1) * 4 + 1 && ch.id <= book.id * 4);
    const avgProgress = bookChapters.length > 0 
      ? Math.round(bookChapters.reduce((acc, ch) => acc + (ch.progress || 0), 0) / bookChapters.length)
      : 0;
    return { ...book, progress: avgProgress };
  });

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
          // For now, manually mock status since progress tracking isn't fully implemented
          const enrichedData = data.map((ch: Chapter, chIdx: number) => ({
            ...ch,
            progress: 0, // Everyone starts at 0% for now
            scenes: ch.scenes.map((sc: Scene, scIdx: number) => ({
              ...sc,
              status: chIdx === 0 && scIdx === 0 ? 'available' : 'locked'
            }))
          }));
          setChapters(enrichedData);
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
        {enrichedBooks.map(book => (
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
                <div className="progress-fill" style={{ width: `${book.progress}%` }} />
              </div>
              <span className="progress-text">{book.progress}%</span>
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
                {chapters.map((chapter) => (
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
                            onClick={() => scene.status !== 'locked' && setSelectedScene(scene)}
                          >
                            <div className="node-circle">
                              {scene.status === 'completed' && <span className="check">✓</span>}
                              {scene.status === 'locked' && <span className="lock">🔒</span>}
                            </div>
                            <div className="scene-label-container">
                              <span className="chapter-prefix">{(chapter.title || chapter.name || '').split(':')[0] || `Chapter ${chapter.sort_order}`}</span>
                              <span className="scene-number">{chapter.sort_order}-{scene.sort_order}</span>
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
