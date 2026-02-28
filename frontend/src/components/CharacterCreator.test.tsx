import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterCreator } from './CharacterCreator';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockClasses = [
  {
    id: 1,
    name: 'Sentinel',
    lore_blurb: 'A stalwart defender of the realm.',
    base_strength: 15,
    base_agility: 8,
    base_intelligence: 10,
    sprite_key: null,
    is_available: true,
  },
  {
    id: 2,
    name: 'Arcanist',
    lore_blurb: 'A wielder of ancient magic.',
    base_strength: 6,
    base_agility: 10,
    base_intelligence: 18,
    sprite_key: null,
    is_available: true,
  },
];

const mockExistingCharacter = {
  id: 1,
  character_name: 'Aldric',
  level: 1,
  strength: 15,
  agility: 8,
  intelligence: 10,
  created_at: '2026-02-27T00:00:00Z',
  class: mockClasses[0],
};

function mockFetch(data: unknown, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe('CharacterCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows existing character when one is provided', () => {
    render(<CharacterCreator existingCharacter={mockExistingCharacter} />);
    expect(screen.getByTestId('character-display')).toBeTruthy();
    expect(screen.getByText('Aldric')).toBeTruthy();
    expect(screen.getByText(/Sentinel/)).toBeTruthy();
    expect(screen.getByText(/Level 1/)).toBeTruthy();
  });

  it('shows the creator form when no character exists', async () => {
    mockFetch(mockClasses);
    render(<CharacterCreator existingCharacter={null} />);

    await waitFor(() => {
      expect(screen.getByTestId('character-creator')).toBeTruthy();
    });
    expect(screen.getByText('Create Your Character')).toBeTruthy();
  });

  it('renders class cards after loading', async () => {
    mockFetch(mockClasses);
    render(<CharacterCreator existingCharacter={null} />);

    await waitFor(() => {
      expect(screen.getByTestId('class-card-1')).toBeTruthy();
      expect(screen.getByTestId('class-card-2')).toBeTruthy();
    });
    expect(screen.getByText('Sentinel')).toBeTruthy();
    expect(screen.getByText('Arcanist')).toBeTruthy();
  });

  it('validates name — too short', async () => {
    mockFetch(mockClasses);
    render(<CharacterCreator existingCharacter={null} />);

    await waitFor(() => screen.getByTestId('class-card-1'));

    const input = screen.getByPlaceholderText(/3.20 characters/i);
    fireEvent.change(input, { target: { value: 'Hi' } });

    await waitFor(() => {
      expect(screen.getByTestId('name-error').textContent).toMatch(/at least 3/i);
    });
  });

  it('validates name — invalid characters', async () => {
    mockFetch(mockClasses);
    render(<CharacterCreator existingCharacter={null} />);

    await waitFor(() => screen.getByTestId('class-card-1'));

    const input = screen.getByPlaceholderText(/3.20 characters/i);
    fireEvent.change(input, { target: { value: 'Name@!' } });

    await waitFor(() => {
      expect(screen.getByTestId('name-error').textContent).toMatch(/hyphens only/i);
    });
  });

  it('submit button disabled until class selected and valid name entered', async () => {
    mockFetch(mockClasses);
    render(<CharacterCreator existingCharacter={null} />);

    await waitFor(() => screen.getByTestId('class-card-1'));

    const button = screen.getByRole('button', { name: /Create Character/i });
    expect(button).toBeDisabled();

    const input = screen.getByPlaceholderText(/3.20 characters/i);
    fireEvent.change(input, { target: { value: 'ValidName' } });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('calls API and triggers onCharacterCreated on success', async () => {
    mockFetch(mockClasses);
    const onCreated = vi.fn();
    render(<CharacterCreator existingCharacter={null} onCharacterCreated={onCreated} />);

    await waitFor(() => screen.getByTestId('class-card-1'));

    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ character: mockExistingCharacter, progress: {}, essence: {} }),
    });

    const input = screen.getByPlaceholderText(/3.20 characters/i);
    fireEvent.change(input, { target: { value: 'Aldric' } });

    const button = screen.getByRole('button', { name: /Create Character/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/players/me/characters', {
        character_name: 'Aldric',
        class_id: 1,
      });
      expect(onCreated).toHaveBeenCalledWith(mockExistingCharacter);
    });
  });

  it('shows error message when creation fails', async () => {
    mockFetch(mockClasses);
    render(<CharacterCreator existingCharacter={null} />);

    await waitFor(() => screen.getByTestId('class-card-1'));

    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: { error: 'This name is already taken', field: 'character_name' } }),
    });

    const input = screen.getByPlaceholderText(/3.20 characters/i);
    fireEvent.change(input, { target: { value: 'TakenName' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Character/i }));

    await waitFor(() => {
      expect(screen.getByTestId('submit-error').textContent).toMatch(/already taken/i);
    });
  });

  it('shows delete button on existing character', () => {
    render(<CharacterCreator existingCharacter={mockExistingCharacter} />);
    expect(screen.getByTestId('delete-character-btn')).toBeTruthy();
  });

  it('clicking delete button shows the confirm form', async () => {
    render(<CharacterCreator existingCharacter={mockExistingCharacter} />);
    fireEvent.click(screen.getByTestId('delete-character-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm-form')).toBeTruthy();
      expect(screen.getByTestId('delete-name-input')).toBeTruthy();
    });
    // Delete forever button disabled until name typed
    expect(screen.getByTestId('delete-confirm-submit')).toBeDisabled();
  });

  it('Delete Forever button stays disabled when wrong name entered', async () => {
    render(<CharacterCreator existingCharacter={mockExistingCharacter} />);
    fireEvent.click(screen.getByTestId('delete-character-btn'));

    await waitFor(() => screen.getByTestId('delete-name-input'));
    fireEvent.change(screen.getByTestId('delete-name-input'), { target: { value: 'WrongName' } });

    expect(screen.getByTestId('delete-confirm-submit')).toBeDisabled();
  });

  it('Delete Forever button enabled when exact name entered', async () => {
    render(<CharacterCreator existingCharacter={mockExistingCharacter} />);
    fireEvent.click(screen.getByTestId('delete-character-btn'));

    await waitFor(() => screen.getByTestId('delete-name-input'));
    fireEvent.change(screen.getByTestId('delete-name-input'), {
      target: { value: mockExistingCharacter.character_name },
    });

    expect(screen.getByTestId('delete-confirm-submit')).not.toBeDisabled();
  });

  it('calls delete API and triggers onCharacterDeleted on confirmed submit', async () => {
    const onDeleted = vi.fn();

    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Character deleted' }),
    });

    render(<CharacterCreator existingCharacter={mockExistingCharacter} onCharacterDeleted={onDeleted} />);

    fireEvent.click(screen.getByTestId('delete-character-btn'));
    await waitFor(() => screen.getByTestId('delete-name-input'));

    fireEvent.change(screen.getByTestId('delete-name-input'), {
      target: { value: mockExistingCharacter.character_name },
    });
    fireEvent.submit(screen.getByTestId('delete-confirm-form'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/api/players/me/characters/${mockExistingCharacter.id}`);
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('cancel hides the confirm form without calling the API', async () => {
    render(<CharacterCreator existingCharacter={mockExistingCharacter} />);
    fireEvent.click(screen.getByTestId('delete-character-btn'));

    await waitFor(() => screen.getByTestId('delete-cancel-btn'));
    fireEvent.click(screen.getByTestId('delete-cancel-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('delete-confirm-form')).toBeNull();
    });
    expect(api.delete).not.toHaveBeenCalled();
  });
});
