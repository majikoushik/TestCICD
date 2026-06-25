# ClinicTrust AI Platform

> A production-grade, blockchain-powered healthcare platform architected for secure patient record sharing, AI-driven clinical analytics, and a token-based incentive economy — designed and built as a full-stack solution architecture reference implementation.

---

## Table of Contents

- [Solution Overview](#solution-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Key Features](#key-features)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Running Locally](#running-locally)
- [Synthetic Data Mode](#synthetic-data-mode)
- [Demo Accounts](#demo-accounts)
- [Deploying to Azure](#deploying-to-azure)
- [Environment Variables](#environment-variables)
- [Data Models](#data-models)
- [Security Design](#security-design)

---

## Solution Overview

ClinicTrust AI is an enterprise healthcare platform that solves three critical problems in modern healthcare systems:

| Problem | Solution |
|---|---|
| Fragmented, insecure patient records | Hyperledger Fabric blockchain for immutable, permissioned record sharing |
| Reactive, siloed clinical decision-making | TensorFlow.js-powered predictive analytics surfaced on real-time dashboards |
| Lack of incentive for data contribution | Smart-contract-driven token economy rewarding clinicians and patients |

This repository demonstrates a **cloud-native, microservices-aligned full-stack architecture** — from smart contract design through REST/GraphQL API layers to a React SPA — deployable on Azure App Service with a managed MongoDB Atlas backend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Azure App Service                            │
│                                                                     │
│   ┌───────────────────┐          ┌──────────────────────────────┐   │
│   │   React SPA       │          │     Node.js / Express        │   │
│   │   (Port 3000)     │◄────────►│     API Server (Port 5000)   │   │
│   │                   │  Proxy   │                              │   │
│   │  - Material UI    │          │  - REST API  /api/*          │   │
│   │  - Redux Toolkit  │          │  - GraphQL   /graphql        │   │
│   │  - TensorFlow.js  │          │  - JWT Auth Middleware       │   │
│   │  - Recharts       │          │  - Role-Based Access Control │   │
│   └───────────────────┘          └──────────┬───────────────────┘   │
│                                             │                       │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────┐
                    │                         │                     │
          ┌─────────▼────────┐    ┌───────────▼───────┐  ┌──────────▼────────┐
          │   MongoDB Atlas  │    │  Hyperledger      │  │  Winston / Morgan │
          │   (Managed DB)   │    │  Fabric Network   │  │  Observability    │
          │                  │    │  (Blockchain)     │  │  Layer            │
          │  - Users         │    │                   │  │                   │
          │  - Patients      │    │  - Smart Contracts│  │  - Structured     │
          │  - Referrals     │    │  - Transactions   │  │    Logging        │
          │  - Tokens        │    │  - Identity Mgmt  │  │  - HTTP Audit     │
          │  - Analytics     │    │                   │  │    Trail          │
          └──────────────────┘    └───────────────────┘  └───────────────────┘
```

### Architectural Decisions

- **Dual API Surface (REST + GraphQL)**: REST for CRUD operations and mobile-friendly consumption; GraphQL for complex, nested data queries from the analytics dashboard — reducing over-fetching on data-heavy views.
- **Proxy Pattern**: React dev server proxies to `localhost:5000`, eliminating CORS configuration complexity in development and mirroring the production single-origin model on Azure.
- **Blockchain as an Audit Layer**: Hyperledger Fabric is not used as the primary datastore — MongoDB handles operational data. Fabric records immutable transaction hashes, preserving query performance while guaranteeing tamper-evidence.
- **Client-Side AI**: TensorFlow.js runs inference in the browser, removing a dedicated ML microservice and reducing latency for real-time prediction on the dashboard.
- **Role-Based Access at the Middleware Layer**: Authorization is enforced via Express middleware (`protect` + `authorize`) rather than at the route level, keeping route files clean and authorization logic centralised.

---

## Technology Stack

### Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | v18+ | Server-side JavaScript runtime |
| Framework | Express.js | ^4.18.2 | REST API and middleware pipeline |
| Query Language | GraphQL / express-graphql | ^0.12.0 | Flexible data querying for analytics |
| Database | MongoDB + Mongoose | ^7.0.3 | Document store for operational data |
| Blockchain | Hyperledger Fabric + fabric-network | ^2.2.16 | Permissioned blockchain for audit records |
| Authentication | JWT + bcryptjs | ^9.0.0 / ^2.4.3 | Stateless auth with secure password hashing |
| Logging | Winston + Morgan | ^3.8.2 / ^1.10.0 | Structured logging and HTTP request tracing |
| Config | dotenv | ^16.3.1 | 12-factor app configuration |
| Dev Tooling | nodemon + concurrently | ^2.0.22 / ^8.2.0 | Hot reload and parallel process management |

### Frontend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React | ^18.2.0 | Component-driven UI |
| UI Library | Material UI (MUI) | ^5.12.1 | Enterprise-grade component system |
| State | Redux Toolkit | ^2.8.2 | Predictable global state management |
| Routing | React Router | ^6.10.0 | Client-side navigation |
| HTTP | Axios | ^1.3.6 | API communication with interceptors |
| Charts | Recharts + Chart.js | ^3.1.0 / ^4.2.1 | Data visualisation |
| AI / ML | TensorFlow.js | ^4.4.0 | In-browser predictive analytics |
| Reports | jsPDF + jspdf-autotable | ^3.0.1 | PDF report generation |

### Infrastructure

| Component | Technology |
|---|---|
| Cloud Platform | Microsoft Azure App Service (Linux) |
| Database Cloud | MongoDB Atlas |
| Node Target | v20.x (Azure) |
| Deployment | ZIP deploy via Azure Deployment Center |

---

## Key Features

### Blockchain-Verified Referrals
Medical referrals are written to Hyperledger Fabric as immutable transactions. Each referral carries a blockchain transaction ID, providing a cryptographically verifiable audit trail that cannot be altered retroactively.

### AI-Powered Analytics Dashboard
TensorFlow.js models run client-side to surface predictive insights: patient outcome probabilities, referral success rates, and resource utilisation trends — all rendered in real-time without a round-trip to an ML server.

### Token Economy
A smart-contract-driven token system incentivises clinicians and patients to contribute anonymised data. Tokens are earned, tracked, and redeemable — with all transactions recorded on-chain.

### Role-Based Access Control (RBAC)
Five distinct roles — `admin`, `superadmin`, `doctor`, `nurse`, `patient` — each with enforced route-level permissions. Admin operations are protected by a separate auth flow (`/api/admin/auth`).

### GraphQL Analytics API
Complex nested queries (e.g., patient + referral + token history in one request) are served via GraphQL, reducing the number of round-trips for data-heavy dashboard views.

### PDF Report Generation
Clinical reports are generated in-browser using jsPDF, allowing clinicians to export patient summaries, referral histories, and analytics snapshots without a server round-trip.

---

## Project Structure

```
VibeCoding/
├── client/                          # React SPA
│   ├── public/
│   └── src/
│       ├── components/              # Reusable UI components
│       │   ├── admin/               # Admin-specific components
│       │   ├── analytics/           # Chart and analytics components
│       │   └── blockchain/          # Blockchain status and history views
│       ├── pages/                   # Route-level page components (30+)
│       │   ├── auth/                # Login, register, password reset
│       │   ├── dashboard/           # Main dashboard
│       │   ├── patients/            # Patient management
│       │   ├── referrals/           # Referral creation and tracking
│       │   ├── tokens/              # Token economy views
│       │   └── admin/               # Admin panel
│       ├── redux/                   # Redux slices
│       │   ├── authSlice.js
│       │   ├── notificationSlice.js
│       │   ├── tokenSlice.js
│       │   └── referralSlice.js
│       ├── services/                # Axios API service wrappers
│       ├── contexts/                # React context providers
│       ├── hooks/                   # Custom hooks
│       ├── layouts/                 # Admin, Auth, Landing, Main layouts
│       ├── utils/                   # Shared utilities
│       ├── theme.js                 # MUI theme configuration
│       └── App.js
│
├── deploy/                          # Azure deployment package
│   └── server/                      # Backend (production copy)
│       ├── blockchain/
│       │   ├── contracts.js         # Smart contract interaction layer
│       │   └── identity.js          # Fabric identity management
│       ├── controllers/
│       │   ├── dashboardController.js
│       │   └── notificationController.js
│       ├── middleware/
│       │   ├── auth.js              # JWT protect + authorize middleware
│       │   └── async.js             # Async error wrapper
│       ├── models/                  # Mongoose schemas
│       │   ├── User.js
│       │   ├── Patient.js
│       │   ├── Referral.js
│       │   ├── ReferralDispute.js
│       │   ├── ReferralTransaction.js
│       │   ├── Token.js
│       │   ├── Analytics.js
│       │   ├── Notification.js
│       │   ├── Admin.js
│       │   └── AIManagement.js
│       ├── routes/                  # Express route handlers
│       │   ├── auth.js
│       │   ├── patients.js
│       │   ├── referrals.js
│       │   ├── analytics.js
│       │   ├── tokens.js
│       │   ├── notifications.js
│       │   ├── dashboard.js
│       │   ├── graphql.js
│       │   └── admin/
│       │       ├── referrals.js
│       │       └── aiManagement.js
│       ├── utils/
│       │   ├── blockchain.js        # Hyperledger utility helpers
│       │   ├── mockNotifications.js
│       │   └── seedNotifications.js
│       ├── schema.js                # GraphQL type definitions
│       ├── resolvers.js             # GraphQL resolvers
│       └── index.js                 # Express app entry point
│
├── start-dev.js                     # Concurrent dev server launcher
├── populate_db.js                   # MongoDB seed script
├── build-for-azure.bat              # Azure deployment build script (Windows)
├── netlify.toml                     # Netlify deployment config
└── package.json
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | JWT | Get current user profile |
| POST | `/api/admin/auth/login` | Public | Admin login |

### Patients

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/patients` | JWT | List all patients |
| POST | `/api/patients` | JWT | Create a patient record |
| GET | `/api/patients/:id` | JWT | Get patient by ID |
| PUT | `/api/patients/:id` | JWT | Update patient record |

### Referrals

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/referrals` | JWT | List referrals |
| POST | `/api/referrals` | JWT | Create referral (writes to blockchain) |
| GET | `/api/referrals/:id` | JWT | Get referral + blockchain receipt |
| PUT | `/api/referrals/:id` | JWT | Update referral status |
| GET | `/api/admin/referrals` | Admin | All referrals (admin view) |

### Tokens

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tokens` | JWT | Get token balance and history |
| POST | `/api/tokens/earn` | JWT | Earn tokens for data contribution |
| POST | `/api/tokens/redeem` | JWT | Redeem tokens |

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics` | JWT | Aggregated analytics data |
| GET | `/api/dashboard` | JWT | Dashboard summary metrics |

### GraphQL

| Endpoint | Description |
|---|---|
| `POST /graphql` | GraphQL query endpoint — supports complex nested data queries across patients, referrals, tokens, and analytics |

---

## Running Locally

### Prerequisites

Ensure the following are installed before proceeding:

| Tool | Minimum Version | Check Command |
|---|---|---|
| Node.js | v16.x | `node --version` |
| npm | v8.x | `npm --version` |
| Git | Any | `git --version` |

> **MongoDB**: The application connects to a MongoDB Atlas cluster by default. No local MongoDB installation is required unless you provide your own `MONGO_URI`.

---

### Step 1 — Clone the repository

```bash
git clone <repository-url>
cd VibeCoding
```

---

### Step 2 — Install all dependencies

Run this single command from the project root. It installs both the root (backend) and client (frontend) dependencies:

```bash
npm run install-all
```

This executes:
1. `npm install` — installs backend packages (Express, Mongoose, Fabric, etc.)
2. `cd client && npm install` — installs frontend packages (React, MUI, Redux, TensorFlow.js, etc.)

> The client has 50+ dependencies including TensorFlow.js. Expect 2–4 minutes on first install.

---

### Step 3 — Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```dotenv
# .env
NODE_ENV=development
PORT=5000

# MongoDB Atlas connection string
MONGO_URI=your_mongodb_connection_string_here

# Generate with: node -e "require('crypto').randomBytes(64).toString('hex')"
JWT_SECRET=your_strong_random_secret
JWT_REFRESH_SECRET=your_strong_random_refresh_secret
JWT_RESET_SECRET=your_strong_random_reset_secret

# Allowed CORS origin (comma-separated for multiple)
CORS_ORIGIN=http://localhost:3000
```

> **No database? No problem.** If `MONGO_URI` is unreachable, the server automatically falls back to [Synthetic Data Mode](#synthetic-data-mode) and starts with pre-seeded demo data. See [Demo Accounts](#demo-accounts) for login credentials.

---

### Step 4 — (Optional) Seed the database

If you have a live MongoDB connection and want to populate it with realistic mock data, run:

```bash
# Requires mongosh or the legacy mongo shell
mongo populate_db.js
```

Alternatively, use the application in [Synthetic Data Mode](#synthetic-data-mode) — no seeding required.

---

### Step 5 — Start both servers

```bash
npm run start-dev
```

This launches `start-dev.js`, which concurrently starts:

- **Backend** (green logs) → `http://localhost:5000`
- **Frontend** (blue logs) → `http://localhost:3000`

Both processes share a single terminal with colour-coded, timestamped output. Press **Ctrl+C** to cleanly shut down both servers.

**Alternative — run servers individually in separate terminals:**

```bash
# Terminal 1 — Backend (with hot reload via nodemon)
npm run server

# Terminal 2 — Frontend
npm run client
```

---

### Step 6 — Open the application

| Service | URL |
|---|---|
| React Frontend | http://localhost:3000 |
| REST API | http://localhost:5000/api |
| GraphQL Playground | http://localhost:5000/graphql |

---

### npm Scripts Reference

| Script | Command | Description |
|---|---|---|
| `npm run start-dev` | `node start-dev.js` | Start both servers (recommended) |
| `npm run dev` | `concurrently ...` | Start both via concurrently directly |
| `npm run server` | `nodemon server/index.js` | Backend only with hot reload |
| `npm run client` | `cd client && npm start` | Frontend only |
| `npm run install-all` | `npm install && cd client && npm install` | Install all dependencies |
| `npm run build` | `cd client && npm run build` | Build React for production |
| `npm run blockchain:start` | `cd blockchain && ./startFabric.sh` | Start Hyperledger Fabric network |
| `npm run blockchain:stop` | `cd blockchain && ./stopFabric.sh` | Stop Hyperledger Fabric network |

---

## Synthetic Data Mode

When the server starts, it attempts to connect to MongoDB Atlas within **8 seconds**.  
If the connection fails — due to no network, a wrong URI, a paused Atlas cluster, or any other reason — the server automatically switches to **Synthetic Data Mode** and continues running without any manual intervention.

### How it works

```
Server starts
    │
    ├── Attempt MongoDB connection (8 s timeout)
    │       │
    │       ├── SUCCESS → Live Database Mode  ✅
    │       │            All data reads/writes go to MongoDB Atlas.
    │       │
    │       └── TIMEOUT / ERROR → Synthetic Data Mode  🔄
    │                            All data is served from an in-memory
    │                            store seeded from populate_db.js.
    │                            No database required.
    │
    └── Server listens on PORT (default 5000)
```

### What synthetic mode provides

- Full JWT authentication (same secrets, identical token format)
- All REST API endpoints respond with realistic pre-seeded data
- In-memory CRUD — creates, updates, and deletes persist for the duration of the running process
- Role-based access control enforced identically to live mode
- Token transfers and redemptions update in-memory balances
- Referral status changes (including token rewards) work end-to-end

### Console output

**Live database:**
```
✅  MongoDB connected — running in live database mode
🚀  Server running on port 5000 [LIVE DB]
```

**Synthetic mode:**
```
⚠️  MongoDB unavailable (Connection timeout after 8 s)
🔄  Starting in SYNTHETIC DATA mode — all data is in-memory.
    Demo accounts: admin@clinictrustai.com / john.smith@clinictrustai.com / etc.
    Demo password for all accounts: Demo1234!
🚀  Server running on port 5000 [SYNTHETIC DATA]
```

### Limitations of synthetic mode

| Feature | Synthetic mode |
|---|---|
| Data persistence across restarts | Not supported — resets on every server restart |
| GraphQL endpoint | Returns a 503 with a helpful message |
| Blockchain file writes | Skipped (no file I/O needed) |
| MongoDB transactions | Not applicable |

> **Synthetic mode is intended for local development and demos only.**  
> Production deployments must have a valid `MONGO_URI` configured.

---

## Demo Accounts

The following accounts are available in both **Synthetic Data Mode** and after running `node populate_db.js` against a live database.

**All accounts share the same password: `Demo1234!`**

### Provider accounts

| Name | Email | Role | Organization | Token Balance |
|---|---|---|---|---|
| Dr. John Smith | `john.smith@clinictrustai.com` | doctor | Metro Heart Institute | 350 |
| Dr. Michael Chen | `michael.chen@clinictrustai.com` | doctor | Neuroscience Medical Center | 420 |
| Dr. Robert Williams | `robert.williams@clinictrustai.com` | doctor | Westside Family Medicine | 290 |
| Nurse Sarah Johnson | `sarah.johnson@clinictrustai.com` | provider | Community Care Hospital | 175 |

### Admin account

| Name | Email | Role | Password |
|---|---|---|---|
| Admin User | `admin@clinictrustai.com` | admin | `Demo1234!` |

> The admin account logs in via the **Admin Portal** at `/admin/login` (uses `/api/admin/auth/login`).  
> Provider accounts log in via the standard login page (uses `/api/auth/login`).

### Pre-seeded data (synthetic mode)

| Collection | Records |
|---|---|
| Users | 5 (1 admin, 4 providers) |
| Patients | 5 (James Wilson, Emily Rodriguez, Thomas Brown, Maria Garcia, David Lee) |
| Referrals | 3 (completed, pending, accepted) |
| Analytics reports | 3 (completed, completed, processing) |
| Token transactions | 6 |
| Notifications | 3 |

---

## Deploying to Azure

This guide covers deploying to **Azure App Service (Linux)** with the React build served statically by the Express server — a single-service deployment model that eliminates the need for a separate static hosting service.

### Prerequisites

- Azure subscription with an App Service resource created (Node.js 20 LTS, Linux)
- Azure CLI installed (`az --version`) — optional, for CLI-based deploy
- MongoDB Atlas connection string (production database)

---

### Step 1 — Build the React frontend

```bash
cd client
set CI=false
set DISABLE_ESLINT_PLUGIN=true
npm run build
cd ..
```

> `CI=false` prevents ESLint warnings from failing the build in the Azure pipeline environment.

This generates an optimised production bundle in `client/build/`.

---

### Step 2 — Create the deployment package

Run the included build script from the project root:

```bat
build-for-azure.bat
```

This script performs the following steps automatically:

1. Removes any existing `deploy/` folder and recreates the directory structure
2. Copies `client/build` into `deploy/client/build/` and `deploy/server/client-build/`
3. Copies `package.json` into `deploy/` and runs `npm install --production`
4. Copies all server source files into `deploy/server/`
5. Produces a ready-to-upload ZIP archive: `clinictrust-ai-azure.zip`

---

### Step 3 — Configure Azure App Service settings

In the **Azure Portal**, navigate to your App Service → **Settings** → **Environment variables** and add:

| Application Setting | Value |
|---|---|
| `WEBSITE_NODE_DEFAULT_VERSION` | `20.x` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A strong randomly generated secret |
| `JWT_EXPIRE` | `30d` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |

> Never commit production secrets. Use Azure Application Settings or Azure Key Vault for all sensitive values.

---

### Step 4a — Deploy via Azure Portal (ZIP Deploy)

1. In the Azure Portal, open your App Service
2. Navigate to **Deployment Center**
3. Select **Manual deployment** → **ZIP Deploy**
4. Upload `clinictrust-ai-azure.zip`
5. Azure will extract, install production dependencies, and start the app automatically

---

### Step 4b — Deploy via Azure CLI

```bash
# Login to Azure
az login

# Deploy the ZIP package
az webapp deploy \
  --resource-group <your-resource-group> \
  --name <your-app-service-name> \
  --src-path clinictrust-ai-azure.zip \
  --type zip
```

---

### Step 5 — Verify the deployment

```bash
# Stream live logs from Azure
az webapp log tail \
  --resource-group <your-resource-group> \
  --name <your-app-service-name>
```

Expected startup output:
```
MongoDB connected
Server running on port 8080
```

The application will be live at:
```
https://<your-app-service-name>.azurewebsites.net
```

---

### Production Architecture on Azure

```
Internet
    │
    ▼
Azure App Service (Linux, Node 20 LTS)
    │
    ├── Express serves React SPA from /client-build  (static assets)
    ├── Express handles REST API routes at /api/*
    ├── Express handles GraphQL at /graphql
    │
    ▼
MongoDB Atlas (managed, geo-redundant)
```

In production, the Express server serves the React `index.html` for all non-API routes (`app.get('*', ...)`), enabling client-side routing without any additional Azure Static Web App or CDN configuration.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port (Azure sets `8080` automatically) |
| `NODE_ENV` | No | `development` | Controls static file serving and logging verbosity |
| `MONGO_URI` | Yes (prod) | Atlas URI | MongoDB connection string |
| `JWT_SECRET` | Yes (prod) | — | Secret key for JWT signing — must be strong and unique |
| `JWT_EXPIRE` | No | `30d` | JWT token expiration window |

---

## Data Models

### User
`name`, `email`, `password` (bcrypt hashed), `role` (admin/superadmin/doctor/nurse/patient), `createdAt`

### Patient
`patientId`, `name`, `dateOfBirth`, `medicalHistory`, `assignedDoctor`, `createdAt`

### Referral
`patient`, `referringDoctor`, `specialistDoctor`, `reason`, `status`, `blockchainTxId`, `createdAt`

### ReferralTransaction
Ledger of referral state changes with blockchain transaction receipts.

### ReferralDispute
Dispute records linked to referrals with resolution status.

### Token
`user`, `balance`, `transactions[]` (type, amount, description, blockchainTxId, timestamp)

### Analytics
`date`, `referralCount`, `successRate`, `avgProcessingTime`, `tokenActivity`, `patientOutcomes`

### Notification
`user`, `type`, `title`, `message`, `read`, `createdAt`

### AIManagement
Configuration and state for AI model versions, thresholds, and feature flags managed via the admin panel.

---

## Security Design

| Layer | Mechanism |
|---|---|
| Authentication | JWT (stateless Bearer tokens) — no server-side session state |
| Password storage | bcrypt with salt rounds — no plaintext or reversible hashing |
| Authorization | `protect` middleware validates JWT; `authorize(...roles)` enforces RBAC per route |
| Admin separation | Dedicated `/api/admin/auth` route and `Admin` model — isolated from standard user auth |
| Transport | HTTPS enforced by Azure App Service TLS termination |
| Secrets management | Environment variables only — never committed to source control |
| Blockchain integrity | Hyperledger Fabric provides cryptographic tamper-evidence for referral records |
| Error handling | Centralized Express error middleware — internal stack traces never exposed to clients |
| Input trust boundary | Validation at route layer; unhandled async errors caught by `async.js` wrapper middleware |

---

## License

MIT
