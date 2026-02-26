# Infrastructure Setup Guide

This document outlines the steps required to set up the cloud and authentication infrastructure for the ERP project.

## 1. Google Cloud Platform (GCP)
We use GCP for hosting (Cloud Run), database (Cloud SQL), and secret management.

- **Account Signup:** [Google Cloud Console](https://console.cloud.google.com/)
- **Setup Steps:**
  1. **Create Project:** Name it `elysium-rising-erp` (or similar).
  2. **Enable APIs:**
     - Cloud Run API
     - Cloud SQL Admin API
     - Artifact Registry API
     - Secret Manager API
     - IAM Service Account Credentials API
  3. **Cloud SQL (PostgreSQL):**
     - Provision a Cloud SQL for PostgreSQL instance (e.g., `erp-db-j7q9k`).
     - **Securing the Database:**
       - **Private IP:** Enable Private IP for the instance to allow internal GCP traffic (from Cloud Run) without exposing it to the internet.
       - **Public IP & Authorized Networks:** If you need to connect from your local machine:
         - Go to the **Connections** tab > **Networking**.
         - Under **Authorized Networks**, click **Add Network**.
         - Name it `LocalDev` and enter your public IPv4 address (found via `whatsmyip.org`) with a `/32` mask (e.g., `1.2.3.4/32`).
       - **SSL/TLS:** Enforce SSL connections for all traffic.
     - Note the `Instance Connection Name` for the Backend configuration.
  4. **Artifact Registry:**
     - Create a Docker repository named `erp-images` in your preferred region (e.g., `us-east1`).

## 2. Domain & DNS (WordPress.com)
To link your WordPress.com domain (e.g., `elysium-rising.com`) to your services.

1. **Cloud Run Domain Mapping:**
   - In GCP Console, go to **Cloud Run** > **Manage Custom Domains**.
   - Click **Add Mapping**, select your service (e.g., `erp-frontend`), and enter the subdomain (e.g., `play.elysium-rising.com`).
   - GCP will provide a set of **DNS Records** (usually A, AAAA, and TXT).
2. **WordPress.com DNS Setup:**
   - Log in to [WordPress.com](https://wordpress.com/domains/manage/).
   - Select your domain > **DNS Records** > **Manage**.
   - **Add Records:** Enter the A/AAAA/TXT records provided by GCP.
   - **TTL:** Set to the default (usually 3600).
   - *Note:* It may take up to 24-48 hours for DNS changes to propagate.

## 3. Firebase & Google SSO
Firebase handles our Authentication and tie-in with Google Play.

- **Console:** [Firebase Console](https://console.firebase.google.com/)
- **Setup Steps:**
  1. **Add Project:** Connect it to your existing GCP project.
  2. **Enable Authentication:**
     - Go to Build > Authentication > Get Started.
     - Enable the **Google** Sign-in provider.
  3. **App Registration (Detailed):**
     - On the Firebase Project Overview page, click the **Web icon** (`</>`) to add an app.
     - **App nickname:** Enter `erp-web-ui`.
     - (Optional) Skip "Firebase Hosting" for now as we use Cloud Run.
     - Click **Register app**.
     - **Copy Configuration:** You will see a `firebaseConfig` object. Save these values; they will be needed for your Frontend `.env` file:
       - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
     - Click **Continue to console**.
  4. **Google Play Integration (Detailed):**
     - **Prerequisite:** You must have a [Google Play Developer Account](https://play.google.com/console/signup).
     - **Link Firebase:** Go to **Project Settings** > **Integrations** > **Google Play** > **Link**.
     - **Play Games Services (PGS):** In [Google Play Console](https://play.google.com/console/), go to **Grow** > **Play Games Services** > **Configuration** and follow the PGS setup.

## 4. GitHub Actions (CI/CD)
To automate deployment to Cloud Run.

1. **Create Service Account:** In GCP IAM, create a service account with `Cloud Run Developer` and `Artifact Registry Administrator` roles.
2. **Download JSON Key:** Generate and download a JSON key for this account.
3. **GitHub Secrets:** Add the following to your repository settings (Settings > Secrets and variables > Actions):
   - `GCP_PROJECT_ID`: Your GCP Project ID.
   - `GCP_SA_KEY`: The contents of your Service Account JSON key.
   - `GCP_REGION`: The region (e.g., `us-east1`).

## 5. Stripe Payments
Stripe handles microtransactions, subscriptions, and donations.

- **Account Signup:** [Stripe Dashboard](https://dashboard.stripe.com/register)
- **Setup Steps:**
 1. **Activate Account:** Complete the business activation to process live payments (or use Test Mode for development).
  2. **API Keys:**
     - Go to Developers > API keys.
     - Copy the **Publishable key** (for Frontend).
     - Copy the **Secret key** (for Backend).
  3. **Webhook Setup:**
     - Go to Developers > Webhooks.
     - Add an endpoint for your backend (e.g., `https://api.elysium-rising.com/v1/payments/webhook`).
     - Select events like `checkout.session.completed` and `customer.subscription.deleted`.
     - Copy the **Webhook Secret** for Backend verification.
  4. **Products & Prices:**
     - Create Products in the Stripe Dashboard for subscriptions and microtransactions to get their `Price IDs`.

## 6. Local Development & Cloud Deployment

### 6.1. Environment Configuration
Before running the application, ensure you have configured your environment variables.
- Create a `.env` file in the `backend/` directory based on `backend/.env.example`.
- Create a `.env` file in the `frontend/` directory based on `frontend/.env.example`.
- Create a `.env` file in the `admin/` directory based on `admin/.env.example`.

### 6.2. Local Orchestration (Docker Compose)
To launch the entire development stack (PostgreSQL, FastAPI Backend, React Frontend, Admin Panel) locally:

1. **Build and Start:**
   ```bash
   docker-compose up --build
   ```
2. **Accessing Services:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Admin Panel:** [http://localhost:3001](http://localhost:3001)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
3. **Stop Services:**
   ```bash
   docker-compose down
   ```

### 6.3. Manual Deployment to GCP (us-east1)
To manually build, push, and deploy your containers to Google Cloud Run:

1. **Authentication & Config:**
   ```bash
   # Login to Google Cloud
   gcloud auth login

   # Configure Docker to use Artifact Registry in us-east1
   gcloud auth configure-docker us-east1-docker.pkg.dev

   # Set your active project
   gcloud config set project [YOUR_PROJECT_ID]
   ```

2. **Build and Tag Images:**
   ```bash
   # Build Backend
   docker build -t us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/backend:latest ./backend

   # Build Frontend
   docker build -t us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/frontend:latest ./frontend

   # Build Admin Panel
   docker build -t us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/admin:latest ./admin
   ```

3. **Push to Artifact Registry:**
   ```bash
   docker push us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/backend:latest
   docker push us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/frontend:latest
   docker push us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/admin:latest
   ```

4. **Deploy to Cloud Run:**
   ```bash
   # Deploy Backend
   gcloud run deploy erp-backend \
     --image us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/backend:latest \
     --region us-east1 \
     --allow-unauthenticated

   # Deploy Frontend
   gcloud run deploy erp-frontend \
     --image us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/frontend:latest \
     --region us-east1 \
     --allow-unauthenticated

   # Deploy Admin Panel
   gcloud run deploy erp-admin \
     --image us-east1-docker.pkg.dev/[YOUR_PROJECT_ID]/erp-images/admin:latest \
     --region us-east1 \
     --allow-unauthenticated
   ```
