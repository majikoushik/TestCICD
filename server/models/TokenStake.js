/**
 * TokenStake — provider token staking positions.
 *
 * Providers lock tokens for a fixed period (30/60/90 days) in exchange for a
 * bonus multiplier paid on completion.  While staked, the tokens are removed
 * from tokenBalance and added to stakedBalance on the User document.
 *
 * Multipliers:
 *   30 days → 1.10×  (+10% bonus)
 *   60 days → 1.25×  (+25% bonus)
 *   90 days → 1.50×  (+50% bonus)
 *
 * Status lifecycle:  active → completed | cancelled
 *   completed — endDate reached, principal + bonus released back to tokenBalance
 *   cancelled — early unstake, principal only returned (no bonus)
 */
const mongoose = require('mongoose');

const PERIOD_MULTIPLIERS = { 30: 1.10, 60: 1.25, 90: 1.50 };

const tokenStakeSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  amount:       { type: Number, required: true, min: 1 },
  periodDays:   { type: Number, required: true, enum: [30, 60, 90] },
  multiplier:   { type: Number, required: true },
  startDate:    { type: Date, default: Date.now },
  endDate:      { type: Date, required: true },
  status:       { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  bonusAmount:  { type: Number, default: 0 },
  releaseTxId:  { type: String, default: null },
  cancelledAt:  { type: Date, default: null },
  completedAt:  { type: Date, default: null },
}, { timestamps: true });

tokenStakeSchema.index({ status: 1, endDate: 1 });

tokenStakeSchema.statics.PERIOD_MULTIPLIERS = PERIOD_MULTIPLIERS;

module.exports = mongoose.model('TokenStake', tokenStakeSchema);
