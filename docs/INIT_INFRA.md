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
     - Provision a Cloud SQL for PostgreSQL instance.
     - Note the `Instance Connection Name` for the Backend configuration.
  4. **Artifact Registry:**
     - Create a Docker repository named `erp-images` in your preferred region (e.g., `us-east1`).

## 2. Firebase & Google SSO
Firebase handles our Authentication and tie-in with Google Play.

- **Console:** [Firebase Console](https://console.firebase.google.com/)
- **Setup Steps:**
  1. **Add Project:** Connect it to your existing GCP project.
  2. **Enable Authentication:**
     - Go to Build > Authentication > Get Started.
     - Enable the **Google** Sign-in provider.
  3. **App Registration:**
     - Register a **Web App** to get your `firebaseConfig` (API Key, Auth Domain, etc.).
  4. **Google Play Integration (Optional for now):**
     - Link Firebase to your Google Play Developer Console in Project Settings > Integrations.

## 3. GitHub Actions (CI/CD)
To automate deployment to Cloud Run.

1. **Create Service Account:** In GCP IAM, create a service account with `Cloud Run Developer` and `Artifact Registry Administrator` roles.
2. **Download JSON Key:** Generate and download a JSON key for this account.
3. **GitHub Secrets:** Add the following to your repository settings (Settings > Secrets and variables > Actions):
   - `GCP_PROJECT_ID`: Your GCP Project ID.
   - `GCP_SA_KEY`: The contents of your Service Account JSON key.
   - `GCP_REGION`: The region (e.g., `us-east1`).

## 4. Stripe Payments
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

## 5. Local Environment
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Install [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install).
3. Run `gcloud auth login` and `gcloud auth configure-docker`.
