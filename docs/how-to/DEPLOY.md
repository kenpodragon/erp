# ERP Deployment Guide

This guide covers how to run and deploy the Elysium Rising mmorPg (ERP) stack.

## 1. Local Development (No Docker)
This is the fastest way to develop. Each service runs directly on your host machine.

### Prerequisites
- Python 3.13+
- Node.js 20+
- A running PostgreSQL instance (or access to the Cloud SQL public IP)

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
- **URL:** http://localhost:8000
- **Docs:** http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- **URL:** http://localhost:5173

### Admin Dashboard
```bash
cd admin
npm install
npm run dev
```
- **URL:** http://localhost:5174

---

## 2. Local Verification Before Deploy

Before pushing to the cloud, verify your changes locally.

> **Testing:** For running the test suite (pytest, vitest, playwright), see [`docs/how-to/TESTING.md`](TESTING.md).

---

## 3. Local Orchestration (Docker Compose)
Use this to run the entire stack in containers. All Dockerfiles and the compose file live in `infra/deploy/`.

```bash
# From the infra/deploy directory
cd infra/deploy
docker compose up --build
```

### Infrastructure Layout
```
infra/deploy/
  docker-compose.yml     # Orchestrates all services
  Dockerfile.backend     # Python/FastAPI image
  Dockerfile.frontend    # Node/Vite player app image
  Dockerfile.admin       # Node/Vite admin app image
  Dockerfile.db          # PostgreSQL 17 with init scripts
  db/                    # DB init scripts, dump.sql, .env
    init-user.sh
    init-db.sh
    dump.sql
    .env / .env.example
```

All Dockerfiles use the repo root as build context, so COPY paths reference `backend/`, `frontend/`, `admin/`, and `db/` from the repo root.

*Note: Your local `.env` files in each service directory are used by the containers.*

---

## 4. Manual Cloud Deployment
We use specialized scripts to push local configurations directly to Google Cloud Run. This method uses temporary YAML files to handle complex values (like JSON credentials) securely.

### How the Postfix Logic Works
The scripts look for variables ending in `_LIVE` in your `.env` files and use them to override the base variable in the cloud.
- **Example:** `DATABASE_URL_LIVE` becomes `DATABASE_URL` on the Cloud Run server.

### Run the Full Deploy Script
This script builds Docker images, pushes them to Artifact Registry, and redeploys the services with updated environment variables.
```powershell
# Scripts live in the krakalaken project wrapper (../infra/ relative to code/)
python ../infra/deploy_cloud.py
```

### Sync Environment Variables Only
If you only changed `.env` files and don't need to rebuild the code, use this faster script:
```powershell
python ../infra/push_env.py
```

---

## 5. Automated CI/CD (Google Cloud Build)
The project is configured to deploy automatically whenever code is pushed to the `main` branch.

### How it works
Cloud Build uses the `cloudbuild.yaml` file (located in the krakalaken project wrapper at `../cloudbuild.yaml`) to:
1.  **Build Images:** Creates Docker images for Backend, Frontend, and Admin.
2.  **Push:** Uploads images to Google Artifact Registry.
3.  **Deploy:** Deploys the images to Cloud Run.

*Note: Tests and Linting are handled **locally** via `run_tests` to ensure the cloud pipeline remains fast and reliable.*

### Setup Requirements
1.  **Connect Repository:** Connect this GitHub repository to Google Cloud Build in the GCP Console.
2.  **IAM Permissions:** The Service Account running the build (e.g., `github-deployer@...`) must have:
    -   `roles/logging.logWriter`
    -   `roles/run.admin`
    -   `roles/iam.serviceAccountUser`
    -   `roles/artifactregistry.admin`

### Deployment URLs
- **Game:** https://play.does-god-exist.org
- **API:** https://api.does-god-exist.org
- **Admin:** https://admin.does-god-exist.org

---

## 6. Cloud Management & Cost Saving
You can stop all cloud services (Cloud SQL and Cloud Run) when not developing to save costs.

### Stop All Services
```powershell
python ../infra/stop_cloud.py
```

### Start All Services
```powershell
python ../infra/start_cloud.py
```
