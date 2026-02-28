import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { CharacterCreator } from './CharacterCreator';
import { TermsPage } from './TermsPage';
import './OnboardingFlow.css';

interface OnboardingFlowProps {
  player: any;
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ player, onComplete }) => {
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);

  const [alias, setAlias] = useState(player.alias || player.google_display_name || '');
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [isAliasValidating, setIsAliasValidating] = useState(false);
  const [isAliasAvailable, setIsAliasAvailable] = useState(false);
  
  const [selectedPreset, setSelectedPreset] = useState<string | null>(player.avatar_preset_key);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const [createdCharacter, setCreatedCharacter] = useState<any>(null);

  // Step 1: Terms Scroll Check
  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasScrolledTerms(true);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      const res = await api.post('/api/players/me/accept-terms');
      if (res.ok) {
        setStep(2);
      }
    } catch (err) {
      console.error("Failed to accept terms", err);
    }
  };

  // Step 2: Profile Validation
  useEffect(() => {
    if (step !== 2 || !alias || alias === player.alias) return;
    
    const timer = setTimeout(async () => {
      if (alias.length < 3) {
        setAliasError('Min 3 characters');
        setIsAliasAvailable(false);
        return;
      }
      setIsAliasValidating(true);
      try {
        const res = await api.get(`/api/players/check-alias?alias=${encodeURIComponent(alias)}`);
        const data = await res.json();
        setIsAliasAvailable(data.available);
        setAliasError(data.available ? null : data.reason);
      } catch {
        setAliasError('Validation failed');
      } finally {
        setIsAliasValidating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [alias, step, player.alias]);

  const handleProfileSubmit = async () => {
    setIsSubmittingProfile(true);
    try {
      const res = await api.patch('/api/players/me', {
        alias: alias !== player.alias ? alias : undefined,
        avatar_preset_key: selectedPreset
      });
      if (res.ok) {
        setStep(3);
      } else {
        const data = await res.json();
        setAliasError(data.detail || 'Update failed');
      }
    } catch {
      setAliasError('Server error');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleSkipProfile = () => {
    setStep(3);
  };

  // Render Helpers
  const renderStep1 = () => (
    <div className="onboarding-step">
      <h2>Welcome to Elysium Rising</h2>
      <p>Before we begin your ascent, please review and accept our Terms of Service.</p>
      <div 
        className="terms-container" 
        onScroll={handleTermsScroll}
        ref={termsRef}
      >
        <TermsPage />
      </div>
      <div className="terms-actions">
        <label className="checkbox-container">
          <input 
            type="checkbox" 
            checked={termsAccepted} 
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={!hasScrolledTerms}
          />
          <span className="checkmark"></span>
          I have read and accept the Terms of Service
        </label>
        {!hasScrolledTerms && <p className="scroll-hint">Please scroll to the bottom to continue.</p>}
        <button 
          className="btn-primary" 
          disabled={!termsAccepted || !hasScrolledTerms}
          onClick={handleAcceptTerms}
        >
          I Accept
        </button>
      </div>
    </div>
  );

  const PRESETS = [
    { key: 'warrior', name: 'The Sentinel', url: '/assets/avatars/preset_warrior.png' },
    { key: 'mage', name: 'The Arcanist', url: '/assets/avatars/preset_mage.png' },
    { key: 'rogue', name: 'The Shadow', url: '/assets/avatars/preset_rogue.png' },
    { key: 'cleric', name: 'The Warden', url: '/assets/avatars/preset_cleric.png' },
  ];

  const renderStep2 = () => (
    <div className="onboarding-step">
      <h2>Set Up Your Profile</h2>
      <p>How should other Ascendants see you in the world?</p>
      
      <div className="form-group">
        <label>Hero Alias</label>
        <input 
          type="text" 
          className="form-control"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Enter an alias..."
          maxLength={20}
        />
        {isAliasValidating && <div className="validation-msg">Checking...</div>}
        {aliasError && <div className="validation-msg error">{aliasError}</div>}
        {isAliasAvailable && alias !== player.alias && <div className="validation-msg success">Alias available!</div>}
      </div>

      <div className="form-group">
        <label>Choose an Avatar</label>
        <div className="avatar-grid">
          <div 
            className={`avatar-preset ${selectedPreset === null ? 'selected' : ''}`}
            onClick={() => setSelectedPreset(null)}
          >
            {player.google_avatar_url ? (
              <img src={player.google_avatar_url} alt="Google" referrerPolicy="no-referrer" />
            ) : (
              <div className="no-photo">?</div>
            )}
            <div className="preset-label">Google</div>
          </div>
          {PRESETS.map(p => (
            <div 
              key={p.key}
              className={`avatar-preset ${selectedPreset === p.key ? 'selected' : ''}`}
              onClick={() => setSelectedPreset(p.key)}
            >
              <img src={p.url} alt={p.name} onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80'} />
              <div className="preset-label">{p.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="step-actions">
        <button 
          className="btn-primary" 
          onClick={handleProfileSubmit}
          disabled={isSubmittingProfile || (alias !== player.alias && !isAliasAvailable)}
        >
          {isSubmittingProfile ? 'Saving...' : 'Continue'}
        </button>
        <button className="btn-secondary" onClick={handleSkipProfile}>Skip for Now</button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="onboarding-step">
      <h2>Create Your Character</h2>
      <p>This is your vessel in Elysium. Choose wisely.</p>
      <CharacterCreator 
        onCharacterCreated={(char) => {
          setCreatedCharacter(char);
          setStep(4);
        }}
      />
    </div>
  );

  const renderStep4 = () => (
    <div className="onboarding-step welcome-screen">
      <div className="welcome-hero">
        <img 
          src={createdCharacter?.class?.sprite_key ? `/assets/avatars/preset_${createdCharacter.class.sprite_key.replace('class_', '')}.png` : ''} 
          alt="Character" 
          className="welcome-avatar"
        />
        <h1>Welcome, {createdCharacter?.character_name}</h1>
        <h3 className="class-title">{createdCharacter?.class?.name}</h3>
      </div>
      
      <div className="welcome-lore">
        <p>{createdCharacter?.class?.lore_blurb}</p>
        <p>Your journey begins in the shadow of the First Tower. The Essence of Elysium flows through you. Will you be the one to reach the summit?</p>
      </div>

      <div className="welcome-actions">
        <button className="btn-primary btn-large" onClick={onComplete}>Begin Adventure</button>
        <button className="btn-secondary" onClick={onComplete}>Explore Home Base</button>
      </div>
    </div>
  );

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          <div className={`progress-dot ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="progress-line"></div>
          <div className={`progress-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className="progress-line"></div>
          <div className={`progress-dot ${step >= 3 ? 'active' : ''}`}>3</div>
          <div className="progress-line"></div>
          <div className={`progress-dot ${step >= 4 ? 'active' : ''}`}>4</div>
        </div>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};
