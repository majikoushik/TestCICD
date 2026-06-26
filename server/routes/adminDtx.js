const express = require('express');
const router = express.Router();
const DtxProgram = require('../models/DtxProgram');
const DtxPrescription = require('../models/DtxPrescription');
const { protect, authorize } = require('../middleware/auth');

// GET /admin/dtx/stats
router.get('/stats', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const totalPrograms = await DtxProgram.countDocuments({ isActive: true });
    const totalPrescriptions = await DtxPrescription.countDocuments();
    const completed = await DtxPrescription.countDocuments({ status: 'completed' });
    const active = await DtxPrescription.countDocuments({ status: { $in: ['active', 'enrolled'] } });
    const dropped = await DtxPrescription.countDocuments({ status: 'dropped' });
    const completionRate = totalPrescriptions > 0 ? Math.round((completed / totalPrescriptions) * 100) : 0;

    const byCategory = await DtxPrescription.aggregate([
      { $group: { _id: '$programCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byStatus = await DtxPrescription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const topPrograms = await DtxPrescription.aggregate([
      { $group: { _id: '$programId', programName: { $first: '$programName' }, count: { $sum: 1 }, avgEngagement: { $avg: '$engagementScore' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const tokensAwarded = await DtxPrescription.aggregate([
      { $match: { tokenRewardIssued: true } },
      { $group: { _id: null, total: { $sum: '$tokenRewardAmount' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalPrograms,
        totalPrescriptions,
        completed,
        active,
        dropped,
        completionRate,
        byCategory,
        byStatus,
        topPrograms,
        tokensAwarded: tokensAwarded[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /admin/dtx/programs
router.get('/programs', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { category, isActive, search } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ name: q }, { vendor: q }];
    }
    const programs = await DtxProgram.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, data: { programs, total: programs.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /admin/dtx/programs
router.post('/programs', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const program = await DtxProgram.create(req.body);
    res.status(201).json({ success: true, data: program });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /admin/dtx/programs/:id
router.put('/programs/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const program = await DtxProgram.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!program) return res.status(404).json({ success: false, error: 'Program not found' });
    res.json({ success: true, data: program });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /admin/dtx/programs/:id — soft deactivate
router.delete('/programs/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const program = await DtxProgram.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!program) return res.status(404).json({ success: false, error: 'Program not found' });
    res.json({ success: true, data: program });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /admin/dtx/prescriptions — all prescriptions
router.get('/prescriptions', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.programCategory = category;
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

module.exports = router;
