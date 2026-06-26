const express = require('express');
const router = express.Router();
const DtxProgram = require('../models/DtxProgram');
const DtxPrescription = require('../models/DtxPrescription');
const User = require('../models/User');
const Referral = require('../models/Referral');
const { protect } = require('../middleware/auth');
const { processTokenTransaction } = require('../blockchain/contracts');

const DTX_TOKEN_REWARD = 10;

// GET /dtx/programs — browse active catalog
router.get('/programs', protect, async (req, res) => {
  try {
    const { category, evidenceLevel, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (category && category !== 'all') filter.category = category;
    if (evidenceLevel && evidenceLevel !== 'all') filter.evidenceLevel = evidenceLevel;
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ name: q }, { vendor: q }, { description: q }, { conditions: q }];
    }
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const total = await DtxProgram.countDocuments(filter);
    const programs = await DtxProgram.find(filter)
      .sort({ prescriptionCount: -1, name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({ success: true, data: { programs, total, page: pageNum, limit: limitNum } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /dtx/programs/:id — program detail
router.get('/programs/:id', protect, async (req, res) => {
  try {
    const program = await DtxProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ success: false, error: 'Program not found' });
    res.json({ success: true, data: program });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /dtx/prescriptions — prescribe a program
router.post('/prescriptions', protect, async (req, res) => {
  try {
    const {
      programId, patientName, patientId, patientEmail, patientPhone,
      clinicalNotes, linkedReferralId,
    } = req.body;
    if (!programId || !patientName) {
      return res.status(400).json({ success: false, error: 'programId and patientName are required' });
    }
    const program = await DtxProgram.findById(programId);
    if (!program || !program.isActive) {
      return res.status(404).json({ success: false, error: 'Program not found or inactive' });
    }
    const provider = await User.findById(req.user.id).select('name');
    const prescription = await DtxPrescription.create({
      programId,
      programName: program.name,
      programVendor: program.vendor,
      programCategory: program.category,
      providerId: req.user.id,
      providerName: provider?.name || 'Unknown Provider',
      patientName,
      patientId,
      patientEmail,
      patientPhone,
      clinicalNotes,
      linkedReferralId: linkedReferralId || undefined,
      statusHistory: [{ status: 'prescribed', notes: 'Initial prescription' }],
    });
    await DtxProgram.findByIdAndUpdate(programId, { $inc: { prescriptionCount: 1 } });
    res.status(201).json({ success: true, data: prescription });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /dtx/prescriptions — provider's own prescriptions
router.get('/prescriptions', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { providerId: req.user.id };
    if (status && status !== 'all') filter.status = status;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const total = await DtxPrescription.countDocuments(filter);
    const prescriptions = await DtxPrescription.find(filter)
      .sort({ prescribedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({ success: true, data: { prescriptions, total, page: pageNum, limit: limitNum } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /dtx/prescriptions/:id/status — update status + capture outcome
router.put('/prescriptions/:id/status', protect, async (req, res) => {
  try {
    const { status, engagementScore, outcomeNotes, notes } = req.body;
    const prescription = await DtxPrescription.findOne({ _id: req.params.id, providerId: req.user.id });
    if (!prescription) return res.status(404).json({ success: false, error: 'Prescription not found' });

    const update = { status };
    if (engagementScore != null) update.engagementScore = engagementScore;
    if (outcomeNotes) update.outcomeNotes = outcomeNotes;

    const now = new Date();
    if (status === 'enrolled') update.enrolledAt = now;
    if (status === 'active') update.enrolledAt = prescription.enrolledAt || now;
    if (status === 'completed') update.completedAt = now;
    if (status === 'dropped') update.droppedAt = now;

    update.$push = { statusHistory: { status, changedAt: now, notes: notes || '' } };

    if (status === 'completed' && !prescription.tokenRewardIssued) {
      const program = await DtxProgram.findById(prescription.programId);
      const reward = program?.tokenReward || DTX_TOKEN_REWARD;
      update.tokenRewardIssued = true;
      update.tokenRewardAmount = reward;
      try {
        await processTokenTransaction('system', prescription.providerId, reward, 'DTx prescription completed', {
          prescriptionId: prescription._id,
          programName: prescription.programName,
        });
        await User.findByIdAndUpdate(prescription.providerId, { $inc: { tokenBalance: reward } });
      } catch (tokenErr) {
        console.error('DTx token reward failed:', tokenErr.message);
      }
    }

    const updated = await DtxPrescription.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
