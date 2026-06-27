const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { Token } = require('../models/Token');
const { protect } = require('../middleware/auth');
const { processTokenTransaction } = require('../blockchain/contracts');
const logger = require('../utils/logger');

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

    // Check if sender has enough tokens
    const sender = await User.findById(req.user.id);
    if (!sender) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (sender.tokenBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient token balance'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    // Process token transaction on blockchain (outside DB session — cannot roll back blockchain)
    const blockchainTransaction = await processTokenTransaction(
      sender._id.toString(),
      recipient._id.toString(),
      amount,
      reason || 'Token transfer',
      { transferType: 'user-to-user' }
    );

    // Wrap all DB writes in a single transaction so a mid-flight failure cannot
    // leave balances inconsistent (sender debited, recipient not credited).
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        sender.tokenBalance -= amount;
        await sender.save({ session });

        recipient.tokenBalance += amount;
        await recipient.save({ session });

        let token = await Token.findOne().session(session);
        if (!token) {
          token = new Token({
            contractAddress: `0x${require('crypto').randomBytes(20).toString('hex')}`,
          });
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
            balanceAfter: recipient.tokenBalance,
            metadata: { senderName: sender.name, senderOrganization: sender.organization },
          }
        );
        await token.save({ session });
      });
    } finally {
      await session.endSession();
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
    // In a real system, these would be dynamic and stored in the database
    const services = [
      {
        id: 'ai-analysis-basic',
        name: 'Basic AI Analysis',
        description: 'Run basic AI analysis on your patient data',
        tokenCost: 10,
        category: 'analytics'
      },
      {
        id: 'ai-analysis-advanced',
        name: 'Advanced AI Analysis',
        description: 'Run advanced AI analysis with predictive modeling',
        tokenCost: 25,
        category: 'analytics'
      },
      {
        id: 'priority-referral',
        name: 'Priority Referral Processing',
        description: 'Get priority handling for your referrals',
        tokenCost: 5,
        category: 'operations'
      },
      {
        id: 'extended-data-access',
        name: 'Extended Network Data Access',
        description: 'Access anonymized data from the entire network for research',
        tokenCost: 50,
        category: 'research'
      },
      {
        id: 'premium-support',
        name: 'Premium Support',
        description: 'Get priority technical support',
        tokenCost: 15,
        category: 'support'
      }
    ];

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    logger.error('Get services error', logger.reqCtx(req, error));
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

    // In a real system, this would fetch the service from the database
    // For now, we'll use a hardcoded list
    const services = {
      'ai-analysis-basic': {
        name: 'Basic AI Analysis',
        tokenCost: 10,
        category: 'analytics'
      },
      'ai-analysis-advanced': {
        name: 'Advanced AI Analysis',
        tokenCost: 25,
        category: 'analytics'
      },
      'priority-referral': {
        name: 'Priority Referral Processing',
        tokenCost: 5,
        category: 'operations'
      },
      'extended-data-access': {
        name: 'Extended Network Data Access',
        tokenCost: 50,
        category: 'research'
      },
      'premium-support': {
        name: 'Premium Support',
        tokenCost: 15,
        category: 'support'
      }
    };

    const service = services[serviceId];
    
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

module.exports = router;
