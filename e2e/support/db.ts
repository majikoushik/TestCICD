import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

/**
 * Direct-to-database helpers used ONLY by test setup/teardown — never by
 * spec files themselves. Specs talk to the app exclusively through its UI
 * or its real REST API (see fixtures/api-client.ts); this file exists
 * because two things genuinely can't be done any other way:
 *
 *   1. Verifying the target environment is backed by a real, persistent
 *      MongoDB rather than Synthetic Data Mode (server/index.js falls back
 *      to an in-memory store when Mongo is unreachable — see README.md
 *      "Synthetic Data Mode"). Persistence-focused scenarios (A9 notification
 *      persistence, A10 blockchain history, B9 token balances, etc.) are
 *      meaningless against a store that resets on restart.
 *   2. Seeding one 'superadmin'-role fixture account. There is no
 *      self-registration path for admin/superadmin (server/routes/auth.js
 *      explicitly rejects it) and populate_db.js does not seed one, but
 *      B1-04 exists specifically to regression-test a bug where superadmins
 *      were locked out of the admin panel — so the suite needs one.
 */

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (!client) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error(
        'MONGO_URI is not set. Copy e2e/.env.example to e2e/.env and point it at the ' +
          'same database the server under test uses.'
      );
    }
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8_000 });
    await client.connect();
  }
  return client;
}

/** Fails fast with a clear message if the target DB isn't reachable. */
export async function assertDatabaseReachable(): Promise<void> {
  try {
    const c = await getClient();
    await c.db().command({ ping: 1 });
  } catch (err) {
    throw new Error(
      'Could not reach MONGO_URI from e2e/.env. This suite requires the server under ' +
        'test to be running in live-database mode (not Synthetic Data Mode) so that ' +
        `persistence-focused scenarios are meaningful. Original error: ${(err as Error).message}`
    );
  }
}

/** Idempotent — safe to call before every run. */
export async function ensureSuperadminFixture(): Promise<{ email: string; password: string }> {
  const email = process.env.SUPERADMIN_EMAIL || 'e2e.superadmin@clinictrustai.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'Demo1234!';

  const c = await getClient();
  const users = c.db().collection('users');

  const existing = await users.findOne({ email });
  if (existing && existing.role === 'superadmin') return { email, password };

  const passwordHash = await bcrypt.hash(password, 10);
  await users.updateOne(
    { email },
    {
      $set: {
        email,
        password: passwordHash,
        name: 'E2E Superadmin',
        firstName: 'E2E',
        lastName: 'Superadmin',
        role: 'superadmin',
        organization: 'ClinicTrust AI (E2E fixture)',
        isActive: true,
        accountStatus: 'approved',
        onboardingStatus: 'verified',
        kycVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return { email, password };
}

/**
 * Marks a freshly-registered account's email as verified, bypassing the
 * verification-link click. Used ONLY by A3/A9 onboarding specs that need to
 * reach the "profile" or "docs" onboarding step, which the UI locks behind
 * email verification (see client/src/pages/onboarding/OnboardingWall.js
 * stepStatus()) — the real verification token is one-way-hashed server-side
 * (see A1-13/A1-14 test.fixme reasons) so there is no API-level way to do this.
 * Unlike the fixture helpers above, this IS called directly from spec files.
 */
export async function markEmailVerified(email: string): Promise<void> {
  const c = await getClient();
  await c.db().collection('users').updateOne(
    { email },
    { $set: { onboardingStatus: 'profile_incomplete', kycStatus: 'profile_incomplete', 'onboardingSteps.email_verified': true } }
  );
}

/**
 * Creates a Notification document directly. There is no API path to create
 * an in-app notification for a user other than the caller: POST /api/notifications
 * (server/controllers/notificationController.js createNotification) always
 * forces userId to req.user.id, and no feature in the app (referral creation,
 * admin targeted alerts, etc.) creates an in-app Notification record for
 * another user — only real emails are sent. This is the one exception where
 * a direct-DB write stands in for a genuinely missing API/UI creation path,
 * used by A9 spec files only.
 */
export async function createNotificationFixture(
  userId: string,
  fields: { title: string; message: string; type?: string; priority?: string }
): Promise<string> {
  const c = await getClient();
  const result = await c.db().collection('notifications').insertOne({
    userId: String(userId),
    title: fields.title,
    message: fields.message,
    type: fields.type || 'info',
    priority: fields.priority || 'medium',
    read: false,
    createdAt: new Date(),
  });
  return String(result.insertedId);
}

/**
 * Creates a fully active, onboarded, KYC-verified provider with NO blockchain
 * identity yet. Unreachable through the real onboarding flow: KYC approval
 * (server/routes/admin/kyc.js PATCH /:id, status: 'verified') always creates
 * a wallet in the same request unless that creation throws, so every provider
 * that clears onboarding normally already has a blockchainId. A11-04 tests
 * the Profile page's "Start Verification" affordance, which only renders for
 * this otherwise-unreachable pre-wallet state — hence the direct-DB fixture.
 */
export async function createVerifiedProviderWithoutWallet(email: string, password: string): Promise<void> {
  const c = await getClient();
  const passwordHash = await bcrypt.hash(password, 10);
  // blockchainId/walletAddress have sparse unique indexes — sparse only skips
  // documents where the field is entirely ABSENT, not documents where it's
  // explicitly set to null, so $unset (not $set: null) to avoid duplicate-key
  // collisions across multiple fixture accounts.
  await c.db().collection('users').updateOne(
    { email },
    {
      $set: {
        email, password: passwordHash, name: 'E2E BlockchainVerify', firstName: 'E2E', lastName: 'BlockchainVerify',
        role: 'doctor', organization: 'E2E_Test Clinic', isActive: true, accountStatus: 'approved',
        kycVerified: true, onboardingStatus: 'verified', loginAttempts: 0,
        tokenBalance: 0, createdAt: new Date(),
      },
      $unset: { blockchainId: '', walletAddress: '' },
    },
    { upsert: true }
  );
  await c.db().collection('providerprofiles').updateOne(
    { userId: (await c.db().collection('users').findOne({ email }))!._id.toString() },
    { $set: { kycStatus: 'verified', onboardingSteps: { profile_created: true, email_verified: true, profile_reviewed: true, docs_uploaded: true } } },
    { upsert: true }
  );
}

/**
 * Creates a ReferralDispute directly. No route anywhere in the server creates
 * one (server/routes/admin/referrals.js PUT /:id/dispute only RESOLVES an
 * already-existing 'Pending' dispute) — raising a dispute has no API or UI
 * path in this app at all, only pre-seeded records exist. Used by B3-04/B3-05.
 */
export async function createReferralDisputeFixture(referralId: string, initiatedBy: string, initiatorName: string): Promise<void> {
  const c = await getClient();
  await c.db().collection('referraldisputes').insertOne({
    referralId: String(referralId),
    initiatedBy: String(initiatedBy),
    initiatorName,
    reason: 'E2E_ dispute fixture',
    requestedAmount: 150,
    status: 'Pending',
    createdAt: new Date(),
  });
}

/**
 * Creates an EscalationWorkflow directly. Nothing in the app creates one —
 * server/routes/admin/escalations.js only reads/assigns/resolves existing
 * records, and populate_db.js seeds none — these are presumably meant to be
 * raised by an AI risk-monitoring job that doesn't exist yet. Used by B4-08/09/10.
 */
export async function createEscalationFixture(title: string, patientName: string): Promise<string> {
  const c = await getClient();
  const result = await c.db().collection('escalationworkflows').insertOne({
    title, patientId: `E2E_${Date.now()}`, patientName, aiRiskScore: 0.82,
    flaggedAt: new Date(), status: 'pending_review', priority: 'high', category: 'readmission',
    assignedTo: null, details: { riskFactors: ['E2E_ fixture'], aiRecommendations: [], notes: '' }, timeline: [],
  });
  return String(result.insertedId);
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
