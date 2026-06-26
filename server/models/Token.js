const mongoose = require('mongoose');

const TokenTransactionSchema = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['earn', 'spend', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['patient', 'referral', 'analytics', 'service']
    },
    entityId: String
  },
  blockchainTransactionId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  balanceAfter: Number,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const TokenSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'ClinicToken',
    required: true
  },
  symbol: {
    type: String,
    default: 'CLT',
    required: true
  },
  totalSupply: {
    type: Number,
    default: 1000000,
    required: true
  },
  contractAddress: {
    type: String,
    required: true
  },
  transactions: [TokenTransactionSchema],
  exchangeRates: {
    USD: {
      type: Number,
      default: 0.1
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
TokenSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = {
  Token: mongoose.model('Token', TokenSchema),
  TokenTransaction: mongoose.model('TokenTransaction', TokenTransactionSchema)
};
