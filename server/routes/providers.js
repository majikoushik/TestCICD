'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital', 'lab', 'provider'];

// GET /api/providers
// Returns a list of registered providers for use in referral creation dropdowns.
// Supports optional ?specialty=&search= query params.
router.get('/', protect, async (req, res) => {
  try {
    const { specialty, search } = req.query;

    const filter = { role: { $in: PROVIDER_ROLES } };

    if (specialty) {
      filter.specialty = new RegExp(specialty, 'i');
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { specialty: new RegExp(search, 'i') },
        { organization: new RegExp(search, 'i') },
      ];
    }

    const providers = await User.find(filter)
      .select('_id name firstName lastName specialty organization role email')
      .limit(200)
      .lean();

    return res.status(200).json({ success: true, data: providers });
  } catch (error) {
    logger.error('Get providers error', logger.reqCtx(req, error));
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
