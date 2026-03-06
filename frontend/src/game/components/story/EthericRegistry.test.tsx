import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('../../../api', () => ({
  api: {
    get: mockGet,
  },
}));

import EthericRegistry from './EthericRegistry';

const MOCK_ENTITIES = [
  {
    entity_id: 1,
    name: 'Shadow Wolf',
    family: 'Beast',
    sprite_key: 'wolf_01',
    encounter_count: 12,
    kill_count: 8,
    discovery_rank: 'C',
    discovery_state: 'revealed',
    is_new: false,
  },
  {
    entity_id: 2,
    name: 'Flame Wraith',
    family: 'Spirit',
    sprite_key: null,
    encounter_count: 3,
    kill_count: 1,
    discovery_rank: 'A',
    discovery_state: 'grey',
    is_new: true,
  },
  {
    entity_id: 3,
    name: 'Unknown Horror',
    family: 'Abyssal',
    sprite_key: null,
    encounter_count: 0,
    kill_count: 0,
    discovery_rank: 'E',
    discovery_state: 'mist',
    is_new: false,
  },
];

const MOCK_RESPONSE = {
  entities: MOCK_ENTITIES,
  total: 3,
  page: 1,
  per_page: 20,
  families: ['Beast', 'Spirit', 'Abyssal'],
};

describe('EthericRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_RESPONSE),
    });
  });

  it('shows loading state initially', () => {
    // Make fetch hang to observe loading state
    mockGet.mockReturnValue(new Promise(() => {}));

    render(<EthericRegistry />);

    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders the title', async () => {
    render(<EthericRegistry />);

    await waitFor(() => {
      expect(screen.getByText('Etheric Registry')).toBeDefined();
    });
  });

  it('renders entity cards after fetch', async () => {
    render(<EthericRegistry />);

    await waitFor(() => {
      expect(screen.getByText('Shadow Wolf')).toBeDefined();
    });

    expect(screen.getByText('Flame Wraith')).toBeDefined();
    // Mist entities show "???" instead of name
    expect(screen.getByText('???')).toBeDefined();
  });

  it('shows discovery rank badges', async () => {
    render(<EthericRegistry />);

    await waitFor(() => {
      expect(screen.getByText('C')).toBeDefined();
    });

    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('E')).toBeDefined();
  });

  it('shows "New" badge for newly discovered entities', async () => {
    render(<EthericRegistry />);

    await waitFor(() => {
      expect(screen.getByText('New')).toBeDefined();
    });
  });

  it('shows encounter and kill counts for non-mist entities', async () => {
    render(<EthericRegistry />);

    await waitFor(() => {
      expect(screen.getByText('Seen: 12')).toBeDefined();
    });

    expect(screen.getByText('Kills: 8')).toBeDefined();
  });

  it('renders family filter tabs', async () => {
    render(<EthericRegistry />);

    await waitFor(() => {
      expect(screen.getByText('All')).toBeDefined();
    });

    expect(screen.getByText('Beast')).toBeDefined();
    expect(screen.getByText('Spirit')).toBeDefined();
    expect(screen.getByText('Abyssal')).toBeDefined();
  });

  it('calls API with family filter when tab clicked', async () => {
    render(<EthericRegistry />);

    await waitFor(() => {
      expect(screen.getByText('Beast')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Beast'));

    await waitFor(() => {
      // Second call should include family filter
      const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0];
      expect(lastCall).toContain('family=Beast');
    });
  });

  it('expands entity detail on card click', async () => {
    const MOCK_DETAIL = {
      entity_id: 1,
      name: 'Shadow Wolf',
      family: 'Beast',
      sprite_key: 'wolf_01',
      encounter_count: 12,
      kill_count: 8,
      discovery_rank: 'C',
      discovery_state: 'revealed',
      description: 'A fearsome wolf of shadow.',
      lore_text: 'Born from the darkness between towers.',
      base_hp: 500,
      base_attack: 75,
      weakness: 'Fire',
      first_encountered: '2026-01-15',
    };

    // Route list vs detail calls based on URL
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/entities/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_DETAIL),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_RESPONSE),
      });
    });

    render(<EthericRegistry />);

    await waitFor(() => {
      expect(screen.getByText('Shadow Wolf')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Shadow Wolf'));

    await waitFor(() => {
      expect(screen.getByText('A fearsome wolf of shadow.')).toBeDefined();
    });

    expect(screen.getByText('Born from the darkness between towers.')).toBeDefined();
    expect(screen.getByText('HP: 500')).toBeDefined();
    expect(screen.getByText('ATK: 75')).toBeDefined();
    expect(screen.getByText('Weakness: Fire')).toBeDefined();
  });
});
