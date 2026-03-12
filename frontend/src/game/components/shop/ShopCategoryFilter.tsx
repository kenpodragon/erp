import React from 'react';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'skin', label: 'Skins' },
  { key: 'flair', label: 'Flair' },
  { key: 'badge', label: 'Badges' },
  { key: 'avatar', label: 'Avatars' },
  { key: 'booster', label: 'Boosters' },
  { key: 'bundle', label: 'Bundles' },
];

interface Props {
  selected: string;
  onChange: (category: string) => void;
}

const ShopCategoryFilter: React.FC<Props> = ({ selected, onChange }) => (
  <div className="emporium-category-filter">
    {CATEGORIES.map(c => (
      <button
        key={c.key}
        className={`emporium-cat-btn ${selected === c.key ? 'active' : ''}`}
        onClick={() => onChange(c.key)}
      >
        {c.label}
      </button>
    ))}
  </div>
);

export default ShopCategoryFilter;
