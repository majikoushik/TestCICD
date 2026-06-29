/**
 * Token Maintenance Job
 *
 * Runs on a schedule (default: every 6 hours).  Performs two operations:
 *
 * 1. STAKE RELEASE — finds active stakes whose endDate has passed, pays out
 *    principal + bonus back to tokenBalance, marks them completed.
 *
 * 2. TOKEN EXPIRY — finds providers with tokenBalance > 0 whose
 *    tokenLastActivity is more than TOKEN_EXPIRY_DAYS old (default: 365).
 *    Sets their balance to zero and records the expiry on the ledger so the
 *    total-supply accounting stays consistent.
 *    Set TOKEN_EXPIRY_DAYS=0 in .env to disable expiry entirely.
 */

const logger = require('../utils/logger');

const TOKEN_EXPIRY_DAYS = parseInt(process.env.TOKEN_EXPIRY_DAYS || '365', 10);

async function releaseMaturedStakes() {
  const TokenStake = require('../models/TokenStake');
  const User       = require('../models/User');
  const { processTokenTransaction } = require('../blockchain/contracts');

  const matured = await TokenStake.find({
    status: 'active',
    endDate: { $lte: new Date() },
  });

  let released = 0;
  for (const stake of matured) {
    try {
      const bonusAmount  = Math.floor(stake.amount * (stake.multiplier - 1));
      const totalReturn  = stake.amount + bonusAmount;

      const user = await User.findByIdAndUpdate(
        stake.userId,
        {
          $inc: { tokenBalance: totalReturn, stakedBalance: -stake.amount },
          $set: { tokenLastActivity: new Date() },
        },
        { new: true }
      );
      if (!user) { logger.warn('Stake release: user not found', { stakeId: stake._id }); continue; }

      stake.status      = 'completed';
      stake.completedAt = new Date();
      stake.bonusAmount = bonusAmount;

      // Record bonus earn on ledger
      if (bonusAmount > 0) {
        const txResult = await processTokenTransaction(
          'system', stake.userId, bonusAmount,
          `Staking bonus (${stake.periodDays}-day stake at ${stake.multiplier}x)`,
          { source: 'stake_bonus', stakeId: String(stake._id) }
        ).catch(err => { logger.warn('Stake bonus ledger tx failed', { error: err.message }); return { transactionId: null }; });
        stake.releaseTxId = txResult.transactionId;
      }

      await stake.save();
      released++;
      logger.info('Stake released', {
        stakeId: stake._id, userId: stake.userId,
        principal: stake.amount, bonus: bonusAmount, newBalance: user.tokenBalance,
      });
    } catch (err) {
      logger.error('Stake release error', { stakeId: stake._id, error: err.message });
    }
  }
  return released;
}

async function expireStaleTokens() {
  if (TOKEN_EXPIRY_DAYS <= 0) return 0;

  const User = require('../models/User');
  const { processTokenTransaction } = require('../blockchain/contracts');

  const cutoff = new Date(Date.now() - TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Find providers with positive balance and no recent activity
  const stale = await User.find({
    tokenBalance: { $gt: 0 },
    tokenLastActivity: { $lt: cutoff },
    role: { $nin: ['admin', 'superadmin'] },
  }).select('_id name email tokenBalance').lean();

  let expired = 0;
  for (const user of stale) {
    try {
      const amount = user.tokenBalance;
      await User.findByIdAndUpdate(user._id, {
        $set: { tokenBalance: 0, tokenLastActivity: new Date() },
      });

      // Record expiry on ledger (fire-and-forget)
      processTokenTransaction(
        String(user._id), 'expired', amount,
        `Token expiry — ${TOKEN_EXPIRY_DAYS} days of inactivity`,
        { source: 'token_expiry', expiredBalance: amount }
      ).catch(() => {});

      expired++;
      logger.info('Tokens expired', { userId: user._id, amount });
    } catch (err) {
      logger.error('Token expiry error', { userId: user._id, error: err.message });
    }
  }
  return expired;
}

async function runTokenMaintenance() {
  const start = Date.now();
  logger.info('[tokenMaintenance] Starting run');
  try {
    const stakesReleased = await releaseMaturedStakes();
    const tokensExpired  = await expireStaleTokens();
    const result = { stakesReleased, tokensExpired, durationMs: Date.now() - start };
    logger.info('[tokenMaintenance] Complete', result);
    return result;
  } catch (err) {
    logger.error('[tokenMaintenance] Fatal error', { error: err.message });
    return { error: err.message, durationMs: Date.now() - start };
  }
}

module.exports = { runTokenMaintenance, releaseMaturedStakes, expireStaleTokens };
