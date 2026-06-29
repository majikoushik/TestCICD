const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { Token } = require('../models/Token');
const ConversionRule = require('../models/ConversionRule');
const { protect } = require('../middleware/auth');
const { processTokenTransaction } = require('../blockchain/contracts');
const logger = require('../utils/logger');

// Default services used as fallback when DB collection is empty
const DEFAULT_SERVICES = [
  { serviceId: 'ai-analysis-basic',    name: 'Basic AI Analysis',              description: 'Run basic AI analysis on your patient data',                     tokenCost: 10, category: 'analytics'  },
  { serviceId: 'ai-analysis-advanced', name: 'Advanced AI Analysis',           description: 'Run advanced AI analysis with predictive modeling',               tokenCost: 25, category: 'analytics'  },
  { serviceId: 'priority-referral',    name: 'Priority Referral Processing',   description: 'Get priority handling for your referrals',                       tokenCost: 5,  category: 'operations' },
  { serviceId: 'pa-fast-track',        name: 'PA Fast-Track',                  description: 'Skip the queue and get priority PA review (10 token cost)',       tokenCost: 10, category: 'priority'   },
  { serviceId: 'extended-data-access', name: 'Extended Network Data Access',   description: 'Access anonymized data from the entire network for research',    tokenCost: 50, category: 'research'   },
  { serviceId: 'premium-support',      name: 'Premium Support',                description: 'Get priority technical support',                                 tokenCost: 15, category: 'support'    },
];

// @route   GET api/tokens/balance
// @desc    Get user token balance
// @access  Private
router.get('/balance', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        tokenBalance: user.tokenBalance,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    logger.error('Get token balance error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/tokens/transactions
// @desc    Get user token transactions
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    // Get token info
    let token = await Token.findOne();
    
    if (!token) {
      // Create token if it doesn't exist
      token = new Token({
        contractAddress: `0x${require('crypto').randomBytes(20).toString('hex')}`
      });
      await token.save();
    }
    
    // Filter transactions for this user
    const userTransactions = token.transactions.filter(
      tx => tx.user.toString() === req.user.id
    );
    
    res.status(200).json({
      success: true,
      count: userTransactions.length,
      data: userTransactions.sort((a, b) => b.createdAt - a.createdAt)
    });
  } catch (error) {
    logger.error('Get token transactions error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/tokens/transfer
// @desc    Transfer tokens to another user
// @access  Private
router.post('/transfer', protect, async (req, res) => {
  try {
    const { recipientId, amount, reason } = req.body;
    
    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid recipient and amount'
      });
    }

    // Validate recipient exists before touching balances
    const recipient = await User.findById(recipientId).select('name email organization tokenBalance');
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }
    if (String(recipient._id) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: 'Cannot transfer tokens to yourself' });
    }

    // ── Atomic debit: only succeeds if sender actually has enough tokens ──────
    // Single findOneAndUpdate prevents race-condition double-spend — no separate
    // "check then write" window that two concurrent requests could both pass.
    const sender = await User.findOneAndUpdate(
      { _id: req.user.id, tokenBalance: { $gte: amount } },
      { $inc: { tokenBalance: -amount } },
      { new: true }
    );
    if (!sender) {
      return res.status(400).json({ success: false, error: 'Insufficient token balance' });
    }

    // Credit recipient
    const updatedRecipient = await User.findByIdAndUpdate(
      recipientId,
      { $inc: { tokenBalance: amount } },
      { new: true }
    );

    // Record on ledger (blockchain + Token transaction log)
    let blockchainTransaction = { transactionId: null };
    try {
      blockchainTransaction = await processTokenTransaction(
        sender._id.toString(),
        recipient._id.toString(),
        amount,
        reason || 'Token transfer',
        { transferType: 'user-to-user' }
      );
    } catch (bcErr) {
      logger.warn('Blockchain ledger write failed (balances already updated)', { error: bcErr.message });
    }

    try {
      let token = await Token.findOne();
      if (!token) {
        token = new Token({ contractAddress: `0x${require('crypto').randomBytes(20).toString('hex')}` });
      }
      token.transactions.push(
        {
          user: sender._id,
          type: 'transfer',
          amount: -amount,
          reason: reason || 'Token transfer',
          relatedEntity: { entityType: 'user', entityId: recipient._id },
          blockchainTransactionId: blockchainTransaction.transactionId,
          status: 'completed',
          balanceAfter: sender.tokenBalance,
          metadata: { recipientName: recipient.name, recipientOrganization: recipient.organization },
        },
        {
          user: recipient._id,
          type: 'earn',
          amount,
          reason: reason || 'Token transfer',
          relatedEntity: { entityType: 'user', entityId: sender._id },
          blockchainTransactionId: blockchainTransaction.transactionId,
          status: 'completed',
          balanceAfter: updatedRecipient.tokenBalance,
          metadata: { senderName: sender.name, senderOrganization: sender.organization },
        }
      );
      await token.save();
    } catch (logErr) {
      logger.warn('Token log write failed (non-fatal)', { error: logErr.message });
    }

    res.status(200).json({
      success: true,
      data: {
        amount,
        recipient: { id: recipient._id, name: recipient.name, organization: recipient.organization },
        transaction: blockchainTransaction,
        newBalance: sender.tokenBalance,
      },
    });
  } catch (error) {
    logger.error('Token transfer error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/tokens/services
// @desc    Get available services to spend tokens on
// @access  Private
router.get('/services', protect, async (req, res) => {
  try {
    let services;
    try {
      const dbRules = await ConversionRule.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
      if (dbRules.length > 0) {
        services = dbRules.map(r => ({
          id: r.serviceId, name: r.name, description: r.description,
          tokenCost: r.tokenCost, category: r.category,
        }));
      }
    } catch (_) {}
    if (!services) {
      services = DEFAULT_SERVICES.map(s => ({ id: s.serviceId, name: s.name, description: s.description, tokenCost: s.tokenCost, category: s.category }));
    }

    res.status(200).json({ success: true, count: services.length, data: services });
  } catch (error) {
    logger.error('Get services error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/tokens/earn-sources
// @desc    Get ways providers can earn tokens on the platform
// @access  Private
router.get('/earn-sources', protect, async (req, res) => {
  try {
    let policy = {};
    try {
      const TokenEarnPolicy = require('../models/TokenEarnPolicy');
      policy = await TokenEarnPolicy.getSingleton();
    } catch (_) {}

    const earnSources = [
      { id: 'complete-referral',  name: 'Complete a Referral',             description: 'Earn tokens when a referral you sent is accepted and completed',                    tokenReward: policy.referralSent       || 10, category: 'referrals',  frequency: 'per_action' },
      { id: 'accept-referral',    name: 'Accept a Referral',               description: 'Earn tokens each time you accept an incoming referral',                              tokenReward: policy.referralAccepted   || 5,  category: 'referrals',  frequency: 'per_action' },
      { id: 'complete-profile',   name: 'Complete Your Profile',           description: 'One-time bonus for completing all profile fields',                                   tokenReward: policy.profileCompleted   || 25, category: 'onboarding', frequency: 'one_time'   },
      { id: 'kyc-verified',       name: 'KYC Verification',                description: 'One-time bonus when your identity is verified by our team',                          tokenReward: policy.kycVerified        || 50, category: 'onboarding', frequency: 'one_time'   },
      { id: 'invite-colleague',   name: 'Invite a Colleague',              description: 'Earn tokens for each colleague who joins and completes onboarding',                  tokenReward: policy.inviteColleague    || 20, category: 'network',    frequency: 'per_action' },
      { id: 'data-contribution',  name: 'Contribute Anonymized Data',      description: 'Earn tokens monthly for contributing anonymized outcome data to the network',        tokenReward: policy.dataContribution   || 15, category: 'research',   frequency: 'monthly'    },
      { id: 'analytics-complete', name: 'Complete Analytics Report',       description: 'Earn tokens each time you complete and submit an analytics report',                  tokenReward: policy.analyticsCompleted || 15, category: 'research',   frequency: 'per_action' },
    ].filter(s => s.tokenReward > 0);

    res.status(200).json({ success: true, count: earnSources.length, data: earnSources });
  } catch (error) {
    logger.error('Get earn-sources error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/tokens/redeem
// @desc    Redeem tokens for a service
// @access  Private
router.post('/redeem', protect, async (req, res) => {
  try {
    const { serviceId } = req.body;
    
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid service ID'
      });
    }

    // Look up service in DB; fall back to defaults if not found
    let service = null;
    try {
      const dbRule = await ConversionRule.findOne({ serviceId, isActive: true }).lean();
      if (dbRule) service = { name: dbRule.name, tokenCost: dbRule.tokenCost, category: dbRule.category };
    } catch (_) {}
    if (!service) {
      const fallback = DEFAULT_SERVICES.find(s => s.serviceId === serviceId);
      if (fallback) service = { name: fallback.name, tokenCost: fallback.tokenCost, category: fallback.category };
    }

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    // Check if user has enough tokens
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (user.tokenBalance < service.tokenCost) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient token balance'
      });
    }

    // Process token transaction on blockchain
    const blockchainTransaction = await processTokenTransaction(
      user._id.toString(),
      'system',
      service.tokenCost,
      `Service redemption: ${service.name}`,
      { serviceId, serviceCategory: service.category }
    );

    // Update user balance
    user.tokenBalance -= service.tokenCost;
    await user.save();

    // Get token info
    let token = await Token.findOne();
    
    if (!token) {
      // Create token if it doesn't exist
      token = new Token({
        contractAddress: `0x${require('crypto').randomBytes(20).toString('hex')}`
      });
    }

    // Record transaction
    const transaction = {
      user: user._id,
      type: 'spend',
      amount: -service.tokenCost,
      reason: `Service redemption: ${service.name}`,
      relatedEntity: {
        entityType: 'service',
        entityId: null
      },
      blockchainTransactionId: blockchainTransaction.transactionId,
      status: 'completed',
      balanceAfter: user.tokenBalance,
      metadata: {
        serviceId,
        serviceName: service.name,
        serviceCategory: service.category
      }
    };

    token.transactions.push(transaction);
    await token.save();

    res.status(200).json({
      success: true,
      data: {
        service: {
          id: serviceId,
          name: service.name,
          tokenCost: service.tokenCost
        },
        transaction: blockchainTransaction,
        newBalance: user.tokenBalance
      }
    });
  } catch (error) {
    logger.error('Token redemption error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Token Staking ─────────────────────────────────────────────────────────────

const TokenStake = require('../models/TokenStake');
const STAKE_PERIODS = [30, 60, 90];
const MULTIPLIERS = { 30: 1.10, 60: 1.25, 90: 1.50 };

/**
 * POST /api/tokens/stake
 * Lock tokens for 30/60/90 days; earn bonus on completion.
 */
router.post('/stake', protect, async (req, res) => {
  try {
    const { amount, periodDays } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ success: false, error: 'amount must be >= 1' });
    if (!STAKE_PERIODS.includes(Number(periodDays))) {
      return res.status(400).json({ success: false, error: `periodDays must be one of ${STAKE_PERIODS.join(', ')}` });
    }

    const multiplier = MULTIPLIERS[periodDays];

    // Atomic: debit tokenBalance, credit stakedBalance
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, tokenBalance: { $gte: amount } },
      {
        $inc: { tokenBalance: -amount, stakedBalance: amount },
        $set: { tokenLastActivity: new Date() },
      },
      { new: true }
    );
    if (!user) return res.status(400).json({ success: false, error: 'Insufficient token balance' });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + Number(periodDays) * 24 * 60 * 60 * 1000);

    const stake = await TokenStake.create({
      userId: req.user.id,
      amount,
      periodDays: Number(periodDays),
      multiplier,
      startDate,
      endDate,
    });

    // Ledger record
    processTokenTransaction(req.user.id, 'stake_pool', amount, `Staked ${amount} CLT for ${periodDays} days (${multiplier}x)`, {
      source: 'stake', stakeId: String(stake._id),
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: {
        stake,
        newBalance: user.tokenBalance,
        stakedBalance: user.stakedBalance,
        expectedBonus: Math.floor(amount * (multiplier - 1)),
        releaseAt: endDate,
      },
    });
  } catch (error) {
    logger.error('Stake error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/tokens/stakes
 * List the caller's staking positions.
 */
router.get('/stakes', protect, async (req, res) => {
  try {
    const status = req.query.status || null;
    const filter = { userId: req.user.id, ...(status ? { status } : {}) };
    const stakes = await TokenStake.find(filter).sort({ createdAt: -1 }).lean();

    const user = await User.findById(req.user.id).select('tokenBalance stakedBalance').lean();

    res.json({
      success: true,
      data: stakes,
      summary: {
        activeCount: stakes.filter(s => s.status === 'active').length,
        totalStaked: user?.stakedBalance || 0,
        tokenBalance: user?.tokenBalance || 0,
      },
    });
  } catch (error) {
    logger.error('Get stakes error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * DELETE /api/tokens/stakes/:id
 * Early unstake — returns principal only, no bonus.
 */
router.delete('/stakes/:id', protect, async (req, res) => {
  try {
    const stake = await TokenStake.findOne({ _id: req.params.id, userId: req.user.id });
    if (!stake) return res.status(404).json({ success: false, error: 'Stake not found' });
    if (stake.status !== 'active') {
      return res.status(400).json({ success: false, error: `Cannot cancel a ${stake.status} stake` });
    }

    stake.status = 'cancelled';
    stake.cancelledAt = new Date();
    await stake.save();

    // Return principal (no bonus)
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { tokenBalance: stake.amount, stakedBalance: -stake.amount }, $set: { tokenLastActivity: new Date() } },
      { new: true }
    );

    processTokenTransaction('stake_pool', req.user.id, stake.amount, `Early unstake — ${stake.amount} CLT returned (no bonus)`, {
      source: 'unstake_early', stakeId: String(stake._id),
    }).catch(() => {});

    res.json({
      success: true,
      data: {
        stakeId: stake._id,
        returnedAmount: stake.amount,
        newBalance: user.tokenBalance,
        stakedBalance: user.stakedBalance,
        note: 'Early cancellation — bonus forfeited.',
      },
    });
  } catch (error) {
    logger.error('Unstake error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
