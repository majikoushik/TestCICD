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
    const { status, provider, startDate, endDate, search } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (provider) {
      query.$or = [
        { referringProvider: provider },
        { receivingProvider: provider }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const searchOr = [{ reason: { $regex: search, $options: 'i' } }];
      if (query.$or) {
        // Combine with existing $or using $and
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const referrals = await Referral.find(query)
      .populate('patient', 'patientId name dateOfBirth gender')
      .populate('referringProvider', 'firstName lastName name organization specialty')
      .populate('receivingProvider', 'firstName lastName name organization specialty')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: referrals });
  } catch (err) {
    logger.error('Error fetching referrals', logger.reqCtx(req, err));
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @desc    Get referral by ID
// @route   GET /api/admin/referrals/:id
// @access  Private (Admin, SuperAdmin)
router.get('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('patient', 'patientId name dateOfBirth gender contactInfo')
      .populate('referringProvider', 'firstName lastName name organization specialty email')
      .populate('receivingProvider', 'firstName lastName name organization specialty email');

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    // Attach any linked disputes
    const disputes = await ReferralDispute.find({ referralId: referral._id });
    const transactions = await ReferralTransaction.find({ referralId: referral._id });

    res.json({ success: true, data: { ...referral.toObject(), disputes, transactions } });
  } catch (err) {
    logger.error('Error fetching referral', logger.reqCtx(req, err));
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @desc    Update referral status
// @route   PUT /api/admin/referrals/:id/status
// @access  Private (Admin, SuperAdmin)
router.put('/:id/status', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    referral.status = status;
    if (notes) referral.notes = notes;
    if (status === 'completed') referral.completionDate = new Date();

    await referral.save();

    res.json({ success: true, data: referral });
  } catch (err) {
    logger.error('Error updating referral status', logger.reqCtx(req, err));
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @desc    Handle referral dispute
// @route   PUT /api/admin/referrals/:id/dispute
// @access  Private (Admin, SuperAdmin)
router.put('/:id/dispute', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { resolution, finalAmount, notes } = req.body;

    if (!resolution) {
      return res.status(400).json({ success: false, message: 'Resolution is required' });
    }

    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    const dispute = await ReferralDispute.findOne({ referralId: referral._id, status: 'Pending' });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Active dispute not found for this referral' });
    }

    dispute.status = 'Resolved';
    dispute.resolution = resolution;
    dispute.finalAmount = finalAmount || dispute.requestedAmount;
    dispute.resolvedAt = Date.now();
    dispute.resolvedBy = req.user.id;
    if (notes) dispute.notes = notes;
    await dispute.save();

    // Update billing status based on dispute resolution
    if (resolution === 'Approved' || resolution === 'Partially Approved') {
      referral.billing.status = 'pending';
      if (finalAmount) referral.billing.amount = finalAmount;
    } else {
      referral.billing.status = 'disputed';
    }
    await referral.save();

    res.json({ success: true, data: { referral, dispute } });
  } catch (err) {
    logger.error('Error handling referral dispute', logger.reqCtx(req, err));
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @desc    Process referral payment
// @route   POST /api/admin/referrals/:id/payment
// @access  Private (Admin, SuperAdmin)
router.post('/:id/payment', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { amount, txHash, notes } = req.body;

    if (!amount || !txHash) {
      return res.status(400).json({ success: false, message: 'Amount and transaction hash are required' });
    }

    const referral = await Referral.findById(req.params.id)
      .populate('referringProvider', 'firstName lastName name');
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    const verificationResult = await verifyBlockchainTransaction(txHash);
    if (!verificationResult.verified) {
      return res.status(400).json({ success: false, message: 'Transaction verification failed', details: verificationResult.error });
    }

    const providerName = referral.referringProvider
      ? (referral.referringProvider.firstName || referral.referringProvider.name || 'Unknown')
      : 'Unknown';

    const transaction = new ReferralTransaction({
      referralId: referral._id,
      amount,
      txHash,
      blockNumber: verificationResult.blockNumber,
      fromProvider: 'Insurance Network',
      toProvider: providerName,
      status: 'Confirmed',
      notes: notes || 'Payment processed by admin'
    });
    await transaction.save();

    referral.billing.status = 'settled';
    referral.billing.amount = amount;
    referral.billing.transactionId = txHash;
    await referral.save();

    res.json({ success: true, data: { referral, transaction } });
  } catch (err) {
    logger.error('Error processing referral payment', logger.reqCtx(req, err));
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @desc    Get referral statistics
// @route   GET /api/admin/referrals/stats/overview
// @access  Private (Admin, SuperAdmin)
router.get('/stats/overview', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { startDate, endDate, providerId } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate)   dateFilter.createdAt.$lte = new Date(endDate);
    }

    const providerFilter = {};
    if (providerId) {
      providerFilter.$or = [
        { referringProvider: providerId },
        { receivingProvider: providerId }
      ];
    }

    const filter = { ...dateFilter, ...providerFilter };

    const [total, pending, accepted, completed, cancelled, rejected] = await Promise.all([
      Referral.countDocuments(filter),
      Referral.countDocuments({ ...filter, status: 'pending' }),
      Referral.countDocuments({ ...filter, status: 'accepted' }),
      Referral.countDocuments({ ...filter, status: 'completed' }),
      Referral.countDocuments({ ...filter, status: 'cancelled' }),
      Referral.countDocuments({ ...filter, status: 'rejected' }),
    ]);

    const activeDisputes = await ReferralDispute.countDocuments({ ...dateFilter, status: 'Pending' });

    // Average completion time (days)
    const completedDocs = await Referral.find({
      ...filter,
      status: 'completed',
      completionDate: { $exists: true }
    }).select('createdAt completionDate');

    let averageCompletionTime = 0;
    if (completedDocs.length > 0) {
      const totalDays = completedDocs.reduce((sum, ref) => {
        return sum + (new Date(ref.completionDate) - new Date(ref.createdAt)) / 86400000;
      }, 0);
      averageCompletionTime = +(totalDays / completedDocs.length).toFixed(1);
    }

    // Top referrers (by referringProvider string ID — join names separately)
    const topReferrersRaw = await Referral.aggregate([
      { $match: filter },
      { $group: { _id: '$referringProvider', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Top receivers
    const topReceiversRaw = await Referral.aggregate([
      { $match: filter },
      { $group: { _id: '$receivingProvider', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Monthly trends for current year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const monthlyTrends = await Referral.aggregate([
      { $match: { ...filter, createdAt: { $gte: startOfYear } } },
      { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $let: {
              vars: { months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
              in: { $arrayElemAt: ['$$months', { $subtract: ['$_id', 1] }] }
            }
          },
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalReferrals: total,
        pendingReferrals: pending,
        acceptedReferrals: accepted,
        completedReferrals: completed,
        cancelledReferrals: cancelled,
        rejectedReferrals: rejected,
        activeDisputes,
        averageCompletionTime,
        topReferrers: topReferrersRaw.map(r => ({ providerId: r._id, count: r.count })),
        topReceivers: topReceiversRaw.map(r => ({ providerId: r._id, count: r.count })),
        monthlyTrends
      }
    });
  } catch (err) {
    logger.error('Error fetching referral statistics', logger.reqCtx(req, err));
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @desc    Verify blockchain transaction
// @route   GET /api/admin/referrals/verify/:txHash
// @access  Private (Admin, SuperAdmin)
router.get('/verify/:txHash', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const verificationResult = await verifyBlockchainTransaction(req.params.txHash);

    if (!verificationResult.verified) {
      return res.status(400).json({ success: false, verified: false, message: 'Transaction verification failed', details: verificationResult.error });
    }

    const transaction = await ReferralTransaction.findOne({ txHash: req.params.txHash });

    res.json({ success: true, verified: true, blockchainData: verificationResult, databaseRecord: transaction || null });
  } catch (err) {
    logger.error('Error verifying transaction', logger.reqCtx(req, err));
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
