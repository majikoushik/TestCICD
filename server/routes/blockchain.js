/**
 * User-facing Blockchain Routes
 *
 * Lets a logged-in provider view the ledger entries they're a participant in
 * (referrals they sent/received, token transfers/rewards, consent grants).
 * Backed by the same BlockchainTransaction ledger the admin ledger browser
 * uses (server/routes/admin/blockchain.js) — just filtered to the caller.
 *
 * GET /blockchain/transactions      — paginated, user-scoped transaction history
 * GET /blockchain/transactions/:id  — single transaction detail (must be a participant)
 */

const express = require('express');
const router = express.Router();
const BlockchainTransaction = require('../models/BlockchainTransaction');
const { protect } = require('../middleware/auth');
const { verifyBlockchainTransaction } = require('../utils/blockchain');
const logger = require('../utils/logger');

router.use(protect);

// Map a raw ledger record + resolved provider ids into the shape the client renders
function toClientTransaction(tx, resolved = {}) {
  const { type, data = {} } = tx;
  let event = 'Other';
  let from = resolved.from || null;
  let to = resolved.to || null;

  if (type === 'referral') {
    event = 'ReferralCreated';
    from = data.referringProviderId;
    to = data.receivingProviderId;
  } else if (type === 'referral_update') {
    const statusToEvent = {
      accepted: 'ReferralAccepted',
      rejected: 'ReferralRejected',
      completed: 'ReferralCompleted',
      cancelled: 'ReferralCancelled',
    };
    event = statusToEvent[data.status] || 'ReferralUpdated';
  } else if (type === 'token') {
    event = data.fromUserId === 'system' ? 'TokenReward' : 'TokenTransfer';
    from = data.fromUserId;
    to = data.toUserId;
  } else if (type === 'consent') {
    event = 'ConsentGranted';
    from = data.providerId;
    to = data.patientId;
  }

  return {
    hash: tx.transactionId,
    event,
    blockNumber: tx.blockNumber,
    from,
    to,
    timestamp: tx.timestamp,
    status: 'Confirmed',
    type,
  };
}

// Find every referral-ledger transactionId the user participated in (as referring
// or receiving provider), so we can also pull the follow-up referral_update entries
// (accept/reject/complete/cancel), which don't store provider ids directly.
async function getUserReferralTxIds(userId) {
  const refTxs = await BlockchainTransaction.find({
    type: 'referral',
    $or: [
      { 'data.referringProviderId': userId },
      { 'data.receivingProviderId': userId },
    ],
  }).select('transactionId data').lean();

  const idToProviders = new Map(
    refTxs.map((tx) => [tx.transactionId, {
      from: tx.data.referringProviderId,
      to: tx.data.receivingProviderId,
    }])
  );
  return { txIds: refTxs.map((tx) => tx.transactionId), idToProviders };
}

// GET /api/blockchain/transactions
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(0, parseInt(req.query.page, 10) || 0);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const { txIds: referralTxIds, idToProviders } = await getUserReferralTxIds(userId);

    const filter = {
      $or: [
        { type: 'referral', 'data.referringProviderId': userId },
        { type: 'referral', 'data.receivingProviderId': userId },
        { type: 'referral_update', 'data.originalTransactionId': { $in: referralTxIds } },
        { type: 'token', 'data.fromUserId': userId },
        { type: 'token', 'data.toUserId': userId },
        { type: 'consent', 'data.providerId': userId },
      ],
    };

    const [txs, total] = await Promise.all([
      BlockchainTransaction.find(filter)
        .sort({ blockNumber: -1, createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .lean(),
      BlockchainTransaction.countDocuments(filter),
    ]);

    const data = txs.map((tx) => {
      const resolved = tx.type === 'referral_update'
        ? idToProviders.get(tx.data.originalTransactionId)
        : undefined;
      return toClientTransaction(tx, resolved);
    });

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      data,
    });
  } catch (error) {
    logger.error('Get user blockchain transactions error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/blockchain/transactions/:hash
router.get('/transactions/:hash', async (req, res) => {
  try {
    const userId = req.user.id;
    const tx = await BlockchainTransaction.findOne({ transactionId: req.params.hash }).lean();
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    let resolved;
    let isParticipant = false;

    if (tx.type === 'referral') {
      isParticipant = tx.data.referringProviderId === userId || tx.data.receivingProviderId === userId;
    } else if (tx.type === 'referral_update') {
      const original = await BlockchainTransaction.findOne({ transactionId: tx.data.originalTransactionId }).lean();
      if (original) {
        resolved = { from: original.data.referringProviderId, to: original.data.receivingProviderId };
        isParticipant = original.data.referringProviderId === userId || original.data.receivingProviderId === userId;
      }
    } else if (tx.type === 'token') {
      isParticipant = tx.data.fromUserId === userId || tx.data.toUserId === userId;
    } else if (tx.type === 'consent') {
      isParticipant = tx.data.providerId === userId;
    }

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'You are not authorized to view this transaction' });
    }

    const verification = await verifyBlockchainTransaction(tx.transactionId);

    res.status(200).json({
      success: true,
      data: {
        ...toClientTransaction(tx, resolved),
        confirmations: verification.confirmations ?? (verification.verified ? 1 : 0),
        decodedData: tx.data,
        hashDigest: tx.hash,
        previousHash: tx.previousHash,
        verification,
      },
    });
  } catch (error) {
    logger.error('Get user blockchain transaction detail error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
