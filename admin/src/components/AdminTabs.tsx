import './AdminTabs.css';

interface Tab {
  key: string;
  label: string;
}

interface AdminTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  variant?: 'primary' | 'secondary';
}

export default function AdminTabs({ tabs, activeTab, onTabChange, variant = 'primary' }: AdminTabsProps) {
  return (
    <div className={`admin-tabs admin-tabs--${variant}`}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`admin-tab ${activeTab === tab.key ? 'admin-tab--active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
