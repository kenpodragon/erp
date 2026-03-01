import React from 'react';
import { useGame } from '../GameContext';

const StoryMode: React.FC = () => {
  const { state, exitScene } = useGame();

  return (
    <div className="placeholder-view" style={{ flexDirection: 'column', gap: '2rem' }}>
      <h2 style={{ color: '#fff' }}>Loop B: Story Mode</h2>
      <p>Active Scene ID: {state.activeSceneId}</p>
      
      <div style={{ 
        width: '300px', 
        height: '200px', 
        border: '2px dashed #444', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: '#666'
      }}>
        Combat Canvas Placeholder (Loop B Engine)
      </div>

      <button 
        className="btn-primary" 
        onClick={exitScene}
        style={{ padding: '0.5rem 2rem' }}
      >
        Exit to Map
      </button>
    </div>
  );
};

export default StoryMode;
