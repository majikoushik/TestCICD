const express = require('express');
const router = express.Router();
const PriorAuthorization = require('../models/PriorAuthorization');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { analyzePriorAuthorization, isEligibleForAutoApproval } = require('../services/azureAIService');
const logger = require('../utils/logger');

const APPEAL_REVIEW_SLA_DAYS = 15;
const MAX_APPEALS_PER_PA = 1;

// ── Audit helper ──────────────────────────────────────────────────────────────
async function auditPA(action, pa, req, extra = {}) {
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
      ...extra,
    });
  } catch (err) {
    logger.warn('PA audit log write failed', { error: err.message, action, paId: pa._id });
  }
}

// GET /api/prior-auth - Get all PAs for the authenticated provider
router.get('/', protect, async (req, res) => {
  try {
    const filter = { requestingProviderId: req.user.id };
    const { status, page = 0, limit = 20 } = req.query;
    if (status && status !== 'all') filter.status = status;

    const total = await PriorAuthorization.countDocuments(filter);
    const pas = await PriorAuthorization.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(page) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ success: true, data: { priorAuths: pas, total } });
  } catch (err) {
    logger.error('Get prior auths error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/prior-auth/:id - Get single PA
router.get('/:id', protect, async (req, res) => {
  try {
    const pa = await PriorAuthorization.findById(req.params.id);
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: pa });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/prior-auth - Create new PA request
router.post('/', protect, async (req, res) => {
  try {
    const {
      referralId, patientId, patientName, targetProviderName,
      serviceType, serviceCode, diagnosisCodes, clinicalNotes,
      urgency, insurancePlan, memberId,
    } = req.body;

    if (!patientId || !patientName || !serviceType || !clinicalNotes) {
      return res.status(400).json({ success: false, error: 'Missing required fields: patientId, patientName, serviceType, clinicalNotes' });
    }

    const pa = new PriorAuthorization({
      referralId: referralId || null,
      patientId,
      patientName,
      requestingProviderId: req.user.id,
      requestingProviderName: req.user.name || req.user.email,
      targetProviderName: targetProviderName || '',
      serviceType,
      serviceCode: serviceCode || '',
      diagnosisCodes: diagnosisCodes || [],
      clinicalNotes,
      urgency: urgency || 'Routine',
      insurancePlan: insurancePlan || '',
      memberId: memberId || '',
      status: 'Pending',
    });

    await pa.save();
    await auditPA('PA_SUBMITTED', pa, req);

    // Run AI analysis async — triggers auto-approval if criteria met
    const savedPaId = pa._id;
    analyzePriorAuthorization(pa)
      .then(async (aiResult) => {
        const doc = await PriorAuthorization.findById(savedPaId);
        if (!doc) return;

        doc.aiRecommendation = aiResult.recommendation;
        doc.aiConfidenceScore = aiResult.confidenceScore;
        doc.aiReasoning = aiResult.reasoning;
        doc.aiKeyFactors = aiResult.keyFactors || [];
        doc.aiSuggestedAction = aiResult.suggestedAction || '';
        doc.aiGuidelinesCited = aiResult.guidelinesCited || [];
        doc.aiAnalyzedAt = new Date();

        if (isEligibleForAutoApproval(doc, aiResult)) {
          doc.status = 'Approved';
          doc.autoApproved = true;
          doc.approvedDate = new Date();
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + (doc.approvalDurationDays || 90));
          doc.expiryDate = expiry;
          doc.reviewerNotes = `Auto-approved by AI (confidence: ${aiResult.confidenceScore}%). ${aiResult.reasoning}`;
          await doc.save();
          await AuditLog.create({
            action: 'PA_AUTO_APPROVED',
            resourceType: 'PriorAuthorization',
            resourceId: String(doc._id),
            patientId: doc.patientId,
            userId: null,
            userRole: 'system',
            endpoint: '/internal/ai-analysis',
            method: 'POST',
          });
          logger.info('PA auto-approved', { paId: doc._id, confidence: aiResult.confidenceScore, serviceType: doc.serviceType });
        } else {
          doc.status = 'Under Review';
          if (aiResult.denialReasonCode) {
            doc.denialReasonCode = aiResult.denialReasonCode;
            doc.denialReasonDescription = aiResult.denialReasonDescription;
          }
          await doc.save();
          await AuditLog.create({
            action: 'PA_AI_ANALYZED',
            resourceType: 'PriorAuthorization',
            resourceId: String(doc._id),
            patientId: doc.patientId,
            userId: null,
            userRole: 'system',
            endpoint: '/internal/ai-analysis',
            method: 'POST',
          });
        }
      })
      .catch(err => logger.error('PA AI analysis async error', { error: err.message, paId: savedPaId }));

    res.status(201).json({ success: true, data: pa });
  } catch (err) {
    logger.error('Create prior auth error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/prior-auth/:id/appeal - Submit appeal (max 1 per PA)
router.post('/:id/appeal', protect, async (req, res) => {
  try {
    const pa = await PriorAuthorization.findOne({ _id: req.params.id, requestingProviderId: req.user.id });
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
    if (pa.status !== 'Denied') {
      return res.status(400).json({ success: false, error: 'Can only appeal denied requests' });
    }
    if (pa.appealCount >= MAX_APPEALS_PER_PA) {
      return res.status(400).json({
        success: false,
        error: `Maximum of ${MAX_APPEALS_PER_PA} appeal(s) allowed per prior authorization`,
      });
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + APPEAL_REVIEW_SLA_DAYS);

    pa.status = 'Appealing';
    pa.appealNotes = req.body.appealNotes || '';
    pa.appealCount = (pa.appealCount || 0) + 1;
    pa.appealSubmittedAt = new Date();
    pa.appealDeadlineDate = deadline;
    await pa.save();

    await auditPA('PA_APPEALED', pa, req);

    res.json({ success: true, data: pa });
  } catch (err) {
    logger.error('PA appeal submit error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/prior-auth/:id/appeal-draft - AI-generated appeal letter draft
router.post('/:id/appeal-draft', protect, async (req, res) => {
  try {
    const pa = await PriorAuthorization.findOne({ _id: req.params.id, requestingProviderId: req.user.id });
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
    if (!['Denied', 'Appealing'].includes(pa.status)) {
      return res.status(400).json({ success: false, error: 'Appeal draft only available for denied requests' });
    }

    const { generateAppealLetter } = require('../services/azureAIService');
    const denialReason = pa.reviewerNotes || pa.denialReasonDescription || pa.aiReasoning || 'Not specified';
    const letter = await generateAppealLetter(pa, denialReason);

    res.json({ success: true, data: letter });
  } catch (err) {
    logger.error('PA appeal draft error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/prior-auth/:id/analyze - Trigger AI re-analysis
router.post('/:id/analyze', protect, async (req, res) => {
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
    logger.error('PA analyze error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
