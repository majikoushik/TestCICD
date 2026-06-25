const mongoose = require('mongoose');

const ReferralTransactionSchema = new mongoose.Schema({
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  txHash: {
    type: String,
    required: true,
    unique: true
  },
  blockNumber: {
    type: Number
  },
  fromProvider: {
    type: String,
    required: true
  },
  toProvider: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Failed'],
    default: 'Pending'
  },
  notes: String
});

module.exports = mongoose.model('ReferralTransaction', ReferralTransactionSchema);
