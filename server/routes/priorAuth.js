const express = require('express');
const router = express.Router();
const PriorAuthorization = require('../models/PriorAuthorization');
const { protect } = require('../middleware/auth');
const { analyzePriorAuthorization } = require('../services/azureAIService');
const logger = require('../utils/logger');

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
    logger.error('Get prior auths error', logger.reqCtx(req, err));
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
      urgency, insurancePlan, memberId
    } = req.body;

    if (!patientId || !patientName || !serviceType || !clinicalNotes) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
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
      status: 'Pending'
    });

    await pa.save();

    // Run AI analysis async (don't block response)
    analyzePriorAuthorization(pa).then(async (aiResult) => {
      pa.aiRecommendation = aiResult.recommendation;
      pa.aiConfidenceScore = aiResult.confidenceScore;
      pa.aiReasoning = aiResult.reasoning + (aiResult.suggestedAction ? ' ' + aiResult.suggestedAction : '');
      pa.aiAnalyzedAt = new Date();
      pa.status = 'Under Review';
      await pa.save();
    }).catch(err => logger.error('AI analysis error', logger.reqCtx(req, err)));

    res.status(201).json({ success: true, data: pa });
  } catch (err) {
    logger.error('Create prior auth error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/prior-auth/:id/appeal - Submit appeal
router.post('/:id/appeal', protect, async (req, res) => {
  try {
    const pa = await PriorAuthorization.findOne({ _id: req.params.id, requestingProviderId: req.user.id });
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
    if (pa.status !== 'Denied') return res.status(400).json({ success: false, error: 'Can only appeal denied requests' });

    pa.status = 'Appealing';
    pa.appealNotes = req.body.appealNotes || '';
    pa.appealSubmittedAt = new Date();
    await pa.save();

    res.json({ success: true, data: pa });
  } catch (err) {
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
    pa.aiReasoning = aiResult.reasoning + (aiResult.suggestedAction ? ' ' + aiResult.suggestedAction : '');
    pa.aiAnalyzedAt = new Date();
    await pa.save();

    res.json({ success: true, data: { ...aiResult, pa } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
