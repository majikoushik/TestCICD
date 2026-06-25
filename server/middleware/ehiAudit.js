/**
 * EHI Audit Middleware
 *
 * Records every Electronic Health Information access event after the response
 * is sent.  The write is fire-and-forget: a DB hiccup must never fail or delay
 * a clinical request — that would itself constitute information blocking under
 * 45 CFR § 171.203 (Security Exception).
 *
 * Usage:
 *   router.get('/:id', protect, ehiAudit('Patient', 'READ'), async (req, res) => { ... })
 */
const AuditLog = require('../models/AuditLog');

const ehiAudit = (resourceType, action) => (req, res, next) => {
  res.on('finish', () => {
    const rawId = req.user?._id || req.user?.id;
    // Synthetic-mode users have string IDs like 'user-2'; skip ObjectId coercion
    const isSyntheticId = typeof rawId === 'string' && rawId.startsWith('user-');

    const entry = {
      userId:         isSyntheticId ? null : (rawId || null),
      userEmail:      req.user?.email      || null,
      userRole:       req.user?.role       || null,
      action,
      resourceType,
      resourceId:     req.params?.id || req.params?.patientId || null,
      patientId:      req.params?.patientId || req.params?.id || null,
      endpoint:       req.originalUrl,
      method:         req.method,
      ipAddress:      req.ip,
      userAgent:      req.get('User-Agent'),
      responseStatus: res.statusCode,
      timestamp:      new Date(),
    };

    AuditLog.create(entry).catch(() => {
      // Intentionally swallowed — audit log failure must not propagate
    });
  });

  next();
};

module.exports = { ehiAudit };
