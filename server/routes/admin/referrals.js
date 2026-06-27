const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const Referral = require('../../models/Referral');
const logger = require('../../utils/logger');
const ReferralDispute = require('../../models/ReferralDispute');
const ReferralTransaction = require('../../models/ReferralTransaction');
const { verifyBlockchainTransaction } = require('../../utils/blockchain');

// @desc    Get all referrals with optional filtering
// @route   GET /api/admin/referrals
// @access  Private (Admin, SuperAdmin)
router.get('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status, provider, startDate, endDate, hasDispute, search } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by provider (either referring or target)
    if (provider) {
      query.$or = [
        { referringProviderId: provider },
        { targetProviderId: provider }
      ];
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Filter by dispute status
    if (hasDispute === 'true') {
      query.hasDispute = true;
    }
    
    // Search by patient name, provider name, or referral reason
    if (search) {
      query.$or = query.$or || [];
      query.$or.push(
        { patientName: { $regex: search, $options: 'i' } },
        { referringProviderName: { $regex: search, $options: 'i' } },
        { targetProviderName: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } }
      );
    }
    
    const referrals = await Referral.find(query)
      .sort({ createdAt: -1 })
      .populate('disputes')
      .populate('transactions');
    
    res.json(referrals);
  } catch (err) {
    logger.error('Error fetching referrals', logger.reqCtx(req, err));
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get referral by ID
// @route   GET /api/admin/referrals/:id
// @access  Private (Admin, SuperAdmin)
router.get('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('disputes')
      .populate('transactions');
    
    if (!referral) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    
    res.json(referral);
  } catch (err) {
    logger.error('Error fetching referral', logger.reqCtx(req, err));
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update referral status
// @route   PUT /api/admin/referrals/:id/status
// @access  Private (Admin, SuperAdmin)
router.put('/:id/status', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['Pending', 'Approved', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const referral = await Referral.findById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    
    // Update status and add timestamp
    referral.status = status;
    referral.notes = notes || referral.notes;
    
    // Add timestamp based on status
    if (status === 'Approved') {
      referral.approvedAt = Date.now();
      referral.approvedBy = req.user.id;
    } else if (status === 'Completed') {
      referral.completedAt = Date.now();
    } else if (status === 'Cancelled') {
      referral.cancelledAt = Date.now();
      referral.cancelledBy = req.user.id;
    }
    
    await referral.save();
    
    res.json(referral);
  } catch (err) {
    logger.error('Error updating referral status', logger.reqCtx(req, err));
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Handle referral dispute
// @route   PUT /api/admin/referrals/:id/dispute
// @access  Private (Admin, SuperAdmin)
router.put('/:id/dispute', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { resolution, finalAmount, notes } = req.body;
    
    if (!resolution) {
      return res.status(400).json({ message: 'Resolution is required' });
    }
    
    const referral = await Referral.findById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    
    if (!referral.hasDispute) {
      return res.status(400).json({ message: 'No dispute exists for this referral' });
    }
    
    // Find the dispute
    const dispute = await ReferralDispute.findOne({ referralId: referral._id, status: 'Pending' });
    
    if (!dispute) {
      return res.status(404).json({ message: 'Active dispute not found' });
    }
    
    // Update dispute
    dispute.status = 'Resolved';
    dispute.resolution = resolution;
    dispute.finalAmount = finalAmount || dispute.requestedAmount;
    dispute.resolvedAt = Date.now();
    dispute.resolvedBy = req.user.id;
    dispute.notes = notes || dispute.notes;
    
    await dispute.save();
    
    // Update referral payment status if approved
    if (resolution === 'Approved' || resolution === 'Partially Approved') {
      referral.paymentStatus = 'Pending Payment';
      referral.paymentAmount = finalAmount;
    } else {
      referral.paymentStatus = 'Dispute Rejected';
    }
    
    await referral.save();
    
    res.json({ referral, dispute });
  } catch (err) {
    logger.error('Error handling referral dispute', logger.reqCtx(req, err));
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Process referral payment
// @route   POST /api/admin/referrals/:id/payment
// @access  Private (Admin, SuperAdmin)
router.post('/:id/payment', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { amount, txHash, notes } = req.body;
    
    if (!amount || !txHash) {
      return res.status(400).json({ message: 'Amount and transaction hash are required' });
    }
    
    const referral = await Referral.findById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    
    // Verify blockchain transaction (in real implementation)
    const verificationResult = await verifyBlockchainTransaction(txHash);
    
    if (!verificationResult.verified) {
      return res.status(400).json({ message: 'Transaction verification failed', details: verificationResult.error });
    }
    
    // Create transaction record
    const transaction = new ReferralTransaction({
      referralId: referral._id,
      amount,
      txHash,
      blockNumber: verificationResult.blockNumber,
      fromProvider: 'Insurance Network', // This would be dynamic in a real implementation
      toProvider: referral.referringProviderName,
      status: 'Confirmed',
      notes: notes || 'Payment processed by admin'
    });
    
    await transaction.save();
    
    // Update referral payment status
    referral.paymentStatus = 'Paid';
    referral.paymentAmount = amount;
    referral.paymentTxHash = txHash;
    
    await referral.save();
    
    res.json({ referral, transaction });
  } catch (err) {
    logger.error('Error processing referral payment', logger.reqCtx(req, err));
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get referral statistics
// @route   GET /api/admin/referrals/stats
// @access  Private (Admin, SuperAdmin)
router.get('/stats/overview', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { startDate, endDate, providerId } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Build provider filter
    const providerFilter = {};
    if (providerId) {
      providerFilter.$or = [
        { referringProviderId: providerId },
        { targetProviderId: providerId }
      ];
    }
    
    // Combine filters
    const filter = { ...dateFilter, ...providerFilter };
    
    // Get counts by status
    const totalReferrals = await Referral.countDocuments(filter);
    const pendingReferrals = await Referral.countDocuments({ ...filter, status: 'Pending' });
    const approvedReferrals = await Referral.countDocuments({ ...filter, status: 'Approved' });
    const completedReferrals = await Referral.countDocuments({ ...filter, status: 'Completed' });
    const cancelledReferrals = await Referral.countDocuments({ ...filter, status: 'Cancelled' });
    
    // Get dispute counts
    const activeDisputes = await ReferralDispute.countDocuments({ 
      ...dateFilter, 
      status: 'Pending' 
    });
    
    // Calculate average completion time (in days)
    const completedReferralsData = await Referral.find({
      ...filter,
      status: 'Completed',
      completedAt: { $exists: true },
      createdAt: { $exists: true }
    });
    
    let averageCompletionTime = 0;
    if (completedReferralsData.length > 0) {
      const totalDays = completedReferralsData.reduce((sum, ref) => {
        const completionTime = new Date(ref.completedAt) - new Date(ref.createdAt);
        return sum + (completionTime / (1000 * 60 * 60 * 24)); // Convert ms to days
      }, 0);
      averageCompletionTime = totalDays / completedReferralsData.length;
    }
    
    // Get top referrers
    const topReferrers = await Referral.aggregate([
      { $match: filter },
      { $group: { _id: '$referringProviderId', count: { $sum: 1 }, name: { $first: '$referringProviderName' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, providerId: '$_id', providerName: '$name', count: 1 } }
    ]);
    
    // Get top receivers
    const topReceivers = await Referral.aggregate([
      { $match: filter },
      { $group: { _id: '$targetProviderId', count: { $sum: 1 }, name: { $first: '$targetProviderName' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, providerId: '$_id', providerName: '$name', count: 1 } }
    ]);
    
    // Get monthly trends (for current year)
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    
    const monthlyTrends = await Referral.aggregate([
      { 
        $match: { 
          ...filter,
          createdAt: { $gte: startOfYear } 
        } 
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $let: {
              vars: {
                monthsInString: [
                  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ]
              },
              in: { $arrayElemAt: ['$$monthsInString', { $subtract: ['$_id', 1] }] }
            }
          },
          count: 1
        }
      }
    ]);
    
    res.json({
      totalReferrals,
      pendingReferrals,
      approvedReferrals,
      completedReferrals,
      cancelledReferrals,
      activeDisputes,
      averageCompletionTime,
      topReferrers,
      topReceivers,
      monthlyTrends
    });
  } catch (err) {
    logger.error('Error fetching referral statistics', logger.reqCtx(req, err));
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Verify blockchain transaction
// @route   GET /api/admin/referrals/verify/:txHash
// @access  Private (Admin, SuperAdmin)
router.get('/verify/:txHash', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { txHash } = req.params;
    
    // Verify transaction on blockchain
    const verificationResult = await verifyBlockchainTransaction(txHash);
    
    if (!verificationResult.verified) {
      return res.status(400).json({ 
        verified: false, 
        message: 'Transaction verification failed', 
        details: verificationResult.error 
      });
    }
    
    // Find transaction in database
    const transaction = await ReferralTransaction.findOne({ txHash });
    
    res.json({
      verified: true,
      blockchainData: verificationResult,
      databaseRecord: transaction || null
    });
  } catch (err) {
    logger.error('Error verifying transaction', logger.reqCtx(req, err));
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
