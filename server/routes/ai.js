const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateClinicalInsight, generateReferralSummary, analyzeRiskFactors } = require('../services/azureAIService');
const logger = require('../utils/logger');

// POST /api/ai/clinical-insight — conversational AI assistant for providers
router.post('/clinical-insight', protect, async (req, res) => {
  try {
    const { question, context } = req.body;
    if (!question) return res.status(400).json({ success: false, error: 'question is required' });
    const result = await generateClinicalInsight(context || {}, question);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('clinical-insight error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/referral-summary — auto-generate referral clinical notes
router.post('/referral-summary', protect, async (req, res) => {
  try {
    const result = await generateReferralSummary(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('referral-summary error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/risk-analysis — explain a patient's risk score in plain English
router.post('/risk-analysis', protect, async (req, res) => {
  try {
    const result = await analyzeRiskFactors(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('risk-analysis error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
