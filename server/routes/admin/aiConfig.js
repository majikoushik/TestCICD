const express = require('express');
const router = express.Router();
const AIConfig = require('../../models/AIConfig');

const DEFAULT_CONFIGS = [
  // Prior Auth
  { key: 'priorAuth.autoApproveThreshold', category: 'priorAuth', value: 0.95, label: 'Auto-Approve Threshold', description: 'Confidence score above which PA requests are auto-approved', dataType: 'number', minValue: 0.7, maxValue: 1.0 },
  { key: 'priorAuth.minConfidence', category: 'priorAuth', value: 0.80, label: 'Minimum Confidence', description: 'Minimum AI confidence required to use recommendation', dataType: 'number', minValue: 0.5, maxValue: 1.0 },
  { key: 'priorAuth.requireReviewBelow', category: 'priorAuth', value: 0.65, label: 'Manual Review Threshold', description: 'PA requests with confidence below this go to manual review', dataType: 'number', minValue: 0.3, maxValue: 0.9 },
  // Risk Score
  { key: 'riskScore.highRiskThreshold', category: 'riskScore', value: 75, label: 'High Risk Threshold', description: 'Score above which patient is flagged as high risk', dataType: 'number', minValue: 50, maxValue: 95 },
  { key: 'riskScore.criticalRiskThreshold', category: 'riskScore', value: 90, label: 'Critical Risk Threshold', description: 'Score above which patient is flagged as critical risk', dataType: 'number', minValue: 70, maxValue: 100 },
  { key: 'riskScore.alertOnIncrease', category: 'riskScore', value: 15, label: 'Alert on Score Increase', description: 'Generate alert when risk score increases by this many points', dataType: 'number', minValue: 5, maxValue: 30 },
  // Referral Matching
  { key: 'referralMatching.minConfidence', category: 'referralMatching', value: 0.75, label: 'Min Match Confidence', description: 'Minimum match score to include in results', dataType: 'number', minValue: 0.5, maxValue: 1.0 },
  { key: 'referralMatching.maxCandidates', category: 'referralMatching', value: 10, label: 'Max Candidates', description: 'Maximum number of provider matches to return', dataType: 'number', minValue: 3, maxValue: 25 },
  { key: 'referralMatching.outcomeWeight', category: 'referralMatching', value: 0.15, label: 'Outcome Score Weight', description: 'Weight of historical outcome data in match scoring', dataType: 'number', minValue: 0, maxValue: 0.5 },
  // Escalation
  { key: 'escalation.flagThreshold', category: 'escalation', value: 0.70, label: 'Escalation Flag Threshold', description: 'AI confidence threshold to trigger escalation workflow', dataType: 'number', minValue: 0.5, maxValue: 0.95 },
  // Ambient
  { key: 'ambient.enabled', category: 'ambient', value: true, label: 'Ambient Intelligence Enabled', description: 'Enable AI ambient session processing', dataType: 'boolean' },
  { key: 'ambient.autoGenerateNotes', category: 'ambient', value: true, label: 'Auto-Generate Clinical Notes', description: 'Automatically generate SOAP notes from ambient sessions', dataType: 'boolean' },
];

// GET /api/admin/ai-config — get all configs, seed defaults if missing
router.get('/', async (req, res) => {
  try {
    // Ensure defaults exist
    for (const def of DEFAULT_CONFIGS) {
      await AIConfig.findOneAndUpdate({ key: def.key }, { $setOnInsert: def }, { upsert: true });
    }
    const configs = await AIConfig.find().sort({ category: 1, key: 1 });
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/ai-config/category/:category
router.get('/category/:category', async (req, res) => {
  try {
    const configs = await AIConfig.find({ category: req.params.category });
    const result = {};
    configs.forEach(c => { result[c.key] = c.value; });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/ai-config/:key — update a single config value
router.put('/:key(*)', async (req, res) => {
  try {
    const { value } = req.body;
    const config = await AIConfig.findOneAndUpdate(
      { key: req.params.key },
      { value, updatedBy: req.user.id },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/admin/ai-config/bulk — update multiple configs at once
router.post('/bulk', async (req, res) => {
  try {
    const { configs } = req.body; // array of { key, value }
    const results = await Promise.all(
      configs.map(({ key, value }) =>
        AIConfig.findOneAndUpdate({ key }, { value, updatedBy: req.user.id }, { new: true, upsert: true })
      )
    );
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/admin/ai-config/reset — reset all to defaults
router.post('/reset', async (req, res) => {
  try {
    await AIConfig.deleteMany({});
    const results = await AIConfig.insertMany(DEFAULT_CONFIGS.map(d => ({ ...d, updatedBy: req.user.id })));
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
