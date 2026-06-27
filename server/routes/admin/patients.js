'use strict';

const express = require('express');
const router = express.Router();
const Patient = require('../../models/Patient');
const User = require('../../models/User');
const logger = require('../../utils/logger');

// GET /api/admin/patients
// Full patient list — admin/superadmin only, all access tiers bypassed.
// Supports: ?page=0&limit=20&search=&provider=&riskLevel=high|medium|low
router.get('/', async (req, res) => {
  try {
    const page     = parseInt(req.query.page)  || 0;
    const limit    = parseInt(req.query.limit) || 20;
    const search   = req.query.search   || '';
    const provider = req.query.provider || '';
    const riskLevel = req.query.riskLevel || '';

    const filter = {};

    if (search) {
      const rx = new RegExp(search, 'i');
      filter.$or = [
        { name: rx },
        { patientId: rx },
        { 'contactInfo.email': rx },
        { 'contactInfo.phone': rx },
      ];
    }

    if (provider) filter.primaryProvider = provider;

    if (riskLevel === 'high')   filter.riskScore = { $gte: 70 };
    else if (riskLevel === 'medium') filter.riskScore = { $gte: 30, $lt: 70 };
    else if (riskLevel === 'low')    filter.riskScore = { $lt: 30 };

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .skip(page * limit)
        .limit(limit)
        .lean(),
      Patient.countDocuments(filter),
    ]);

    // Enrich with provider names (primaryProvider is a string ID)
    const providerIds = [...new Set(patients.map(p => p.primaryProvider).filter(Boolean))];
    const providerDocs = await User.find({ _id: { $in: providerIds } })
      .select('_id name organization specialty')
      .lean();
    const providerMap = {};
    providerDocs.forEach(u => { providerMap[u._id] = u; });

    const enriched = patients.map(p => ({
      ...p,
      primaryProviderInfo: providerMap[p.primaryProvider] || null,
    }));

    logger.info('Admin patient list accessed', {
      userId: req.user._id,
      role: req.user.role,
      total,
      filters: { search, provider, riskLevel },
    });

    return res.status(200).json({
      success: true,
      data: { patients: enriched, total, page, limit },
    });
  } catch (err) {
    logger.error('Admin get patients error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/patients/:id
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      $or: [{ patientId: req.params.id }, { _id: req.params.id }],
    }).lean();

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const provider = patient.primaryProvider
      ? await User.findById(patient.primaryProvider).select('name organization specialty email').lean()
      : null;

    logger.info('Admin patient detail accessed', {
      userId: req.user._id,
      patientId: patient.patientId,
    });

    return res.status(200).json({
      success: true,
      data: { ...patient, primaryProviderInfo: provider },
    });
  } catch (err) {
    logger.error('Admin get patient error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
