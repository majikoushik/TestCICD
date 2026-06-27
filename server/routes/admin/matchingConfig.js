'use strict';

const express = require('express');
const router = express.Router();
const MatchingConfig = require('../../models/MatchingConfig');
const { invalidateConfigCache } = require('../../services/referralMatchingService');
const logger = require('../../utils/logger');

// GET /api/admin/matching-config
router.get('/', async (req, res) => {
  try {
    const config = await MatchingConfig.getSingleton();
    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    logger.error('Get matching config error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/matching-config
router.put('/', async (req, res) => {
  try {
    const allowed = ['bypassSpecialtyFilter', 'partialMatchEnabled', 'partialMatchScore', 'minScoreThreshold', 'scoreWeights', 'synonymGroups'];
    const update = { updatedBy: req.user._id };
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const config = await MatchingConfig.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    invalidateConfigCache();
    logger.info('Matching config updated', { updatedBy: req.user._id, fields: Object.keys(update) });
    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    logger.error('Update matching config error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/matching-config/reset  — restore factory defaults
router.post('/reset', async (req, res) => {
  try {
    const config = await MatchingConfig.findOneAndUpdate(
      {},
      {
        $set: {
          bypassSpecialtyFilter: false,
          partialMatchEnabled:   true,
          partialMatchScore:     12,
          minScoreThreshold:     0,
          scoreWeights:          { specialty: 30, insurance: 25, acceptanceRate: 20, availability: 15, tokenStanding: 10 },
          synonymGroups:         MatchingConfig.DEFAULT_SYNONYM_GROUPS,
          updatedBy:             req.user._id,
        },
      },
      { new: true, upsert: true }
    );

    invalidateConfigCache();
    logger.info('Matching config reset to defaults', { updatedBy: req.user._id });
    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    logger.error('Reset matching config error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
