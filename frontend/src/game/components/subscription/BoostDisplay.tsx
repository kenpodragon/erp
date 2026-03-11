import './BoostDisplay.css';

interface Boosts {
  xp: number;
  essence: number;
  drop_rate: number;
  training_speed: number;
  stipend_shards: number;
  is_ascendant: boolean;
  continuous_streak: number;
  cumulative_months: number;
}

interface Props {
  boosts: Boosts;
}

function formatMult(val: number): string {
  return val.toFixed(2) + 'x';
}

export function BoostDisplay({ boosts }: Props) {
  const rows = [
    { label: 'XP', value: boosts.xp, base: 1.15 },
    { label: 'Essence', value: boosts.essence, base: 1.15 },
    { label: 'Drop Rate', value: boosts.drop_rate, base: 1.10 },
    { label: 'Training Speed', value: boosts.training_speed, base: 1.10 },
  ];

  return (
    <div className="boost-display">
      <h3 className="boost-heading">Active Boosts</h3>
      <div className="boost-grid">
        {rows.map(r => {
          const streakBonus = r.value - r.base;
          return (
            <div key={r.label} className="boost-row">
              <span className="boost-label">{r.label}</span>
              <span className="boost-value">{formatMult(r.value)}</span>
              {streakBonus > 0.001 && (
                <span className="boost-streak-bonus">+{(streakBonus * 100).toFixed(0)}% streak</span>
              )}
            </div>
          );
        })}
        <div className="boost-row">
          <span className="boost-label">Monthly Shards</span>
          <span className="boost-value">{boosts.stipend_shards}</span>
        </div>
      </div>
    </div>
  );
}
