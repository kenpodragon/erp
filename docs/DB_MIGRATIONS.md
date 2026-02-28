# Database Migrations Guide

This document outlines the procedure for applying SQL migrations to the production database.

## 🚀 Procedure

### 1. Locate Postgres CLI (`psql`)
Ensure `psql` is installed and locate its executable.
- **Windows:** Typically found in `C:\Program Files\PostgreSQL\<version>\bin\psql.exe`.
- **Linux/Mac:** Usually available in the PATH as `psql`.

### 2. Retrieve Connection Details
The production connection string is stored in `backend/.env` under the variable `DATABASE_URL_LIVE`.
- Look for: `DATABASE_URL_LIVE=postgresql+psycopg2://<user>:<password>@/<dbname>?host=<instance_connection_name>`
- Extract the username, password, and the Cloud SQL Public IP (which can be found via `gcloud sql instances describe <instance_name>`).

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
