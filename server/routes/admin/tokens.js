/**
 * Admin Token Management Routes (MongoDB)
 *
 * Endpoints:
 *   GET    /admin/tokens/providers              — list providers with token balances
 *   GET    /admin/tokens/providers/:id/history  — token transaction history for a provider
 *   POST   /admin/tokens/mint                   — mint tokens for a provider
 *   POST   /admin/tokens/burn                   — burn tokens from a provider
 *   POST   /admin/tokens/bonus                  — award bonus tokens to a provider
 *   GET    /admin/tokens/catalog                — list redemption catalog items
 *   POST   /admin/tokens/catalog                — create a catalog item
 *   DELETE /admin/tokens/catalog/:itemId        — delete a catalog item
 *   GET    /admin/tokens/conversion-rules       — list conversion rules
 *   POST   /admin/tokens/conversion-rules       — create a conversion rule
 *   DELETE /admin/tokens/conversion-rules/:ruleId — delete a conversion rule
 *   GET    /admin/tokens/earn-policy            — get earn rate policy
 *   PUT    /admin/tokens/earn-policy            — update earn rate policy
 *   GET    /admin/tokens/analytics              — token economy analytics
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../../models/User');
const { Token } = require('../../models/Token');
const ConversionRule = require('../../models/ConversionRule');
const TokenCatalog = require('../../models/TokenCatalog');
const TokenEarnPolicy = require('../../models/TokenEarnPolicy');
const TokenOperation = require('../../models/TokenOperation');
const { processTokenTransaction } = require('../../blockchain/contracts');
const logger = require('../../utils/logger');

// Number of admin approvals required to execute mint/burn (configurable via env)
const MULTISIG_REQUIRED = parseInt(process.env.TOKEN_MULTISIG_REQUIRED || '2', 10);

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getCirculatingSupply() {
  const result = await User.aggregate([{ $group: { _id: null, total: { $sum: '$tokenBalance' } } }]);
  return result.length ? result[0].total : 0;
}

async function applyTokenOp(providerId, amount, reason, type, source, adminUserId) {
  const absAmount = Math.abs(amount);

  // Supply cap enforcement for mint/bonus operations
  if (type !== 'burn') {
    const token = await Token.findOne().lean();
    const cap = token ? token.totalSupply : 1_000_000;
    const circulating = await getCirculatingSupply();
    if (circulating + absAmount > cap) {
      throw Object.assign(
        new Error(`Mint would exceed total supply cap of ${cap.toLocaleString()} CLT (currently ${circulating.toLocaleString()} in circulation)`),
        { status: 400 }
      );
    }
  }

  // Atomic update — prevents race conditions on concurrent admin ops
  let updatedUser;
  if (type === 'burn') {
    updatedUser = await User.findOneAndUpdate(
      { _id: providerId, tokenBalance: { $gte: absAmount } },
      { $inc: { tokenBalance: -absAmount } },
      { new: true }
    );
    if (!updatedUser) {
      const u = await User.findById(providerId);
      if (!u) throw Object.assign(new Error('Provider not found'), { status: 404 });
      throw Object.assign(new Error(`Insufficient balance to burn ${absAmount} CLT (balance: ${u.tokenBalance})`), { status: 400 });
    }
  } else {
    updatedUser = await User.findByIdAndUpdate(
      providerId,
      { $inc: { tokenBalance: absAmount } },
      { new: true }
    );
    if (!updatedUser) throw Object.assign(new Error('Provider not found'), { status: 404 });
  }

  const user = updatedUser;
  const delta = type === 'burn' ? -absAmount : absAmount;

  // Record on blockchain ledger (non-fatal)
  const blockchainTx = await processTokenTransaction(
    String(user._id), 'system', absAmount,
    reason, { source, adminId: String(adminUserId) }
  ).catch(() => ({ transactionId: null }));

  let token = await Token.findOne();
  if (!token) {
    token = new Token({ contractAddress: `0x${crypto.randomBytes(20).toString('hex')}` });
  }
  token.transactions.push({
    user: user._id,
    type: type === 'burn' ? 'spend' : 'earn',
    amount: delta,
    reason,
    relatedEntity: { entityType: 'admin_operation', entityId: String(adminUserId) },
    blockchainTransactionId: blockchainTx.transactionId,
    status: 'completed',
    balanceAfter: user.tokenBalance,
    metadata: { source, adminId: String(adminUserId) },
  });
  await token.save();
  return { newBalance: user.tokenBalance, transactionId: blockchainTx.transactionId };
}

// ── Providers ─────────────────────────────────────────────────────────────────

// GET /admin/tokens/providers
router.get('/providers', async (req, res) => {
  try {
    const PROVIDER_ROLES = ['doctor', 'lab', 'clinic', 'hospital', 'provider', 'nurse'];
    const providers = await User.find({ role: { $in: PROVIDER_ROLES }, isActive: true })
      .select('name firstName lastName email organization specialty tokenBalance walletAddress createdAt isActive role')
      .sort({ tokenBalance: -1 })
      .lean();

    // Attach last transaction date from Token ledger
    const token = await Token.findOne().lean();
    const lastTxMap = {};
    if (token && token.transactions) {
      for (const tx of token.transactions) {
        const uid = String(tx.user);
        if (!lastTxMap[uid] || new Date(tx.createdAt) > new Date(lastTxMap[uid])) {
          lastTxMap[uid] = tx.createdAt;
        }
      }
    }

    const data = providers.map(p => ({
      id: String(p._id),
      name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      email: p.email,
      organization: p.organization || '',
      specialty: p.specialty || '',
      role: p.role || '',
      tokenBalance: p.tokenBalance || 0,
      walletAddress: p.walletAddress || null,
      lastTransaction: lastTxMap[String(p._id)] || null,
      joinedAt: p.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Admin tokens: get providers error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /admin/tokens/providers/:id/history
router.get('/providers/:id/history', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('name email tokenBalance').lean();
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const token = await Token.findOne().lean();
    const txs = (token && token.transactions || [])
      .filter(tx => String(tx.user) === userId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map(tx => ({
        id: String(tx._id),
        type: tx.type,
        amount: tx.amount,
        reason: tx.reason,
        status: tx.status,
        balanceAfter: tx.balanceAfter,
        metadata: tx.metadata || {},
        createdAt: tx.createdAt,
      }));

    res.json({ success: true, data: txs, provider: { id: userId, name: user.name, email: user.email, tokenBalance: user.tokenBalance } });
  } catch (err) {
    logger.error('Admin tokens: get provider history error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Mint / Burn / Bonus ───────────────────────────────────────────────────────

// POST /admin/tokens/mint — creates pending multi-sig operation (requires MULTISIG_REQUIRED approvals)
router.post('/mint', async (req, res) => {
  try {
    const { providerId, amount, reason } = req.body;
    if (!providerId || !amount || amount <= 0) return res.status(400).json({ success: false, error: 'providerId and positive amount are required' });

    const provider = await User.findById(providerId).select('name email').lean();
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    // Single-admin mode (TOKEN_MULTISIG_REQUIRED=1 or 0): execute immediately
    if (MULTISIG_REQUIRED <= 1) {
      const result = await applyTokenOp(providerId, amount, reason || 'Admin mint', 'mint', 'admin_mint', req.user.id);
      return res.json({ success: true, data: result, multisig: false });
    }

    // Create pending operation — first approval auto-added from creator
    const op = await TokenOperation.create({
      type: 'mint',
      providerId,
      providerName: provider.name || provider.email,
      amount,
      reason: reason || 'Admin mint',
      requiredApprovals: MULTISIG_REQUIRED,
      createdBy: String(req.user.id),
      approvals: [{ adminId: String(req.user.id), adminName: req.user.name || req.user.email }],
    });
    res.status(202).json({
      success: true,
      multisig: true,
      message: `Mint operation queued. Requires ${MULTISIG_REQUIRED - 1} more approval(s) to execute.`,
      data: { operationId: op._id, approvals: 1, required: MULTISIG_REQUIRED },
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// POST /admin/tokens/burn — creates pending multi-sig operation
router.post('/burn', async (req, res) => {
  try {
    const { providerId, amount, reason } = req.body;
    if (!providerId || !amount || amount <= 0) return res.status(400).json({ success: false, error: 'providerId and positive amount are required' });

    const provider = await User.findById(providerId).select('name email tokenBalance').lean();
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });
    if (provider.tokenBalance < amount) return res.status(400).json({ success: false, error: `Insufficient balance (${provider.tokenBalance} CLT)` });

    if (MULTISIG_REQUIRED <= 1) {
      const result = await applyTokenOp(providerId, amount, reason || 'Admin burn', 'burn', 'admin_burn', req.user.id);
      return res.json({ success: true, data: result, multisig: false });
    }

    const op = await TokenOperation.create({
      type: 'burn',
      providerId,
      providerName: provider.name || provider.email,
      amount,
      reason: reason || 'Admin burn',
      requiredApprovals: MULTISIG_REQUIRED,
      createdBy: String(req.user.id),
      approvals: [{ adminId: String(req.user.id), adminName: req.user.name || req.user.email }],
    });
    res.status(202).json({
      success: true,
      multisig: true,
      message: `Burn operation queued. Requires ${MULTISIG_REQUIRED - 1} more approval(s) to execute.`,
      data: { operationId: op._id, approvals: 1, required: MULTISIG_REQUIRED },
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// POST /admin/tokens/bonus
router.post('/bonus', async (req, res) => {
  try {
    const { providerId, amount, reason } = req.body;
    if (!providerId || !amount || amount <= 0) return res.status(400).json({ success: false, error: 'providerId and positive amount are required' });
    const result = await applyTokenOp(providerId, amount, reason || 'Admin bonus', 'bonus', 'admin_bonus', req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ── Catalog (TokenCatalog CRUD) ───────────────────────────────────────────────

// GET /admin/tokens/catalog
router.get('/catalog', async (req, res) => {
  try {
    const items = await TokenCatalog.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    const data = items.map(r => ({
      id: String(r._id),
      _id: String(r._id),
      serviceId: r.serviceId,
      name: r.name,
      description: r.description,
      category: r.category,
      tokenCost: r.tokenCost,
      features: r.features || [],
      tier: r.tier || 'standard',
      iconName: r.iconName || '',
      isActive: r.isActive,
      sortOrder: r.sortOrder,
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /admin/tokens/catalog
router.post('/catalog', async (req, res) => {
  try {
    const { serviceId, name, description, category, tokenCost, features, tier, iconName, sortOrder } = req.body;
    if (!serviceId || !name || !tokenCost) return res.status(400).json({ success: false, error: 'serviceId, name, and tokenCost are required' });
    const item = await TokenCatalog.create({ serviceId, name, description, category, tokenCost, features: features || [], tier: tier || 'standard', iconName: iconName || '', sortOrder: sortOrder || 0 });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A catalog item with that service ID already exists' });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /admin/tokens/catalog/:itemId
router.put('/catalog/:itemId', async (req, res) => {
  try {
    const ALLOWED = ['name', 'description', 'category', 'tokenCost', 'features', 'tier', 'iconName', 'sortOrder', 'isActive'];
    const updates = {};
    for (const f of ALLOWED) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const item = await TokenCatalog.findByIdAndUpdate(req.params.itemId, { $set: updates }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, error: 'Catalog item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /admin/tokens/catalog/:itemId
router.delete('/catalog/:itemId', async (req, res) => {
  try {
    const item = await TokenCatalog.findByIdAndDelete(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Catalog item not found' });
    res.json({ success: true, message: 'Catalog item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Conversion Rules (ConversionRule CRUD — spend-rate rules) ─────────────────

// GET /admin/tokens/conversion-rules
router.get('/conversion-rules', async (req, res) => {
  try {
    const rules = await ConversionRule.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    const data = rules.map(r => ({
      id: String(r._id),
      _id: String(r._id),
      service: r.name,
      serviceId: r.serviceId,
      tokenAmount: r.tokenCost,
      description: r.description,
      category: r.category,
      isActive: r.isActive,
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /admin/tokens/conversion-rules
router.post('/conversion-rules', async (req, res) => {
  try {
    const { service, serviceId, tokenAmount, description, category } = req.body;
    const svcId = serviceId || (service || '').toLowerCase().replace(/\s+/g, '-');
    if (!svcId || !tokenAmount) return res.status(400).json({ success: false, error: 'serviceId and tokenAmount are required' });
    const rule = await ConversionRule.create({ serviceId: svcId, name: service || svcId, description, category, tokenCost: tokenAmount });
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'A rule with that service ID already exists' });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /admin/tokens/conversion-rules/:ruleId
router.put('/conversion-rules/:ruleId', async (req, res) => {
  try {
    const ALLOWED = ['name', 'description', 'category', 'tokenCost', 'sortOrder', 'isActive'];
    const updates = {};
    for (const f of ALLOWED) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (req.body.tokenAmount !== undefined) updates.tokenCost = req.body.tokenAmount;
    const rule = await ConversionRule.findByIdAndUpdate(req.params.ruleId, { $set: updates }, { new: true, runValidators: true });
    if (!rule) return res.status(404).json({ success: false, error: 'Conversion rule not found' });
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /admin/tokens/conversion-rules/:ruleId
router.delete('/conversion-rules/:ruleId', async (req, res) => {
  try {
    const rule = await ConversionRule.findByIdAndDelete(req.params.ruleId);
    if (!rule) return res.status(404).json({ success: false, error: 'Conversion rule not found' });
    res.json({ success: true, message: 'Conversion rule deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Earn Policy ───────────────────────────────────────────────────────────────

// GET /admin/tokens/earn-policy
router.get('/earn-policy', async (req, res) => {
  try {
    const policy = await TokenEarnPolicy.getSingleton();
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /admin/tokens/earn-policy
router.put('/earn-policy', async (req, res) => {
  try {
    const ALLOWED_FIELDS = ['referralSent', 'referralAccepted', 'kycVerified', 'profileCompleted', 'inviteColleague', 'dataContribution', 'analyticsCompleted', 'dtxCompleted', 'appointmentCompleted'];
    const updates = {};
    for (const f of ALLOWED_FIELDS) {
      if (req.body[f] !== undefined) updates[f] = Number(req.body[f]);
    }
    const policy = await TokenEarnPolicy.findOneAndUpdate(
      { _singleton: 'global' },
      { $set: updates },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /admin/tokens/analytics
router.get('/analytics', async (req, res) => {
  try {
    const [allUsers, token] = await Promise.all([
      User.find({ role: 'provider' }).select('name email tokenBalance').lean(),
      Token.findOne().lean(),
    ]);

    const totalCirculating = allUsers.reduce((s, u) => s + (u.tokenBalance || 0), 0);
    const txs = (token && token.transactions) || [];

    const now = Date.now();
    const MS_30 = 30 * 24 * 60 * 60 * 1000;
    const MS_90 = 90 * 24 * 60 * 60 * 1000;

    const recent30 = txs.filter(t => new Date(t.createdAt) > new Date(now - MS_30));
    const earned30 = recent30.filter(t => t.type === 'earn').reduce((s, t) => s + (t.amount || 0), 0);
    const spent30  = recent30.filter(t => t.type === 'spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);

    // Top earners
    const topEarners = [...allUsers].sort((a, b) => (b.tokenBalance || 0) - (a.tokenBalance || 0)).slice(0, 10).map(u => ({ name: u.name, email: u.email, tokenBalance: u.tokenBalance }));

    // Most redeemed services
    const serviceCount = {};
    for (const tx of txs) {
      if (tx.type === 'spend' && tx.metadata && tx.metadata.serviceId) {
        serviceCount[tx.metadata.serviceId] = (serviceCount[tx.metadata.serviceId] || 0) + 1;
      }
    }
    const topServices = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([serviceId, count]) => ({ serviceId, count }));

    // Stale balances (>0 balance, no spend in last 90 days)
    const spentIn90 = new Set(txs.filter(t => t.type === 'spend' && new Date(t.createdAt) > new Date(now - MS_90)).map(t => String(t.user)));
    const staleCount = allUsers.filter(u => (u.tokenBalance || 0) > 0 && !spentIn90.has(String(u._id))).length;

    res.json({
      success: true,
      data: {
        totalCirculating,
        earned30Days: earned30,
        spent30Days: spent30,
        netVelocity30Days: earned30 - spent30,
        totalTransactions: txs.length,
        topEarners,
        topServices,
        staleBalanceProviders: staleCount,
      },
    });
  } catch (err) {
    logger.error('Admin tokens: analytics error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
