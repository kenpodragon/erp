# ERP Deployment Guide

This guide covers how to run and deploy the Elysium Rising mmorPg (ERP) stack in various environments.

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

## 2. Local Orchestration (Docker Compose)
Use this to test the containerized versions of the services and ensure they interact correctly.

```bash
# From the project root
docker-compose up --build
```
- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:5173
- **Admin:** http://localhost:5174

*Note: Your local `.env` files are automatically mounted into the containers.*

---

## 3. Manual Cloud Deployment
We use specialized scripts to push local configurations to Google Cloud Run via **Google Secret Manager**. This keeps Docker images clean of secrets and ensures secure variable management.

### How the Postfix Logic Works
The deployment scripts are environment-agnostic. They look for variables ending in `_LIVE` in your `.env` files and use them to override the base variable in the cloud.
- **Example:** `DATABASE_URL_LIVE` becomes `DATABASE_URL` on the Cloud Run server.

### Run the Deploy Script
This script builds your Docker images, pushes them to Artifact Registry, updates your Secrets in Secret Manager, and redeploys the services.
```bash
# Full rebuild and redeploy
python infra/deploy_cloud.py
```

### Update Environment Variables (Secrets) Only
If you only changed `.env` files and don't need to rebuild the code, use this faster script:
```bash
python infra/push_env.py
```
This script updates the secrets in Google Secret Manager and triggers a new revision in Cloud Run to mount the updated `.env` file.

---

## 4. Automated CI/CD (Google Cloud Build)
The project is configured to deploy automatically via **Google Cloud Build** whenever code is pushed to the `main` branch.

### How it works
Cloud Build uses the `cloudbuild.yaml` file in the root directory to:
1.  **Test Backend:** Runs `pytest` on the backend code.
2.  **Lint Frontend/Admin:** Runs `npm run lint` for both UI projects.
3.  **Build & Push:** Creates Docker images and pushes them to Artifact Registry.
4.  **Deploy:** Deploys the new images to Cloud Run, mounting secrets from Secret Manager.

### Setup Requirements
1.  **Connect Repository:** Connect this GitHub repository to Google Cloud Build in the GCP Console.
2.  **Secret Manager:** Ensure secrets (`erp-backend-env`, `erp-frontend-env`, `erp-admin-env`) exist in Secret Manager. Use `python infra/migrate_secrets.py` to sync them from your local environment.
3.  **Permissions:** The Cloud Build Service Account needs `Cloud Run Admin` and `Secret Manager Secret Accessor` roles.

### Deployment URLs (Friendly)
- **Game:** https://play.does-god-exist.org
- **API:** https://api.does-god-exist.org
- **Admin:** https://admin.does-god-exist.org

---

## 5. Cloud Management & Cost Saving
You can stop all cloud services (Cloud SQL and Cloud Run) when not developing to save costs.

### Stop All Services
```bash
python infra/stop_cloud.py
```

### Start All Services
```bash
python infra/start_cloud.py
```

---

## 6. Troubleshooting
- **CORS Errors:** Ensure the URL you are accessing from is listed in `backend/main.py` under `CORSMiddleware`.
- **404 on Custom Domains:** This usually means SSL certificates are still provisioning. Check progress with:
  `gcloud beta run domain-mappings describe --domain play.does-god-exist.org --region us-east1`
- **Database Connection Failed:**
  - Locally: Check if your IP is whitelisted in Cloud SQL -> Connections.
  - Cloud: Ensure the Cloud Run service has the Cloud SQL instance attached.
