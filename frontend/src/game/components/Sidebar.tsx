import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'skills', label: 'Skills', icon: '⚔️' },
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'shop', label: 'Shop', icon: '💰' },
    { id: 'ascendant', label: 'Ascendant', icon: '★' },
    { id: 'chat', label: 'Chat', icon: '💬' },
  ];

  return (
    <nav className="game-sidebar">
      <div className="sidebar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;
