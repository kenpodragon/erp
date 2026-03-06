/**
 * WebSocket chat client with auto-reconnect (REC 2.6.4).
 */

import { auth } from '../../firebase';

export interface ChatMessage {
  type: 'message' | 'system' | 'error' | 'history' | 'ping';
  player_id?: number;
  player_name?: string;
  player_level?: number;
  content?: string;
  timestamp?: string;
  is_system?: boolean;
  messages?: ChatMessage[];
  message?: string;
}

type MessageHandler = (msg: ChatMessage) => void;

const WS_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace(/^http/, 'ws');

class ChatClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;

  get connected(): boolean {
    return this._connected;
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const user = auth?.currentUser;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      this.ws = new WebSocket(`${WS_BASE}/ws/chat?token=${token}`);

      this.ws.onopen = () => {
        this._connected = true;
        this.reconnectAttempts = 0;
        this.notify({ type: 'system', content: 'Connected to chat' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ChatMessage;
          if (data.type === 'ping') {
            this.ws?.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          this.notify(data);
        } catch {
          // ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this._connected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this._connected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  send(content: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'message', content }));
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent reconnect
    this.ws?.close();
    this.ws = null;
    this._connected = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private notify(msg: ChatMessage): void {
    this.handlers.forEach(h => {
      try { h(msg); } catch { /* ignore */ }
    });
  }
}

// Singleton
export const chatClient = new ChatClient();
