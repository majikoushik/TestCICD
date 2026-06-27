'use strict';

const express = require('express');
const router  = express.Router();
const { runAnalyticsJob, getLatestSnapshot } = require('../../services/analyticsCalculationService');
const logger  = require('../../utils/logger');

// POST /api/admin/analytics/run-job
// Manually trigger the full analytics calculation job.
// Updates all patient risk scores + saves a global AnalyticsSnapshot.
router.post('/run-job', async (req, res) => {
  const triggeredBy = req.user._id || req.user.id || 'admin';
  logger.info('[Analytics] Manual job triggered', { triggeredBy, ip: req.ip });

  try {
    const result = await runAnalyticsJob(triggeredBy);

    return res.status(200).json({
      success: true,
      message: 'Analytics job completed successfully',
      data: {
        snapshotId:      result.snapshot.snapshotId,
        patientsUpdated: result.patientsUpdated,
        computedAt:      result.snapshot.computedAt,
        durationMs:      result.snapshot.durationMs,
        metrics: {
          riskDistribution:       result.snapshot.metrics.riskDistribution,
          patientEngagement:      result.snapshot.metrics.patientEngagement,
          treatmentAdherence:     result.snapshot.metrics.treatmentAdherence,
          missedAppointments:     result.snapshot.metrics.missedAppointments,
          referralAcceptanceRate: result.snapshot.metrics.referralAcceptanceRate,
        },
      },
    });
  } catch (err) {
    logger.error('[Analytics] Manual job error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/analytics/run-job
// Return the most-recent global snapshot + its metadata.
router.get('/run-job', async (req, res) => {
  try {
    const snapshot = await getLatestSnapshot('global');

    if (!snapshot) {
      return res.status(200).json({
        success: true,
        data:    null,
        message: 'No analytics job has been run yet. Click "Run Analytics Job" to compute.',
      });
    }

    return res.status(200).json({ success: true, data: snapshot });
  } catch (err) {
    logger.error('[Analytics] Get last job error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
