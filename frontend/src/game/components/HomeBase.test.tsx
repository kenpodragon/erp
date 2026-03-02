import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeBase from './HomeBase';
import { api } from '../../api';

// Mock the API
vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ ok: true })
  }
}));

describe('HomeBase Component', () => {
  const mockPlayer = { alias: 'Test' };
  const mockCharacter = { character_name: 'Hero' };

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default mock responses
    (api.post as any).mockResolvedValue({ ok: true });
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('artifacts')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
        { id: 1, name: 'Core', rarity: 'rare', unlocked: true, lore_text: 'Lore A' }
      ])});
      if (url.includes('journal')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
        { location: 'CH 1', title: 'Gate', summary: 'Summary A' }
      ])});
      if (url.includes('leaderboards')) return Promise.resolve({ ok: true, json: () => Promise.resolve([
        { name: 'Xenon', value: 'Book 2' }
      ])});
      return Promise.resolve({ ok: false });
    });
  });

  it('renders section headers and title', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);
    
    await waitFor(() => {
      expect(screen.getByText('Home Base')).toBeDefined();
      expect(screen.getByText('The Akashic Log')).toBeDefined();
      expect(screen.getByText('Artifact Gallery')).toBeDefined();
      expect(screen.getByText('Tower Rankings')).toBeDefined();
    });
  });

  it('renders journal entries in the terminal', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Gate: Summary A/)).toBeDefined();
      expect(screen.getByText('[CH 1]')).toBeDefined();
    });
  });

  it('renders artifacts and handles click details', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);
    
    await waitFor(() => {
      const artifact = screen.getByText('Core');
      expect(artifact).toBeDefined();
      fireEvent.click(artifact);
    });

    expect(screen.getByText('Lore A')).toBeDefined();
  });

  it('switches leaderboard tabs', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);
    
    const essenceTab = await screen.findByText('Essence');
    fireEvent.click(essenceTab);

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('type=essence'));
  });

  it('shows confirmation on progress wipe', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);
    
    const wipeBtn = await screen.findByText(/Wipe Character Data/);
    fireEvent.click(wipeBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/api/players/me/reset');
  });
});
