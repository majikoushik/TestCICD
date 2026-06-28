/**
 * expirePriorAuths.js
 *
 * Nightly cron job: find all Approved PAs where expiryDate has passed
 * and set their status to Expired. Also logs SLA breaches for overdue appeals.
 *
 * Schedule: every day at 00:05 (just after midnight)
 * Called from server/index.js after DB connection is established.
 */

const PriorAuthorization = require('../models/PriorAuthorization');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

async function runExpirePriorAuths() {
  const now = new Date();
  logger.info('[expirePriorAuths] Running PA expiry job', { at: now.toISOString() });

  try {
    // Find all Approved PAs whose expiryDate has passed
    const expired = await PriorAuthorization.find({
      status: 'Approved',
      expiryDate: { $lt: now },
    }).lean();

    if (expired.length === 0) {
      logger.info('[expirePriorAuths] No PAs to expire', { checked: new Date().toISOString() });
      return { expired: 0, slaBreaches: 0 };
    }

    const ids = expired.map(pa => pa._id);

    // Bulk update status
    await PriorAuthorization.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'Expired' } }
    );

    // Bulk audit log entries
    const auditEntries = expired.map(pa => ({
      action: 'PA_EXPIRED',
      resourceType: 'PriorAuthorization',
      resourceId: String(pa._id),
      patientId: pa.patientId,
      userId: null,
      userRole: 'system',
      endpoint: '/internal/expiry-job',
      method: 'CRON',
      responseStatus: 200,
    }));

    await AuditLog.insertMany(auditEntries);
    logger.info('[expirePriorAuths] PAs expired', { count: expired.length, ids });

    // SLA breach check — Appealing PAs past their reviewDeadline
    const overdueAppeals = await PriorAuthorization.find({
      status: 'Appealing',
      appealDeadlineDate: { $lt: now },
    }).lean();

    if (overdueAppeals.length > 0) {
      logger.warn('[expirePriorAuths] Appeal SLA breaches detected', {
        count: overdueAppeals.length,
        ids: overdueAppeals.map(pa => pa._id),
      });
    }

    return { expired: expired.length, slaBreaches: overdueAppeals.length };
  } catch (err) {
    logger.error('[expirePriorAuths] Job failed', { error: err.message, stack: err.stack });
    return { expired: 0, slaBreaches: 0, error: err.message };
  }
}

module.exports = { runExpirePriorAuths };
