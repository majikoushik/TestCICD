const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['patientRisk', 'operationalEfficiency', 'patientOutcomes', 'financialMetrics', 'custom'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: String,
    required: true
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  results: {
    summary: String,
    data: mongoose.Schema.Types.Mixed,
    visualizations: [{
      type: String,
      title: String,
      description: String,
      config: mongoose.Schema.Types.Mixed
    }],
    insights: [{
      title: String,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
      actionable: Boolean,
      recommendations: [String]
    }]
  },
  dataUsed: [{
    source: String,
    type: String,
    recordCount: Number,
    dateRange: {
      start: Date,
      end: Date
    },
    anonymized: {
      type: Boolean,
      default: true
    }
  }],
  modelVersion: String,
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    accessLevel: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      default: 'view'
    }
  }],
  tokenReward: {
    amount: Number,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending'
    }
  },
  blockchainReference: {
    transactionId: String,
    timestamp: Date,
    hash: String
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
AnalyticsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Analytics', AnalyticsSchema);
