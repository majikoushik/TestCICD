const express = require('express');
const router = express.Router();
const referralMatchingService = require('../services/referralMatchingService');
const ProviderMatchProfile = require('../models/ProviderMatchProfile');
const MatchSession = require('../models/MatchSession');

// POST /match
router.post('/match', async (req, res) => {
  try {
    const { specialty, patientInsurance, patientCity, patientState, urgency, excludeProviderIds, limit } = req.body;

    if (!specialty) {
      return res.status(400).json({ success: false, message: 'specialty is required' });
    }

    const criteria = { specialty, patientInsurance, patientCity, patientState, urgency, excludeProviderIds };
    const options = {
      limit: limit || 10,
      requestedBy: req.user._id,
      requestedByName: req.user.name || req.user.email,
    };

    const result = await referralMatchingService.findMatches(criteria, options);
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Matching failed' });
    }

    return res.status(200).json({
      success: true,
      data: {
        matches: result.matches,
        criteria: result.criteria,
        total: result.total,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /providers  — must come before /providers/:id
router.get('/providers', async (req, res) => {
  try {
    const { specialty, city, state, isAcceptingReferrals } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const filter = {};
    if (specialty) filter.specialty = specialty;
    if (city) filter.city = city;
    if (state) filter.state = state;
    if (isAcceptingReferrals !== undefined) {
      if (isAcceptingReferrals === 'true') {
        filter.isAcceptingReferrals = { $ne: false };
      } else {
        filter.isAcceptingReferrals = false;
      }
    }

    const skip = (page - 1) * limit;
    const [providers, total] = await Promise.all([
      ProviderMatchProfile.find(filter).skip(skip).limit(limit),
      ProviderMatchProfile.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { providers, total, page, limit },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await referralMatchingService.getMatchingStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /sessions
router.get('/sessions', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const filter = { requestedBy: req.user._id };

    const [sessions, total] = await Promise.all([
      MatchSession.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      MatchSession.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { sessions, total },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /sessions/:sessionId/select  — specific route before /:id
router.post('/sessions/:sessionId/select', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { selectedProviderId, selectedProviderName, selectedMatchScore, linkedReferralId } = req.body;

    await referralMatchingService.recordSelection(sessionId, {
      selectedProviderId,
      selectedProviderName,
      selectedMatchScore,
      linkedReferralId,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /providers/:id
router.get('/providers/:id', async (req, res) => {
  try {
    const profile = await ProviderMatchProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /providers/:id  (admin only)
router.put('/providers/:id', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Forbidden: admin access required' });
    }

    const updatedProfile = await ProviderMatchProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    return res.status(200).json({ success: true, data: updatedProfile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
