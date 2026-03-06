import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import './EthericRegistry.css';

interface RegistryEntity {
  entity_id: number;
  name: string;
  family: string;
  sprite_key: string | null;
  encounter_count: number;
  kill_count: number;
  discovery_rank: string; // E, C, A, SS
  discovery_state: string; // mist, grey, revealed
  is_new: boolean;
}

interface EntityDetail {
  entity_id: number;
  name: string;
  family: string;
  sprite_key: string | null;
  encounter_count: number;
  kill_count: number;
  discovery_rank: string;
  discovery_state: string;
  description: string | null;
  lore_text: string | null;
  base_hp: number | null;
  base_attack: number | null;
  weakness: string | null;
  first_encountered: string | null;
}

interface RegistryResponse {
  entities: RegistryEntity[];
  total: number;
  page: number;
  per_page: number;
  families: string[];
}

const RANK_COLORS: Record<string, string> = {
  E: '#cd7f32',
  C: '#c0c0c0',
  A: '#ffd700',
  SS: '#9b59b6',
};

const EthericRegistry: React.FC = () => {
  const [entities, setEntities] = useState<RegistryEntity[]>([]);
  const [families, setFamilies] = useState<string[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(20);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      let path = `/api/game/registry/entities?page=${page}&per_page=${perPage}`;
      if (selectedFamily) {
        path += `&family=${encodeURIComponent(selectedFamily)}`;
      }
      const res = await api.get(path);
      if (res.ok) {
        const data: RegistryResponse = await res.json();
        setEntities(data.entities);
        setTotal(data.total);
        if (data.families && families.length === 0) {
          setFamilies(data.families);
        }
      }
    } catch {
      // Network error handled by api layer
    } finally {
      setLoading(false);
    }
  }, [page, perPage, selectedFamily, families.length]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const handleExpand = async (entityId: number) => {
    if (expandedId === entityId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(entityId);
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/game/registry/entities/${entityId}`);
      if (res.ok) {
        const data: EntityDetail = await res.json();
        setDetail(data);
      }
    } catch {
      // Network error
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFamilyChange = (family: string) => {
    setSelectedFamily(family);
    setPage(1);
    setExpandedId(null);
    setDetail(null);
  };

  const totalPages = Math.ceil(total / perPage);

  const getDisplayName = (entity: RegistryEntity) => {
    return entity.discovery_state === 'mist' ? '???' : entity.name;
  };

  return (
    <div className="etheric-registry">
      <h2 className="registry-title">Etheric Registry</h2>

      <div className="registry-families">
        <button
          className={`family-tab ${selectedFamily === '' ? 'active' : ''}`}
          onClick={() => handleFamilyChange('')}
        >
          All
        </button>
        {families.map((f) => (
          <button
            key={f}
            className={`family-tab ${selectedFamily === f ? 'active' : ''}`}
            onClick={() => handleFamilyChange(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="registry-loading">Loading...</div>
      ) : (
        <>
          <div className="registry-grid">
            {entities.map((entity) => (
              <div
                key={entity.entity_id}
                className={`registry-card state-${entity.discovery_state}`}
                onClick={() => handleExpand(entity.entity_id)}
              >
                <div className="card-sprite">
                  {entity.discovery_state === 'mist' ? (
                    <div className="silhouette" />
                  ) : (
                    <div className="sprite-placeholder">
                      {entity.sprite_key || '?'}
                    </div>
                  )}
                </div>

                <div className="card-info">
                  <span className="card-name">{getDisplayName(entity)}</span>
                  <span
                    className="rank-badge"
                    style={{ borderColor: RANK_COLORS[entity.discovery_rank] || '#888', color: RANK_COLORS[entity.discovery_rank] || '#888' }}
                  >
                    {entity.discovery_rank}
                  </span>
                </div>

                {entity.discovery_state !== 'mist' && (
                  <div className="card-counts">
                    <span>Seen: {entity.encounter_count}</span>
                    <span>Kills: {entity.kill_count}</span>
                  </div>
                )}

                {entity.is_new && <span className="new-badge">New</span>}

                {expandedId === entity.entity_id && (
                  <div className="card-detail" onClick={(e) => e.stopPropagation()}>
                    {detailLoading ? (
                      <p>Loading details...</p>
                    ) : detail ? (
                      <>
                        {detail.description && <p className="detail-desc">{detail.description}</p>}
                        {detail.lore_text && <p className="detail-lore">{detail.lore_text}</p>}
                        {detail.base_hp !== null && <p>HP: {detail.base_hp}</p>}
                        {detail.base_attack !== null && <p>ATK: {detail.base_attack}</p>}
                        {detail.weakness && <p>Weakness: {detail.weakness}</p>}
                        {detail.first_encountered && (
                          <p className="detail-first">First seen: {detail.first_encountered}</p>
                        )}
                      </>
                    ) : (
                      <p>No details available.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="registry-pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Prev
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EthericRegistry;
