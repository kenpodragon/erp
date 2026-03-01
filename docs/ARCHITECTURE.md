# ERP Architecture

This document describes the technical architecture of the Elysium Rising mmorPg (ERP).

## Technical Stack

### Backend
- **Language:** Python
- **Framework:** FastAPI
- **Responsibility:** Game logic, scoring, leaderboards, and database management.

### Frontend (Player UI)
- **Framework:** React (Vite)
- **Styling:** Vanilla CSS (preferred)
- **Responsibility:** Core gameplay (incremental clicker), audio integration, and player profile management.

### Admin Dashboard
- **Framework:** React (Vite)
- **Responsibility:** Managing game state, users, and narrative triggers.

### Database
- **Provider:** Google Cloud SQL
- **Engine:** PostgreSQL
- **Schema Management:** SQL scripts in `db/` folder.

### Social & Authentication
- **Provider:** Firebase Authentication (Google SSO)
- **Integration:** Google Play Games Services for achievements.
- **Social:** Discord API for chat and community features.

### Audio & Music
- **Narration:** Eleven Reader (API-based streaming of book chapters).
- **Music:** SUNO (Thematic tracks with persistent caching and randomized playlist generation).

### AI Assets
- **Images:** AI-driven generation (e.g., Stable Diffusion or Google Imagen) for character and enemy sprites based on narrative context.
- **Persistence:** Generated assets (audio/image) are stored in Google Cloud Storage and cached via CDN for global delivery.

### Payments
- **Provider:** Stripe
- **Features:** Microtransactions, Subscriptions, and Donations.

## Core Gameplay Loop
1. **Generation:** Player generates *Elysium Essence* via active clicking or passive auto-generation.
2. **Listen & Progress:** Players must listen to the Eleven Reader audio narration for the current chapter node. Progression is gated by the audio duration (1x speed).
3. **Upgrade:** Use Essence to upgrade character stats, purchase equipment, and unlock auto-generation tiers.
4. **Story Beat Bosses:** At narrative nodes, players encounter bosses derived from the book. Success depends on character stats and active engagement.
5. **Chapter Transition:** Upon completing all nodes and defeating the final chapter boss, players transition to the next chapter.

### Infrastructure & Deployment
- **Containerization:** Docker (separate containers for frontend, backend, and admin).
- **Hosting:** Google Cloud Run.
- **CI/CD:** Google Cloud Build.
- **Secrets:** Google Secret Manager.

## Service Interaction
1. **Frontend** communicates with **Backend** via REST API.
2. **Backend** interacts with **PostgreSQL** for persistent state.
3. **Authentication** is verified on the Backend using Firebase Admin SDK.
