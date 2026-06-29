'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital', 'lab', 'provider', 'nurse'];

// ── GET /api/providers ─────────────────────────────────────────────────────────
// Public-ish: list providers for referral creation dropdowns
router.get('/', protect, async (req, res) => {
  try {
    const { specialty, search } = req.query;
    const filter = { role: { $in: PROVIDER_ROLES } };
    if (specialty) filter.specialty = new RegExp(specialty, 'i');
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { specialty: new RegExp(search, 'i') },
        { organization: new RegExp(search, 'i') },
      ];
    }
    const providers = await User.find(filter)
      .select('_id name firstName lastName specialty organization role email credential phone kycVerified')
      .limit(200)
      .lean();
    return res.status(200).json({ success: true, data: providers });
  } catch (err) {
    logger.error('GET /providers error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/providers/profile ─────────────────────────────────────────────────
// Current provider's extended profile (ProviderProfile document)
router.get('/profile', protect, async (req, res) => {
  try {
    const profile = await ProviderProfile.findOne({ userId: req.user._id.toString() });
    if (!profile) {
      // Return a minimal shell if no profile exists yet
      return res.json({ success: true, data: { userId: req.user._id, npi: '', specialty: req.user.specialty || '', acceptingNewPatients: true, languagesSpoken: ['English'], insuranceAccepted: [], boardCertifications: [], hospitalAffiliations: [], conditionsTreated: [] } });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    logger.error('GET /providers/profile error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── PUT /api/providers/profile ─────────────────────────────────────────────────
// Update current provider's practice details
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = [
      'specialty', 'specialties', 'credential', 'phone', 'fax', 'address',
      'acceptingNewPatients', 'telehealthAvailable', 'ageGroupsTreated',
      'languagesSpoken', 'insuranceAccepted', 'boardCertifications',
      'hospitalAffiliations', 'conditionsTreated', 'consultationHours',
    ];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const profile = await ProviderProfile.findOneAndUpdate(
      { userId: req.user._id.toString() },
      { $set: updates },
      { new: true, upsert: true, runValidators: false }
    );

    // Mirror specialty/phone/fax back to User for consistency
    const userMirror = {};
    if (updates.specialty) userMirror.specialty = updates.specialty;
    if (updates.phone) userMirror.phone = updates.phone;
    if (updates.fax) userMirror.fax = updates.fax;
    if (Object.keys(userMirror).length) {
      await User.findByIdAndUpdate(req.user._id, { $set: userMirror });
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    logger.error('PUT /providers/profile error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/providers/:providerId ────────────────────────────────────────────
// Public provider card for referral preview
router.get('/:providerId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.providerId)
      .select('_id name firstName lastName specialty organization role email credential phone kycVerified profileImage');
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const profile = await ProviderProfile.findOne({ userId: req.params.providerId })
      .select('npi acceptingNewPatients telehealthAvailable languagesSpoken insuranceAccepted boardCertifications hospitalAffiliations conditionsTreated ageGroupsTreated specialty specialties');

    res.json({ success: true, data: { ...user.toObject(), providerProfile: profile } });
  } catch (err) {
    logger.error('GET /providers/:providerId error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
