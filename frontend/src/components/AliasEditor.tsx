import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface AliasEditorProps {
  currentAlias: string | null;
  displayName: string | null;
  onSave: (newAlias: string) => void;
}

/**
 * Inline alias editor — renders as "{name} ✏️" when idle.
 * Clicking the pencil icon opens an inline input with debounced validation.
 */
export const AliasEditor: React.FC<AliasEditorProps> = ({ currentAlias, displayName, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [alias, setAlias] = useState(currentAlias || '');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAlias(currentAlias || '');
  }, [currentAlias]);

  const checkAvailability = useCallback(async (value: string) => {
    if (value === currentAlias) {
      setIsAvailable(true);
      setError(null);
      return;
    }
    if (value.length < 3) {
      setIsAvailable(false);
      setError('Too short (min 3 chars)');
      return;
    }
    setIsValidating(true);
    try {
      const res = await api.get(`/api/players/check-alias?alias=${encodeURIComponent(value)}`);
      const data = await res.json();
      setIsAvailable(data.available);
      setError(data.available ? null : data.reason);
    } catch {
      setError('Could not verify availability');
    } finally {
      setIsValidating(false);
    }
  }, [currentAlias]);

  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      if (alias) checkAvailability(alias);
    }, 500);
    return () => clearTimeout(timer);
  }, [alias, isEditing, checkAvailability]);

  const handleEdit = () => {
    setAlias(currentAlias || '');
    setError(null);
    setIsAvailable(currentAlias ? true : false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setAlias(currentAlias || '');
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!isAvailable || isSaving) return;
    setIsSaving(true);
    try {
      const res = await api.patch('/api/players/me', { alias });
      if (res.ok) {
        onSave(alias);
        setIsEditing(false);
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to save alias');
      }
    } catch {
      setError('Server error');
    } finally {
      setIsSaving(false);
    }
  };

  const shown = currentAlias || displayName || 'Ascendant';

  if (!isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, color: '#b8860b' }}>{shown}</h2>
        <button
          onClick={handleEdit}
          title="Edit display name"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px', lineHeight: 1, color: '#888' }}
          aria-label="Edit alias"
        >
          ✏️
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-control"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Enter your hero name..."
          maxLength={20}
          autoFocus
          style={{ maxWidth: '220px' }}
        />
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!isAvailable || alias === currentAlias || isSaving || isValidating}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          style={{ background: 'none', border: '1px solid #555', color: '#aaa', borderRadius: '4px', cursor: 'pointer', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
        >
          Cancel
        </button>
      </div>
      {isValidating && <div className="validation-msg" style={{ marginTop: '4px' }}>Checking…</div>}
      {error && <div className="validation-msg error" style={{ marginTop: '4px' }}>{error}</div>}
      {isAvailable && alias !== currentAlias && !isValidating && !error && (
        <div className="validation-msg success" style={{ marginTop: '4px' }}>Alias available!</div>
      )}
    </div>
  );
};
