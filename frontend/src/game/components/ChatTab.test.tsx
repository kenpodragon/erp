import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConnect, mockDisconnect, mockSend, mockOnMessage } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockSend: vi.fn(),
  mockOnMessage: vi.fn(() => vi.fn()),
}));

vi.mock('../services/chatClient', () => ({
  chatClient: {
    connect: mockConnect,
    disconnect: mockDisconnect,
    send: mockSend,
    onMessage: mockOnMessage,
    get connected() {
      return true;
    },
  },
}));

import ChatTab from './ChatTab';

describe('ChatTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // onMessage captures the callback; invoke it immediately so connected state becomes true
    mockOnMessage.mockImplementation((cb: (msg: any) => void) => {
      // Fire a history message to trigger setConnected(chatClient.connected) → true
      setTimeout(() => cb({ type: 'history', messages: [] }), 0);
      return vi.fn();
    });
  });

  it('renders the chat header and input', () => {
    render(<ChatTab />);

    expect(screen.getByText('Global Chat')).toBeDefined();
    expect(screen.getByPlaceholderText('Type a message...')).toBeDefined();
  });

  it('renders the Send button', () => {
    render(<ChatTab />);

    expect(screen.getByText('Send')).toBeDefined();
  });

  it('calls connect on mount', () => {
    render(<ChatTab />);

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('subscribes to messages on mount', () => {
    render(<ChatTab />);

    expect(mockOnMessage).toHaveBeenCalledTimes(1);
    expect(typeof mockOnMessage.mock.calls[0][0]).toBe('function');
  });

  it('sends message when clicking Send with text in input', async () => {
    render(<ChatTab />);

    // Wait for onMessage callback to fire and set connected=true
    await waitFor(() => {
      expect(screen.getByText('Send')).not.toBeDisabled();
    });

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByText('Send'));

    expect(mockSend).toHaveBeenCalledWith('Hello world');
  });

  it('sends message when pressing Enter', () => {
    render(<ChatTab />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    expect(mockSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send empty messages', () => {
    render(<ChatTab />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Send'));

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('clears input after sending', async () => {
    render(<ChatTab />);

    await waitFor(() => {
      expect(screen.getByText('Send')).not.toBeDisabled();
    });

    const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));

    expect(input.value).toBe('');
  });

  it('does not send on Shift+Enter', () => {
    render(<ChatTab />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Multiline text' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('renders system broadcast messages with broadcast class', async () => {
    let messageCallback: ((msg: any) => void) | null = null;
    mockOnMessage.mockImplementation((cb: (msg: any) => void) => {
      messageCallback = cb;
      setTimeout(() => cb({ type: 'history', messages: [] }), 0);
      return vi.fn();
    });

    const { container } = render(<ChatTab />);

    await waitFor(() => {
      expect(messageCallback).not.toBeNull();
    });

    act(() => {
      messageCallback!({
        type: 'system_broadcast',
        event_type: 'boss_defeat',
        player_name: 'TestHero',
        detail: 'TestHero defeated the Chapter Boss!',
        is_system: true,
      });
    });

    await waitFor(() => {
      const broadcastMsg = container.querySelector('.chat-message.broadcast');
      expect(broadcastMsg).not.toBeNull();
    });
  });
});
