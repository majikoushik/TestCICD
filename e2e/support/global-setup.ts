import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { assertDatabaseReachable, ensureSuperadminFixture, closeDb } from './db';

/**
 * Runs once before any project/test. Two jobs, both explained in db.ts:
 *   1. Fail fast if the environment isn't a real, seeded database.
 *   2. Upsert the superadmin fixture account used by B1-04.
 *
 * Login + storageState capture is intentionally NOT done here — it lives in
 * tests/auth.setup.ts as a Playwright "setup project" (see playwright.config.ts),
 * which is the documented pattern for auth bootstrapping and gives per-role
 * setup its own trace/screenshot on failure instead of a silent globalSetup crash.
 */
export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

  await assertDatabaseReachable();
  const { email } = await ensureSuperadminFixture();
  console.log(`[global-setup] Superadmin fixture ready: ${email}`);
  await closeDb();

  fs.mkdirSync(path.resolve(__dirname, '..', '.auth'), { recursive: true });
}
