/**
 * expirePriorAuths.js
 *
 * Scheduled jobs for Prior Authorization lifecycle management:
 *
 *   runExpirePriorAuths()  — nightly at 00:05
 *     Finds Approved PAs whose expiryDate has passed → sets status = Expired.
 *     Logs PA_SLA_BREACH audit entries for appeals already past deadline.
 *
 *   runUrgencyEscalation() — every 30 minutes
 *     Finds Pending/Under-Review PAs that have exceeded their urgency SLA and
 *     have not yet had an escalation alert sent:
 *       Emergent  → alert after 1 hour
 *       Urgent    → alert after 4 hours
 *     Marks escalationSentAt, writes PA_ESCALATED audit entries, and emails
 *     ADMIN_NOTIFICATION_EMAIL (or stubs gracefully when that env var is absent).
 */

const PriorAuthorization = require('../models/PriorAuthorization');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { sendEmail, triggerAutomaticNotification, sendPatientNotification, saveNotificationLog } = require('../services/patientEngagementService');
const logger = require('../utils/logger');

// ── Nightly expiry job ────────────────────────────────────────────────────────

async function runExpirePriorAuths() {
  const now = new Date();
  logger.info('[expirePriorAuths] Running PA expiry job', { at: now.toISOString() });

  try {
    const expired = await PriorAuthorization.find({
      status: 'Approved',
      expiryDate: { $lt: now },
    }).lean();

    if (expired.length === 0) {
      logger.info('[expirePriorAuths] No PAs to expire');
      return { expired: 0, slaBreaches: 0 };
    }

    const ids = expired.map(pa => pa._id);

    await PriorAuthorization.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'Expired' } }
    );

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
    logger.info('[expirePriorAuths] PAs expired', { count: expired.length });

    // Notify patients + providers (fire-and-forget per PA)
    for (const pa of expired) {
      ;(async () => {
        try {
          const authNumber = String(pa._id).slice(-8).toUpperCase();
          const rd = { serviceName: pa.serviceType, authNumber };
          const patientUser = await User.findById(pa.patientId).select('email phone').lean().catch(() => null);
          if (patientUser?.email || patientUser?.phone) {
            const pt = { name: pa.patientName, email: patientUser.email || '', phone: patientUser.phone || '' };
            const notif = await triggerAutomaticNotification('prior_auth_expired', rd, pt);
            const result = await sendPatientNotification(notif);
            await saveNotificationLog({ paId: pa._id, patientId: pa.patientId, patientName: pa.patientName, patientEmail: patientUser.email, patientPhone: patientUser.phone, notifObj: notif, sendResult: result });
          }
          // Notify provider
          if (pa.requestingProviderId) {
            const provUser = await User.findById(pa.requestingProviderId).select('email').lean().catch(() => null);
            if (provUser?.email) {
              const subject = `Prior Authorization Expired — ${pa.serviceType}`;
              const html = `<h3>Prior Authorization Expired</h3><p>Patient: <strong>${pa.patientName}</strong></p><p>Service: <strong>${pa.serviceType}</strong> (Auth #${authNumber})</p><p>Please submit a renewal if the service is still needed.</p>`;
              const text = `Prior authorization for ${pa.serviceType} (Auth #${authNumber}) for patient ${pa.patientName} has expired. Please submit a renewal if the service is still needed.`;
              await sendEmail(provUser.email, subject, html, text);
            }
          }
        } catch (_) {}
      })();
    }

    // Log SLA breach entries for appeals already overdue
    const overdueAppeals = await PriorAuthorization.find({
      status: 'Appealing',
      appealDeadlineDate: { $lt: now },
    }).lean();

    if (overdueAppeals.length > 0) {
      const slaEntries = overdueAppeals.map(pa => ({
        action: 'PA_SLA_BREACH',
        resourceType: 'PriorAuthorization',
        resourceId: String(pa._id),
        patientId: pa.patientId,
        userId: null,
        userRole: 'system',
        endpoint: '/internal/expiry-job',
        method: 'CRON',
        responseStatus: 200,
      }));
      await AuditLog.insertMany(slaEntries);
      logger.warn('[expirePriorAuths] Appeal SLA breaches logged', {
        count: overdueAppeals.length,
      });
    }

    return { expired: expired.length, slaBreaches: overdueAppeals.length };
  } catch (err) {
    logger.error('[expirePriorAuths] Job failed', { error: err.message, stack: err.stack });
    return { expired: 0, slaBreaches: 0, error: err.message };
  }
}

// ── 30-minute urgency escalation job ─────────────────────────────────────────

const EMERGENT_SLA_MS = 1 * 60 * 60 * 1000;  // 1 hour
const URGENT_SLA_MS   = 4 * 60 * 60 * 1000;  // 4 hours

async function runUrgencyEscalation() {
  const now = new Date();
  logger.info('[escalation] Running urgency escalation check', { at: now.toISOString() });

  try {
    const emergentCutoff = new Date(now - EMERGENT_SLA_MS);
    const urgentCutoff   = new Date(now - URGENT_SLA_MS);

    // PAs past their urgency SLA that haven't been escalated yet
    const toEscalate = await PriorAuthorization.find({
      status: { $in: ['Pending', 'Under Review'] },
      escalationSentAt: null,
      $or: [
        { urgency: 'Emergent', createdAt: { $lt: emergentCutoff } },
        { urgency: 'Urgent',   createdAt: { $lt: urgentCutoff } },
      ],
    }).lean();

    if (toEscalate.length === 0) {
      logger.info('[escalation] No PAs require escalation');
      return { escalated: 0 };
    }

    const ids = toEscalate.map(pa => pa._id);

    // Mark escalationSentAt to prevent duplicate alerts on the next run
    await PriorAuthorization.updateMany(
      { _id: { $in: ids } },
      { $set: { escalationSentAt: now } }
    );

    const auditEntries = toEscalate.map(pa => ({
      action: 'PA_ESCALATED',
      resourceType: 'PriorAuthorization',
      resourceId: String(pa._id),
      patientId: pa.patientId,
      userId: null,
      userRole: 'system',
      endpoint: '/internal/escalation-job',
      method: 'CRON',
      responseStatus: 200,
    }));
    await AuditLog.insertMany(auditEntries);

    // Email admin (gracefully stubs when ADMIN_NOTIFICATION_EMAIL is absent)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || '';
    if (adminEmail) {
      const listHtml = toEscalate.map(pa => {
        const waitMins = Math.round((now - new Date(pa.createdAt)) / 60000);
        return `<li><strong>[${pa.urgency}]</strong> ${pa.patientName} — ${pa.serviceType} (${pa.status}, waiting ${waitMins} min)</li>`;
      }).join('');

      const subject = `⚠️ ALERT: ${toEscalate.length} PA(s) Require Immediate Review`;
      const html = `
        <h3>Prior Authorization Urgency Alert</h3>
        <p>${toEscalate.length} prior authorization(s) have exceeded their review SLA:</p>
        <ul>${listHtml}</ul>
        <p><strong>SLA thresholds:</strong> Emergent = 1 hour &nbsp;|&nbsp; Urgent = 4 hours</p>
        <p>Please log in to the admin portal to review immediately.</p>
      `;
      const text = `PA URGENCY ALERT: ${toEscalate.length} PA(s) need immediate review.\n` +
        toEscalate.map(pa => `• [${pa.urgency}] ${pa.patientName} — ${pa.serviceType}`).join('\n');

      await sendEmail(adminEmail, subject, html, text);
    }

    logger.warn('[escalation] PAs escalated to admin', {
      count: toEscalate.length,
      ids: ids.map(String),
    });
    return { escalated: toEscalate.length };
  } catch (err) {
    logger.error('[escalation] Job failed', { error: err.message, stack: err.stack });
    return { escalated: 0, error: err.message };
  }
}

module.exports = { runExpirePriorAuths, runUrgencyEscalation };
