# ClinicTrust AI Platform

> A production-grade, blockchain-powered healthcare platform architected for secure patient record sharing, AI-driven clinical analytics, regulatory compliance, and a token-based incentive economy — designed and built as a full-stack solution architecture reference implementation.

---

## Table of Contents

- [Solution Overview](#solution-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Key Features](#key-features)
- [Advanced Features](#advanced-features)
  - [Information Blocking Compliance & FHIR R4 API](#information-blocking-compliance--fhir-r4-api)
  - [Prior Authorization Engine](#prior-authorization-engine)
  - [Patient Notification & Engagement](#patient-notification--engagement)
  - [AI Referral Matching](#ai-referral-matching)
  - [Ambient Clinical Intelligence](#ambient-clinical-intelligence)
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

ClinicTrust AI is an enterprise healthcare platform that solves critical problems in modern healthcare systems:

| Problem | Solution |
|---|---|
| Fragmented, insecure patient records | Hyperledger Fabric blockchain for immutable, permissioned record sharing |
| Reactive, siloed clinical decision-making | TensorFlow.js-powered predictive analytics surfaced on real-time dashboards |
| Lack of incentive for data contribution | Smart-contract-driven token economy rewarding clinicians and patients |
| Regulatory non-compliance (21st Century Cures Act) | Full FHIR R4 API with Information Blocking safeguards |
| Manual, error-prone prior authorization | Automated PA engine with payer rule evaluation and decision tracking |
| Poor patient communication and follow-up | Multi-channel engagement platform (email, SMS, push, in-app) |
| Inefficient specialist referral selection | AI-powered provider matching with weighted scoring across 5 dimensions |
| Incomplete clinical documentation at point of care | Ambient speech recognition + Azure OpenAI clinical note generation |

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
│   │  - TensorFlow.js  │          │  - FHIR R4   /api/fhir/*     │   │
│   │  - Recharts       │          │  - JWT Auth Middleware        │   │
│   │  - Web Speech API │          │  - Role-Based Access Control  │   │
│   └───────────────────┘          └──────────┬───────────────────┘   │
│                                             │                       │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────┐
                    │                         │                     │
          ┌─────────▼────────┐    ┌───────────▼───────┐  ┌──────────▼────────┐
          │   MongoDB Atlas  │    │  Hyperledger      │  │  Azure AI Services │
          │   (Managed DB)   │    │  Fabric Network   │  │                   │
          │                  │    │  (Blockchain)     │  │  - Azure OpenAI    │
          │  - Users         │    │                   │  │    (GPT-4 notes)   │
          │  - Patients      │    │  - Smart Contracts│  │  - Azure Speech    │
          │  - Referrals     │    │  - Transactions   │  │    (STT)           │
          │  - Tokens        │    │  - Identity Mgmt  │  │                   │
          │  - PriorAuth     │    │                   │  └───────────────────┘
          │  - Engagement    │    └───────────────────┘
          │  - AmbientAI     │
          │  - MatchProfiles │
          └──────────────────┘
```

### Architectural Decisions

- **Dual API Surface (REST + GraphQL)**: REST for CRUD operations and mobile-friendly consumption; GraphQL for complex, nested data queries from the analytics dashboard — reducing over-fetching on data-heavy views.
- **FHIR R4 Compliance Layer**: A dedicated `/api/fhir` router translates internal MongoDB documents into FHIR-standard JSON resources (Patient, Practitioner, ServiceRequest, Observation, AllergyIntolerance) to meet ONC 21st Century Cures Act requirements.
- **Proxy Pattern**: React dev server proxies to `localhost:5000`, eliminating CORS configuration complexity in development and mirroring the production single-origin model on Azure.
- **Blockchain as an Audit Layer**: Hyperledger Fabric is not used as the primary datastore — MongoDB handles operational data. Fabric records immutable transaction hashes, preserving query performance while guaranteeing tamper-evidence.
- **Client-Side AI**: TensorFlow.js runs inference in the browser, removing a dedicated ML microservice and reducing latency for real-time prediction on the dashboard.
- **Azure AI Stubs**: Ambient Clinical Intelligence and AI Matching services integrate with Azure Speech and Azure OpenAI via environment-variable-gated stubs. When Azure credentials are absent, realistic mock data is returned — so the full feature workflow is demonstrable without incurring cloud costs.
- **Role-Based Access at the Middleware Layer**: Authorization is enforced via Express middleware (`protect` + `authorize`) rather than at the route level, keeping route files clean and authorization logic centralised.
- **Synthetic Data Mode**: Every advanced feature ships with a full in-memory implementation in `syntheticRouter.js`, enabling the complete application to run without any database or cloud service dependency.

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
| AI Integration | Azure OpenAI + Azure Speech | REST / SDK | Clinical note generation and speech transcription |
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
| Speech | Web Speech API (browser-native) | — | Real-time ambient speech-to-text transcription |
| Reports | jsPDF + jspdf-autotable | ^3.0.1 | PDF report generation |

### Infrastructure

| Component | Technology |
|---|---|
| Cloud Platform | Microsoft Azure App Service (Linux) |
| Database Cloud | MongoDB Atlas |
| AI Services | Azure OpenAI, Azure Cognitive Services (Speech) |
| Node Target | v20.x (Azure) |
| Deployment | ZIP deploy via Azure Deployment Center |

---

## Key Features

### Blockchain-Verified Referrals
Medical referrals are written to Hyperledger Fabric as immutable transactions. Each referral carries a blockchain transaction ID, providing a cryptographically verifiable audit trail that cannot be altered retroactively.

### AI-Powered Analytics Dashboard
TensorFlow.js models run client-side to surface predictive insights: patient outcome probabilities, referral success rates, and resource utilisation trends — all rendered in real-time without a round-trip to an ML server.

### Token Economy
A smart-contract-driven token system incentivises clinicians and patients to contribute anonymised data. Tokens are earned, tracked, and redeemable — with all transactions recorded on-chain. Token standing is also factored into the AI Referral Matching score, rewarding high-quality network participants with more referrals.

### Role-Based Access Control (RBAC)
Five distinct roles — `admin`, `superadmin`, `doctor`, `nurse`, `patient` — each with enforced route-level permissions. Admin operations are protected by a separate auth flow (`/api/admin/auth`).

### GraphQL Analytics API
Complex nested queries (e.g., patient + referral + token history in one request) are served via GraphQL, reducing the number of round-trips for data-heavy dashboard views.

### PDF Report Generation
Clinical reports are generated in-browser using jsPDF, allowing clinicians to export patient summaries, referral histories, and analytics snapshots without a server round-trip.

---

## Advanced Features

The following six features represent the platform's enterprise compliance, AI, and automation capabilities. Each is fully integrated — backend models, API routes, frontend pages, seed data, and synthetic mode handlers.

---

### Information Blocking Compliance & FHIR R4 API

**What it does**

ClinicTrust AI includes a full FHIR R4 API layer that exposes internal patient and clinical data as standards-compliant FHIR resources. This satisfies the **ONC 21st Century Cures Act Final Rule** and the **CMS-0057-F Information Blocking rule**, which require covered healthcare entities to provide patients and authorised third parties with access to Electronic Health Information (EHI) via standardised APIs.

**How it works in the application**

The `/api/fhir` router maps MongoDB documents to FHIR R4 JSON resources in real time — no separate FHIR datastore required. Resources include:

| FHIR Resource | Maps to internal data |
|---|---|
| `Patient` | Patient collection |
| `Practitioner` | User (provider roles) |
| `ServiceRequest` | Referral collection |
| `Observation` | Analytics / vitals |
| `AllergyIntolerance` | Patient medical history |

The FHIR capability statement (`/api/fhir/metadata`) describes supported resources, interactions, and the server's conformance level — required by ONC for certified health IT.

**Value it adds**

- **Regulatory compliance**: Avoids up to $1M per violation in Information Blocking penalties by providing lawful, standards-based access to EHI.
- **Interoperability**: Third-party EHR systems, patient apps, and payer platforms can consume data using the universal FHIR standard without custom integrations.
- **Audit trail**: All FHIR data access requests are logged, satisfying HIPAA access log requirements.

**Admin access**: Admin Panel → FHIR R4 API

---

### Prior Authorization Engine

**What it does**

The Prior Authorization Engine automates the creation, submission, tracking, and decision management of insurance prior authorization requests — one of the most time-consuming administrative burdens in US healthcare, averaging 14 hours per physician per week (AMA, 2023).

**How it works in the application**

When a provider creates a referral or orders a procedure requiring insurance approval, they submit a prior auth request through the `/app/prior-auth` workflow. The engine:

1. **Evaluates eligibility** — checks the patient's insurance plan and the requested service against payer rules
2. **Submits for review** — creates a structured PA record with clinical justification, diagnosis codes, and urgency classification
3. **Tracks status** — moves through `pending → under_review → approved / denied / pending_info` states with full audit history
4. **Notifies stakeholders** — status changes trigger notifications to both the requesting provider and the patient

Each PA record stores the denial reason, approval code, approved service duration, peer review notes, and appeal history, giving providers everything needed to respond to denials without starting over.

**Value it adds**

- **Reduces administrative burden**: Structured workflows replace fax/phone-based PA submissions, cutting turnaround time from days to hours.
- **Fewer claim denials**: Complete documentation at submission reduces the #1 cause of claim denials — missing or incomplete prior auth.
- **Appeal support**: Built-in denial tracking and appeal history gives providers a clear record to challenge incorrect decisions.
- **Compliance**: PA records integrate with the FHIR layer, enabling automated submission to payer FHIR endpoints under the CMS Interoperability Rule.

**Admin access**: Admin Panel → Prior Authorizations  
**Provider access**: Main App → Prior Auth

---

### Patient Notification & Engagement

**What it does**

The Patient Engagement platform delivers proactive, personalised communications to patients across multiple channels — email, SMS, push notification, and in-app — with full campaign management, delivery tracking, and template libraries.

**How it works in the application**

Providers and admins compose notifications using reusable templates (appointment reminders, referral status updates, care gap alerts, wellness campaigns). The system:

1. **Template library** — pre-built and custom templates with variable substitution (patient name, appointment date, provider name)
2. **Multi-channel delivery** — each notification is sent via the channels configured for that patient (email via Azure Communication Services, SMS via configurable provider, push via device token)
3. **Campaign management** — bulk notifications can be grouped into campaigns with scheduling, target population filters, and delivery reports
4. **Delivery tracking** — each notification record tracks channel-level status (`sent`, `delivered`, `failed`) with timestamps and error details
5. **Patient portal** — patients see their notification history and can update communication preferences from the in-app notification centre

The delivery service (`patientEngagementService.js`) returns a unified `overall` status (`sent / partial / failed`) that aggregates across all channels, so the UI always reflects reality even when one channel fails.

**Value it adds**

- **Reduced no-shows**: Automated appointment reminders reduce no-show rates by 30–40% (MGMA benchmark data).
- **Better care adherence**: Proactive care gap alerts (e.g., overdue screenings) close gaps that drive value-based care quality scores.
- **Patient satisfaction**: Timely, relevant communication across preferred channels improves patient experience scores (HCAHPS).
- **Operational efficiency**: Campaign tools replace manual outreach, letting care coordinators manage thousands of patient touchpoints at once.

**Admin access**: Admin Panel → Patient Engagement

---

### AI Referral Matching

**What it does**

When a provider creates a referral, the AI Referral Matching engine analyses the clinical context and instantly suggests the most appropriate specialists — ranked by a transparent, 100-point composite score that accounts for specialty fit, insurance compatibility, historical performance, availability, and network standing.

**How it works in the application**

In the **Create Referral** flow (Step 1 — Provider Information), the provider types the needed specialty (e.g. "Cardiology"). After 800 ms the AI panel automatically surfaces up to 5 ranked specialist suggestions, each showing:

- **Overall match score** (0–100) with a colour-coded progress bar
- **Score breakdown chips** — how many points came from specialty, insurance, and acceptance rate
- **Provider details** — organisation, average response time, acceptance rate
- **Badges** — In-Network (green) and Telehealth (blue) where applicable

Clicking a suggestion auto-fills the provider field. The provider can still use the manual autocomplete below to override.

**Scoring model (100 points total)**

| Dimension | Max Points | How scored |
|---|---|---|
| Specialty match | 30 | Exact = 30, synonym group = 22, sub-specialty = 18, no match = 0 |
| Insurance participation | 25 | Exact plan = 25, plan family = 18, unknown = 12, out-of-network = 2 |
| Historical acceptance rate | 20 | `acceptanceRate × 20` (0.95 → 19 pts) |
| Availability score | 15 | `(availabilityScore / 100) × 15` |
| Token economy standing | 10 | Tiers: ≥1000 earned = 10, ≥500 = 8, ≥200 = 6, ≥50 = 4 |
| **Bonus modifiers** | +10 max | In-network +3, board-certified +2, telehealth for urgent +2, fast response +1–3 |

Each match session is saved as a `MatchSession` document, recording which suggestions were shown, which was selected, and the linked referral — powering the admin analytics dashboard.

**Azure AI integration**

The scoring engine runs in Node.js (no Azure call required for matching). Azure AI is used for future enhancements such as NLP-based specialty extraction from referral reason text and outcome prediction from historical referral data.

**Value it adds**

- **Faster specialist selection**: Providers choose from ranked, pre-vetted suggestions in seconds rather than searching provider directories manually.
- **Better network utilisation**: Insurance-aware scoring steers referrals toward in-network providers, reducing patient out-of-pocket costs and payer friction.
- **Higher acceptance rates**: Matching on historical acceptance rate reduces referral bounce — a leading cause of delayed patient care.
- **Data-driven improvement**: Admin analytics (session count, selection rate, top specialties) reveal referral pattern trends and help identify network gaps.
- **Token economy alignment**: Providers with higher token standing (indicating reliable, completed referrals) naturally rank higher, reinforcing the incentive loop.

**Admin access**: Admin Panel → AI Referral Matching  
**Provider access**: Create Referral → Step 1 (AI suggestion panel)

---

### Ambient Clinical Intelligence

**What it does**

Ambient Clinical Intelligence removes the documentation burden from clinical encounters. A provider starts a recording session, speaks naturally with the patient, and the platform automatically generates a structured SOAP clinical note, a referral letter draft, ICD-10 code suggestions, and an urgency classification — all ready for provider review and one-click approval.

**How it works in the application**

Providers access the Ambient AI recorder at `/app/ambient` through a three-step workflow:

**Step 1 — Patient & Setup**
The provider enters the patient name, chief complaint, and selects the encounter type. This context is passed to the AI model to improve note relevance.

**Step 2 — Record & Transcribe**
The browser's **Web Speech API** (`window.SpeechRecognition`) captures real-time speech and displays a live rolling transcript — no audio file upload required. This eliminates latency and works without microphone permissions on the server.

When the provider stops recording, the transcript is sent to the backend where:
- **Azure Speech Services** (optional) can provide higher-accuracy server-side transcription for long or complex encounters
- **Azure OpenAI (GPT-4)** generates the structured clinical note from the transcript in SOAP format (Subjective, Objective, Assessment, Plan)

The response includes:
- SOAP clinical summary
- Referral note draft (ready to attach to a referral)
- Suggested ICD-10 codes with descriptions
- Urgency classification (`routine / urgent / emergent`) with clinical rationale
- Recommended specialist type

**Step 3 — Review & Approve**
The provider reviews the AI-generated content, edits inline if needed, then either **Approves** (note moves to `approved` status, ready to link to a referral) or **Rejects** (session closed with a reason). Every edit is tracked in an `editHistory` array for audit purposes.

After approval, the session's `linkedReferralId` can be set when the provider creates the associated referral, creating an end-to-end documentation chain.

**Session lifecycle**

```
draft → reviewing → approved → submitted
              └──────────────→ rejected
```

Each session stores: audio transcript, AI-generated clinical summary, referral note draft, ICD codes, urgency classification, recommended specialty, provider identity, edit history, and approval status.

**Azure AI integration**

| Azure Service | Environment variable | Fallback behaviour |
|---|---|---|
| Azure OpenAI (GPT-4) | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_NAME` | Returns a realistic mock SOAP note and referral letter |
| Azure Speech (STT) | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Uses Web Speech API transcript directly |

The service is designed to degrade gracefully — the full UI workflow runs without any Azure credentials, using mock data that mirrors real GPT-4 output.

**Value it adds**

- **Saves 1–2 hours per clinician per day**: Clinical documentation is estimated to consume 35–55% of a physician's working hours (AMA / Medscape). Ambient AI reduces this to minutes.
- **Reduces documentation errors**: AI-structured SOAP notes are consistently formatted and always include the required ICD-10 codes, reducing coding denials.
- **Improves referral quality**: AI-drafted referral letters capture clinical context that is often omitted in manual referrals, leading to better specialist preparation and faster care.
- **Audit-ready**: Every note change is tracked in `editHistory` with timestamp and provider identity — satisfying HIPAA documentation requirements.
- **Token economy integration**: Completed, approved ambient sessions can trigger token rewards, incentivising consistent, high-quality documentation.

**Admin access**: Admin Panel → Ambient AI Sessions  
**Provider access**: Main App → Ambient AI

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
│       │   ├── blockchain/          # Blockchain status and history views
│       │   └── referral/            # AIProviderSuggestions (AI matching panel)
│       ├── pages/                   # Route-level page components (40+)
│       │   ├── auth/                # Login, register, password reset
│       │   ├── dashboard/           # Main dashboard
│       │   ├── patients/            # Patient management
│       │   ├── referrals/           # Referral creation (with AI matching)
│       │   ├── tokens/              # Token economy views
│       │   ├── prior-auth/          # Prior authorization workflow
│       │   ├── ambient/             # Ambient Clinical Intelligence recorder
│       │   └── admin/               # Admin panel
│       │       ├── AdminPriorAuth.js
│       │       ├── AdminPatientEngagement.js
│       │       ├── AdminAmbientSessions.js
│       │       └── AdminReferralMatching.js
│       ├── services/                # Axios API service wrappers
│       │   ├── referralMatchingService.js
│       │   ├── ambientSessionService.js
│       │   └── adminEngagementService.js
│       ├── layouts/                 # Admin, Auth, Landing, Main layouts
│       ├── utils/                   # Shared utilities
│       ├── theme.js                 # MUI theme configuration
│       └── App.js
│
├── server/
│   ├── middleware/
│   │   ├── auth.js                  # JWT protect + authorize middleware
│   │   └── async.js                 # Async error wrapper
│   ├── models/                      # Mongoose schemas
│   │   ├── User.js
│   │   ├── Patient.js
│   │   ├── Referral.js
│   │   ├── PriorAuth.js
│   │   ├── PatientNotification.js
│   │   ├── NotificationTemplate.js
│   │   ├── NotificationCampaign.js
│   │   ├── AmbientSession.js
│   │   ├── ProviderMatchProfile.js
│   │   └── MatchSession.js
│   ├── routes/                      # Express route handlers
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── referrals.js
│   │   ├── fhir.js                  # FHIR R4 API
│   │   ├── priorAuth.js
│   │   ├── patientEngagement.js
│   │   ├── ambientSessions.js
│   │   ├── referralMatching.js
│   │   ├── syntheticRouter.js       # In-memory fallback for all routes
│   │   └── admin/
│   │       ├── referrals.js
│   │       ├── patientEngagement.js
│   │       ├── ambientSessions.js
│   │       └── aiManagement.js
│   ├── services/
│   │   ├── patientEngagementService.js
│   │   ├── ambientIntelligenceService.js  # Azure Speech + OpenAI
│   │   └── referralMatchingService.js     # 100-point scoring engine
│   ├── seeds/
│   │   ├── priorAuthSeed.js
│   │   ├── patientEngagementSeed.js
│   │   ├── ambientSessionSeed.js
│   │   └── referralMatchingSeed.js
│   ├── schema.js                    # GraphQL type definitions
│   ├── resolvers.js                 # GraphQL resolvers
│   └── index.js                     # Express app entry point
│
├── start-dev.js                     # Concurrent dev server launcher
├── populate_db.js                   # MongoDB seed script
├── build-for-azure.bat              # Azure deployment build script (Windows)
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

### FHIR R4 API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/fhir/metadata` | Public | FHIR capability statement |
| GET | `/api/fhir/Patient` | JWT | List patients as FHIR Patient resources |
| GET | `/api/fhir/Patient/:id` | JWT | Single FHIR Patient resource |
| GET | `/api/fhir/Practitioner` | JWT | List providers as FHIR Practitioner resources |
| GET | `/api/fhir/ServiceRequest` | JWT | List referrals as FHIR ServiceRequest resources |
| GET | `/api/fhir/Observation` | JWT | Clinical observations as FHIR resources |
| GET | `/api/fhir/AllergyIntolerance` | JWT | Allergies as FHIR resources |

### Prior Authorization

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/prior-auth` | JWT | List prior auth requests |
| POST | `/api/prior-auth` | JWT | Submit a new PA request |
| GET | `/api/prior-auth/:id` | JWT | Get PA request details |
| PUT | `/api/prior-auth/:id` | JWT | Update PA status |
| GET | `/api/admin/prior-auth` | Admin | All PA requests (admin view) |
| PUT | `/api/admin/prior-auth/:id` | Admin | Admin decision (approve/deny) |

### Patient Engagement

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/patient-engagement` | JWT | List notifications |
| POST | `/api/patient-engagement/send` | JWT | Send a notification |
| GET | `/api/admin/patient-engagement` | Admin | All notifications (admin view) |
| GET | `/api/admin/patient-engagement/templates` | Admin | Notification templates |
| POST | `/api/admin/patient-engagement/templates` | Admin | Create a template |
| GET | `/api/admin/patient-engagement/campaigns` | Admin | Campaigns list |
| POST | `/api/admin/patient-engagement/campaigns` | Admin | Create a campaign |

### AI Referral Matching

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/referral-matching/match` | JWT | Run AI matching — returns ranked providers |
| GET | `/api/referral-matching/providers` | JWT | List all provider match profiles |
| GET | `/api/referral-matching/providers/:id` | JWT | Single provider profile |
| PUT | `/api/referral-matching/providers/:id` | Admin | Update provider profile |
| GET | `/api/referral-matching/stats` | JWT | Aggregate matching analytics |
| GET | `/api/referral-matching/sessions` | JWT | Match session history |
| POST | `/api/referral-matching/sessions/:id/select` | JWT | Record provider selection |

### Ambient Clinical Intelligence

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/ambient-sessions` | JWT | List provider's sessions |
| POST | `/api/ambient-sessions` | JWT | Create session + trigger AI processing |
| GET | `/api/ambient-sessions/stats` | JWT | Provider session stats |
| GET | `/api/ambient-sessions/:id` | JWT | Session details |
| PUT | `/api/ambient-sessions/:id/review` | JWT | Approve or reject a session |
| PUT | `/api/ambient-sessions/:id` | JWT | Update session |
| POST | `/api/ambient-sessions/:id/reprocess` | JWT | Re-run AI on existing transcript |
| DELETE | `/api/ambient-sessions/:id` | JWT | Delete a draft session |
| GET | `/api/admin/ambient-sessions` | Admin | All sessions (admin view) |
| GET | `/api/admin/ambient-sessions/stats` | Admin | Platform-wide session analytics |
| PUT | `/api/admin/ambient-sessions/:id` | Admin | Admin update |

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

| Tool | Minimum Version | Check Command |
|---|---|---|
| Node.js | v16.x | `node --version` |
| npm | v8.x | `npm --version` |
| Git | Any | `git --version` |

> **MongoDB**: The application connects to a MongoDB Atlas cluster by default. No local MongoDB installation is required. If unreachable, the server automatically falls back to [Synthetic Data Mode](#synthetic-data-mode).

---

### Step 1 — Clone the repository

```bash
git clone <repository-url>
cd VibeCoding
```

---

### Step 2 — Install all dependencies

```bash
npm run install-all
```

This executes:
1. `npm install` — installs backend packages
2. `cd client && npm install` — installs frontend packages (React, MUI, Redux, TensorFlow.js, etc.)

> The client has 50+ dependencies including TensorFlow.js. Expect 2–4 minutes on first install.

---

### Step 3 — Configure environment variables

```bash
cp .env.example .env
```

```dotenv
# .env
NODE_ENV=development
PORT=5000

# MongoDB Atlas connection string
MONGO_URI=your_mongodb_connection_string_here

# JWT secrets — generate with: node -e "require('crypto').randomBytes(64).toString('hex')"
JWT_SECRET=your_strong_random_secret
JWT_REFRESH_SECRET=your_strong_random_refresh_secret
JWT_RESET_SECRET=your_strong_random_reset_secret

# Allowed CORS origin
CORS_ORIGIN=http://localhost:3000

# Azure AI — Ambient Clinical Intelligence (optional, falls back to mock data)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Azure Speech Services — optional, falls back to Web Speech API transcript
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=eastus
```

> **No database? No problem.** If `MONGO_URI` is unreachable, the server automatically falls back to [Synthetic Data Mode](#synthetic-data-mode). Azure credentials are optional — all AI features degrade gracefully to mock data.

---

### Step 4 — (Optional) Seed the database

```bash
node populate_db.js
```

Alternatively, use [Synthetic Data Mode](#synthetic-data-mode) — no seeding required.

---

### Step 5 — Start both servers

```bash
npm run start-dev
```

- **Backend** → `http://localhost:5000`
- **Frontend** → `http://localhost:3000`

**Or run separately:**

```bash
# Terminal 1 — Backend
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
| FHIR R4 API | http://localhost:5000/api/fhir/metadata |
| GraphQL Playground | http://localhost:5000/graphql |
| Admin Portal | http://localhost:3000/admin/login |

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
If the connection fails, the server automatically switches to **Synthetic Data Mode** and continues running with pre-seeded in-memory data — including all advanced features.

### How it works

```
Server starts
    │
    ├── Attempt MongoDB connection (8 s timeout)
    │       │
    │       ├── SUCCESS → Live Database Mode  ✅
    │       │
    │       └── TIMEOUT / ERROR → Synthetic Data Mode  🔄
    │                            All data served from in-memory store.
    │                            No database or cloud services required.
    │
    └── Server listens on PORT (default 5000)
```

### What synthetic mode provides

- Full JWT authentication (same secrets, identical token format)
- All REST API endpoints with realistic pre-seeded data
- In-memory CRUD — creates, updates, and deletes persist for the running process
- FHIR R4 resources generated from in-memory patient data
- Prior authorization submissions and decisions
- Patient engagement notifications, templates, and campaigns
- AI Referral Matching with 15 pre-built provider profiles and scoring engine
- Ambient Clinical Intelligence sessions with mock AI-generated notes
- Token transfers and referral status changes work end-to-end

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

### Limitations

| Feature | Synthetic mode |
|---|---|
| Data persistence across restarts | Not supported — resets on server restart |
| GraphQL endpoint | Returns a 503 with a helpful message |
| Blockchain file writes | Skipped |
| Real Azure AI calls | Not made — mock responses returned |

> **Synthetic mode is intended for local development and demos only.**

---

## Demo Accounts

All accounts share the password: **`Demo1234!`**

### Provider accounts

| Name | Email | Role | Organization | Token Balance |
|---|---|---|---|---|
| Dr. John Smith | `john.smith@clinictrustai.com` | doctor | Metro Heart Institute | 350 |
| Dr. Michael Chen | `michael.chen@clinictrustai.com` | doctor | Neuroscience Medical Center | 420 |
| Dr. Robert Williams | `robert.williams@clinictrustai.com` | doctor | Westside Family Medicine | 290 |
| Nurse Sarah Johnson | `sarah.johnson@clinictrustai.com` | provider | Community Care Hospital | 175 |

### Admin account

| Name | Email | Role |
|---|---|---|
| Admin User | `admin@clinictrustai.com` | admin |

> Admin logs in at `/admin/login`. Providers log in at the standard login page.

### Pre-seeded data (synthetic mode)

| Collection | Records |
|---|---|
| Users | 5 (1 admin, 4 providers) |
| Patients | 5 |
| Referrals | 3 |
| Prior Auth requests | 10 (covering all statuses) |
| Patient notifications | 12 |
| Notification templates | 6 |
| Campaigns | 3 |
| Ambient sessions | 10 (all statuses and urgencies) |
| Provider match profiles | 15 (across 14 specialties) |
| Match sessions | 5 |

---

## Deploying to Azure

### Prerequisites

- Azure App Service resource (Node.js 20 LTS, Linux)
- MongoDB Atlas connection string
- Azure CLI (optional)

---

### Step 1 — Build the React frontend

```bash
cd client
set CI=false
set DISABLE_ESLINT_PLUGIN=true
npm run build
cd ..
```

---

### Step 2 — Create the deployment package

```bat
build-for-azure.bat
```

Produces `clinictrust-ai-azure.zip`.

---

### Step 3 — Configure Azure App Service settings

| Application Setting | Value |
|---|---|
| `WEBSITE_NODE_DEFAULT_VERSION` | `20.x` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Strong random secret |
| `JWT_EXPIRE` | `30d` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | GPT-4 deployment name |
| `AZURE_SPEECH_KEY` | Azure Speech key |
| `AZURE_SPEECH_REGION` | Azure region (e.g. `eastus`) |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |

---

### Step 4 — Deploy

**Via Portal:** App Service → Deployment Center → Manual → ZIP Deploy → upload `clinictrust-ai-azure.zip`

**Via CLI:**
```bash
az webapp deploy \
  --resource-group <your-resource-group> \
  --name <your-app-service-name> \
  --src-path clinictrust-ai-azure.zip \
  --type zip
```

---

### Step 5 — Verify

```bash
az webapp log tail --resource-group <rg> --name <app-name>
```

Expected:
```
✅  MongoDB connected — running in live database mode
🚀  Server running on port 8080 [LIVE DB]
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | Controls static file serving and log verbosity |
| `MONGO_URI` | Yes (prod) | — | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes (prod) | — | JWT signing key |
| `JWT_REFRESH_SECRET` | Yes (prod) | — | JWT refresh key |
| `JWT_RESET_SECRET` | Yes (prod) | — | JWT password-reset key |
| `JWT_EXPIRE` | No | `30d` | JWT expiration window |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin(s) |
| `AZURE_OPENAI_ENDPOINT` | No | — | Azure OpenAI endpoint (Ambient AI) |
| `AZURE_OPENAI_API_KEY` | No | — | Azure OpenAI key (Ambient AI) |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | No | — | Azure OpenAI GPT-4 deployment name |
| `AZURE_SPEECH_KEY` | No | — | Azure Speech Services key (Ambient AI) |
| `AZURE_SPEECH_REGION` | No | — | Azure Speech region (e.g. `eastus`) |

---

## Data Models

### Core Models

**User** — `name`, `email`, `password` (bcrypt), `role`, `specialty`, `organization`, `tokenBalance`, `isActive`, `kycVerified`

**Patient** — `patientId`, `name`, `dateOfBirth`, `gender`, `medicalHistory`, `assignedDoctor`

**Referral** — `patient`, `referringProvider`, `receivingProvider`, `reason`, `urgency`, `status`, `billing`, `blockchainTxId`

**Token** — `user`, `balance`, `transactions[]` (type, amount, blockchainTxId, timestamp)

**Analytics** — `date`, `referralCount`, `successRate`, `avgProcessingTime`, `tokenActivity`, `patientOutcomes`

### Advanced Feature Models

**PriorAuth** — `patient`, `provider`, `requestedService`, `diagnosisCodes`, `urgency`, `status`, `submittedAt`, `decisionAt`, `denialReason`, `approvalCode`, `editHistory[]`

**PatientNotification** — `patientId`, `title`, `message`, `channels[]`, `status` (sent/failed/partial), `channelResults[]`, `sentAt`

**NotificationTemplate** — `name`, `type`, `subject`, `body`, `channels`, `variables[]`

**NotificationCampaign** — `name`, `templateId`, `targetAudience`, `scheduledAt`, `status`, `deliveryStats`

**AmbientSession** — `sessionId`, `providerId`, `patientId`, `chiefComplaint`, `audioTranscript`, `clinicalSummary` (SOAP), `referralNoteDraft`, `urgencyClassification`, `icdCodes[]`, `recommendedSpecialty`, `status`, `approvedNote`, `editHistory[]`, `linkedReferralId`

**ProviderMatchProfile** — `providerId`, `specialty`, `subSpecialties[]`, `acceptedInsurance[]`, `city`, `state`, `acceptanceRate`, `avgResponseTimeDays`, `tokenBalance`, `tokenEarned`, `availabilityScore`, `networkParticipation`, `isAcceptingReferrals`, `boardCertified`, `telehealth`

**MatchSession** — `requestedBy`, `specialty`, `patientInsurance`, `urgency`, `resultsCount`, `topMatchScore`, `selectedProviderId`, `suggestions[]`, `linkedReferralId`

---

## Security Design

| Layer | Mechanism |
|---|---|
| Authentication | JWT (stateless Bearer tokens) — no server-side session state |
| Password storage | bcrypt with salt rounds — no plaintext or reversible hashing |
| Authorization | `protect` validates JWT; `authorize(...roles)` enforces RBAC per route |
| Admin separation | Dedicated `/api/admin/auth` route and `Admin` model — isolated from standard user auth |
| Transport | HTTPS enforced by Azure App Service TLS termination |
| Secrets management | Environment variables only — never committed to source control |
| Blockchain integrity | Hyperledger Fabric provides cryptographic tamper-evidence for referral records |
| FHIR access control | All FHIR endpoints require JWT; audit logs capture every EHI access event |
| AI data handling | Ambient session transcripts and clinical notes are stored per-patient with provider-scoped access — providers can only access their own sessions |
| Error handling | Centralised Express error middleware — stack traces never exposed to clients |
| Input trust boundary | Validation at route layer; unhandled async errors caught by `async.js` wrapper |
| Rate limiting | Auth endpoints are rate-limited (20 req / 15 min window) to prevent credential stuffing |

---

## License

MIT
