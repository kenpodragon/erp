import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SplashPage } from './SplashPage';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('SplashPage', () => {
  it('renders the hero title', () => {
    renderWithRouter(<SplashPage onLogin={vi.fn()} />);
    expect(screen.getByText('Elysium')).toBeTruthy();
    expect(screen.getByText('Rising')).toBeTruthy();
  });

  it('renders the tagline', () => {
    renderWithRouter(<SplashPage onLogin={vi.fn()} />);
    expect(screen.getByText(/forgotten gods stir/)).toBeTruthy();
  });

  it('renders CTA buttons that call onLogin', () => {
    const onLogin = vi.fn();
    renderWithRouter(<SplashPage onLogin={onLogin} />);
    const ctaButtons = screen.getAllByText('Begin Your Ascent');
    expect(ctaButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(ctaButtons[0]);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('renders About the Game section', () => {
    renderWithRouter(<SplashPage onLogin={vi.fn()} />);
    expect(screen.getByText('About the Game')).toBeTruthy();
    expect(screen.getByText('Incremental MMORPG')).toBeTruthy();
    expect(screen.getByText('Audio-Driven Narrative')).toBeTruthy();
    expect(screen.getByText('Competitive & Social')).toBeTruthy();
  });

  it('renders The Story section', () => {
    renderWithRouter(<SplashPage onLogin={vi.fn()} />);
    expect(screen.getByText('The Story')).toBeTruthy();
    expect(screen.getByText(/Towers appeared without warning/)).toBeTruthy();
  });

  it('renders How It Works section with 4 steps', () => {
    renderWithRouter(<SplashPage onLogin={vi.fn()} />);
    expect(screen.getByText('How It Works')).toBeTruthy();
    expect(screen.getByText('Click & Conquer')).toBeTruthy();
    expect(screen.getByText('Listen & Progress')).toBeTruthy();
    expect(screen.getByText('Fight & Ascend')).toBeTruthy();
    expect(screen.getByText('Compete & Dominate')).toBeTruthy();
  });

  it('renders footer links', () => {
    renderWithRouter(<SplashPage onLogin={vi.fn()} />);
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('Contact Support')).toBeTruthy();
  });
});
