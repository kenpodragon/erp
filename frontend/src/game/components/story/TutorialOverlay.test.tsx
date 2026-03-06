import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TutorialOverlay from './TutorialOverlay';

const LS_KEY = 'has_completed_onboarding';

describe('TutorialOverlay', () => {
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onComplete = vi.fn();
    localStorage.clear();
  });

  it('renders the first step text', () => {
    render(<TutorialOverlay onComplete={onComplete} />);

    expect(
      screen.getByText(/Narrative Panel/)
    ).toBeDefined();
    expect(screen.getByText('Step 1 of 7')).toBeDefined();
  });

  it('advances to the next step when Next is clicked', () => {
    render(<TutorialOverlay onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Next'));

    expect(
      screen.getByText(/Combat Stage/)
    ).toBeDefined();
    expect(screen.getByText('Step 2 of 7')).toBeDefined();
  });

  it('calls onComplete and sets localStorage when Skip is clicked', () => {
    render(<TutorialOverlay onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Skip'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LS_KEY)).toBe('true');
  });

  it('calls onComplete after completing all steps', () => {
    render(<TutorialOverlay onComplete={onComplete} />);

    // There are 7 steps; click Next 6 times to reach the last, then Finish
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText('Next'));
    }

    // Last step should show "Finish" instead of "Next"
    expect(screen.getByText('Finish')).toBeDefined();
    expect(screen.getByText('Step 7 of 7')).toBeDefined();

    fireEvent.click(screen.getByText('Finish'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LS_KEY)).toBe('true');
  });

  it('shows the correct step counter throughout navigation', () => {
    render(<TutorialOverlay onComplete={onComplete} />);

    expect(screen.getByText('Step 1 of 7')).toBeDefined();

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Step 2 of 7')).toBeDefined();

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Step 3 of 7')).toBeDefined();
  });
});
