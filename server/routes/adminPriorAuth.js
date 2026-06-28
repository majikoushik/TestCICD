const express = require('express');
const router = express.Router();
const PriorAuthorization = require('../models/PriorAuthorization');
const AuditLog = require('../models/AuditLog');
const { analyzePriorAuthorization } = require('../services/azureAIService');
const { triggerAutomaticNotification, sendPatientNotification } = require('../services/patientEngagementService');
const logger = require('../utils/logger');

// All routes in this file are already guarded by protect + authorize('admin','superadmin')
// in the mount point in index.js

// ── Audit helper ──────────────────────────────────────────────────────────────
async function auditPA(action, pa, req) {
  try {
    await AuditLog.create({
      action,
      resourceType: 'PriorAuthorization',
      resourceId: String(pa._id),
      patientId: pa.patientId,
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      userRole: req.user?.role || null,
      endpoint: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      responseStatus: 200,
    });
  } catch (err) {
    logger.warn('Admin PA audit log write failed', { error: err.message, action, paId: pa._id });
  }
}

// ── Notification helper ───────────────────────────────────────────────────────
async function notifyPatient(type, pa) {
  try {
    // In production these come from the patient record; use PA data as fallback
    const patient = {
      name: pa.patientName,
      email: pa.patientEmail || '',
      phone: pa.patientPhone || '',
    };

    if (!patient.email && !patient.phone) {
      logger.info('PA notification skipped — no patient contact info', { paId: pa._id, type });
      return;
    }

    const relatedData = {
      serviceName: pa.serviceType,
      authNumber: String(pa._id).slice(-8).toUpperCase(),
      reason: pa.reviewerNotes || pa.denialReasonDescription || 'Not specified',
    };

    const notification = await triggerAutomaticNotification(type, relatedData, patient);
    const result = await sendPatientNotification(notification);
    logger.info('PA patient notification sent', { type, paId: pa._id, overall: result.overall });
  } catch (err) {
    logger.warn('PA patient notification failed (non-fatal)', { error: err.message, paId: pa._id });
  }
}

// GET /api/admin/prior-auth - List all PAs with status stats
router.get('/', async (req, res) => {
  try {
    const { status, page = 0, limit = 20, search = '' } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { serviceType: { $regex: search, $options: 'i' } },
        { requestingProviderName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await PriorAuthorization.countDocuments(filter);
    const pas = await PriorAuthorization.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(page) * parseInt(limit))
      .limit(parseInt(limit));

    const stats = await PriorAuthorization.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statMap = { Pending: 0, 'Under Review': 0, Approved: 0, Denied: 0, Appealing: 0, Expired: 0 };
    stats.forEach(s => { statMap[s._id] = s.count; });

    // SLA breach counts — appeals overdue
    const now = new Date();
    const overdueAppeals = await PriorAuthorization.countDocuments({
      status: 'Appealing',
      appealDeadlineDate: { $lt: now },
    });
    statMap.overdueAppeals = overdueAppeals;

    res.json({ success: true, data: { priorAuths: pas, total, stats: statMap } });
  } catch (err) {
    logger.error('Admin get PAs error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/admin/prior-auth/analytics - TAT and denial pattern analytics
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Average turnaround time (submission → review decision) in hours
    const tatPipeline = await PriorAuthorization.aggregate([
      { $match: { status: { $in: ['Approved', 'Denied'] }, reviewedAt: { $ne: null } } },
      {
        $project: {
          serviceType: 1,
          tat: {
            $divide: [{ $subtract: ['$reviewedAt', '$createdAt'] }, 3600000], // ms → hours
          },
        },
      },
      {
        $group: {
          _id: '$serviceType',
          avgTatHours: { $avg: '$tat' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Denial rate by service type
    const denialRatePipeline = await PriorAuthorization.aggregate([
      {
        $group: {
          _id: '$serviceType',
          total: { $sum: 1 },
          denied: { $sum: { $cond: [{ $eq: ['$status', 'Denied'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
        },
      },
      {
        $project: {
          serviceType: '$_id',
          total: 1,
          denied: 1,
          approved: 1,
          denialRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$denied', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { denialRate: -1 } },
      { $limit: 10 },
    ]);

    // AI accuracy — cases where AI rec matched final decision
    const aiAccuracy = await PriorAuthorization.aggregate([
      {
        $match: {
          status: { $in: ['Approved', 'Denied'] },
          aiRecommendation: { $ne: null },
          reviewedAt: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          correct: {
            $sum: {
              $cond: [{ $eq: ['$status', '$aiRecommendation'] }, 1, 0],
            },
          },
          autoApproved: { $sum: { $cond: ['$autoApproved', 1, 0] } },
        },
      },
    ]);

    // Appeal win rate
    const appealStats = await PriorAuthorization.aggregate([
      { $match: { appealOutcome: { $ne: null } } },
      {
        $group: {
          _id: '$appealOutcome',
          count: { $sum: 1 },
        },
      },
    ]);

    // Volume trend — last 30 days
    const volumeTrend = await PriorAuthorization.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const aiStats = aiAccuracy[0] || { total: 0, correct: 0, autoApproved: 0 };
    const aiAccuracyPct = aiStats.total > 0 ? Math.round((aiStats.correct / aiStats.total) * 100) : 0;

    const appealMap = {};
    appealStats.forEach(s => { appealMap[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        tatByServiceType: tatPipeline,
        denialRateByService: denialRatePipeline,
        aiAccuracy: { ...aiStats, accuracyPct: aiAccuracyPct },
        appealOutcomes: { Approved: appealMap.Approved || 0, Denied: appealMap.Denied || 0 },
        volumeTrend,
      },
    });
  } catch (err) {
    logger.error('PA analytics error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/admin/prior-auth/:id
router.get('/:id', async (req, res) => {
  try {
    const pa = await PriorAuthorization.findById(req.params.id);
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: pa });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/admin/prior-auth/:id/review - Approve or Deny
router.put('/:id/review', async (req, res) => {
  try {
    const { decision, reviewerNotes, denialReasonCode, approvalDurationDays } = req.body;
    if (!['Approved', 'Denied'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Decision must be Approved or Denied' });
    }

    const pa = await PriorAuthorization.findById(req.params.id);
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
    if (!['Pending', 'Under Review'].includes(pa.status)) {
      return res.status(400).json({ success: false, error: `Cannot review a PA with status: ${pa.status}` });
    }

    pa.status = decision;
    pa.reviewerNotes = reviewerNotes || '';
    pa.reviewedBy = req.user.id;
    pa.reviewedAt = new Date();

    if (decision === 'Approved') {
      pa.approvedDate = new Date();
      const durationDays = parseInt(approvalDurationDays) || 90;
      pa.approvalDurationDays = durationDays;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + durationDays);
      pa.expiryDate = expiry;
    } else {
      pa.deniedDate = new Date();
      if (denialReasonCode) {
        pa.denialReasonCode = denialReasonCode;
        // Map code to description if known
        const CARC_MAP = {
          '4': 'Not covered by this payer',
          '50': 'Not deemed medically necessary',
          '96': 'Non-covered charge',
          '167': 'Diagnosis codes not covered',
          '197': 'Precertification/authorization absent',
          '252': 'Attachment/documentation required',
        };
        pa.denialReasonDescription = CARC_MAP[denialReasonCode] || denialReasonCode;
      }
    }

    await pa.save();

    // Audit log
    await auditPA(decision === 'Approved' ? 'PA_APPROVED' : 'PA_DENIED', pa, req);

    // Notify patient (fire-and-forget)
    notifyPatient(
      decision === 'Approved' ? 'prior_auth_approved' : 'prior_auth_denied',
      pa
    );

    res.json({ success: true, data: pa });
  } catch (err) {
    logger.error('PA review error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/admin/prior-auth/:id/appeal-review - Review an appeal
router.put('/:id/appeal-review', async (req, res) => {
  try {
    const { outcome, reviewerNotes } = req.body;
    if (!['Approved', 'Denied'].includes(outcome)) {
      return res.status(400).json({ success: false, error: 'Outcome must be Approved or Denied' });
    }

    const pa = await PriorAuthorization.findById(req.params.id);
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
    if (pa.status !== 'Appealing') {
      return res.status(400).json({ success: false, error: 'PA is not in Appealing status' });
    }

    pa.status = outcome;
    pa.appealOutcome = outcome;
    pa.appealReviewedAt = new Date();
    pa.reviewerNotes = reviewerNotes || pa.reviewerNotes;
    pa.reviewedBy = req.user.id;
    pa.reviewedAt = new Date();

    if (outcome === 'Approved') {
      pa.approvedDate = new Date();
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (pa.approvalDurationDays || 90));
      pa.expiryDate = expiry;
    } else {
      pa.deniedDate = new Date();
    }

    await pa.save();

    // Audit log
    await auditPA(outcome === 'Approved' ? 'PA_APPEAL_APPROVED' : 'PA_APPEAL_DENIED', pa, req);

    // Notify patient (fire-and-forget)
    notifyPatient(
      outcome === 'Approved' ? 'prior_auth_approved' : 'prior_auth_denied',
      pa
    );

    res.json({ success: true, data: pa });
  } catch (err) {
    logger.error('PA appeal review error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/admin/prior-auth/:id/analyze - Re-run AI analysis
router.post('/:id/analyze', async (req, res) => {
  try {
    const pa = await PriorAuthorization.findById(req.params.id);
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });

    const aiResult = await analyzePriorAuthorization(pa);
    pa.aiRecommendation = aiResult.recommendation;
    pa.aiConfidenceScore = aiResult.confidenceScore;
    pa.aiReasoning = aiResult.reasoning;
    pa.aiKeyFactors = aiResult.keyFactors || [];
    pa.aiSuggestedAction = aiResult.suggestedAction || '';
    pa.aiGuidelinesCited = aiResult.guidelinesCited || [];
    if (aiResult.denialReasonCode) {
      pa.denialReasonCode = aiResult.denialReasonCode;
      pa.denialReasonDescription = aiResult.denialReasonDescription;
    }
    pa.aiAnalyzedAt = new Date();
    await pa.save();

    await auditPA('PA_AI_ANALYZED', pa, req);
    res.json({ success: true, data: { ...aiResult, pa } });
  } catch (err) {
    logger.error('Admin PA analyze error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
