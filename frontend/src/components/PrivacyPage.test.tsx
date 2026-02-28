import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyPage } from './PrivacyPage';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PrivacyPage', () => {
  it('renders the page title', () => {
    renderWithRouter(<PrivacyPage />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders key privacy sections', () => {
    renderWithRouter(<PrivacyPage />);
    expect(screen.getByText('1. Introduction')).toBeTruthy();
    expect(screen.getByText('2. Information We Collect')).toBeTruthy();
    expect(screen.getByText('3. How We Use Your Information')).toBeTruthy();
    expect(screen.getByText('4. Sharing of Information')).toBeTruthy();
    expect(screen.getByText('5. Data Security')).toBeTruthy();
    expect(screen.getByText('6. Data Retention')).toBeTruthy();
    expect(screen.getByText('7. Your Rights')).toBeTruthy();
    expect(screen.getByText(/Children.*Privacy/)).toBeTruthy();
    expect(screen.getByText('9. Third-Party Services')).toBeTruthy();
  });

  it('renders links to third-party privacy policies', () => {
    renderWithRouter(<PrivacyPage />);
    expect(screen.getByText('Google Privacy Policy')).toBeTruthy();
    expect(screen.getByText('Firebase Privacy Policy')).toBeTruthy();
    expect(screen.getByText('Stripe Privacy Policy')).toBeTruthy();
  });

  it('renders return to home link', () => {
    renderWithRouter(<PrivacyPage />);
    expect(screen.getByText('Return to Home')).toBeTruthy();
  });
});
