# ClinicTrust AI — Playwright E2E Suite

Enterprise-grade end-to-end tests for the provider and admin portals, implementing the 286 scenarios in [`QA_TEST_SCENARIOS.md`](../QA_TEST_SCENARIOS.md) at the repo root. Every test ID in a spec file (e.g. `A6-07`, `B3-04`) corresponds exactly to a row in that document — start there to understand *why* a test exists before reading *how* it works.

## Prerequisites

- Node.js 18+
- A running instance of the ClinicTrust AI server and client (see the root [`README.md`](../README.md))
- A real, reachable MongoDB instance — **not** Synthetic Data Mode. The server falls back to an in-memory store when Mongo is unreachable within 8s; this suite fails fast with a clear error if it detects that, because persistence-focused scenarios (notifications, blockchain history, token balances, KYC state, etc.) are meaningless against a store that resets on restart.
- The database seeded via `npm run populate_db` at the repo root, or `npm run seed` from this directory (same script).

## Setup

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
cp .env.example .env   # then fill in real values for your environment
```

### Required `.env` values

| Variable | Purpose |
|---|---|
| `BASE_URL` | Client origin (default `http://localhost:3000`) |
| `API_BASE_URL` | Server API origin (default `http://localhost:5000/api`) |
| `MONGO_URI` | Same database the server under test is connected to |
| `DEMO_PASSWORD` | Password for all `populate_db.js`-seeded accounts |
| `PROVIDER_A_EMAIL` / `PROVIDER_B_EMAIL` | Two seeded providers — most scenarios act as Provider A; a handful of cross-provider scenarios (e.g. accepting a referral sent by another provider) run as Provider B via `test.use({ storageState: '.auth/provider-b.json' })` |
| `ADMIN_EMAIL` | Seeded admin account |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Fixture superadmin — created idempotently by `support/global-setup.ts` since there's no self-registration path for this role |

## Running

```bash
npm test                  # full suite, all projects
npm run test:p0           # P0 scenarios only — the release-gate subset
npm run test:regression   # scenarios tagged @regression (regressions for defects fixed this engagement)
npm run test:provider     # provider portal only
npm run test:admin        # admin portal only
npm run test:headed       # visible browser, useful while stabilizing a new spec
npm run test:debug        # Playwright Inspector
npm run report            # open the last HTML report
```

Run a single scenario by ID: `npx playwright test -g "A6-07"`.

## Why real backend, no mocks

This suite intentionally does **not** mock the app's own API, and does **not** mock third-party services either:

- **Own API — never mocked.** The whole point of this suite is validating persistence and business rules that were previously broken in this codebase (see the "Defects Found and Fixed During Verification" table in `QA_TEST_SCENARIOS.md`). Mocking the API would test the mock, not the app. Every scenario runs against the real REST API and a real, seeded MongoDB instance.
- **Third-party services — never mocked, and never asserted on.** Per the QA doc's own scope rule, no scenario validates Azure OpenAI/Speech, Twilio, SendGrid, or Azure Notification Hubs content or delivery — only this app's own behavior, which is well-defined and deterministic whether or not those services are configured (see the root README's "Infrastructure & Go-Live Configuration" section on fallback paths). Run the **server** without those provider env vars set for maximum determinism in CI; the fallback path *is* the behavior under test.
- **Test data setup goes through the real REST API** (`fixtures/api-client.ts`), not the UI, for speed and reliability — except for the specific scenarios that test a creation flow itself (registration, Add Patient, Create Referral, Book Appointment, Create PA, Prescribe DTx), which drive the UI because that *is* what's under test.

## Direct-database fixture helpers — and why each one exists

`support/db.ts` is the one file allowed to talk to MongoDB directly instead of through the app's API/UI. Every function in it exists because there is **no other way** to reach the state a test needs — each one is commented at its definition with the specific gap it works around:

| Helper | Used by | Gap it works around |
|---|---|---|
| `ensureSuperadminFixture` | global setup | No self-registration path for `superadmin` exists anywhere in the app |
| `markEmailVerified` | A3, A11 | The real email-verification token is one-way-hashed server-side; there is no API path to read it back or bypass it, and the onboarding wall locks the Profile/Docs steps behind email verification |
| `createNotificationFixture` | A9 | No feature anywhere (referral creation, admin targeted alerts, etc.) creates an in-app `Notification` document for *another* user — only real emails are sent. `POST /api/notifications` exists but always forces `userId` to the caller's own id |
| `createReferralDisputeFixture` | B3 | No route or UI action creates a `ReferralDispute` — `PUT /admin/referrals/:id/dispute` only *resolves* an already-existing one |
| `createEscalationFixture` | B4 | No route or UI action creates an `EscalationWorkflow` — presumably meant to originate from an AI risk-monitoring job that doesn't exist yet in this codebase |
| `createVerifiedProviderWithoutWallet` | A11 | KYC approval (`PATCH /admin/kyc/:id`, status `verified`) always creates a blockchain wallet in the same request unless creation throws — so every provider that clears onboarding normally already has a `blockchainId`. Profile's "Start Verification" affordance targets an otherwise-unreachable pre-wallet state |

If a future feature adds a real creation path for any of these (e.g. an AI job that raises escalations), retire the corresponding fixture helper and drive that spec through the real path instead — the fixture is a stand-in, not the intended long-term test strategy.

## Known coverage gaps (by design, not oversight)

A few scenarios in `QA_TEST_SCENARIOS.md` are marked `test.fixme()` with an inline reason rather than faked:

- **A1-05** — "NPI already registered, pending email verification": no fixture account exists in this state, and creating one mid-registration isn't currently automatable via the API.
- **A1-13 / A1-14** — email verification via link: the real token is only ever emailed, never returned by any API response (unlike the password-reset flow, which has a documented `resetToken` dev-mode shortcut used by A2-11).
- **A2-05** — login to a suspended account: no admin action *suspends* an account (as distinct from deactivating it, which A2-07/B11-04 cover) exists anywhere in the app.
- **A2-06** — login to a rejected account: needs a real KYC-rejected fixture chained after an automated B2-03 run; not wired up yet.

Separately, two scenarios were rewritten after discovering the QA doc described UI controls that don't exist in the codebase (see the inline comments in `a7-appointments-schedule.spec.ts` and the corresponding fixed rows in `QA_TEST_SCENARIOS.md`):

- **A7-12** — there is no separate "Start Visit" control; only "Check In" and "Complete" exist, and "Complete" accepts either `checked_in` or `in_progress` as its starting state.
- **A7-13** — marking an appointment `no_show` is admin-only (see B7-03); the provider portal has no such control at all.

## Tagging conventions

- `@P0` / `@P1` / `@P2` — priority, matches the QA doc's Priority column. Filter with `--grep`.
- `@regression` — specifically regression-tests a defect that was found and fixed during this engagement (see the defects table in `QA_TEST_SCENARIOS.md`). Run this subset whenever touching code anywhere near one of those fixes.
- Test titles always start with the scenario ID (`'A6-07 @P0 - ...'`) so failures map directly back to the QA doc.

## Project structure

```
e2e/
  fixtures/        Data factories, the ApiClient wrapper, the `api` test fixture, sample-file generators
  pages/           Page Object Models — provider/ and admin/, one file per app section
  support/         global-setup/teardown, the one direct-DB module (db.ts)
  tests/
    provider/      a1-...a18-...  (one spec file per QA doc section)
    admin/         b1-...b12-...
    auth.setup.ts  logs in once per role via the API, saves storageState
```

Auth is bootstrapped once via a Playwright `setup` project (`tests/auth.setup.ts`) that logs in through the real API and seeds `localStorage` in the exact shape the app expects (`client/src/utils/storageUtils.js`: `auth:token` / `auth:user`, JSON-stringified). Every other project depends on `setup` and reuses the saved `storageState`, so individual specs never repeat login steps.

## Suggested CI workflow

```yaml
name: E2E
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:7
        ports: ['27017:27017']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install server deps and seed DB
        run: |
          npm ci
          MONGO_URI=mongodb://localhost:27017/clinictrustai npm run populate_db
      - name: Start server (no third-party env vars — exercise fallback paths)
        run: |
          MONGO_URI=mongodb://localhost:27017/clinictrustai NODE_ENV=development PORT=5000 npm run server &
          npx wait-on http://localhost:5000/api/health
      - name: Start client
        run: |
          npm --prefix client ci
          npm --prefix client run build
          npx serve -s client/build -l 3000 &
          npx wait-on http://localhost:3000
      - name: Install e2e deps
        working-directory: e2e
        run: |
          npm ci
          npx playwright install --with-deps chromium
      - name: Run E2E suite
        working-directory: e2e
        env:
          MONGO_URI: mongodb://localhost:27017/clinictrustai
        run: npm run test:p0
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

Run `test:p0` on every PR for fast feedback; run the full `test` suite on a nightly schedule or before a release.
