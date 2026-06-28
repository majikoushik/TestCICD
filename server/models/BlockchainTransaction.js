const mongoose = require('mongoose');

const blockchainTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  type:          { type: String, enum: ['consent', 'referral', 'referral_update', 'token'], required: true },
  data:          { type: mongoose.Schema.Types.Mixed },
  hash:          { type: String },
  timestamp:     { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('BlockchainTransaction', blockchainTransactionSchema);
