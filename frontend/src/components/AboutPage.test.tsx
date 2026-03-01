import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AboutPage } from './AboutPage';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AboutPage', () => {
  it('renders the page title', () => {
    renderWithRouter(<AboutPage />);
    expect(screen.getByText('About Elysium Rising')).toBeTruthy();
  });

  it('renders game description sections', () => {
    renderWithRouter(<AboutPage />);
    expect(screen.getByText('What Is Elysium Rising?')).toBeTruthy();
    expect(screen.getByText('The World')).toBeTruthy();
    expect(screen.getByText('Choose Your Path')).toBeTruthy();
    expect(screen.getByText('Features')).toBeTruthy();
  });

  it('renders all four class overviews', () => {
    renderWithRouter(<AboutPage />);
    expect(screen.getByText('The Engineer')).toBeTruthy();
    expect(screen.getByText('The Conduit')).toBeTruthy();
    expect(screen.getByText('The Drifter')).toBeTruthy();
    expect(screen.getByText('The Vessel')).toBeTruthy();
  });

  it('renders feature list items', () => {
    renderWithRouter(<AboutPage />);
    expect(screen.getByText(/Narrative-Driven Progression/)).toBeTruthy();
    expect(screen.getByText(/Incremental Mechanics/)).toBeTruthy();
    expect(screen.getByText(/Competitive Leaderboards/)).toBeTruthy();
  });

  it('renders return to home link', () => {
    renderWithRouter(<AboutPage />);
    expect(screen.getByText('Return to Home')).toBeTruthy();
  });
});
