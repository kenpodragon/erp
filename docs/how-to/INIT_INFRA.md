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
     > **Database Migrations:** For detailed migration procedures, schema management, and production DB operations, see [`docs/how-to/DB_MIGRATIONS.md`](DB_MIGRATIONS.md).
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
   5.  Add Authorized Domains
     - Firebase only allows logins from domains it trusts.
     - In the same Authentication section, click the Settings tab (top right).
     - Select Authorized domains from the left sub-menu.
     - Ensure localhost is listed.

## 4. GitHub Actions (CI/CD)
To automate deployment to Cloud Run.

1. **Create Service Account:** In GCP IAM, create a service account with `Cloud Run Developer` and `Artifact Registry Administrator` roles.
2. **Download JSON Key:** Generate and download a JSON key for this account.
3. **GitHub Secrets:** Add the following to your repository settings (Settings > Secrets and variables > Actions):
   - `GCP_PROJECT_ID`: Your GCP Project ID.
   - `GCP_SA_KEY`: The contents of your Service Account JSON key.
   - `GCP_REGION`: The region (e.g., `us-east1`).
   - `BACKEND_ENV`: (contents of your backend/.env)
   - `FRONTEND_ENV`: (contents of your frontend/.env)
   - `ADMIN_ENV`: (contents of your admin/.env)

## 5. Stripe Payments
Stripe handles microtransactions (shard purchasing), subscriptions (Elysium Ascendant), donations, and marketplace shard transfers.

- **Account Signup:** [Stripe Dashboard](https://dashboard.stripe.com/register)

### 5.1 Test Mode Setup (Local Development)
Use Stripe's Test Mode for all local development. No real charges are made.

1. **Create/Access Account:**
   - Go to [dashboard.stripe.com](https://dashboard.stripe.com) and sign in (or create a free account).
   - Toggle **Test mode** using the switch in the top-right corner of the dashboard.

2. **Get Test API Keys:**
   - Go to **Developers → API keys**.
   - Copy the **Publishable key** (`pk_test_...`) — used by Frontend for Stripe.js.
   - Copy the **Secret key** (`sk_test_...`) — used by Backend for API calls.
   - Add to `backend/.env`:
     ```
     STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
     ```

3. **Local Webhook Forwarding (Stripe CLI):**
   - Install the Stripe CLI:
     - **Windows (winget):** `winget install Stripe.StripeCLI`
     - **Windows (npm):** `npm install -g stripe`
     - **Windows (manual):** Download zip from [github.com/stripe/stripe-cli/releases](https://github.com/stripe/stripe-cli/releases) → extract `stripe.exe` → add to PATH
     - **Mac:** `brew install stripe/stripe-cli/stripe`
     - **Linux:** See [docs](https://stripe.com/docs/stripe-cli#install)
   - Authenticate:
     ```bash
     stripe login
     ```
     This opens a browser window to authorize the CLI with your Stripe account.
   - Start webhook forwarding:
     ```bash
     stripe listen --forward-to localhost:8000/api/webhooks/stripe
     ```
     The CLI will output a webhook signing secret: `whsec_...`. Copy it.
   - Add to `backend/.env`:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_YOUR_CLI_SECRET_HERE
     ```
   - **Keep the CLI running** in a separate terminal while testing payment flows.

4. **Verify Integration:**
   ```bash
   # Test that the backend can create a checkout session
   # Requires a valid Firebase Bearer token (auth bypass removed 2026-03-22)
   curl -X POST http://localhost:8000/api/payments/checkout \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <FIREBASE_TOKEN>" \
     -d '{"package_id": 1}'

   # Trigger a test webhook event
   stripe trigger checkout.session.completed
   ```

5. **Test Credit Cards:**
   Stripe provides test card numbers for different scenarios:
   | Card Number | Scenario |
   |-------------|----------|
   | `4242 4242 4242 4242` | Successful payment |
   | `4000 0000 0000 0002` | Card declined |
   | `4000 0000 0000 9995` | Insufficient funds |
   | `4000 0000 0000 0259` | Dispute/chargeback |

   Use any future expiry date, any 3-digit CVC, and any billing ZIP.

### 5.2 Production Setup
1. **Activate Account:** Complete the business activation form in the Stripe Dashboard to process live payments.
2. **API Keys:**
   - Go to **Developers → API keys** (with Test mode OFF).
   - Copy the live **Publishable key** (`pk_live_...`) and **Secret key** (`sk_live_...`).
3. **Webhook Setup:**
   - Go to **Developers → Webhooks → Add endpoint**.
   - URL: `https://api.elysium-rising.com/api/webhooks/stripe`
   - Select events:
     - `checkout.session.completed` (shard purchases, donations)
     - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` (subscriptions)
     - `invoice.paid`, `invoice.payment_failed` (recurring billing)
     - `charge.dispute.created`, `charge.dispute.closed` (disputes)
   - Copy the **Webhook Secret** (`whsec_...`) for Backend verification.
4. **Products & Prices:**
   - Create Products in the Stripe Dashboard for subscription plans to get their `Price IDs`.
   - The backend uses `shard_packages` and `subscription_plans` DB tables — seed these with Stripe Price IDs.

### 5.3 Environment Variables Summary
| Variable | Location | Example | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | `backend/.env` | `sk_test_...` or `sk_live_...` | Backend API key |
| `STRIPE_WEBHOOK_SECRET` | `backend/.env` | `whsec_...` | Webhook signature verification |
| `FRONTEND_URL` | `backend/.env` | `http://localhost:5173` | Redirect URL after checkout |

## 6. Local Development & Cloud Deployment

### 6.1. Environment Configuration
Before running the application, ensure you have configured your environment variables.
- Create a `.env` file in the `backend/` directory based on `backend/.env.example`.
- Create a `.env` file in the `frontend/` directory based on `frontend/.env.example`.
- Create a `.env` file in the `admin/` directory based on `admin/.env.example`.

> **Local Development & Deployment:** For Docker orchestration, local service startup, and Cloud Run deployment procedures, see [`docs/how-to/DEPLOY.md`](DEPLOY.md).
