import { useCallback, useEffect, useMemo, useState } from 'react';
import './TutorialOverlay.css';

interface TutorialStep {
  target: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

const LS_KEY = 'has_completed_onboarding';

const STEPS: TutorialStep[] = [
  {
    target: 'narrative',
    text: 'This is the Narrative Panel. Story paragraphs appear here as you progress through each chapter.',
    position: 'right',
  },
  {
    target: 'combat',
    text: 'The Combat Stage is where you fight enemies. Click rapidly to deal damage and defeat waves of foes.',
    position: 'left',
  },
  {
    target: 'skills',
    text: 'Your Skills Hotbar holds active abilities. Unlock and level them up to boost your power.',
    position: 'top',
  },
  {
    target: 'upgrades',
    text: 'The Upgrade Menu lets you spend gold to increase your stats and damage output.',
    position: 'top',
  },
  {
    target: 'hero-stats',
    text: 'Your Hero Stats show current health, DPS, and other vital information at a glance.',
    position: 'bottom',
  },
  {
    target: 'gold',
    text: 'Gold is earned by defeating enemies. Use it to buy upgrades and progress faster.',
    position: 'bottom',
  },
  {
    target: 'header',
    text: 'The Global Header shows your current chapter, active buffs, and Dark Ritual progress. You are ready to begin!',
    position: 'bottom',
  },
];

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 14;

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = useMemo(() => STEPS[stepIndex], [stepIndex]);

  const measureTarget = useCallback(() => {
    const el = document.querySelector(`[data-tutorial="${step.target}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [measureTarget]);

  function finish() {
    localStorage.setItem(LS_KEY, 'true');
    onComplete();
  }

  function handleNext() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      finish();
    }
  }

  // Build the backdrop shadow to create a spotlight cutout
  const backdropStyle: React.CSSProperties = targetRect
    ? {
        boxShadow: `
          0 0 0 9999px rgba(0, 0, 0, 0.75),
          0 0 20px 4px rgba(0, 0, 0, 0.5)
        `,
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
        borderRadius: '8px',
        position: 'absolute' as const,
        pointerEvents: 'none' as const,
      }
    : {
        background: 'rgba(0, 0, 0, 0.75)',
      };

  // Compute tooltip position relative to target
  function getTooltipStyle(): React.CSSProperties {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const pos = step.position;

    switch (pos) {
      case 'bottom':
        return {
          top: targetRect.bottom + SPOTLIGHT_PADDING + TOOLTIP_GAP,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + SPOTLIGHT_PADDING + TOOLTIP_GAP,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + SPOTLIGHT_PADDING + TOOLTIP_GAP,
          transform: 'translateY(-50%)',
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + SPOTLIGHT_PADDING + TOOLTIP_GAP,
          transform: 'translateY(-50%)',
        };
      default:
        return {};
    }
  }

  function getArrowClass(): string {
    // Arrow points toward the target, so it's on the opposite side of tooltip
    switch (step.position) {
      case 'bottom':
        return 'tutorial-tooltip-arrow--bottom';
      case 'top':
        return 'tutorial-tooltip-arrow--top';
      case 'right':
        return 'tutorial-tooltip-arrow--right';
      case 'left':
        return 'tutorial-tooltip-arrow--left';
      default:
        return '';
    }
  }

  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="tutorial-overlay">
      {/* Backdrop with spotlight cutout */}
      {targetRect ? (
        <>
          {/* Full-screen click catcher */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Spotlight hole via box-shadow */}
          <div style={backdropStyle} />
          {/* Highlight ring around target */}
          <div
            className="tutorial-spotlight-ring"
            style={{
              top: targetRect.top - SPOTLIGHT_PADDING,
              left: targetRect.left - SPOTLIGHT_PADDING,
              width: targetRect.width + SPOTLIGHT_PADDING * 2,
              height: targetRect.height + SPOTLIGHT_PADDING * 2,
            }}
          />
        </>
      ) : (
        <div className="tutorial-backdrop" />
      )}

      {/* Tooltip */}
      <div className="tutorial-tooltip" style={getTooltipStyle()}>
        <div className={`tutorial-tooltip-arrow ${getArrowClass()}`} />

        <div className="tutorial-step-counter">
          Step {stepIndex + 1} of {STEPS.length}
        </div>

        <div className="tutorial-step-text">{step.text}</div>

        <div className="tutorial-actions">
          <button className="tutorial-skip-btn" onClick={finish}>
            Skip
          </button>
          <button className="tutorial-next-btn" onClick={handleNext}>
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
