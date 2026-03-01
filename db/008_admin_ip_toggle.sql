-- Add a toggle for Admin IP Whitelisting
INSERT INTO server_config (key, value, value_type, category, description, default_value)
VALUES (
    'ops.admin_ip_whitelist_enabled', 
    'true', 
    'boolean', 
    'ops', 
    'If true, the Admin Panel enforces the IP whitelist. If false, any whitelisted email can access from any IP.', 
    'true'
)
ON CONFLICT (key) DO NOTHING;
