/**
 * TokenOperation — pending multi-signature admin token operations.
 *
 * Mint and burn requests require MULTISIG_REQUIRED approvals (default: 2)
 * from distinct admins before executing. This prevents a single rogue admin
 * from inflating or destroying the token supply.
 *
 * Workflow:
 *   1. Any admin POSTs to /admin/tokens/mint|burn   → creates a 'pending' TokenOperation
 *   2. A second admin POSTs to /admin/tokens/operations/:id/approve
 *   3. When approvals.length >= MULTISIG_REQUIRED   → execute atomically
 *   4. Status transitions: pending → approved → executed | pending → rejected
 */
const mongoose = require('mongoose');

const tokenOperationSchema = new mongoose.Schema({
  type: { type: String, enum: ['mint', 'burn'], required: true },
  providerId: { type: String, required: true },
  providerName: { type: String, default: '' },
  amount: { type: Number, required: true, min: 1 },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'executed', 'rejected', 'expired'],
    default: 'pending',
  },
  approvals: [{
    adminId:   { type: String, required: true },
    adminName: { type: String, default: '' },
    signedAt:  { type: Date, default: Date.now },
  }],
  rejections: [{
    adminId:   { type: String, required: true },
    adminName: { type: String, default: '' },
    reason:    { type: String, default: '' },
    rejectedAt: { type: Date, default: Date.now },
  }],
  requiredApprovals: { type: Number, default: 2 },
  createdBy: { type: String, required: true },
  executedAt: { type: Date, default: null },
  executedTxId: { type: String, default: null },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 24h
}, { timestamps: true });

tokenOperationSchema.index({ status: 1 });
tokenOperationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('TokenOperation', tokenOperationSchema);
