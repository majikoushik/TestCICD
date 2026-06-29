const express = require('express');
const router = express.Router();
const ReferralOutcome = require('../models/ReferralOutcome');
const { protect } = require('../middleware/auth');

// POST /api/referral-outcomes — create or update outcome for a referral
router.post('/', protect, async (req, res) => {
  try {
    const { referralId, accepted, rejectionReason, appointmentScheduled, appointmentDate, outcomeRating, patientSatisfaction, referringProviderFeedback, readmissionWithin30Days } = req.body;

    let outcome = await ReferralOutcome.findOne({ referralId });
    if (!outcome) {
      outcome = new ReferralOutcome({ referralId, providerId: req.user.id });
    }

    if (accepted !== undefined) { outcome.accepted = accepted; if (accepted) outcome.acceptedAt = new Date(); else outcome.rejectionReason = rejectionReason; }
    if (appointmentScheduled !== undefined) { outcome.appointmentScheduled = appointmentScheduled; if (appointmentDate) outcome.appointmentDate = new Date(appointmentDate); }
    if (outcomeRating !== undefined) outcome.outcomeRating = outcomeRating;
    if (patientSatisfaction !== undefined) outcome.patientSatisfaction = patientSatisfaction;
    if (referringProviderFeedback !== undefined) outcome.referringProviderFeedback = referringProviderFeedback;
    if (readmissionWithin30Days !== undefined) outcome.readmissionWithin30Days = readmissionWithin30Days;

    // Compute time to appointment if both dates available
    if (outcome.acceptedAt && outcome.appointmentDate) {
      outcome.timeToAppointmentDays = Math.round((outcome.appointmentDate - outcome.acceptedAt) / 86400000);
    }

    outcome.computeOutcomeScore();
    await outcome.save();

    res.json({ success: true, data: outcome });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/referral-outcomes/:referralId
router.get('/:referralId', protect, async (req, res) => {
  try {
    const outcome = await ReferralOutcome.findOne({ referralId: req.params.referralId });
    if (!outcome) return res.status(404).json({ success: false, error: 'Outcome not found' });
    res.json({ success: true, data: outcome });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/referral-outcomes/:referralId — update appointment attended status etc.
router.patch('/:referralId', protect, async (req, res) => {
  try {
    const outcome = await ReferralOutcome.findOne({ referralId: req.params.referralId });
    if (!outcome) return res.status(404).json({ success: false, error: 'Outcome not found' });

    Object.assign(outcome, req.body);
    outcome.computeOutcomeScore();
    await outcome.save();

    res.json({ success: true, data: outcome });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
