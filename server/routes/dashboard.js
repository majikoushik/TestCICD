const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// Apply authentication middleware to all dashboard routes
router.use(protect);

// Dashboard routes
router.get('/', dashboardController.getDashboardData);
router.get('/patient-statistics', dashboardController.getPatientStatistics);
router.get('/referral-statistics', dashboardController.getReferralStatistics);
router.get('/activities', dashboardController.getRecentActivities);
router.get('/analytics', dashboardController.getRecentAnalytics);
router.get('/provider-performance', dashboardController.getProviderPerformance);
router.get('/token-economy', dashboardController.getTokenEconomyStats);
router.get('/ai-analytics', dashboardController.getAIAnalyticsStats);

module.exports = router;
