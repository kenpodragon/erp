# Direct Database Access: Setting the Owner Flag

For security, the `is_owner` flag cannot be changed via the Admin Panel or API. It must be set directly in the database.

## Instructions

### 1. Identify the Player
Find the player ID or email of the user you want to promote to Owner.

```sql
SELECT id, email, alias FROM players WHERE email = 'youremail@gmail.com';
```

### 2. Set the Owner Flag
Run the following SQL command to grant Owner status.

```sql
UPDATE players 
SET is_owner = TRUE, 
    is_system_admin = TRUE, 
    is_game_admin = TRUE 
WHERE email = 'youremail@gmail.com';
```

### 3. Whitelist your Admin Access (Database Bypass)
If you are moving away from environment variables or setting up a fresh environment, you should whitelist your email and current IP directly in the database to ensure immediate access.

#### Whitelist Email
```sql
INSERT INTO admin_whitelist_emails (email, added_by) 
VALUES ('youremail@gmail.com', 'system_init')
ON CONFLICT (email) DO NOTHING;
```

#### Whitelist IP
Replace `YOUR_IP_ADDRESS` with your actual public IP.
```sql
INSERT INTO admin_whitelist_ips (ip_address, note, added_by) 
VALUES ('YOUR_IP_ADDRESS', 'Initial Owner Access', 'system_init')
ON CONFLICT (ip_address) DO NOTHING;
```

### 4. Emergency: Disable IP Whitelist (Local Dev / Docker issues)
If you are locked out due to IP restrictions (common in Docker/Local setups), you can disable IP enforcement entirely via the database.

**Disable IP Check:**
```sql
UPDATE server_config SET value = 'false' WHERE key = 'ops.admin_ip_whitelist_enabled';
```

**Re-enable IP Check:**
```sql
UPDATE server_config SET value = 'true' WHERE key = 'ops.admin_ip_whitelist_enabled';
```

*Note: This setting can also be toggled from the Admin "Server Config" page once you have access.*

### 5. (Optional) Revoke Owner Status
To remove owner status, set the flag to `FALSE`.

```sql
UPDATE players SET is_owner = FALSE WHERE email = 'youremail@gmail.com';
```

---
**Note:** Owners have full access to everything, including the ability to change other users' permissions (System Admin, Game Admin) and manage the Access Control whitelist via the Admin Panel.
