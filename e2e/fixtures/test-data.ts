/**
 * Data factories for test-created entities. Every generated name/value is
 * prefixed with E2E_TAG so global-teardown.ts can safely bulk-delete
 * everything this suite created without ever touching populate_db.js's
 * seeded demo data.
 *
 * Uniqueness comes from a timestamp + random suffix so tests remain
 * independent under Playwright's fully-parallel workers — two tests never
 * collide on the same patient/referral/appointment.
 */
export const E2E_TAG = 'E2E_';

export function uniqueSuffix(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function uniquePatientName(label = 'Patient'): string {
  return `${E2E_TAG}${label}_${uniqueSuffix()}`;
}

export function uniqueReferralReason(label = 'Referral'): string {
  return `${E2E_TAG}${label}_${uniqueSuffix()}`;
}

export function uniqueChiefComplaint(label = 'Complaint'): string {
  return `${E2E_TAG}${label}_${uniqueSuffix()}`;
}

export function uniqueEmail(label = 'user'): string {
  return `${E2E_TAG.toLowerCase()}${label}_${uniqueSuffix()}@example.com`;
}

export function uniqueProgramName(label = 'Program'): string {
  return `${E2E_TAG}${label}_${uniqueSuffix()}`;
}

/** ISO date N days from today — handy for booking slots that are always in the future. */
export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Clinical notes guaranteed to clear the 20-character minimum (see A13-03). */
export const VALID_CLINICAL_NOTES =
  'Patient reports persistent symptoms over the past two weeks; imaging requested to confirm diagnosis and guide treatment planning.';

export const SHORT_CLINICAL_NOTES = 'Too short'; // 10 chars — must be rejected server-side
