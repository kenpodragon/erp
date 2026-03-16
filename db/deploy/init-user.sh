#!/bin/sh
set -e

# Create the application user and database
# This script runs as the postgres superuser during container initialization

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create application user (skip if exists)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${APP_USER}') THEN
            CREATE ROLE ${APP_USER} WITH LOGIN PASSWORD '${APP_USER_PASSWORD}';
        END IF;
    END
    \$\$;

    -- Create application database (skip if exists)
    SELECT 'CREATE DATABASE ${APP_DATABASE} OWNER ${APP_USER}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${APP_DATABASE}')\gexec

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE ${APP_DATABASE} TO ${APP_USER};
EOSQL

# Grant schema privileges on the app database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DATABASE" <<-EOSQL
    GRANT ALL ON SCHEMA public TO ${APP_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${APP_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${APP_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${APP_USER};
EOSQL

echo "✓ Application user '${APP_USER}' and database '${APP_DATABASE}' ready."
