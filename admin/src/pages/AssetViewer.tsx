import { useState, useEffect } from 'react';
import { api } from '../api';
import AdminTabs from '../components/AdminTabs';
import './AssetViewer.css';

/* ── Type definitions ── */

interface ParallaxLayer {
  colors?: string[];
  scroll_speed?: number;
}

interface ParallaxConfig {
  far?: ParallaxLayer;
  mid?: ParallaxLayer;
  near?: ParallaxLayer;
}

interface BackgroundData {
  id: number;
  name: string;
  background_key: string;
  mood: string | null;
  parallax_config: ParallaxConfig | null;
  color_palette: Record<string, unknown> | null;
}

interface EntityData {
  id: number;
  sprite_key: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  canonical_name: string;
  entity_type: string | null;
  movement_name: string | null;
  size_name: string | null;
  animation_name: string | null;
  silhouette_name: string | null;
}

interface AttackTypeData {
  id: number;
  name: string;
  attack_animation_type: string | null;
  projectile_color: string | null;
  trail_type: string | null;
  impact_effect: string | null;
}

interface ItemSpriteData {
  id: number;
  asset_key: string;
  display_name: string | null;
  category: string;
  render_definition: Record<string, unknown> | null;
  tags: string[] | null;
}

interface AchievementData {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  icon_sprite_key: string | null;
  icon_render: Record<string, unknown> | null;
}

interface CuratedArtifactData {
  id: number;
  name: string;
  source_type: string | null;
  rarity: string | null;
  icon_sprite_key: string | null;
  icon_render: Record<string, unknown> | null;
}

interface EntityFamilyData {
  family_name: string;
  count: number;
}

interface BossLoreData {
  id: number;
  title: string;
  chapter_number: number;
  transition_lore_text: string;
  book_title: string;
}

interface SceneCoverage {
  total_scenes: number;
  with_atmosphere: number;
  with_background: number;
  missing_atmosphere: number;
  missing_background: number;
}

interface AssetPreviewResponse {
  backgrounds: BackgroundData[];
  entities: EntityData[];
  attack_types: AttackTypeData[];
  item_sprites: ItemSpriteData[];
  achievements: AchievementData[];
  curated_artifacts: CuratedArtifactData[];
  entity_families: EntityFamilyData[];
  boss_lore: BossLoreData[];
  scene_coverage: SceneCoverage;
}

/* ── Silhouette SVG paths ── */

const SILHOUETTE_PATHS: Record<string, string> = {
  blob: 'M 0,-20 C 15,-25 25,-10 20,5 C 15,20 -15,20 -20,5 C -25,-10 -15,-25 0,-20 Z',
  quadruped: 'M -15,-10 L -10,-20 L 0,-15 L 10,-20 L 15,-10 L 20,0 L 15,10 L -15,10 L -20,0 Z',
  biped: 'M 0,-25 L 8,-15 L 12,0 L 8,5 L 12,20 L 5,25 L 0,10 L -5,25 L -12,20 L -8,5 L -12,0 L -8,-15 Z',
  orb: 'M 0,-15 C 15,-15 15,15 0,15 C -15,15 -15,-15 0,-15 Z',
  winged: 'M 0,-20 L 25,-10 L 15,0 L 20,15 L 0,10 L -20,15 L -15,0 L -25,-10 Z',
  cluster: 'M -8,-12 C -3,-17 3,-17 8,-12 C 13,-7 13,3 8,8 C 3,13 -3,13 -8,8 C -13,3 -13,-7 -8,-12 Z',
};

/* ── Tab definitions ── */

const TABS = [
  { key: 'backgrounds', label: 'Backgrounds' },
  { key: 'entities', label: 'Entity Sprites' },
  { key: 'attacks', label: 'Attack Types' },
  { key: 'items', label: 'Item Sprites' },
  { key: 'icons', label: 'Achievements & Artifacts' },
  { key: 'families', label: 'Entity Families' },
  { key: 'lore', label: 'Boss Lore' },
  { key: 'coverage', label: 'Scene Coverage' },
];

/* ── Helpers ── */

function getLayerColors(layer?: ParallaxLayer): string[] {
  return layer?.colors?.length ? layer.colors : ['#111', '#222', '#333'];
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item) || 'unassigned';
    (result[k] ??= []).push(item);
  }
  return result;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#2ecc71',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
};

/* ── Sub-components ── */

function BackgroundCard({ bg }: { bg: BackgroundData }) {
  const cfg = bg.parallax_config || {};
  const far = getLayerColors(cfg.far);
  const mid = getLayerColors(cfg.mid);
  const near = getLayerColors(cfg.near);

  return (
    <div className="av-card">
      <div className="av-bg-preview">
        <div className="av-bg-layer" style={{ background: `linear-gradient(90deg, ${far.join(', ')})` }} />
        <div className="av-bg-layer" style={{ background: `linear-gradient(90deg, ${mid.join(', ')})`, opacity: 0.7 }} />
        <div className="av-bg-layer" style={{ background: `linear-gradient(90deg, ${near.join(', ')})`, opacity: 0.5 }} />
        <span className="av-bg-label">far / mid / near</span>
      </div>
      <div className="av-card-info">
        <span className="av-card-title">{bg.background_key}</span>
        <span className="av-badge">{bg.mood || 'no mood'}</span>
      </div>
    </div>
  );
}

function EntityCard({ entity }: { entity: EntityData }) {
  const hasVisual = !!(entity.color_primary || entity.silhouette_name);
  const path = SILHOUETTE_PATHS[entity.silhouette_name || ''] || SILHOUETTE_PATHS.blob;

  return (
    <div className="av-card av-card--entity">
      <div className="av-entity-sprite">
        {hasVisual ? (
          <svg viewBox="-30 -30 60 60" width="60" height="60">
            <defs>
              <radialGradient id={`eg-${entity.id}`}>
                <stop offset="0%" stopColor={entity.color_primary || '#666'} />
                <stop offset="100%" stopColor={entity.color_secondary || entity.color_primary || '#333'} />
              </radialGradient>
            </defs>
            <path d={path} fill={`url(#eg-${entity.id})`} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </svg>
        ) : (
          <div className="av-no-visual">?</div>
        )}
      </div>
      <div className="av-card-info">
        <span className="av-card-title">{entity.canonical_name}</span>
        {!hasVisual && <span className="av-badge av-badge--warn">no visual data</span>}
        {entity.silhouette_name && <span className="av-badge">{entity.silhouette_name}</span>}
        {entity.size_name && <span className="av-badge">{entity.size_name}</span>}
        {entity.movement_name && <span className="av-badge">{entity.movement_name}</span>}
        {entity.animation_name && <span className="av-badge">{entity.animation_name}</span>}
        {entity.color_primary && (
          <span className="av-color-swatch" title={entity.color_primary}>
            <span className="av-swatch" style={{ background: entity.color_primary }} />
            <span className="av-swatch" style={{ background: entity.color_secondary || 'transparent' }} />
          </span>
        )}
      </div>
    </div>
  );
}

function AttackCard({ atk }: { atk: AttackTypeData }) {
  return (
    <div className="av-card av-card--attack">
      <div className="av-attack-preview">
        <svg viewBox="0 0 60 60" width="60" height="60">
          <circle cx="30" cy="30" r="18" fill={atk.projectile_color || '#666'} opacity="0.9" />
          <circle cx="30" cy="30" r="12" fill={atk.projectile_color || '#888'} opacity="0.6" />
          <circle cx="30" cy="30" r="6" fill="#fff" opacity="0.3" />
        </svg>
      </div>
      <div className="av-card-info">
        <span className="av-card-title">{atk.name}</span>
        {atk.attack_animation_type && <span className="av-badge">{atk.attack_animation_type}</span>}
        {atk.trail_type && <span className="av-badge av-badge--trail">{atk.trail_type} trail</span>}
        {atk.impact_effect && <span className="av-badge av-badge--impact">{atk.impact_effect} impact</span>}
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: ItemSpriteData }) {
  const rd = item.render_definition || {};
  const shape = (rd as Record<string, string>).shape || 'circle';
  const color = (rd as Record<string, string>).color || '#888';

  return (
    <div className="av-card av-card--item">
      <div className="av-item-preview">
        <svg viewBox="0 0 40 40" width="40" height="40">
          {shape === 'circle' ? (
            <circle cx="20" cy="20" r="14" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          ) : (
            <rect x="6" y="6" width="28" height="28" rx="4" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          )}
        </svg>
      </div>
      <div className="av-card-info">
        <span className="av-card-title">{item.display_name || item.asset_key}</span>
        {item.tags && item.tags.length > 0 && (
          <span className="av-badge">{(item.tags as string[]).join(', ')}</span>
        )}
      </div>
    </div>
  );
}

function IconCard({ name, category, rarity, spriteKey }: {
  name: string;
  category?: string | null;
  rarity?: string | null;
  spriteKey?: string | null;
}) {
  const color = rarity
    ? RARITY_COLORS[rarity.toLowerCase()] || '#888'
    : '#646cff';

  return (
    <div className="av-card av-card--icon">
      <div className="av-icon-placeholder" style={{ borderColor: color }}>
        <span style={{ color }}>{name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="av-card-info">
        <span className="av-card-title">{name}</span>
        {category && <span className="av-badge">{category}</span>}
        {rarity && <span className="av-badge" style={{ color: RARITY_COLORS[rarity.toLowerCase()] }}>{rarity}</span>}
        {spriteKey ? (
          <span className="av-badge av-badge--ok">{spriteKey}</span>
        ) : (
          <span className="av-badge av-badge--warn">no icon</span>
        )}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: EntityFamilyData[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="av-bar-chart">
      {data.map(d => (
        <div key={d.family_name} className="av-bar-row">
          <span className="av-bar-label">{d.family_name}</span>
          <div className="av-bar-track">
            <div
              className="av-bar-fill"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="av-bar-count">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function PieSegment({ pct, color, label, value }: { pct: number; color: string; label: string; value: number }) {
  return (
    <div className="av-pie-legend-item">
      <span className="av-pie-dot" style={{ background: color }} />
      <span>{label}: <strong>{value}</strong> ({pct.toFixed(1)}%)</span>
    </div>
  );
}

function CoveragePanel({ cov }: { cov: SceneCoverage }) {
  const total = cov.total_scenes || 1;
  const atmPct = (cov.with_atmosphere / total) * 100;
  const bgPct = (cov.with_background / total) * 100;

  return (
    <div className="av-coverage">
      <h3>Scene Assignment Coverage</h3>
      <div className="av-coverage-grid">
        <div className="av-coverage-stat">
          <span className="av-stat-num">{cov.total_scenes}</span>
          <span className="av-stat-label">Total Scenes</span>
        </div>

        <div className="av-coverage-block">
          <h4>Atmosphere Assignment</h4>
          <div className="av-progress-track">
            <div className="av-progress-fill av-progress--atm" style={{ width: `${atmPct}%` }} />
          </div>
          <PieSegment pct={atmPct} color="#4caf50" label="Assigned" value={cov.with_atmosphere} />
          <PieSegment pct={100 - atmPct} color="#ff4444" label="Missing" value={cov.missing_atmosphere} />
        </div>

        <div className="av-coverage-block">
          <h4>Background Assignment</h4>
          <div className="av-progress-track">
            <div className="av-progress-fill av-progress--bg" style={{ width: `${bgPct}%` }} />
          </div>
          <PieSegment pct={bgPct} color="#646cff" label="Assigned" value={cov.with_background} />
          <PieSegment pct={100 - bgPct} color="#ff4444" label="Missing" value={cov.missing_background} />
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */

export default function AssetViewer() {
  const [tab, setTab] = useState('backgrounds');
  const [data, setData] = useState<AssetPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/admin/visual/asset-preview');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load asset data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="av-loading">Loading asset data...</div>;
  if (error) return <div className="av-error">Error: {error}</div>;
  if (!data) return null;

  const bgGroups = groupBy(data.backgrounds, b => b.mood || 'unassigned');

  return (
    <div className="asset-viewer">
      <h1 className="av-title">Asset Viewer</h1>
      <p className="av-subtitle">Visual preview of all generated game assets</p>

      <AdminTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {/* 1. Backgrounds */}
      {tab === 'backgrounds' && (
        <div className="av-section">
          <p className="av-section-info">{data.backgrounds.length} backgrounds across {Object.keys(bgGroups).length} moods</p>
          {Object.entries(bgGroups).map(([mood, bgs]) => (
            <div key={mood} className="av-group">
              <h3 className="av-group-title">{mood} <span className="av-count">({bgs.length})</span></h3>
              <div className="av-grid av-grid--bg">
                {bgs.map(bg => <BackgroundCard key={bg.id} bg={bg} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Entity Sprites */}
      {tab === 'entities' && (
        <div className="av-section">
          <p className="av-section-info">
            {data.entities.length} entities (showing first 500)
            &mdash; {data.entities.filter(e => e.color_primary || e.silhouette_name).length} with visual data,
            {' '}{data.entities.filter(e => !e.color_primary && !e.silhouette_name).length} without
          </p>
          <div className="av-grid av-grid--entity">
            {data.entities.map(e => <EntityCard key={e.id} entity={e} />)}
          </div>
        </div>
      )}

      {/* 3. Attack Types */}
      {tab === 'attacks' && (
        <div className="av-section">
          <p className="av-section-info">{data.attack_types.length} attack types</p>
          <div className="av-grid av-grid--attack">
            {data.attack_types.map(a => <AttackCard key={a.id} atk={a} />)}
          </div>
        </div>
      )}

      {/* 4. Item Sprites */}
      {tab === 'items' && (
        <div className="av-section">
          <p className="av-section-info">{data.item_sprites.length} item sprites in asset registry</p>
          {data.item_sprites.length === 0 ? (
            <p className="av-empty">No item sprites registered yet.</p>
          ) : (
            <div className="av-grid av-grid--item">
              {data.item_sprites.map(i => <ItemCard key={i.id} item={i} />)}
            </div>
          )}
        </div>
      )}

      {/* 5. Achievements & Artifacts */}
      {tab === 'icons' && (
        <div className="av-section">
          <div className="av-group">
            <h3 className="av-group-title">Achievements <span className="av-count">({data.achievements.length})</span></h3>
            {data.achievements.length === 0 ? (
              <p className="av-empty">No achievements found.</p>
            ) : (
              <div className="av-grid av-grid--icon">
                {data.achievements.map(a => (
                  <IconCard key={`ach-${a.id}`} name={a.name} category={a.category} spriteKey={a.icon_sprite_key} />
                ))}
              </div>
            )}
          </div>
          <div className="av-group">
            <h3 className="av-group-title">Curated Artifacts <span className="av-count">({data.curated_artifacts.length})</span></h3>
            {data.curated_artifacts.length === 0 ? (
              <p className="av-empty">No curated artifacts found.</p>
            ) : (
              <div className="av-grid av-grid--icon">
                {data.curated_artifacts.map(a => (
                  <IconCard key={`art-${a.id}`} name={a.name} rarity={a.rarity} spriteKey={a.icon_sprite_key} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Entity Families */}
      {tab === 'families' && (
        <div className="av-section">
          <p className="av-section-info">{data.entity_families.length} entity families</p>
          <BarChart data={data.entity_families} />
        </div>
      )}

      {/* 7. Boss Lore */}
      {tab === 'lore' && (
        <div className="av-section">
          <p className="av-section-info">Sample boss transition lore text</p>
          <div className="av-lore-grid">
            {data.boss_lore.map(l => (
              <div key={l.id} className="av-lore-card">
                <div className="av-lore-header">
                  <span className="av-lore-book">{l.book_title}</span>
                  <span className="av-lore-chapter">Ch. {l.chapter_number}: {l.title}</span>
                </div>
                <p className="av-lore-text">{l.transition_lore_text}</p>
              </div>
            ))}
            {data.boss_lore.length === 0 && (
              <p className="av-empty">No boss lore text found in chapters.</p>
            )}
          </div>
        </div>
      )}

      {/* 8. Scene Coverage */}
      {tab === 'coverage' && (
        <div className="av-section">
          <CoveragePanel cov={data.scene_coverage} />
        </div>
      )}
    </div>
  );
}
