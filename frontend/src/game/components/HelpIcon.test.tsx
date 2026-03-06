import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HelpIcon from './HelpIcon';

describe('HelpIcon', () => {
  it('renders a link with "?" text', () => {
    render(<HelpIcon href="/help" />);
    expect(screen.getByText('?')).toBeDefined();
  });

  it('links to the provided href', () => {
    render(<HelpIcon href="/wiki/combat" />);
    const link = screen.getByText('?') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/wiki/combat');
  });

  it('opens in new tab', () => {
    render(<HelpIcon href="/help" />);
    const link = screen.getByText('?') as HTMLAnchorElement;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('uses provided tooltip', () => {
    render(<HelpIcon href="/help" tooltip="Learn more" />);
    const link = screen.getByText('?') as HTMLAnchorElement;
    expect(link.getAttribute('title')).toBe('Learn more');
  });

  it('uses default tooltip when not provided', () => {
    render(<HelpIcon href="/help" />);
    const link = screen.getByText('?') as HTMLAnchorElement;
    expect(link.getAttribute('title')).toBe('Help');
  });

  it('has help-icon class', () => {
    const { container } = render(<HelpIcon href="/help" />);
    expect(container.querySelector('.help-icon')).not.toBeNull();
  });
});
