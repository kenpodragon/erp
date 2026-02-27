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
We use a specialized script to push local configurations to Google Cloud Run while keeping Docker images clean of secrets.

### How the Postfix Logic Works
The deployment script is environment-agnostic. It looks for variables ending in `_LIVE` in your `.env` files and uses them to override the base variable in the cloud.
- **Example:** `DATABASE_URL_LIVE` becomes `DATABASE_URL` on the Cloud Run server.

### Run the Deploy Script
```bash
# Full rebuild and redeploy
python infra/deploy_cloud.py
```

### Update Environment Variables Only
If you only changed `.env` files and don't need to rebuild the code, use this faster script:
```bash
python infra/push_env.py
```
This script handles building, pushing to Artifact Registry, and updating Cloud Run with environment variables.

---

## 4. Automated CI/CD (GitHub Actions)
The project is configured to deploy automatically whenever code is pushed to the `main` branch.

### Setup GitHub Secrets
Go to your repository **Settings > Secrets and variables > Actions** and add:

1. **`GCP_PROJECT_ID`**: `elysium-rising-erp`
2. **`GCP_SA_KEY`**: Content of your Service Account JSON key.
3. **`BACKEND_ENV`**: Copy/paste entire `backend/.env`.
4. **`FRONTEND_ENV`**: Copy/paste entire `frontend/.env`.
5. **`ADMIN_ENV`**: Copy/paste entire `admin/.env`.

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
