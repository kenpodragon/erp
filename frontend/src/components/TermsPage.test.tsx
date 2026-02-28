import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TermsPage } from './TermsPage';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TermsPage', () => {
  it('renders the page title', () => {
    renderWithRouter(<TermsPage />);
    expect(screen.getByText('Terms of Service')).toBeTruthy();
  });

  it('renders all 11 legal sections', () => {
    renderWithRouter(<TermsPage />);
    expect(screen.getByText('1. Acceptance of Terms')).toBeTruthy();
    expect(screen.getByText('2. Eligibility')).toBeTruthy();
    expect(screen.getByText('3. Account Registration')).toBeTruthy();
    expect(screen.getByText('4. User Conduct')).toBeTruthy();
    expect(screen.getByText('5. Intellectual Property')).toBeTruthy();
    expect(screen.getByText(/Virtual Currency/)).toBeTruthy();
    expect(screen.getByText('7. Disclaimers')).toBeTruthy();
    expect(screen.getByText('8. Limitation of Liability')).toBeTruthy();
    expect(screen.getByText('9. Changes to Terms')).toBeTruthy();
    expect(screen.getByText('10. Governing Law')).toBeTruthy();
    expect(screen.getByText('11. Contact')).toBeTruthy();
  });

  it('renders return to home link', () => {
    renderWithRouter(<TermsPage />);
    expect(screen.getByText('Return to Home')).toBeTruthy();
  });
});
