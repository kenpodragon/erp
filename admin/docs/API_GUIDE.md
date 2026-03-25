# Admin API Guide

> **Audience:** Admin dashboard end-users. Action-oriented guide for common workflows and operations.
> For technical API details (endpoints, schemas, parameters), see [`docs/reference/API_REFERENCE.md`](../../docs/reference/API_REFERENCE.md).

This guide covers authentication, key endpoints, and curl examples for the Elysium Rising admin dashboard.

---

## Authentication

### Production: Firebase JWT (Google SSO)

All admin API requests require a valid Firebase ID token in the `Authorization` header. The backend validates the JWT and checks that the corresponding player record has `is_admin = true` in the `players` table.

**Flow:**
1. Admin user signs in via Google SSO in the dashboard UI.
2. Firebase issues an ID token.
3. The frontend attaches the token to every request:
   ```
   Authorization: Bearer <firebase_id_token>
   ```
4. The backend (`/backend/routes/auth.py`) verifies the token with Firebase Admin SDK.
5. If `players.is_admin` is `false` or the player does not exist, the request returns `403 Forbidden`.

### Development Authentication

Auth bypass was removed in the spoofing lockdown (2026-03-22). All environments now require real Firebase authentication. For local development, use Firebase Auth Emulator or sign in with a real Google account.

---

## Base URL

| Environment | Base URL                    |
|-------------|-----------------------------|
| Local Docker | `http://localhost:8000`    |
| Production  | `https://api.elysiumrising.com` |

All admin endpoints are under `/api/admin/`.

---

## Key Admin Endpoints

### Game Config

Manage tunable parameters that control game balance and scaling.

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/admin/config/{key}` | Read a single config value |
| `PUT`  | `/api/admin/config/{key}` | Update a config value |
| `GET`  | `/api/admin/config` | List all config keys (if supported) |

Config values live in the `game_configs` table. Keys are free-form strings (e.g., `xp_multiplier`, `drop_rate_common`).

**Read a config value:**
```bash
curl -s http://localhost:8000/api/admin/config/xp_multiplier \
  -H "X-Dev-Player-Id: <admin_player_uuid>"
```

**Update a config value:**
```bash
curl -s -X PUT http://localhost:8000/api/admin/config/xp_multiplier \
  -H "X-Dev-Player-Id: <admin_player_uuid>" \
  -H "Content-Type: application/json" \
  -d '{"value": "1.5"}'
```

**Production (with Firebase token):**
```bash
curl -s -X PUT https://api.elysiumrising.com/api/admin/config/xp_multiplier \
  -H "Authorization: Bearer <firebase_id_token>" \
  -H "Content-Type: application/json" \
  -d '{"value": "1.5"}'
```

---

### Player Management

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/admin/players` | List all players (paginated) |
| `GET`  | `/api/admin/players/{id}` | Get a single player's full profile |

**List players:**
```bash
curl -s "http://localhost:8000/api/admin/players?limit=20&offset=0" \
  -H "X-Dev-Player-Id: <admin_player_uuid>"
```

**Get a player by ID:**
```bash
curl -s http://localhost:8000/api/admin/players/<player_uuid> \
  -H "X-Dev-Player-Id: <admin_player_uuid>"
```

The player profile response includes: account metadata, character list, subscription status, and last login timestamp. For full field details see [API_REFERENCE.md Section 21](../../docs/reference/API_REFERENCE.md#21-admin-endpoints).

---

### Analytics

Analytics endpoints live under `/api/admin/analytics/`. Specific routes vary by metric domain.

**Common patterns:**

```bash
# Session state / active players
curl -s http://localhost:8000/api/admin/analytics/sessions \
  -H "X-Dev-Player-Id: <admin_player_uuid>"

# Player progression overview
curl -s http://localhost:8000/api/admin/analytics/progression \
  -H "X-Dev-Player-Id: <admin_player_uuid>"

# Revenue / payment events
curl -s http://localhost:8000/api/admin/analytics/payments \
  -H "X-Dev-Player-Id: <admin_player_uuid>"
```

For the full list of analytics routes, see [API_REFERENCE.md Section 21](../../docs/reference/API_REFERENCE.md#21-admin-endpoints).

---

## Debugging & Testing Workflows

### Check Current Session State

Use the analytics/sessions endpoint to inspect active sessions and connected players during a live test run:

```bash
curl -s http://localhost:8000/api/admin/analytics/sessions \
  -H "X-Dev-Player-Id: <admin_player_uuid>" | python -m json.tool
```

### Verify Player Progression

After running a simulation or test sequence, inspect a player's progression state directly:

```bash
curl -s http://localhost:8000/api/admin/players/<player_uuid> \
  -H "X-Dev-Player-Id: <admin_player_uuid>" | python -m json.tool
```

### Tune a Config Parameter and Verify

```bash
# 1. Read current value
curl -s http://localhost:8000/api/admin/config/xp_multiplier \
  -H "X-Dev-Player-Id: <admin_player_uuid>"

# 2. Update
curl -s -X PUT http://localhost:8000/api/admin/config/xp_multiplier \
  -H "X-Dev-Player-Id: <admin_player_uuid>" \
  -H "Content-Type: application/json" \
  -d '{"value": "2.0"}'

# 3. Confirm
curl -s http://localhost:8000/api/admin/config/xp_multiplier \
  -H "X-Dev-Player-Id: <admin_player_uuid>"
```

---

## Error Reference

| Status | Meaning |
|--------|---------|
| `401 Unauthorized` | Missing or invalid auth header |
| `403 Forbidden` | Authenticated but `is_admin = false` |
| `404 Not Found` | Resource (player, config key) does not exist |
| `422 Unprocessable Entity` | Request body failed validation |
| `500 Internal Server Error` | Backend error — check container logs |

---

## Further Reading

- Full API reference: [`docs/reference/API_REFERENCE.md`](../../docs/reference/API_REFERENCE.md) — Section 21 covers all admin endpoints in detail.
- Database schema: [`db/data_dictionary.md`](../../db/data_dictionary.md)
- Auth implementation: `backend/routes/auth.py`
- Admin route implementations: `backend/routes/admin*.py`
