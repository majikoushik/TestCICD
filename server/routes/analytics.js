const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');
const { processTokenTransaction } = require('../blockchain/contracts');
const { ehiAudit } = require('../middleware/ehiAudit');
const { oncDeny } = require('../config/oncExceptions');
const logger = require('../utils/logger');

// @route   POST api/analytics
// @desc    Create a new analytics job
// @access  Private (all healthcare providers)
router.post('/', protect, async (req, res) => {
  try {
    const {
      type,
      name,
      description,
      parameters,
      dataUsed
    } = req.body;

    // Create new analytics job
    const analytics = new Analytics({
      type,
      name,
      description,
      creator: req.user.id,
      organization: req.user.organization,
      parameters: parameters || {},
      dataUsed: dataUsed || [],
      status: 'pending'
    });

    // Save analytics job to database
    await analytics.save();

    // Queue the analytics job for processing
    // In a real system, this would trigger an async job
    setTimeout(() => processAnalyticsJob(analytics._id), 1000);

    res.status(201).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Create analytics job error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/analytics
// @desc    Get all analytics jobs for the user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get analytics jobs created by the user or shared with them
    const analytics = await Analytics.find({
      $or: [
        { creator: req.user.id },
        { 'sharedWith.user': req.user.id }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: analytics.length,
      data: analytics
    });
  } catch (error) {
    logger.error('Get analytics jobs error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/analytics/patient-summary
// @desc    Live analytics for the current provider's patient panel.
//          Computed in-request from real patient data — no stale cache.
//          Used by the Patients list page top-stats bar.
// @access  Private (doctors, clinics, hospitals)
router.get('/patient-summary', protect, async (req, res) => {
  try {
    const { getLiveProviderSummary } = require('../services/analyticsCalculationService');
    const summary = await getLiveProviderSummary(req.user.id);
    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    logger.error('Patient summary analytics error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET api/analytics/snapshot
// @desc    Latest global analytics snapshot — used by provider Dashboard tabs.
//          Returns null data if no job has been run yet.
// @access  Private
router.get('/snapshot', protect, async (req, res) => {
  try {
    const { getLatestSnapshot } = require('../services/analyticsCalculationService');
    const snapshot = await getLatestSnapshot('global');
    return res.status(200).json({ success: true, data: snapshot });
  } catch (err) {
    logger.error('Analytics snapshot error', logger.reqCtx(req, err));
    return res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET api/analytics/reports
// @desc    Paginated list of analytics jobs for the current provider
// @access  Private
router.get('/reports', protect, async (req, res) => {
  try {
    const page  = Math.max(0, parseInt(req.query.page  || '0', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '10', 10));
    const { type, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {
      $or: [{ creator: req.user.id }, { 'sharedWith.user': req.user.id }],
    };
    if (type)   filter.type   = type;
    if (status) filter.status = status;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const total   = await Analytics.countDocuments(filter);
    const reports = await Analytics.find(filter).sort(sort).skip(page * limit).limit(limit);

    res.json({
      success: true,
      reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get analytics reports error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/analytics/predictive-alerts
// @desc    Return predictive alerts for the provider's patient panel
// @access  Private
router.get('/predictive-alerts', protect, async (req, res) => {
  try {
    // Pull completed analytics jobs that have alert-level insights
    const jobs = await Analytics.find({
      creator: req.user.id,
      status: 'completed',
      'results.insights': { $exists: true, $not: { $size: 0 } },
    }).sort({ createdAt: -1 }).limit(50);

    const alerts = jobs.flatMap(job =>
      (job.results?.insights || [])
        .filter(i => i.severity === 'high' || i.severity === 'critical')
        .map(i => ({
          id:          `${job._id}-${i.id || Math.random()}`,
          title:       i.title || i.message || 'Alert',
          description: i.description || '',
          severity:    i.severity,
          type:        i.category || job.type,
          createdAt:   job.createdAt,
        }))
    );

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    logger.error('Get predictive alerts error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/analytics/natural-language-summary
// @desc    Return an AI-generated plain-language summary for the dashboard
// @access  Private
router.get('/natural-language-summary', protect, async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;

    // Gather lightweight aggregate counts to build a factual summary
    const [referralCount, patientCount, completedJobs] = await Promise.all([
      Analytics.countDocuments({ creator: req.user.id, type: 'referral', status: 'completed' }),
      Patient.countDocuments({ primaryProvider: req.user.id }),
      Analytics.countDocuments({ creator: req.user.id, status: 'completed' }),
    ]);

    const periodLabel = timeframe === 'week' ? 'this week'
                      : timeframe === 'quarter' ? 'this quarter'
                      : timeframe === 'year'    ? 'this year'
                      : 'this month';

    const summary = `Over ${periodLabel} your practice has ${patientCount} active patients and completed `
      + `${referralCount} referral analytics job${referralCount !== 1 ? 's' : ''}. `
      + `${completedJobs} analytics job${completedJobs !== 1 ? 's' : ''} have been fully processed. `
      + `Keep reviewing predictive alerts to stay ahead of emerging patient risk patterns.`;

    res.json({ success: true, summary });
  } catch (error) {
    logger.error('Get natural-language summary error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/analytics/provider-benchmarking
// @desc    Benchmarking metrics comparing the provider to network peers
// @access  Private
router.get('/provider-benchmarking', protect, async (req, res) => {
  try {
    const [myCompleted, myReferrals] = await Promise.all([
      Analytics.countDocuments({ creator: req.user.id, status: 'completed' }),
      Analytics.countDocuments({ creator: req.user.id, type: 'referral', status: 'completed' }),
    ]);

    // Return metric objects; scores are normalised 0-100 relative to network averages
    const data = [
      {
        id: 'analytics-completion',
        name: 'Analytics Completion Rate',
        yourScore: myCompleted > 0 ? Math.min(100, myCompleted * 10) : 0,
        networkAvg: 55,
        unit: 'score',
      },
      {
        id: 'referral-analytics',
        name: 'Referral Analytics Usage',
        yourScore: myReferrals > 0 ? Math.min(100, myReferrals * 15) : 0,
        networkAvg: 40,
        unit: 'score',
      },
      {
        id: 'data-contribution',
        name: 'Network Data Contribution',
        yourScore: req.user.tokenBalance ? Math.min(100, req.user.tokenBalance / 5) : 0,
        networkAvg: 50,
        unit: 'score',
      },
    ];

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error('Get provider-benchmarking error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/analytics/:id
// @desc    Get a single analytics job
// @access  Private (creator or shared with)
router.get('/:id', protect, async (req, res) => {
  // Guard: reject anything that isn't a valid ObjectId before hitting the DB
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Analytics job not found' });
  }
  try {
    const analytics = await Analytics.findById(req.params.id);
    
    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Analytics job not found' });
    }

    // Check if user is the creator or the job is shared with them
    const isCreator = analytics.creator.toString() === req.user.id;
    const isSharedWith = analytics.sharedWith.some(
      share => share.user.toString() === req.user.id
    );
    
    if (!isCreator && !isSharedWith) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this analytics job'
      });
    }

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get analytics job error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/analytics/:id/share
// @desc    Share analytics job with another user
// @access  Private (creator only)
router.post('/:id/share', protect, async (req, res) => {
  try {
    const { userId, accessLevel } = req.body;
    
    const analytics = await Analytics.findById(req.params.id);
    
    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Analytics job not found' });
    }

    // Check if user is the creator
    if (analytics.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the creator can share this analytics job'
      });
    }

    // Check if user to share with exists
    const shareUser = await User.findById(userId);
    if (!shareUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already shared with this user
    const alreadyShared = analytics.sharedWith.find(
      share => share.user.toString() === userId
    );
    
    if (alreadyShared) {
      // Update existing share
      alreadyShared.accessLevel = accessLevel || alreadyShared.accessLevel;
      alreadyShared.sharedAt = new Date();
    } else {
      // Add new share
      analytics.sharedWith.push({
        user: userId,
        accessLevel: accessLevel || 'view'
      });
    }

    await analytics.save();

    res.status(200).json({
      success: true,
      data: analytics.sharedWith
    });
  } catch (error) {
    logger.error('Share analytics job error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/analytics/insights/patient/:patientId
// @desc    Get AI insights for a specific patient
// @access  Private (with patient access permission)
router.get('/insights/patient/:patientId', protect, ehiAudit('Analytics', 'READ'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if user has permission to access patient data
    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    let hasAccess = false;
    
    if (!isPrimaryProvider) {
      // Check consent records
      const consentRecord = patient.consentRecords.find(
        record => record.providerId.toString() === req.user.id
      );
      
      hasAccess = consentRecord && 
                 (consentRecord.accessLevel === 'full' || 
                  (consentRecord.dataElements && consentRecord.dataElements.includes('analytics')));
      
      if (!hasAccess) {
        return oncDeny(res, 'GET /api/analytics/insights/patient/:patientId').status(403).json({
          success: false,
          error: "You do not have permission to access this patient's analytics",
        });
      }
    }

    // Get analytics jobs for this patient
    const analytics = await Analytics.find({
      'dataUsed.recordCount': { $gt: 0 },
      'dataUsed.source': patient._id.toString(),
      status: 'completed'
    }).sort({ createdAt: -1 });

    // Extract insights from analytics jobs
    const insights = analytics.flatMap(job => {
      if (!job.results || !job.results.insights) return [];
      
      return job.results.insights.map(insight => ({
        ...insight,
        analyticsId: job._id,
        analyticsName: job.name,
        analyticsType: job.type,
        createdAt: job.createdAt
      }));
    });

    // Group insights by severity
    const groupedInsights = {
      critical: insights.filter(i => i.severity === 'critical'),
      high: insights.filter(i => i.severity === 'high'),
      medium: insights.filter(i => i.severity === 'medium'),
      low: insights.filter(i => i.severity === 'low')
    };

    res.status(200).json({
      success: true,
      data: {
        patientId: patient._id,
        patientName: patient.name,
        riskScore: patient.riskScore || null,
        insights: groupedInsights,
        insightCount: insights.length
      }
    });
  } catch (error) {
    logger.error('Get patient insights error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/analytics/dashboard
// @desc    Get analytics dashboard data
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Get recent analytics jobs
    const recentAnalytics = await Analytics.find({
      creator: req.user.id
    })
    .sort({ createdAt: -1 })
    .limit(5);

    // Get high-risk patients (in a real system, this would be more sophisticated)
    const highRiskPatients = await Patient.find({
      primaryProvider: req.user.id,
      riskScore: { $gt: 70 }
    })
    .select('patientId name riskScore')
    .sort({ riskScore: -1 })
    .limit(5);

    // Get operational metrics (in a real system, this would be calculated)
    const operationalMetrics = {
      averageWaitTime: 3.2, // days
      referralCompletionRate: 87.5, // percent
      patientSatisfaction: 4.2, // out of 5
      claimProcessingTime: 12.4 // days
    };

    res.status(200).json({
      success: true,
      data: {
        recentAnalytics,
        highRiskPatients,
        operationalMetrics,
        tokenBalance: req.user.tokenBalance || 0
      }
    });
  } catch (error) {
    logger.error('Get dashboard data error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Process an analytics job (simulated)
 * @param {string} analyticsId - Analytics job ID
 */
async function processAnalyticsJob(analyticsId) {
  try {
    // Get the analytics job
    const analytics = await Analytics.findById(analyticsId);
    
    if (!analytics) {
      logger.error('Analytics job not found', { analyticsId });
      return;
    }

    // Update status to processing
    analytics.status = 'processing';
    await analytics.save();

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate simulated results based on analytics type
    const results = generateSimulatedResults(analytics);

    // Update analytics job with results
    analytics.results = results;
    analytics.status = 'completed';
    analytics.confidenceScore = Math.random() * 0.3 + 0.7; // 0.7-1.0
    analytics.modelVersion = '1.0.0';
    
    // Anchor analytics results on the blockchain ledger (real record in BlockchainTransaction)
    const crypto = require('crypto');
    const resultsHash = crypto.createHash('sha256').update(JSON.stringify(results)).digest('hex');
    let anchorTxId = `tx_${crypto.randomBytes(16).toString('hex')}`;
    try {
      const BlockchainTransaction = require('../models/BlockchainTransaction');
      const anchorPayload = { type: 'analytics_anchor', analyticsId: String(analytics._id), analyticsType: analytics.type, resultsHash, creator: String(analytics.creator), timestamp: new Date().toISOString() };
      const anchorHash = crypto.createHash('sha256').update(JSON.stringify(anchorPayload)).digest('hex');
      const created = await BlockchainTransaction.create({ transactionId: anchorTxId, type: 'analytics_anchor', data: anchorPayload, hash: anchorHash, timestamp: new Date() });
      anchorTxId = created.transactionId;
    } catch (anchorErr) {
      logger.warn('Analytics blockchain anchor failed (non-fatal)', { error: anchorErr.message });
    }
    analytics.blockchainReference = { transactionId: anchorTxId, timestamp: new Date(), hash: resultsHash };

    // Process token reward
    try {
      let tokenAmount = 15;
      try {
        const TokenEarnPolicy = require('../models/TokenEarnPolicy');
        const policy = await TokenEarnPolicy.getSingleton();
        tokenAmount = policy.analyticsCompleted || 15;
      } catch (_) {}

      const tokenTransaction = await processTokenTransaction(
        'system',
        analytics.creator.toString(),
        tokenAmount,
        'Analytics contribution reward',
        { analyticsId: analytics._id.toString(), analyticsType: analytics.type }
      );

      // Update analytics with token reward info
      analytics.tokenReward = {
        amount: tokenAmount,
        transactionId: tokenTransaction.transactionId,
        status: 'processed'
      };

      // Update user token balance
      await User.findByIdAndUpdate(
        analytics.creator,
        { $inc: { tokenBalance: tokenAmount } }
      );
    } catch (tokenError) {
      logger.error('Token reward error', { analyticsId, error: tokenError, stack: tokenError.stack });
      analytics.tokenReward = {
        status: 'failed',
        error: tokenError.message
      };
    }

    await analytics.save();
    
    logger.info(`Analytics job ${analyticsId} completed`);
  } catch (error) {
    logger.error('Process analytics job error', { analyticsId, error, stack: error.stack });

    // Update job status to failed
    try {
      await Analytics.findByIdAndUpdate(analyticsId, {
        status: 'failed',
        error: error.message
      });
    } catch (updateError) {
      logger.error('Failed to update analytics job status', { analyticsId, error: updateError, stack: updateError.stack });
    }
  }
}

/**
 * Generate simulated results based on analytics type
 * @param {Object} analytics - Analytics job
 * @returns {Object} - Simulated results
 */
function generateSimulatedResults(analytics) {
  const results = {
    summary: `Analysis of ${analytics.name} completed successfully.`,
    data: {},
    visualizations: [],
    insights: []
  };

  switch (analytics.type) {
    case 'patientRisk':
      results.summary = 'Patient risk analysis identified several high-risk patients requiring intervention.';
      results.data = {
        riskDistribution: {
          high: 12,
          medium: 45,
          low: 143
        },
        topRiskFactors: [
          'Missed appointments',
          'Medication non-adherence',
          'Chronic condition progression',
          'Social determinants'
        ]
      };
      results.visualizations = [
        {
          type: 'pieChart',
          title: 'Patient Risk Distribution',
          description: 'Distribution of patients by risk level',
          config: {
            labels: ['High Risk', 'Medium Risk', 'Low Risk'],
            data: [12, 45, 143],
            colors: ['#ff6384', '#ffcd56', '#4bc0c0']
          }
        },
        {
          type: 'barChart',
          title: 'Top Risk Factors',
          description: 'Most common risk factors identified',
          config: {
            labels: ['Missed Appointments', 'Medication Non-adherence', 'Chronic Condition Progression', 'Social Determinants'],
            data: [78, 65, 52, 48]
          }
        }
      ];
      results.insights = [
        {
          title: 'High No-Show Rate',
          description: 'Several high-risk patients have missed more than 30% of scheduled appointments.',
          severity: 'high',
          actionable: true,
          recommendations: [
            'Implement appointment reminders via SMS',
            'Offer transportation assistance',
            'Schedule follow-up calls for high-risk patients'
          ]
        },
        {
          title: 'Medication Adherence Issues',
          description: '42% of diabetic patients show signs of medication non-adherence.',
          severity: 'critical',
          actionable: true,
          recommendations: [
            'Schedule medication review appointments',
            'Simplify medication regimens where possible',
            'Provide pill organizers and adherence tools'
          ]
        }
      ];
      break;
    
    case 'operationalEfficiency':
      results.summary = 'Operational analysis identified several bottlenecks in the referral process.';
      results.data = {
        averageWaitTimes: {
          newPatient: 12.3, // days
          followUp: 5.7, // days
          specialist: 18.4 // days
        },
        resourceUtilization: {
          staff: 0.82,
          rooms: 0.75,
          equipment: 0.68
        }
      };
      results.visualizations = [
        {
          type: 'lineChart',
          title: 'Wait Time Trends',
          description: 'Average wait times over the past 6 months',
          config: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
              {
                label: 'New Patient',
                data: [14.2, 13.8, 13.1, 12.7, 12.5, 12.3]
              },
              {
                label: 'Follow-up',
                data: [6.8, 6.5, 6.2, 5.9, 5.8, 5.7]
              },
              {
                label: 'Specialist',
                data: [21.5, 20.8, 19.7, 19.2, 18.8, 18.4]
              }
            ]
          }
        }
      ];
      results.insights = [
        {
          title: 'Referral Processing Delays',
          description: 'Specialist referrals take an average of 3.2 days to process, causing scheduling delays.',
          severity: 'medium',
          actionable: true,
          recommendations: [
            'Implement electronic referral system',
            'Establish clear referral protocols',
            'Designate referral coordinator'
          ]
        },
        {
          title: 'Room Utilization Imbalance',
          description: 'Examination rooms 3 and 4 are underutilized (52% usage) while rooms 1 and 2 are overbooked (93% usage).',
          severity: 'low',
          actionable: true,
          recommendations: [
            'Review room assignment algorithm',
            'Balance provider schedules across all rooms',
            'Evaluate room setup for specialized procedures'
          ]
        }
      ];
      break;
    
    case 'patientOutcomes':
      results.summary = 'Patient outcome analysis shows positive trends in chronic disease management.';
      results.data = {
        outcomeMetrics: {
          diabetesControl: 0.72, // percentage of patients with controlled HbA1c
          hypertensionControl: 0.68, // percentage with controlled BP
          preventiveScreening: 0.81 // percentage up-to-date on screenings
        },
        readmissionRates: {
          overall: 0.12,
          byCondition: {
            diabetes: 0.14,
            heartFailure: 0.18,
            pneumonia: 0.09
          }
        }
      };
      results.visualizations = [
        {
          type: 'radarChart',
          title: 'Outcome Metrics',
          description: 'Key patient outcome metrics compared to benchmarks',
          config: {
            labels: ['Diabetes Control', 'Hypertension Control', 'Preventive Screening', 'Medication Adherence', 'Patient Satisfaction'],
            datasets: [
              {
                label: 'Your Clinic',
                data: [0.72, 0.68, 0.81, 0.75, 0.88]
              },
              {
                label: 'Regional Benchmark',
                data: [0.65, 0.62, 0.78, 0.72, 0.82]
              }
            ]
          }
        }
      ];
      results.insights = [
        {
          title: 'Improved Diabetes Management',
          description: 'Diabetic patients show 12% improvement in HbA1c control over the past year.',
          severity: 'low',
          actionable: false,
          recommendations: [
            'Continue current diabetes management program',
            'Share successful strategies with other providers'
          ]
        },
        {
          title: 'Heart Failure Readmissions',
          description: 'Heart failure readmission rate (18%) exceeds target (15%).',
          severity: 'medium',
          actionable: true,
          recommendations: [
            'Implement post-discharge follow-up within 48 hours',
            'Enhance patient education on symptoms requiring medical attention',
            'Review medication reconciliation process'
          ]
        }
      ];
      break;
    
    case 'financialMetrics':
      results.summary = 'Financial analysis identified opportunities to improve claim processing and reduce denials.';
      results.data = {
        revenueByService: {
          primary: 425000,
          specialty: 380000,
          procedures: 295000,
          labs: 180000
        },
        claimMetrics: {
          averageDays: 18.3,
          denialRate: 0.08,
          appealSuccess: 0.65
        }
      };
      results.visualizations = [
        {
          type: 'barChart',
          title: 'Revenue by Service Type',
          description: 'Breakdown of revenue by service category',
          config: {
            labels: ['Primary Care', 'Specialty Care', 'Procedures', 'Lab Services'],
            data: [425000, 380000, 295000, 180000]
          }
        }
      ];
      results.insights = [
        {
          title: 'High Claim Denial Rate for Cardiology',
          description: 'Cardiology services have a 12.3% denial rate, primarily due to coding issues.',
          severity: 'high',
          actionable: true,
          recommendations: [
            'Conduct coding audit for cardiology services',
            'Provide targeted training on cardiology coding',
            'Implement pre-submission claim review'
          ]
        },
        {
          title: 'Delayed Payments from Insurance B',
          description: 'Insurance B takes an average of 32 days to process claims, compared to 18 days for other payers.',
          severity: 'medium',
          actionable: true,
          recommendations: [
            'Review contract terms with Insurance B',
            'Establish regular check-ins with payer representative',
            'Consider electronic submission optimization'
          ]
        }
      ];
      break;
    
    default:
      results.summary = `Analysis of ${analytics.name} completed with generic results.`;
      results.insights = [
        {
          title: 'General Insight',
          description: 'This is a generic insight for custom analytics.',
          severity: 'medium',
          actionable: true,
          recommendations: [
            'Review the specific parameters of your analysis',
            'Consider refining your analytics query'
          ]
        }
      ];
  }

  return results;
}

// ── Premium Export (token-gated) ──────────────────────────────────────────────

const EXPORT_TOKEN_COST = 25; // CLT to export full analytics results

/**
 * POST /api/analytics/:id/export
 * Deducts EXPORT_TOKEN_COST tokens and returns the full analytics payload as JSON.
 * In production this could stream a PDF/CSV; here we return structured JSON.
 */
router.post('/:id/export', protect, async (req, res) => {
  try {
    const analytics = await Analytics.findById(req.params.id).lean();
    if (!analytics) return res.status(404).json({ success: false, error: 'Analytics job not found' });
    if (analytics.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Analytics job is not completed yet' });
    }

    // Check token balance
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const cost = (() => {
      try {
        const ConversionRule = require('../models/ConversionRule');
        // Cost is read async below; use default for sync check
      } catch (_) {}
      return EXPORT_TOKEN_COST;
    })();

    // Try to read cost from ConversionRule catalog
    let tokenCost = EXPORT_TOKEN_COST;
    try {
      const ConversionRule = require('../models/ConversionRule');
      const rule = await ConversionRule.findOne({ serviceId: 'premium-export', isActive: true }).lean();
      if (rule) tokenCost = rule.tokenCost;
    } catch (_) {}

    if (user.tokenBalance < tokenCost) {
      return res.status(402).json({
        success: false,
        error: `Insufficient tokens. Premium export requires ${tokenCost} CLT (you have ${user.tokenBalance}).`,
        required: tokenCost,
        balance: user.tokenBalance,
      });
    }

    // Atomic debit
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id, tokenBalance: { $gte: tokenCost } },
      { $inc: { tokenBalance: -tokenCost }, $set: { tokenLastActivity: new Date() } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(402).json({ success: false, error: 'Insufficient token balance' });
    }

    // Record spend on ledger (fire-and-forget)
    processTokenTransaction(req.user.id, 'system', tokenCost, 'Premium analytics export', {
      source: 'premium_export', analyticsId: req.params.id,
    }).catch(err => logger.warn('Export token tx record failed', { error: err.message }));

    // Record in Token model
    try {
      const { Token } = require('../models/Token');
      await Token.findOneAndUpdate({}, {
        $push: {
          transactions: {
            user: req.user.id, type: 'spend', amount: -tokenCost,
            reason: 'Premium analytics export',
            relatedEntity: { entityType: 'analytics', entityId: req.params.id },
            status: 'completed', balanceAfter: updatedUser.tokenBalance,
          },
        },
      });
    } catch (_) {}

    logger.info('Premium analytics export', { userId: req.user.id, analyticsId: req.params.id, tokenCost });

    res.json({
      success: true,
      data: {
        analytics: {
          id: analytics._id,
          name: analytics.name,
          type: analytics.type,
          status: analytics.status,
          results: analytics.results,
          blockchainReference: analytics.blockchainReference,
          confidenceScore: analytics.confidenceScore,
          modelVersion: analytics.modelVersion,
          completedAt: analytics.updatedAt,
        },
        export: {
          format: 'json',
          tokenCost,
          newBalance: updatedUser.tokenBalance,
          exportedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Premium export error', { error: error.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
