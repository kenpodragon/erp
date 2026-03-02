import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChapterInfoPanel from './ChapterInfoPanel';

describe('ChapterInfoPanel Component', () => {
  const mockScene = {
    id: 1,
    name: 'The Gate',
    summary: 'A dark entrance to the tower.',
    gameplay_data: {
      required_time_seconds: 180,
    }
  };
  const mockOnClose = vi.fn();

  const mockOnEnter = vi.fn();

  it('renders scene title, summary and formatted duration', () => {
    render(<ChapterInfoPanel scene={mockScene} onClose={mockOnClose} onEnter={mockOnEnter} />);
    expect(screen.getByText('The Gate')).toBeDefined();
    expect(screen.getByText('A dark entrance to the tower.')).toBeDefined();
    expect(screen.getByText('3m')).toBeDefined();
  });

  it('calls onEnter when button is clicked', () => {
    render(<ChapterInfoPanel scene={mockScene} onClose={mockOnClose} onEnter={mockOnEnter} />);
    fireEvent.click(screen.getByText('Enter Story Mode'));
    expect(mockOnEnter).toHaveBeenCalledWith(1);
  });

  it('calls onClose when close button is clicked', () => {
    render(<ChapterInfoPanel scene={mockScene} onClose={mockOnClose} onEnter={mockOnEnter} />);
    fireEvent.click(screen.getByText('×'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
