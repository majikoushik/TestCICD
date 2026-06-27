const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const AIReport = require('../../models/AIManagement');
const logger = require('../../utils/logger');

/**
 * @route   GET /api/admin/ai-management/reports
 * @desc    Get all AI reports with optional filtering
 * @access  Private (Admin)
 */
router.get('/reports', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const queryOptions = {};
    
    if (status) queryOptions.status = status;
    if (type) queryOptions.type = type;
    
    const skip = (page - 1) * limit;
    
    const reports = await AIReport.find(queryOptions)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await AIReport.countDocuments(queryOptions);
    
    res.json({
      success: true,
      count: reports.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: reports
    });
  } catch (error) {
    logger.error('Error fetching AI reports', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while fetching AI reports',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/ai-management/reports/:id
 * @desc    Get a specific AI report by ID
 * @access  Private (Admin)
 */
router.get('/reports/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await AIReport.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('feedback.submittedBy', 'firstName lastName email')
      .populate('reviewHistory.reviewer', 'firstName lastName email')
      .populate('scheduledReports.recipientId', 'firstName lastName email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'AI report not found'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error fetching AI report', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while fetching AI report',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/ai-management/reports
 * @desc    Create a new AI report
 * @access  Private (Admin)
 */
router.post('/reports', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, type, data, confidenceScore, thresholds } = req.body;
    
    const newReport = new AIReport({
      title,
      description,
      type,
      data,
      confidenceScore,
      thresholds,
      createdBy: req.user.id,
      reviewHistory: [{
        action: 'created',
        reviewer: req.user.id,
        comments: 'Initial creation'
      }]
    });
    
    const savedReport = await newReport.save();
    
    res.status(201).json({
      success: true,
      data: savedReport
    });
  } catch (error) {
    logger.error('Error creating AI report', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while creating AI report',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/ai-management/reports/:id
 * @desc    Update an AI report
 * @access  Private (Admin)
 */
router.put('/reports/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, type, data, confidenceScore, thresholds, status } = req.body;
    
    const report = await AIReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'AI report not found'
      });
    }
    
    // Update fields
    if (title) report.title = title;
    if (description) report.description = description;
    if (type) report.type = type;
    if (data) report.data = data;
    if (confidenceScore !== undefined) report.confidenceScore = confidenceScore;
    if (thresholds) report.thresholds = thresholds;
    if (status) report.status = status;
    
    // Add to review history
    report.reviewHistory.push({
      action: 'updated',
      reviewer: req.user.id,
      comments: req.body.comments || 'Updated report'
    });
    
    const updatedReport = await report.save();
    
    res.json({
      success: true,
      data: updatedReport
    });
  } catch (error) {
    logger.error('Error updating AI report', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while updating AI report',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/ai-management/reports/:id/review
 * @desc    Review an AI report (approve/reject)
 * @access  Private (Admin)
 */
router.put('/reports/:id/review', protect, authorize('admin'), async (req, res) => {
  try {
    const { action, comments } = req.body;
    
    if (!['approved', 'rejected', 'published'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approved, rejected, or published'
      });
    }
    
    const report = await AIReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'AI report not found'
      });
    }
    
    // Update status based on action
    report.status = action;
    
    // Add to review history
    report.reviewHistory.push({
      action,
      reviewer: req.user.id,
      comments: comments || `Report ${action}`
    });
    
    const updatedReport = await report.save();
    
    res.json({
      success: true,
      data: updatedReport
    });
  } catch (error) {
    logger.error('Error reviewing AI report', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while reviewing AI report',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/ai-management/reports/:id/feedback
 * @desc    Add feedback to an AI report (false positive/negative)
 * @access  Private (Admin)
 */
router.post('/reports/:id/feedback', protect, authorize('admin'), async (req, res) => {
  try {
    const { type, comment } = req.body;
    
    if (!['false_positive', 'false_negative', 'accurate', 'other'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback type'
      });
    }
    
    const report = await AIReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'AI report not found'
      });
    }
    
    // Add feedback
    report.feedback.push({
      type,
      comment,
      submittedBy: req.user.id
    });
    
    const updatedReport = await report.save();
    
    res.json({
      success: true,
      data: updatedReport
    });
  } catch (error) {
    logger.error('Error adding feedback to AI report', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while adding feedback',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/ai-management/thresholds
 * @desc    Update global AI thresholds
 * @access  Private (Admin)
 */
router.put('/thresholds', protect, authorize('admin'), async (req, res) => {
  try {
    const { readmissionRisk, diagnosisConfidence, treatmentRecommendation } = req.body;
    
    // This would typically update a global settings document
    // For now, we'll just return the updated thresholds
    const thresholds = {
      readmissionRisk: readmissionRisk || 0.7,
      diagnosisConfidence: diagnosisConfidence || 0.85,
      treatmentRecommendation: treatmentRecommendation || 0.8
    };
    
    res.json({
      success: true,
      data: thresholds
    });
  } catch (error) {
    logger.error('Error updating AI thresholds', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while updating thresholds',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/ai-management/reports/:id/schedule
 * @desc    Schedule automated reports for providers
 * @access  Private (Admin)
 */
router.post('/reports/:id/schedule', protect, authorize('admin'), async (req, res) => {
  try {
    const { recipientId, frequency, nextDelivery } = req.body;
    
    if (!['daily', 'weekly', 'monthly', 'quarterly'].includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid frequency'
      });
    }
    
    const report = await AIReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'AI report not found'
      });
    }
    
    // Add scheduled report
    report.scheduledReports.push({
      recipientId,
      frequency,
      nextDelivery: new Date(nextDelivery)
    });
    
    const updatedReport = await report.save();
    
    res.json({
      success: true,
      data: updatedReport
    });
  } catch (error) {
    logger.error('Error scheduling report', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while scheduling report',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/ai-management/aggregate
 * @desc    Get aggregate AI report statistics
 * @access  Private (Admin)
 */
router.get('/aggregate', protect, authorize('admin'), async (req, res) => {
  try {
    // Aggregate statistics from AI reports
    const stats = await AIReport.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidenceScore' },
          reports: { $push: { id: '$_id', title: '$title', status: '$status' } }
        }
      }
    ]);
    
    // Get feedback statistics
    const feedbackStats = await AIReport.aggregate([
      { $unwind: '$feedback' },
      {
        $group: {
          _id: '$feedback.type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        reportStats: stats,
        feedbackStats
      }
    });
  } catch (error) {
    logger.error('Error fetching aggregate AI stats', logger.reqCtx(req, error));
    res.status(500).json({
      success: false,
      message: 'Server error while fetching aggregate stats',
      error: error.message
    });
  }
});

module.exports = router;
