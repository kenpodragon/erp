import './LoyaltyProgress.css';

interface Props {
  streak: number;
  cumulative: number;
}

const STREAK_MILESTONES = [
  { months: 3, label: '3mo', desc: '+5% XP/Essence' },
  { months: 6, label: '6mo', desc: '+5% Drop Rate' },
  { months: 12, label: '12mo', desc: '+5% all' },
  { months: 24, label: '24mo', desc: '+Training, +50 shards' },
  { months: 36, label: '36mo', desc: '+50 shards' },
];

const CUMULATIVE_MILESTONES = [
  { months: 1, title: 'the Patron' },
  { months: 6, title: 'the Devoted' },
  { months: 12, title: 'the Eternal Ascendant' },
  { months: 24, title: 'Architect of Elysium' },
  { months: 36, title: 'Voidwalker Ascendant' },
  { months: 48, title: 'Keeper of the Spire' },
  { months: 60, title: 'Elysium Incarnate' },
];

export function LoyaltyProgress({ streak, cumulative }: Props) {
  return (
    <div className="loyalty-progress">
      <h3 className="loyalty-heading">Loyalty Progress</h3>

      <div className="loyalty-track">
        <div className="loyalty-track-label">Streak Bonuses</div>
        <div className="loyalty-milestones">
          {STREAK_MILESTONES.map(m => (
            <div key={m.months} className={`loyalty-node ${streak >= m.months ? 'loyalty-earned' : ''}`}>
              <div className="loyalty-node-icon">{streak >= m.months ? '✓' : '○'}</div>
              <div className="loyalty-node-label">{m.label}</div>
              <div className="loyalty-node-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="loyalty-track">
        <div className="loyalty-track-label">Lifetime Titles</div>
        <div className="loyalty-milestones">
          {CUMULATIVE_MILESTONES.map(m => (
            <div key={m.months} className={`loyalty-node ${cumulative >= m.months ? 'loyalty-earned' : ''}`}>
              <div className="loyalty-node-icon">{cumulative >= m.months ? '✓' : '○'}</div>
              <div className="loyalty-node-label">{m.months}mo</div>
              <div className="loyalty-node-desc">{m.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
