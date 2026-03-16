#!/bin/sh
set -e

# Database initialization script
# Runs after init-user.sh (alphabetical order: 02 > 01)
#
# Strategy:
#   - If /sql/dump.sql exists → restore from full dump (mirrors localhost)
#   - Otherwise → run individual scripts (001, 002, 003) for clean setup

if [ -f /sql/dump.sql ]; then
    echo "Found dump.sql — restoring full database dump..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DATABASE" -f /sql/dump.sql
    echo "✓ Database restored from dump.sql"
else
    echo "No dump.sql found — running initialization scripts..."

    # Run all scripts as superuser (002 and 003 use session_replication_role = replica
    # to disable triggers during seeding, which requires superuser privileges).
    for sql_file in /sql/001_init_db_tables.sql /sql/002_system_seed_data.sql /sql/003_sample_content_data.sql; do
        if [ -f "$sql_file" ]; then
            echo "  Applying $(basename $sql_file) (as postgres superuser)..."
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DATABASE" -f "$sql_file"
            echo "  ✓ $(basename $sql_file) applied."
        else
            echo "  ⚠ $(basename $sql_file) not found, skipping."
        fi
    done
fi

# Grant ownership of all objects to the app user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DATABASE" <<-EOSQL
    DO \$\$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner != '${APP_USER}' LOOP
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO ${APP_USER}';
        END LOOP;
        FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' LOOP
            EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO ${APP_USER}';
        END LOOP;
    END
    \$\$;
EOSQL

echo "✓ Database initialization complete."
