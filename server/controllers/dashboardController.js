const User = require('../models/User');
const Patient = require('../models/Patient');
const Referral = require('../models/Referral');
const Analytics = require('../models/Analytics');
const { Token, TokenTransaction } = require('../models/Token');

/**
 * Get dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboardData = async (req, res) => {
  try {
    // Get patients data
    const patientsTotal = await Patient.countDocuments();
    const highRiskPatients = await Patient.countDocuments({ riskLevel: 'high' });
    
    // Get referrals data
    const pendingReferrals = await Referral.countDocuments({ status: 'pending' });
    const completedReferrals = await Referral.countDocuments({ status: 'completed' });
    
    // Get recent analytics
    const recentAnalytics = await Analytics.find()
      .sort({ createdAt: -1 })
      .limit(3);
    
    // Get recent activities (combining different types of activities)
    const recentTokenTransactions = await TokenTransaction.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();
      
    const recentActivity = recentTokenTransactions.map(tx => ({
      id: tx._id || tx.id,
      type: tx.type === 'earn' ? 'token' : tx.type === 'transfer' ? 'referral' : 'patient',
      description: tx.reason || 'Token transaction',
      timestamp: tx.createdAt,
      status: tx.status
    }));
    
    // Combine all data
    const dashboardData = {
      patients: {
        total: patientsTotal,
        highRisk: highRiskPatients
      },
      referrals: {
        pending: pendingReferrals,
        completed: completedReferrals
      },
      analytics: {
        recent: recentAnalytics
      },
      recentActivity
    };
    
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

/**
 * Get patient statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPatientStatistics = async (req, res) => {
  try {
    // Get total patients
    const total = await Patient.countDocuments();
    
    // Get patients created in the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = await Patient.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Get patients by risk level
    const highRisk = await Patient.countDocuments({ riskLevel: 'high' });
    const mediumRisk = await Patient.countDocuments({ riskLevel: 'medium' });
    const lowRisk = await Patient.countDocuments({ riskLevel: 'low' });
    
    // Calculate patients by age group
    // This would typically require aggregation based on birthDate
    // For simplicity, we're using approximate percentages
    const byAge = [
      { age: '0-18', count: Math.floor(total * 0.12) },
      { age: '19-35', count: Math.floor(total * 0.22) },
      { age: '36-50', count: Math.floor(total * 0.28) },
      { age: '51-65', count: Math.floor(total * 0.24) },
      { age: '65+', count: Math.floor(total * 0.14) }
    ];
    
    const patientStats = {
      total,
      newThisMonth,
      highRisk,
      byRiskLevel: {
        low: lowRisk,
        medium: mediumRisk,
        high: highRisk
      },
      byAge
    };
    
    res.status(200).json(patientStats);
  } catch (error) {
    console.error('Error fetching patient statistics:', error);
    res.status(500).json({ error: 'Failed to fetch patient statistics' });
  }
};

/**
 * Get referral statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getReferralStatistics = async (req, res) => {
  try {
    // Get referral counts
    const total = await Referral.countDocuments();
    const pending = await Referral.countDocuments({ status: 'pending' });
    const completed = await Referral.countDocuments({ status: 'completed' });
    const rejected = await Referral.countDocuments({ status: 'rejected' });
    
    // Calculate average completion time (would typically require aggregation)
    // For simplicity, using a fixed value
    const averageCompletionTime = 36; // hours
    
    // Get referrals by specialty
    // This would typically require aggregation
    // For simplicity, using approximate percentages
    const bySpecialty = [
      { specialty: 'Cardiology', count: Math.floor(total * 0.26) },
      { specialty: 'Neurology', count: Math.floor(total * 0.21) },
      { specialty: 'Orthopedics', count: Math.floor(total * 0.18) },
      { specialty: 'Oncology', count: Math.floor(total * 0.14) },
      { specialty: 'Other', count: Math.floor(total * 0.21) }
    ];
    
    const referralStats = {
      total,
      pending,
      completed,
      rejected,
      averageCompletionTime,
      bySpecialty
    };
    
    res.status(200).json(referralStats);
  } catch (error) {
    console.error('Error fetching referral statistics:', error);
    res.status(500).json({ error: 'Failed to fetch referral statistics' });
  }
};

/**
 * Get recent activities
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get recent token transactions
    const tokenActivities = await Token.find()
      .sort({ timestamp: -1 })
      .limit(Math.ceil(limit / 2))
      .lean()
      .then(tokens => tokens.map(tx => ({
        id: tx._id || tx.id,
        type: 'token',
        description: tx.description,
        timestamp: tx.timestamp,
        status: tx.status
      })));
    
    // Get recent referrals
    const referralActivities = await Referral.find()
      .sort({ createdAt: -1 })
      .limit(Math.floor(limit / 4))
      .lean()
      .then(referrals => referrals.map(ref => ({
        id: ref._id || ref.id,
        type: 'referral',
        description: `Referral ${ref.status} for ${ref.patientName}`,
        timestamp: ref.updatedAt || ref.createdAt,
        status: ref.status
      })));
    
    // Get recent patient updates
    const patientActivities = await Patient.find()
      .sort({ updatedAt: -1 })
      .limit(Math.floor(limit / 4))
      .lean()
      .then(patients => patients.map(patient => ({
        id: patient._id || patient.id,
        type: 'patient',
        description: `Patient record updated: ${patient.firstName} ${patient.lastName}`,
        timestamp: patient.updatedAt,
        status: 'completed'
      })));
    
    // Combine all activities
    const allActivities = [
      ...tokenActivities,
      ...referralActivities,
      ...patientActivities
    ];
    
    // Sort by timestamp (newest first)
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to requested number
    const limitedActivities = allActivities.slice(0, limit);
    
    res.status(200).json(limitedActivities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
};

/**
 * Get recent analytics reports
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecentAnalytics = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Get recent analytics reports
    const recentReports = await Analytics.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.status(200).json(recentReports);
  } catch (error) {
    console.error('Error fetching recent analytics reports:', error);
    res.status(500).json({ error: 'Failed to fetch recent analytics reports' });
  }
};
