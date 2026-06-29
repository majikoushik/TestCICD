const express = require('express');
const router = express.Router();
const PriorAuthorization = require('../models/PriorAuthorization');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { analyzePriorAuthorization, isEligibleForAutoApproval } = require('../services/azureAIService');
const { triggerAutomaticNotification, sendPatientNotification, saveNotificationLog } = require('../services/patientEngagementService');
const User = require('../models/User');
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

// GET /api/prior-auth/:id/history - Audit trail for a PA (provider view)
router.get('/:id/history', protect, async (req, res) => {
  try {
    // Verify the requesting provider owns this PA
    const pa = await PriorAuthorization.findOne({
      _id: req.params.id,
      requestingProviderId: req.user.id,
    });
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });

    const history = await AuditLog.find({
      resourceType: 'PriorAuthorization',
      resourceId: String(req.params.id),
    }).sort({ timestamp: 1 });

    res.json({ success: true, data: history });
  } catch (err) {
    logger.error('PA history error', { error: err.message });
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

    // Fast-track: optional token-gated priority processing (–10 tokens, skips queue)
    const requestFastTrack = req.body.fastTrack === true || req.body.fastTrack === 'true';
    let fastTrackCost = 0;
    if (requestFastTrack) {
      const ConversionRule = require('../models/ConversionRule');
      const ftRule = await ConversionRule.findOne({ serviceId: 'pa-fast-track', isActive: true }).lean().catch(() => null);
      fastTrackCost = ftRule ? ftRule.tokenCost : 10;
      const provider = await User.findById(req.user.id).select('tokenBalance').lean();
      if (!provider || provider.tokenBalance < fastTrackCost) {
        return res.status(400).json({ success: false, error: `Insufficient tokens for PA fast-track. Required: ${fastTrackCost}` });
      }
      // Deduct tokens immediately (before save so we don't leak on error)
      await User.findByIdAndUpdate(req.user.id, { $inc: { tokenBalance: -fastTrackCost } });
      // Record spend transaction (fire-and-forget)
      ;(async () => {
        try {
          const { Token } = require('../models/Token');
          const { processTokenTransaction } = require('../blockchain/contracts');
          const blockchainTx = await processTokenTransaction(String(req.user.id), 'system', fastTrackCost, 'PA fast-track', { serviceId: 'pa-fast-track' }).catch(() => ({ transactionId: null }));
          const updatedUser = await User.findById(req.user.id).select('tokenBalance').lean();
          let token = await Token.findOne();
          if (!token) token = new Token({ contractAddress: `0x${require('crypto').randomBytes(20).toString('hex')}` });
          token.transactions.push({ user: req.user.id, type: 'spend', amount: -fastTrackCost, reason: 'PA fast-track priority processing', relatedEntity: { entityType: 'service', entityId: null }, blockchainTransactionId: blockchainTx.transactionId, status: 'completed', balanceAfter: (updatedUser || {}).tokenBalance || 0, metadata: { serviceId: 'pa-fast-track' } });
          await token.save();
        } catch (_) {}
      })();
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
      fastTrack: requestFastTrack,
      fastTrackTokenCost: fastTrackCost,
    });

    await pa.save();
    await auditPA('PA_SUBMITTED', pa, req);

    // Notify patient that PA is under review (fire-and-forget)
    ;(async () => {
      try {
        const patientUser = await User.findById(patientId).select('email phone').lean();
        if (patientUser?.email || patientUser?.phone) {
          const patient = { name: patientName, email: patientUser.email || '', phone: patientUser.phone || '' };
          const relatedData = { serviceName: serviceType, authNumber: String(pa._id).slice(-8).toUpperCase() };
          const notif = await triggerAutomaticNotification('prior_auth_under_review', relatedData, patient);
          const result = await sendPatientNotification(notif);
          await saveNotificationLog({ paId: pa._id, patientId, patientName, patientEmail: patientUser.email, patientPhone: patientUser.phone, notifObj: notif, sendResult: result });
        }
      } catch (_) {}
    })();

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
          // Notify patient of auto-approval (fire-and-forget)
          ;(async () => {
            try {
              const pu = await User.findById(doc.patientId).select('email phone').lean();
              if (pu?.email || pu?.phone) {
                const pt = { name: doc.patientName, email: pu.email || '', phone: pu.phone || '' };
                const rd = { serviceName: doc.serviceType, authNumber: String(doc._id).slice(-8).toUpperCase() };
                const notif = await triggerAutomaticNotification('prior_auth_approved', rd, pt);
                const result = await sendPatientNotification(notif);
                await saveNotificationLog({ paId: doc._id, patientId: doc.patientId, patientName: doc.patientName, patientEmail: pu.email, patientPhone: pu.phone, notifObj: notif, sendResult: result });
              }
            } catch (_) {}
          })();
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

// POST /api/prior-auth/:id/renew - Create a renewal PA from an Expired one
router.post('/:id/renew', protect, async (req, res) => {
  try {
    const original = await PriorAuthorization.findOne({
      _id: req.params.id,
      requestingProviderId: req.user.id,
    });
    if (!original) return res.status(404).json({ success: false, error: 'Not found' });
    if (original.status !== 'Expired') {
      return res.status(400).json({ success: false, error: 'Only Expired PAs can be renewed' });
    }

    const renewal = new PriorAuthorization({
      referralId: original.referralId,
      patientId: original.patientId,
      patientName: original.patientName,
      requestingProviderId: original.requestingProviderId,
      requestingProviderName: original.requestingProviderName,
      targetProviderName: original.targetProviderName,
      serviceType: original.serviceType,
      serviceCode: original.serviceCode,
      diagnosisCodes: original.diagnosisCodes,
      clinicalNotes: req.body.clinicalNotes || original.clinicalNotes,
      urgency: req.body.urgency || original.urgency,
      insurancePlan: original.insurancePlan,
      memberId: original.memberId,
      renewedFromId: String(original._id),
      status: 'Pending',
    });

    await renewal.save();
    await auditPA('PA_SUBMITTED', renewal, req);

    // Async AI analysis — same pattern as create
    const renewalId = renewal._id;
    analyzePriorAuthorization(renewal)
      .then(async (aiResult) => {
        const doc = await PriorAuthorization.findById(renewalId);
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
          await AuditLog.create({ action: 'PA_AUTO_APPROVED', resourceType: 'PriorAuthorization', resourceId: String(doc._id), patientId: doc.patientId, userId: null, userRole: 'system', endpoint: '/internal/ai-analysis', method: 'POST' });
        } else {
          doc.status = 'Under Review';
          await doc.save();
          await AuditLog.create({ action: 'PA_AI_ANALYZED', resourceType: 'PriorAuthorization', resourceId: String(doc._id), patientId: doc.patientId, userId: null, userRole: 'system', endpoint: '/internal/ai-analysis', method: 'POST' });
        }
      })
      .catch(err => logger.error('Renewal AI analysis error', { error: err.message, renewalId }));

    res.status(201).json({ success: true, data: renewal });
  } catch (err) {
    logger.error('PA renew error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/prior-auth/:id/notes - Provider adds a clinical note
router.post('/:id/notes', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    const pa = await PriorAuthorization.findOne({
      _id: req.params.id,
      requestingProviderId: req.user.id,
    });
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });

    pa.notes.push({
      authorId:    req.user.id,
      authorEmail: req.user.email || '',
      authorRole:  req.user.role || 'provider',
      message:     message.trim(),
      createdAt:   new Date(),
    });
    await pa.save();
    res.json({ success: true, data: pa.notes });
  } catch (err) {
    logger.error('PA note add error', { error: err.message });
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
