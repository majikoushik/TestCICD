const mongoose = require('mongoose');

const blockchainTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['consent', 'referral', 'referral_update', 'token', 'analytics_anchor', 'admin_op', 'genesis'],
    required: true,
  },
  data:         { type: mongoose.Schema.Types.Mixed },
  hash:         { type: String },
  // Chain integrity fields
  previousHash: { type: String, default: null },
  blockNumber:  { type: Number, default: null },
  timestamp:    { type: Date, default: Date.now },
}, { timestamps: true });

blockchainTransactionSchema.index({ transactionId: 1 });
blockchainTransactionSchema.index({ type: 1 });
blockchainTransactionSchema.index({ blockNumber: 1 });

module.exports = mongoose.model('BlockchainTransaction', blockchainTransactionSchema);
