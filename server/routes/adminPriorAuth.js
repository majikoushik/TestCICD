const express = require('express');
const router = express.Router();
const PriorAuthorization = require('../models/PriorAuthorization');
const { analyzePriorAuthorization } = require('../services/azureAIService');

// All routes in this file are already protected by the mount-point middleware in index.js

// GET /api/admin/prior-auth - Get all PAs with stats
router.get('/', async (req, res) => {
  try {
    const { status, page = 0, limit = 20, search = '' } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { serviceType: { $regex: search, $options: 'i' } },
        { requestingProviderName: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await PriorAuthorization.countDocuments(filter);
    const pas = await PriorAuthorization.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(page) * parseInt(limit))
      .limit(parseInt(limit));

    const stats = await PriorAuthorization.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statMap = { Pending: 0, 'Under Review': 0, Approved: 0, Denied: 0, Appealing: 0, Expired: 0 };
    stats.forEach(s => { statMap[s._id] = s.count; });

    res.json({ success: true, data: { priorAuths: pas, total, stats: statMap } });
  } catch (err) {
    console.error('Admin get PAs error:', err);
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
    const { decision, reviewerNotes } = req.body;
    if (!['Approved', 'Denied'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Decision must be Approved or Denied' });
    }

    const pa = await PriorAuthorization.findById(req.params.id);
    if (!pa) return res.status(404).json({ success: false, error: 'Not found' });

    pa.status = decision;
    pa.reviewerNotes = reviewerNotes || '';
    pa.reviewedBy = req.user.id;
    pa.reviewedAt = new Date();

    if (decision === 'Approved') {
      pa.approvedDate = new Date();
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);
      pa.expiryDate = expiry;
    } else {
      pa.deniedDate = new Date();
    }

    await pa.save();
    res.json({ success: true, data: pa });
  } catch (err) {
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
    if (pa.status !== 'Appealing') return res.status(400).json({ success: false, error: 'Not in appeal state' });

    pa.status = outcome;
    pa.appealOutcome = outcome;
    pa.appealReviewedAt = new Date();
    pa.reviewerNotes = reviewerNotes || pa.reviewerNotes;
    pa.reviewedBy = req.user.id;
    pa.reviewedAt = new Date();

    if (outcome === 'Approved') {
      pa.approvedDate = new Date();
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);
      pa.expiryDate = expiry;
    }

    await pa.save();
    res.json({ success: true, data: pa });
  } catch (err) {
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
    pa.aiAnalyzedAt = new Date();
    await pa.save();

    res.json({ success: true, data: { ...aiResult, pa } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
