# Database Migrations Guide

This document outlines the procedure for applying SQL migrations to the production database.

## 🚀 Procedure

### 1. Locate Postgres CLI (`psql`)
Ensure `psql` is installed and locate its executable.
- **Windows:** Typically found in `C:\Program Files\PostgreSQL\<version>\bin\psql.exe`.
- **Linux/Mac:** Usually available in the PATH as `psql`.

### 2. Retrieve Connection Details

**Local development database** is the HOST machine's PostgreSQL on `localhost:5432` — NOT the Docker postgres container. The Docker postgres service is for clean deployment/CI only.

```bash
# Local dev access (credentials from backend/.env):
PGPASSWORD='<APP_USER_PASSWORD from backend/.env>' psql -h localhost -U erp_app_user -d erp_production
```

**Production/Cloud SQL** connection string is stored in `backend/.env` under `DATABASE_URL_LIVE`.
- Look for: `DATABASE_URL_LIVE=postgresql+psycopg2://<user>:<password>@/<dbname>?host=<instance_connection_name>`
- Extract the username, password, and the Cloud SQL Public IP (which can be found via `gcloud sql instances describe <instance_name>`).
- NOTE: `host.docker.internal` in connection strings maps to `localhost` on the host machine.

### 3. Execute Migration
Use the following command pattern to execute SQL files directly against the production instance:

**Windows (PowerShell):**
```powershell
$env:PGPASSWORD='<password>'; & '<path_to_psql>' -h <public_ip> -U <username> -d <database_name> -f <path_to_sql_file>
```

**Linux/Mac:**
```bash
PGPASSWORD='<password>' psql -h <public_ip> -U <username> -d <database_name> -f <path_to_sql_file>
```

## ⚠️ Safety Rules
1. **Always verify the SQL content** before running it on production.
2. **Never commit the `.env` file** or hardcode the password in permanent scripts.
3. **Authorized Networks:** Ensure your current public IP is added to the Cloud SQL "Authorized Networks" in the GCP Console if you are connecting from a local machine.
4. **Data Dictionary:** After any successful migration, you **MUST** update `db/data_dictionary.md` to reflect the changes (History and Schema).
