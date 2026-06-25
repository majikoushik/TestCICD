const mongoose = require('mongoose');

const ReferralDisputeSchema = new mongoose.Schema({
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
    required: true
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  initiatorName: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  requestedAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Resolved', 'Rejected'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: String,
  finalAmount: Number,
  paymentTxHash: String,
  notes: String
});

module.exports = mongoose.model('ReferralDispute', ReferralDisputeSchema);
