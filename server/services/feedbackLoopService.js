const AIReport = require('../models/AIManagement');
const AIConfig = require('../models/AIConfig');
const PredictiveAlert = require('../models/PredictiveAlert');
const logger = require('../utils/logger');

// Compute accuracy metrics from alert feedback (was the alert actionable/correct?)
async function computeAlertAccuracy(lookbackDays = 30) {
  const since = new Date(Date.now() - lookbackDays * 86400000);
  const alerts = await PredictiveAlert.find({
    wasActionTaken: { $ne: null },
    createdAt: { $gte: since },
  }).select('type severity wasActionTaken status');

  const byType = {};
  alerts.forEach(a => {
    if (!byType[a.type]) byType[a.type] = { total: 0, actionTaken: 0 };
    byType[a.type].total++;
    if (a.wasActionTaken) byType[a.type].actionTaken++;
  });

  const metrics = Object.entries(byType).map(([type, { total, actionTaken }]) => ({
    type,
    total,
    actionTaken,
    actionRate: total > 0 ? (actionTaken / total) : null,
  }));

  return { period: `last ${lookbackDays} days`, total: alerts.length, byType: metrics };
}

// Compute PA recommendation accuracy from AIReport feedback
async function computePAAccuracy(lookbackDays = 30) {
  const since = new Date(Date.now() - lookbackDays * 86400000);
  const reports = await AIReport.find({
    'feedback.0': { $exists: true },
    createdAt: { $gte: since },
  }).select('feedback confidenceScore');

  let falsePositives = 0, falseNegatives = 0, correct = 0;
  reports.forEach(r => {
    r.feedback.forEach(f => {
      if (f.type === 'false_positive') falsePositives++;
      else if (f.type === 'false_negative') falseNegatives++;
      else correct++;
    });
  });

  const total = falsePositives + falseNegatives + correct;
  return {
    total,
    falsePositives,
    falseNegatives,
    correct,
    accuracy: total > 0 ? correct / total : null,
  };
}

// Save accuracy snapshot to AIConfig for dashboard display
async function runFeedbackLoop() {
  try {
    const [alertAccuracy, paAccuracy] = await Promise.all([
      computeAlertAccuracy(30),
      computePAAccuracy(30),
    ]);

    await AIConfig.set('metrics.alertAccuracy', alertAccuracy, null);
    await AIConfig.set('metrics.paAccuracy', paAccuracy, null);
    await AIConfig.set('metrics.lastComputedAt', new Date().toISOString(), null);

    logger.info('Feedback loop completed', { alertAccuracy: alertAccuracy.total, paAccuracy: paAccuracy.total });
    return { alertAccuracy, paAccuracy };
  } catch (err) {
    logger.error('Feedback loop error', { error: err.message });
    return null;
  }
}

module.exports = { computeAlertAccuracy, computePAAccuracy, runFeedbackLoop };
