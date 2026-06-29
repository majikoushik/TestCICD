/**
 * Admin Blockchain Routes
 *
 * GET  /admin/blockchain/status           — chain stats + genesis info
 * GET  /admin/blockchain/integrity        — full chain integrity audit
 * GET  /admin/blockchain/transactions     — paginated ledger view
 * GET  /admin/blockchain/transactions/:id — single transaction detail
 *
 * Multi-sig token operations (mint/burn require 2-of-N admin approvals):
 * GET  /admin/blockchain/operations               — list pending operations
 * POST /admin/blockchain/operations/:id/approve   — approve a pending operation
 * POST /admin/blockchain/operations/:id/reject    — reject a pending operation
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const BlockchainTransaction = require('../../models/BlockchainTransaction');
const TokenOperation        = require('../../models/TokenOperation');
const User                  = require('../../models/User');
const { Token }             = require('../../models/Token');
const { processTokenTransaction } = require('../../blockchain/contracts');
const polygon = require('../../blockchain/polygon');
const logger = require('../../utils/logger');

// ── Chain Status ──────────────────────────────────────────────────────────────

router.get('/status', async (req, res) => {
  try {
    const [total, genesis, tip] = await Promise.all([
      BlockchainTransaction.countDocuments(),
      BlockchainTransaction.findOne({ type: 'genesis' }).lean(),
      BlockchainTransaction.findOne().sort({ blockNumber: -1, createdAt: -1 }).lean(),
    ]);
    const isLiveChain = Boolean(process.env.POLYGON_RPC_URL && process.env.CLINICTOKEN_ADDRESS);
    res.json({
      success: true,
      data: {
        mode: isLiveChain ? 'polygon' : 'ledger',
        network: isLiveChain ? (process.env.POLYGON_NETWORK || 'amoy') : 'internal',
        contractAddress: isLiveChain ? process.env.CLINICTOKEN_ADDRESS : null,
        totalTransactions: total,
        currentBlock: tip ? tip.blockNumber : 0,
        genesisHash: genesis ? genesis.hash : null,
        chainTipHash: tip ? tip.hash : null,
        chainTipAt: tip ? tip.timestamp : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Chain Integrity Audit ──────────────────────────────────────────────────────

router.get('/integrity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
    const txs = await BlockchainTransaction.find().sort({ blockNumber: 1, createdAt: 1 }).limit(limit).lean();

    let broken = 0;
    const issues = [];

    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];

      // 1. Recompute hash
      const hashInput = JSON.stringify({ ...tx.data, previousHash: tx.previousHash, blockNumber: tx.blockNumber });
      const recomputed = crypto.createHash('sha256').update(hashInput).digest('hex');
      const hashOk = recomputed === tx.hash;

      // 2. Check previousHash links to actual previous record
      let linkOk = true;
      if (i === 0) {
        // Genesis or first record — previousHash should be 'genesis' or null
        linkOk = tx.previousHash === 'genesis' || tx.previousHash === null;
      } else {
        linkOk = txs[i - 1].hash === tx.previousHash;
      }

      if (!hashOk || !linkOk) {
        broken++;
        issues.push({
          transactionId: tx.transactionId,
          blockNumber: tx.blockNumber,
          hashOk,
          linkOk,
          expected: i > 0 ? txs[i - 1].hash : 'genesis',
          got: tx.previousHash,
        });
      }
    }

    res.json({
      success: true,
      data: {
        audited: txs.length,
        intact: txs.length - broken,
        broken,
        valid: broken === 0,
        issues: issues.slice(0, 50), // cap at 50 for response size
      },
    });
  } catch (err) {
    logger.error('Chain integrity audit error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Ledger Browser ────────────────────────────────────────────────────────────

router.get('/transactions', async (req, res) => {
  try {
    const page  = Math.max(0, parseInt(req.query.page) || 0);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const type  = req.query.type || null;
    const filter = type ? { type } : {};

    const [txs, total] = await Promise.all([
      BlockchainTransaction.find(filter).sort({ blockNumber: -1, createdAt: -1 }).skip(page * limit).limit(limit).lean(),
      BlockchainTransaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: txs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/transactions/:txId', async (req, res) => {
  try {
    const tx = await BlockchainTransaction.findOne({ transactionId: req.params.txId }).lean();
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });

    // Inline verification
    const { verifyBlockchainTransaction } = require('../../utils/blockchain');
    const verification = await verifyBlockchainTransaction(req.params.txId);

    res.json({ success: true, data: { ...tx, verification } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Multi-sig Operations ──────────────────────────────────────────────────────

// GET /admin/blockchain/operations
router.get('/operations', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const ops = await TokenOperation.find({ status })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: ops });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /admin/blockchain/operations/:id/approve
router.post('/operations/:id/approve', async (req, res) => {
  try {
    const op = await TokenOperation.findById(req.params.id);
    if (!op) return res.status(404).json({ success: false, error: 'Operation not found' });
    if (op.status !== 'pending') return res.status(400).json({ success: false, error: `Operation is already ${op.status}` });
    if (new Date() > op.expiresAt) {
      op.status = 'expired'; await op.save();
      return res.status(400).json({ success: false, error: 'Operation has expired' });
    }
    if (op.approvals.some(a => a.adminId === String(req.user.id))) {
      return res.status(400).json({ success: false, error: 'You have already approved this operation' });
    }

    op.approvals.push({ adminId: String(req.user.id), adminName: req.user.name || req.user.email });

    if (op.approvals.length >= op.requiredApprovals) {
      // Execute the operation
      op.status = 'approved';
      await op.save();

      try {
        // Atomic balance update
        const absAmount = Math.abs(op.amount);
        let updatedUser;
        let onChainResult = null;

        if (op.type === 'burn') {
          updatedUser = await User.findOneAndUpdate(
            { _id: op.providerId, tokenBalance: { $gte: absAmount } },
            { $inc: { tokenBalance: -absAmount } },
            { new: true }
          );
          if (!updatedUser) throw new Error('Insufficient balance for burn');

          // Attempt on-chain burn using stored key (approve + burn atomically)
          if (polygon.isConfigured()) {
            try {
              onChainResult = await polygon.burnOnChainWithStoredKey(op.providerId, absAmount, op.reason);
            } catch (polyErr) {
              logger.warn('On-chain burn failed — balance already deducted in ledger', { error: polyErr.message, opId: op._id });
              onChainResult = { txHash: null, mock: true, error: polyErr.message };
            }
          }
        } else {
          updatedUser = await User.findByIdAndUpdate(op.providerId, { $inc: { tokenBalance: absAmount } }, { new: true });
          if (!updatedUser) throw new Error('Provider not found');
        }

        // Record on ledger
        const blockchainTx = await processTokenTransaction(
          String(op.providerId), 'system', absAmount,
          `${op.type === 'burn' ? 'Admin burn' : 'Admin mint'}: ${op.reason}`,
          { source: `multisig_${op.type}`, operationId: String(op._id), approvers: op.approvals.map(a => a.adminId) }
        ).catch(() => ({ transactionId: null }));

        let token = await Token.findOne();
        if (!token) token = new Token({ contractAddress: `0x${crypto.randomBytes(20).toString('hex')}` });
        token.transactions.push({
          user: op.providerId,
          type: op.type === 'burn' ? 'spend' : 'earn',
          amount: op.type === 'burn' ? -absAmount : absAmount,
          reason: `Multi-sig ${op.type}: ${op.reason}`,
          relatedEntity: { entityType: 'admin_operation', entityId: String(op._id) },
          blockchainTransactionId: blockchainTx.transactionId,
          status: 'completed',
          balanceAfter: updatedUser.tokenBalance,
          metadata: { source: `multisig_${op.type}`, operationId: String(op._id) },
        });
        await token.save();

        op.status = 'executed';
        op.executedAt = new Date();
        op.executedTxId = blockchainTx.transactionId;
        await op.save();

        res.json({ success: true, message: 'Operation approved and executed', data: { operationId: op._id, newBalance: updatedUser.tokenBalance, txId: blockchainTx.transactionId } });
      } catch (execErr) {
        op.status = 'pending'; // roll back status
        await op.save();
        logger.error('Multi-sig execution failed', { error: execErr.message, opId: op._id });
        return res.status(500).json({ success: false, error: `Execution failed: ${execErr.message}` });
      }
    } else {
      await op.save();
      res.json({ success: true, message: `Approval recorded (${op.approvals.length}/${op.requiredApprovals} needed)`, data: { operationId: op._id, approvals: op.approvals.length, required: op.requiredApprovals } });
    }
  } catch (err) {
    logger.error('Operation approve error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Allowance Management ──────────────────────────────────────────────────────

/**
 * GET /admin/blockchain/allowance/:providerId
 * Returns the current on-chain ERC-20 allowance that a provider has granted to
 * the platform wallet, plus whether it's sufficient for any pending burns.
 *
 * In ledger (non-Polygon) mode returns null allowance with a clear note —
 * allowance is not required for MongoDB-based burns.
 */
router.get('/allowance/:providerId', async (req, res) => {
  try {
    const provider = await User.findById(req.params.providerId).select('name email walletAddress tokenBalance').lean();
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    const isLive = polygon.isConfigured();
    const platformWallet = process.env.PRIVATE_KEY
      ? (() => { try { const { ethers } = require('ethers'); return new ethers.Wallet(process.env.PRIVATE_KEY).address; } catch { return null; } })()
      : null;

    // Pending burn total for this provider
    const pendingBurns = await TokenOperation.find({ providerId: req.params.providerId, type: 'burn', status: 'pending' }).lean();
    const pendingBurnTotal = pendingBurns.reduce((s, op) => s + op.amount, 0);

    let onChainAllowance = null;
    let allowanceSufficient = null;

    if (isLive && provider.walletAddress && platformWallet) {
      onChainAllowance = await polygon.getOnChainAllowance(provider.walletAddress, platformWallet);
      allowanceSufficient = onChainAllowance !== null && onChainAllowance >= pendingBurnTotal;
    }

    res.json({
      success: true,
      data: {
        provider: { id: req.params.providerId, name: provider.name, email: provider.email, walletAddress: provider.walletAddress },
        mode: isLive ? 'polygon' : 'ledger',
        platformWallet,
        onChainAllowance,
        allowanceSufficient,
        pendingBurnTotal,
        pendingBurns: pendingBurns.length,
        note: isLive
          ? 'ERC-20 allowance required for on-chain admin burns. Provider must call approve() or use stored key flow.'
          : 'Ledger mode — allowance not required. Admin burns execute directly via MongoDB.',
      },
    });
  } catch (err) {
    logger.error('Allowance check error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /admin/blockchain/allowance/:providerId/approve
 * Uses the stored encrypted private key to sign an on-chain approve() transaction
 * on behalf of the provider, granting the platform wallet an allowance.
 * Only works when POLYGON_RPC_URL + CLINICTOKEN_ADDRESS + WALLET_ENCRYPTION_KEY are set.
 */
router.post('/allowance/:providerId/approve', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'amount required' });

    if (!polygon.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Polygon not configured — allowance not required in ledger mode.',
      });
    }

    const provider = await User.findById(req.params.providerId).select('name email walletAddress').lean();
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    const result = await polygon.burnOnChainWithStoredKey.__approveOnly
      ? polygon.burnOnChainWithStoredKey.__approveOnly(req.params.providerId, amount)
      : null;

    // Use the exported approveFromPrivateKey directly via stored key
    const { decryptPrivateKey } = require('../../blockchain/identity');
    const Wallet = require('../../models/Wallet');
    const walletDoc = await Wallet.findOne({ userId: String(req.params.providerId) }).select('+encryptedPrivateKey').lean();
    if (!walletDoc?.encryptedPrivateKey) {
      return res.status(400).json({ success: false, error: 'No encrypted private key stored for this provider.' });
    }
    const privateKey = decryptPrivateKey(walletDoc.encryptedPrivateKey);
    if (!privateKey) return res.status(500).json({ success: false, error: 'Failed to decrypt key — check WALLET_ENCRYPTION_KEY' });

    const { ethers } = require('ethers');
    const platformWallet = new ethers.Wallet(process.env.PRIVATE_KEY).address;
    const approveTx = await polygon.approveFromPrivateKey(privateKey, platformWallet, amount);

    logger.info('Admin-initiated provider approval', { providerId: req.params.providerId, amount, txHash: approveTx.txHash });
    res.json({ success: true, message: 'Approval transaction submitted', data: { txHash: approveTx.txHash, amount } });
  } catch (err) {
    logger.error('Provider approve error', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /admin/blockchain/operations/:id/reject
router.post('/operations/:id/reject', async (req, res) => {
  try {
    const op = await TokenOperation.findById(req.params.id);
    if (!op) return res.status(404).json({ success: false, error: 'Operation not found' });
    if (op.status !== 'pending') return res.status(400).json({ success: false, error: `Operation is already ${op.status}` });

    op.rejections.push({ adminId: String(req.user.id), adminName: req.user.name || req.user.email, reason: req.body.reason || '' });
    op.status = 'rejected';
    await op.save();

    res.json({ success: true, message: 'Operation rejected', data: { operationId: op._id } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
