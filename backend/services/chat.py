"""Chat connection manager and rate limiting (REC 2.6.4).

Messages are held in an in-memory rolling buffer -- NOT persisted to DB.
"""

import time
from collections import deque
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import WebSocket, WebSocketDisconnect


class ChatRateLimiter:
    """Sliding-window rate limiter per player."""

    def __init__(self, max_per_minute: int = 20):
        self.max_per_minute = max_per_minute
        self._timestamps: Dict[int, List[float]] = {}

    def is_allowed(self, player_id: int) -> bool:
        now = time.time()
        window_start = now - 60.0
        stamps = self._timestamps.get(player_id, [])
        stamps = [t for t in stamps if t > window_start]
        self._timestamps[player_id] = stamps
        if len(stamps) >= self.max_per_minute:
            return False
        stamps.append(now)
        return True


class BroadcastRateLimiter:
    """Global rate limiter for system broadcasts."""

    def __init__(self, max_per_minute: int = 10):
        self.max_per_minute = max_per_minute
        self._timestamps: List[float] = []

    def is_allowed(self) -> bool:
        now = time.time()
        window_start = now - 60.0
        self._timestamps = [t for t in self._timestamps if t > window_start]
        if len(self._timestamps) >= self.max_per_minute:
            return False
        self._timestamps.append(now)
        return True


class ConnectionManager:
    """Manages WebSocket connections and in-memory message buffer."""

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.message_buffer: deque = deque(maxlen=200)
        self.channels: Dict[str, bool] = {"global": True}
        self.chat_rate_limiter = ChatRateLimiter()
        self.broadcast_rate_limiter = BroadcastRateLimiter()

    async def connect(self, player_id: int, websocket: WebSocket):
        await websocket.accept()
        # Close stale connections for this player before adding the new one
        if player_id in self.active_connections:
            stale = self.active_connections[player_id]
            self.active_connections[player_id] = []
            for old_ws in stale:
                try:
                    await old_ws.close(code=4010, reason="Replaced by new connection")
                except (RuntimeError, WebSocketDisconnect):
                    pass
        else:
            self.active_connections[player_id] = []
        self.active_connections[player_id].append(websocket)

    def disconnect(self, player_id: int, websocket: WebSocket):
        if player_id in self.active_connections:
            self.active_connections[player_id] = [
                ws for ws in self.active_connections[player_id] if ws is not websocket
            ]
            if not self.active_connections[player_id]:
                del self.active_connections[player_id]

    async def broadcast(self, message: dict):
        """Send message to all connected clients."""
        self.message_buffer.append(message)
        disconnected = []
        for player_id, sockets in self.active_connections.items():
            for ws in sockets:
                try:
                    await ws.send_json(message)
                except (RuntimeError, WebSocketDisconnect):
                    disconnected.append((player_id, ws))
        for player_id, ws in disconnected:
            self.disconnect(player_id, ws)

    async def send_personal(self, player_id: int, message: dict):
        """Send a message to a specific player."""
        if player_id in self.active_connections:
            for ws in self.active_connections[player_id]:
                try:
                    await ws.send_json(message)
                except (RuntimeError, WebSocketDisconnect):
                    pass

    def get_history(self) -> List[dict]:
        """Return the message buffer as a list."""
        return list(self.message_buffer)

    def update_config(self, buffer_size: int = 200, rate_limit: int = 20,
                      broadcast_limit: int = 10):
        """Update configuration from game_configs."""
        if buffer_size != self.message_buffer.maxlen:
            old_msgs = list(self.message_buffer)
            self.message_buffer = deque(old_msgs[-buffer_size:], maxlen=buffer_size)
        self.chat_rate_limiter.max_per_minute = rate_limit
        self.broadcast_rate_limiter.max_per_minute = broadcast_limit


# Singleton instance
manager = ConnectionManager()
