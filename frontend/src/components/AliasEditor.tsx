import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface AliasEditorProps {
  currentAlias: string | null;
  onSave: (newAlias: string) => void;
}

export const AliasEditor: React.FC<AliasEditorProps> = ({ currentAlias, onSave }) => {
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
    const timer = setTimeout(() => {
      if (alias) checkAvailability(alias);
    }, 500);
    return () => clearTimeout(timer);
  }, [alias, checkAvailability]);

  const handleSave = async () => {
    if (!isAvailable || isSaving) return;
    
    setIsSaving(true);
    try {
      const res = await api.patch('/api/players/me', { alias });
      if (res.ok) {
        onSave(alias);
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

  return (
    <div className="profile-section">
      <h3>Identity</h3>
      <div className="form-group">
        <label>Display Name (Alias)</label>
        <input
          type="text"
          className="form-control"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Enter your hero name..."
          maxLength={20}
        />
        {isValidating && <div className="validation-msg">Checking...</div>}
        {error && <div className="validation-msg error">{error}</div>}
        {isAvailable && alias !== currentAlias && !isValidating && (
          <div className="validation-msg success">Alias available!</div>
        )}
      </div>
      <button 
        className="btn-primary" 
        onClick={handleSave}
        disabled={!isAvailable || alias === currentAlias || isSaving || isValidating}
      >
        {isSaving ? 'Saving...' : 'Update Alias'}
      </button>
    </div>
  );
};
