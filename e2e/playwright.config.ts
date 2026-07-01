import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Data/mocking policy for this suite (see e2e/README.md "Why real backend, no mocks"
 * for the full rationale):
 *
 *   - No network-level mocking of our own API. Every scenario runs against a real,
 *     seeded MongoDB instance (`npm run populate_db` at the repo root). The whole
 *     point of this suite is validating persistence and business rules that were
 *     previously broken — mocking the API would test the mock, not the app.
 *   - No mocking of third-party services (Azure OpenAI/Speech, Gmail/SendGrid,
 *     Twilio, Azure Notification Hubs) either. Per QA_TEST_SCENARIOS.md scope
 *     rules, tests never assert on third-party content/delivery — only on the
 *     app's own behavior, which is well-defined and deterministic whether or
 *     not those services are configured (documented fallback paths). Run this
 *     suite against a server started WITHOUT those env vars set for maximum
 *     determinism; the fallback path IS the behavior under test.
 *   - Test data setup goes through the real REST API (see fixtures/api-client.ts),
 *     not the UI — except for the specific scenarios that test a creation flow
 *     itself (registration, Add Patient, Create Referral, Book Appointment,
 *     Create PA, Prescribe DTx), which drive the UI because that IS what's
 *     under test. This is standard Playwright practice: UI tests test the UI;
 *     API calls handle setup/teardown for speed and reliability.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // server/index.js applies a real, intentional rate limiter to /api/auth and
  // /api/admin/auth (20 requests / 15 min — brute-force protection, not
  // something this suite should weaken). Many specs log in fresh via
  // ApiClient for setup; too many parallel workers exhausts that budget and
  // cascades into unrelated failures. 2 keeps well under it.
  workers: 2,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],

  globalSetup: require.resolve('./support/global-setup'),
  globalTeardown: require.resolve('./support/global-teardown'),

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    // Use the system-installed Chrome rather than Playwright's own bundled
    // Chromium build — this environment's corporate TLS-inspecting proxy
    // blocks the browser binary download (UNABLE_TO_GET_ISSUER_CERT_LOCALLY).
    channel: 'chrome',
  },

  projects: [
    // ── Auth bootstrap: logs in once per role, saves storageState to disk.
    //    Every other project depends on this so tests never repeat login steps.
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ── Provider portal — Provider A identity (primary actor in most scenarios)
    {
      name: 'provider-a',
      testDir: './tests/provider',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/provider-a.json',
        // Ambient Clinical Intelligence (A15) records via getUserMedia();
        // these flags make Chromium serve a synthetic audio/video device
        // instead of prompting for/requiring real hardware.
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
        permissions: ['microphone'],
      },
    },

    // ── Provider portal — Provider B identity, used only by cross-provider
    //    scenarios (e.g. A6-07 accept a referral sent by Provider A).
    //    Individual specs opt into this via test.use({ storageState: ... })
    //    rather than a whole separate project, to keep most specs simple —
    //    see tests/provider/a6-referrals.spec.ts for the pattern.

    // ── Admin portal — regular admin
    {
      name: 'admin',
      testDir: './tests/admin',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
      },
      testIgnore: /b1-admin-auth\.superadmin\.spec\.ts/,
    },

    // ── Admin portal — superadmin (regression coverage for the fixed
    //    AdminRoute lockout bug — see QA_TEST_SCENARIOS.md B1-04). Isolated
    //    into its own project so a superadmin-specific storageState is used.
    {
      name: 'superadmin',
      testDir: './tests/admin',
      testMatch: /b1-admin-auth\.superadmin\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/superadmin.json',
      },
    },
  ],

  // The client + server are expected to already be running (see README.md) —
  // this suite runs against a real, seeded environment, not an ephemeral one
  // spun up per test run, since global-setup needs a stable DB to seed a
  // fixture superadmin account into.
  webServer: undefined,
});
