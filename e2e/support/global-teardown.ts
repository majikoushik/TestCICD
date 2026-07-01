import dotenv from 'dotenv';
import path from 'path';
import { MongoClient } from 'mongodb';

/**
 * Best-effort cleanup of data this suite created. Every entity a test
 * creates is tagged with the `E2E_TAG_PREFIX` (see fixtures/test-data.ts),
 * so we can safely delete "anything with our tag" without ever touching the
 * seeded demo data from populate_db.js. Failure here never fails the run —
 * a messy DB is a nuisance, not a test result.
 */
export default async function globalTeardown() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
  const uri = process.env.MONGO_URI;
  if (!uri) return;

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  try {
    await client.connect();
    const db = client.db();
    const tagRegex = { $regex: '^E2E_' };

    const results = await Promise.allSettled([
      db.collection('patients').deleteMany({ name: tagRegex }),
      db.collection('referrals').deleteMany({ reason: tagRegex }),
      db.collection('appointments').deleteMany({ chiefComplaint: tagRegex }),
      db.collection('priorauthorizations').deleteMany({ patientName: tagRegex }),
      db.collection('dtxprescriptions').deleteMany({ patientName: tagRegex }),
      db.collection('users').deleteMany({ organization: 'ClinicTrust AI (E2E fixture)', email: { $ne: process.env.SUPERADMIN_EMAIL } }),
    ]);

    const deleted = results
      .filter((r): r is PromiseFulfilledResult<{ deletedCount?: number }> => r.status === 'fulfilled')
      .reduce((sum, r) => sum + (r.value.deletedCount || 0), 0);
    console.log(`[global-teardown] Cleaned up ${deleted} E2E-tagged document(s).`);
  } catch (err) {
    console.warn('[global-teardown] Cleanup skipped (non-fatal):', (err as Error).message);
  } finally {
    await client.close();
  }
}
