import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './RelicGallery.css';
import { api } from '../../api';
import { useAssets } from '../providers/AssetProvider';
import type { RenderResult } from '../renderers/AssetRenderer';

// ── Types ──────────────────────────────────────────────────────────────────

interface OwnedArtifact {
  id: number;
  type: 'curated' | 'generated';
  name: string;
  rarity: string;
  icon_sprite_key: string;
  stat_bonuses: Record<string, number>;
  acquired_from: string | null;
  acquired_at: string | null;
  is_new: boolean;
  curated_artifact_id?: number;
  source_hint?: string | null;
  lore_text?: string | null;
  description?: string | null;
  artifact_code?: string;
}

interface UndiscoveredArtifact {
  curated_artifact_id: number;
  name: string;
  source_hint: string;
  source_type: string;
  silhouette: boolean;
}

interface CuratedCollection {
  total: number;
  owned: number;
  undiscovered: UndiscoveredArtifact[];
}

interface GalleryData {
  owned_artifacts: OwnedArtifact[];
  curated_collection: CuratedCollection;
  generated_count: number;
  stat_total: Record<string, number>;
}

type SortKey = 'rarity' | 'name' | 'date';
type FilterRarity = 'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'cosmic';
type FilterType = 'all' | 'curated' | 'generated';

const RARITY_ORDER: Record<string, number> = {
  cosmic: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
};

// ── Asset Icon Helper ─────────────────────────────────────────────────────

/** Safe wrapper around useAssets that returns null when outside AssetProvider. */
function useSafeAssets() {
  try {
    return useAssets();
  } catch {
    return null;
  }
}

const ArtifactIcon: React.FC<{
  assetKey: string;
  size: number;
  className?: string;
}> = ({ assetKey, size, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assets = useSafeAssets();

  useEffect(() => {
    if (!assets || !canvasRef.current) return;
    const result: RenderResult | null = assets.renderAssetWithFallback(assetKey, 'artifact_icon');
    if (result) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = size;
        canvasRef.current.height = size;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(result.canvas, 0, 0, size, size);
      }
    }
  }, [assets, assetKey, size]);

  if (!assets) {
    return <div className={className || 'relic-icon-placeholder'} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
};

// ── Component ──────────────────────────────────────────────────────────────

const RelicGallery: React.FC = () => {
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<OwnedArtifact | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('rarity');
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showUndiscovered, setShowUndiscovered] = useState(true);
  const assets = useSafeAssets();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/game/home-base/artifacts');
        if (!res.ok) throw new Error('Failed to fetch artifacts');
        const json: GalleryData = await res.json();
        setData(json);

        // Preload icon assets for all owned artifacts
        if (assets) {
          const spriteKeys = json.owned_artifacts
            .map(a => a.icon_sprite_key)
            .filter(Boolean);
          if (spriteKeys.length > 0) {
            assets.preloadBatch(spriteKeys);
          }
        }

        // Mark visited — clears "new" badges on next load
        api.post('/api/game/home-base/artifacts/mark-visited');
      } catch {
        setError('Failed to load artifact data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [assets]);

  // ── Filtering & sorting ────────────────────────────────────────────────

  const filteredArtifacts = useMemo(() => {
    if (!data) return [];
    let arts = [...data.owned_artifacts];

    if (filterRarity !== 'all') {
      arts = arts.filter(a => a.rarity === filterRarity);
    }
    if (filterType !== 'all') {
      arts = arts.filter(a => a.type === filterType);
    }

    arts.sort((a, b) => {
      if (sortBy === 'rarity') {
        return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // date — newest first
      return (b.acquired_at || '').localeCompare(a.acquired_at || '');
    });

    return arts;
  }, [data, filterRarity, filterType, sortBy]);

  const formatDate = useCallback((iso: string | null) => {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleDateString();
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) return <div className="relic-loading">Scanning artifact repository...</div>;
  if (error || !data) return <div className="relic-error">{error || 'No data.'}</div>;

  const newCount = data.owned_artifacts.filter(a => a.is_new).length;

  return (
    <div className="relic-gallery">
      {/* Header */}
      <div className="relic-header">
        <h2 className="relic-title">Relic Gallery</h2>
        <div className="relic-collection-stats">
          <span className="relic-stat">
            {data.curated_collection.owned}/{data.curated_collection.total} Curated
          </span>
          <span className="relic-stat-sep">|</span>
          <span className="relic-stat">{data.generated_count} Generated</span>
          {newCount > 0 && <span className="relic-new-count">{newCount} new</span>}
        </div>
      </div>

      {/* Stat Summary */}
      {Object.keys(data.stat_total).length > 0 && (
        <div className="relic-stat-summary">
          <span className="relic-stat-label">Total Bonuses:</span>
          {Object.entries(data.stat_total).map(([stat, val]) => (
            <span key={stat} className="relic-stat-bonus">
              +{val} {stat}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="relic-filters">
        <div className="relic-filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)}>
            <option value="all">All</option>
            <option value="curated">Curated</option>
            <option value="generated">Generated</option>
          </select>
        </div>
        <div className="relic-filter-group">
          <label>Rarity:</label>
          <select value={filterRarity} onChange={e => setFilterRarity(e.target.value as FilterRarity)}>
            <option value="all">All</option>
            <option value="cosmic">Cosmic</option>
            <option value="epic">Epic</option>
            <option value="rare">Rare</option>
            <option value="uncommon">Uncommon</option>
            <option value="common">Common</option>
          </select>
        </div>
        <div className="relic-filter-group">
          <label>Sort:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}>
            <option value="rarity">Rarity</option>
            <option value="name">Name</option>
            <option value="date">Date</option>
          </select>
        </div>
        <label className="relic-toggle">
          <input
            type="checkbox"
            checked={showUndiscovered}
            onChange={e => setShowUndiscovered(e.target.checked)}
          />
          Show undiscovered
        </label>
      </div>

      {/* Grid */}
      <div className="relic-grid">
        {filteredArtifacts.map(art => (
          <button
            key={art.id}
            className={`relic-card relic-rarity-${art.rarity}`}
            onClick={() => setSelectedArtifact(art)}
          >
            <ArtifactIcon assetKey={art.icon_sprite_key} size={40} className="relic-icon-canvas" />
            <span className="relic-card-name">{art.name}</span>
            <span className={`relic-rarity-badge relic-rarity-${art.rarity}`}>{art.rarity}</span>
            {art.is_new && <span className="relic-new-badge">NEW</span>}
          </button>
        ))}

        {/* Undiscovered silhouettes */}
        {showUndiscovered && filterType !== 'generated' && data.curated_collection.undiscovered.map(u => (
          <div key={`sil-${u.curated_artifact_id}`} className="relic-card relic-silhouette" title={u.source_hint}>
            <div className="relic-icon-placeholder silhouette" />
            <span className="relic-card-name">???</span>
            <span className="relic-source-hint">{u.source_hint}</span>
          </div>
        ))}
      </div>

      {filteredArtifacts.length === 0 && !showUndiscovered && (
        <div className="relic-empty">No artifacts match the current filters.</div>
      )}

      {/* Inspection Modal */}
      {selectedArtifact && (
        <div className="relic-modal-overlay" onClick={() => setSelectedArtifact(null)}>
          <div className="relic-modal" onClick={e => e.stopPropagation()}>
            <button className="relic-modal-close" onClick={() => setSelectedArtifact(null)}>&times;</button>

            <ArtifactIcon assetKey={selectedArtifact.icon_sprite_key} size={64} className="relic-modal-icon-canvas" />
            <h3 className="relic-modal-name">{selectedArtifact.name}</h3>
            <span className={`relic-rarity-badge relic-rarity-${selectedArtifact.rarity}`}>
              {selectedArtifact.rarity}
            </span>
            <span className="relic-modal-type">{selectedArtifact.type}</span>

            {selectedArtifact.description && (
              <p className="relic-modal-desc">{selectedArtifact.description}</p>
            )}
            {selectedArtifact.lore_text && (
              <p className="relic-modal-lore">{selectedArtifact.lore_text}</p>
            )}

            <div className="relic-modal-stats">
              <span className="relic-modal-stats-label">Stat Bonuses</span>
              {Object.entries(selectedArtifact.stat_bonuses).map(([stat, val]) => (
                <div key={stat} className="relic-modal-stat-row">
                  <span className="relic-modal-stat-name">{stat}</span>
                  <span className="relic-modal-stat-val">+{val}</span>
                </div>
              ))}
            </div>

            {selectedArtifact.source_hint && (
              <div className="relic-modal-source">
                <span className="relic-modal-source-label">Source</span>
                <span>{selectedArtifact.source_hint}</span>
              </div>
            )}

            <div className="relic-modal-meta">
              <span>Acquired: {formatDate(selectedArtifact.acquired_at)}</span>
              {selectedArtifact.artifact_code && (
                <span className="relic-modal-code">{selectedArtifact.artifact_code}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelicGallery;
