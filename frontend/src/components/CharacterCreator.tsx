import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface CharacterClass {
  id: number;
  name: string;
  lore_blurb: string | null;
  base_strength: number;
  base_agility: number;
  base_intelligence: number;
  sprite_key: string | null;
  is_available: boolean;
}

interface Character {
  id: number;
  character_name: string;
  level: number;
  strength: number | null;
  agility: number | null;
  intelligence: number | null;
  created_at: string;
  class: CharacterClass | null;
}

interface CharacterCreatorProps {
  existingCharacter?: Character | null;
  onCharacterCreated?: (character: Character) => void;
  onCharacterDeleted?: () => void;
}

const CLASS_AVATAR_MAP: Record<string, string> = {
  class_sentinel: 'engineer',
  class_engineer: 'engineer',
  class_arcanist: 'conduit',
  class_conduit:  'conduit',
  class_wanderer: 'drifter',
  class_drifter:  'drifter',
  class_invoker:  'vessel',
  class_vessel:   'vessel',
  class_cleric:   'cleric',
  class_mage:     'mage',
  class_rogue:    'rogue',
  class_warrior:  'warrior',
};

interface ClassVisual { filter: string; transform: string; accentColor: string; }
const CLASS_VISUAL: Record<string, ClassVisual> = {
  class_engineer: {
    filter:      'sepia(0.5) hue-rotate(330deg) brightness(0.85) saturate(1.5)',
    transform:   'scale(1.18) skewX(-4deg) translateX(4px)',
    accentColor: '#c41e3a',  // crimson — Eternal Engine
  },
  class_conduit: {
    filter:      'sepia(0.4) hue-rotate(220deg) brightness(0.8) saturate(1.8)',
    transform:   'scale(1.22) skewY(3deg) translateY(-6px)',
    accentColor: '#7b5ea7',  // cosmic purple
  },
  class_drifter: {
    filter:      'sepia(0.3) hue-rotate(160deg) brightness(0.8) saturate(1.6)',
    transform:   'scale(1.2) rotate(-3deg) translateX(-4px)',
    accentColor: '#00d4ff',  // cyan — reality fractures
  },
  class_vessel: {
    filter:      'sepia(0.55) hue-rotate(30deg) brightness(0.82) saturate(1.7)',
    transform:   'scale(1.15) skewX(5deg) skewY(-2deg)',
    accentColor: '#d4af37',  // gold — divine echoes
  },
};

function StatBar({ label, value, max = 20 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  
  // Color coding based on stat type
  let barColor = '#c41e3a'; // Default crimson
  if (label === 'STR') barColor = '#cc3333';
  if (label === 'AGI') barColor = '#33cc33';
  if (label === 'INT') barColor = '#3366ff';
  
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 'bold' }}>
        <span style={{ color: '#aaa' }}>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ background: '#222', borderRadius: '4px', height: '10px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
        <div
          style={{ 
            background: barColor, 
            borderRadius: '4px', 
            height: '100%', 
            width: `${pct}%`, 
            transition: 'width 0.5s ease-out',
            boxShadow: '0 0 10px ' + barColor + '44'
          }}
        />
      </div>
    </div>
  );
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ existingCharacter, onCharacterCreated, onCharacterDeleted }) => {
  const [classes, setClasses] = useState<CharacterClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteNameInput, setDeleteNameInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/game/classes`
        );
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
          if (data.length > 0) setSelectedClass(data[0]);
        }
      } catch {
        // classes remain empty
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  const validateName = useCallback((name: string): string | null => {
    if (!name) return null;
    if (name.length < 3) return 'Must be at least 3 characters';
    if (name.length > 20) return 'Must be 20 characters or fewer';
    if (!/^[a-zA-Z0-9 -]+$/.test(name)) return 'Letters, numbers, spaces, and hyphens only';
    return null;
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCharacterName(val);
    setNameError(validateName(val));
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !characterName.trim()) return;

    const validationErr = validateName(characterName.trim());
    if (validationErr) {
      setNameError(validationErr);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await api.post('/api/players/me/characters', {
        character_name: characterName.trim(),
        class_id: selectedClass.id,
      });

      if (res.ok) {
        const data = await res.json();
        onCharacterCreated?.(data.character);
      } else {
        const err = await res.json();
        const msg =
          typeof err.detail === 'string'
            ? err.detail
            : err.detail?.error ?? 'Failed to create character';
        setSubmitError(msg);
      }
    } catch {
      setSubmitError('Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingCharacter) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(`/api/players/me/characters/${existingCharacter.id}`);
      if (res.ok) {
        setShowDeleteConfirm(false);
        setDeleteNameInput('');
        setDeleteError(null);
        onCharacterDeleted?.();
      } else {
        const err = await res.json();
        setDeleteError(err.detail ?? 'Failed to delete character');
        setDeleting(false);
      }
    } catch {
      setDeleteError('Could not reach the server');
      setDeleting(false);
    }
  };

  const nameMatches = existingCharacter
    ? deleteNameInput === existingCharacter.character_name
    : false;

  // Show existing character details if one already exists
  if (existingCharacter) {
    const spriteKey = existingCharacter.class?.sprite_key ?? null;
    const presetKey = spriteKey ? (CLASS_AVATAR_MAP[spriteKey] ?? null) : null;
    const charAvatarUrl = presetKey
      ? `/assets/avatars/preset_${presetKey}.png`
      : `https://via.placeholder.com/96/111111/c41e3a?text=${encodeURIComponent(existingCharacter.character_name[0].toUpperCase())}`;

    return (
      <div className="profile-section" data-testid="character-display">
        {/* Title: character name */}
        <h3 style={{ margin: '0 0 1rem', color: '#c41e3a' }}>{existingCharacter.character_name}</h3>

        {/* Three-column body */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Left: avatar */}
          <div style={{ flexShrink: 0 }}>
            <img
              src={charAvatarUrl}
              alt="Character Avatar"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://via.placeholder.com/96/111111/b8860b?text=${encodeURIComponent(existingCharacter.character_name[0].toUpperCase())}`;
              }}
              style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #333', display: 'block' }}
            />
          </div>

          {/* Middle: class info + lore */}
          <div style={{ flex: 1, minWidth: '160px' }}>
            <div style={{ fontWeight: 'bold', color: '#ddd', marginBottom: '0.2rem' }}>
              {existingCharacter.class?.name ?? 'Unknown Class'}
              <span style={{ color: '#888', fontWeight: 'normal', marginLeft: '0.5rem' }}>· Level {existingCharacter.level}</span>
            </div>
            {existingCharacter.class?.lore_blurb && (
              <p style={{ fontSize: '0.82rem', color: '#aaa', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
                {existingCharacter.class.lore_blurb}
              </p>
            )}
          </div>

          {/* Right: stat bars */}
          <div style={{ minWidth: '160px' }}>
            <StatBar label="Strength" value={existingCharacter.strength ?? 0} />
            <StatBar label="Agility" value={existingCharacter.agility ?? 0} />
            <StatBar label="Intelligence" value={existingCharacter.intelligence ?? 0} />
          </div>
        </div>

        {/* Delete button — bottom left, small */}
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={() => { setShowDeleteConfirm(true); setDeleteNameInput(''); setDeleteError(null); }}
            data-testid="delete-character-btn"
            style={{ background: 'none', border: 'none', color: '#5a3030', cursor: 'pointer', fontSize: '0.75rem', padding: '0', textDecoration: 'underline' }}
          >
            Delete Character
          </button>
        </div>

        {/* Floating overlay modal */}
        {showDeleteConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.75)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !deleting) {
                setShowDeleteConfirm(false);
                setDeleteNameInput('');
                setDeleteError(null);
              }
            }}
          >
            <form
              onSubmit={handleDeleteSubmit}
              data-testid="delete-confirm-form"
              style={{
                background: '#111',
                border: '1px solid #7a0000',
                borderRadius: '8px',
                padding: '2rem',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
              }}
            >
              <p style={{ margin: '0 0 0.5rem', color: '#ff8888', fontWeight: 'bold', fontSize: '1rem' }}>
                ⚠ Delete Character — This Cannot Be Undone
              </p>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
                This will permanently delete{' '}
                <strong style={{ color: '#ff8888' }}>{existingCharacter.character_name}</strong>,
                including all progress and essence. There is no backup or recovery — once deleted, this character is gone forever.
              </p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#aaa' }}>
                To confirm, type the character name exactly as shown:
              </p>
              <input
                type="text"
                className="form-control"
                value={deleteNameInput}
                onChange={(e) => { setDeleteNameInput(e.target.value); setDeleteError(null); }}
                placeholder={existingCharacter.character_name}
                autoFocus
                disabled={deleting}
                data-testid="delete-name-input"
                style={{ marginBottom: '0.75rem' }}
              />
              {deleteError && (
                <div style={{ color: '#ff8888', fontSize: '0.85rem', marginBottom: '0.75rem' }} data-testid="delete-error">
                  {deleteError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={!nameMatches || deleting}
                  data-testid="delete-confirm-submit"
                  style={{
                    background: nameMatches ? '#7a0000' : '#3a0000',
                    color: nameMatches ? '#fff' : '#666',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.5rem 1.25rem',
                    cursor: nameMatches && !deleting ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    transition: 'background 0.2s',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete Forever'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteNameInput(''); setDeleteError(null); }}
                  disabled={deleting}
                  data-testid="delete-cancel-btn"
                  style={{ background: 'none', border: '1px solid #555', color: '#aaa', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="profile-section" data-testid="character-creator">
      <h3>Create Your Character</h3>
      {loadingClasses ? (
        <p style={{ color: '#aaa' }}>Loading classes...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Character name + submit inline */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="character-name">Character Name</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  id="character-name"
                  type="text"
                  className="form-control"
                  value={characterName}
                  onChange={handleNameChange}
                  placeholder="Enter a name (3–20 characters)"
                  maxLength={20}
                  disabled={submitting}
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                />
                {nameError && (
                  <div className="validation-msg error" data-testid="name-error">{nameError}</div>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !selectedClass || !characterName.trim() || !!nameError}
                style={{ whiteSpace: 'nowrap', flexShrink: 0, marginTop: '0' }}
              >
                {submitting ? 'Creating...' : 'Create Character'}
              </button>
            </div>
            {submitError && (
              <div
                style={{ background: '#3a0000', border: '1px solid #ff4444', borderRadius: '4px', padding: '0.75rem', marginTop: '0.5rem', color: '#ff8888', fontSize: '0.9rem' }}
                data-testid="submit-error"
              >
                {submitError}
              </div>
            )}
          </div>

          {/* Class selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold' }}>
              Choose Your Class
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {classes.map((cls) => {
                const spriteKey = cls.sprite_key ?? '';
                const presetKey = CLASS_AVATAR_MAP[spriteKey];
                const visual = CLASS_VISUAL[spriteKey];
                const isSelected = selectedClass?.id === cls.id;
                const accentColor = visual?.accentColor ?? '#c41e3a';
                return (
                  <div
                    key={cls.id}
                    role="button"
                    tabIndex={0}
                    data-testid={`class-card-${cls.id}`}
                    onClick={() => setSelectedClass(cls)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedClass(cls)}
                    style={{
                      background: '#111',
                      border: `2px solid ${isSelected ? accentColor : '#2a2a2a'}`,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxShadow: isSelected ? `0 0 12px ${accentColor}55` : 'none',
                    }}
                  >
                    {/* Image header */}
                    {presetKey && (
                      <div style={{ position: 'relative', height: '120px', overflow: 'hidden', background: '#0a0a0a' }}>
                        <img
                          src={`/assets/avatars/preset_${presetKey}.png`}
                          alt={cls.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center top',
                            display: 'block',
                          }}
                        />
                        {/* Subtle gradient at bottom for blend into card body */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.75) 100%)' }} />
                      </div>
                    )}

                    {/* Card body: lore + stats */}
                    <div style={{ padding: '0.75rem' }}>
                      {!presetKey && (
                        <div style={{ fontWeight: 'bold', color: accentColor, marginBottom: '0.4rem' }}>{cls.name}</div>
                      )}
                      {cls.lore_blurb && (
                        <p style={{ fontSize: '0.75rem', color: '#999', margin: '0 0 0.6rem', lineHeight: 1.4 }}>
                          {cls.lore_blurb}
                        </p>
                      )}
                      <StatBar label="STR" value={cls.base_strength} />
                      <StatBar label="AGI" value={cls.base_agility} />
                      <StatBar label="INT" value={cls.base_intelligence} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
