import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  const mockOnTabChange = vi.fn();

  it('renders all navigation tabs', () => {
    render(<Sidebar activeTab="map" onTabChange={mockOnTabChange} />);
    expect(screen.getByText('Map')).toBeDefined();
    expect(screen.getByText('Skills')).toBeDefined();
    expect(screen.getByText('Shop')).toBeDefined();
    expect(screen.getByText('Home')).toBeDefined();
  });

  it('calls onTabChange when a tab is clicked', () => {
    render(<Sidebar activeTab="map" onTabChange={mockOnTabChange} />);
    fireEvent.click(screen.getByText('Skills'));
    expect(mockOnTabChange).toHaveBeenCalledWith('skills');
  });

  it('applies active class to the current tab', () => {
    const { container } = render(<Sidebar activeTab="shop" onTabChange={mockOnTabChange} />);
    const activeBtn = container.querySelector('.active');
    expect(activeBtn?.textContent).toContain('Shop');
  });
});
