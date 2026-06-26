const mongoose = require('mongoose');

const AIReportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['summary', 'risk_assessment', 'readmission', 'diagnosis', 'treatment', 'custom'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'published', 'rejected'],
    default: 'draft'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  thresholds: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      readmissionRisk: 0.7,
      diagnosisConfidence: 0.85,
      treatmentRecommendation: 0.8
    }
  },
  feedback: [{
    type: {
      type: String,
      enum: ['false_positive', 'false_negative', 'accurate', 'other'],
      required: true
    },
    comment: String,
    submittedBy: {
      type: String,
      ref: 'User',
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reviewHistory: [{
    action: {
      type: String,
      enum: ['created', 'submitted', 'approved', 'rejected', 'published', 'updated'],
      required: true
    },
    reviewer: {
      type: String,
      ref: 'User'
    },
    comments: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  scheduledReports: [{
    recipientId: {
      type: String,
      ref: 'User',
      required: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      required: true
    },
    nextDelivery: {
      type: Date,
      required: true
    },
    lastDelivered: Date,
    active: {
      type: Boolean,
      default: true
    }
  }],
  createdBy: {
    type: String,
    ref: 'User',
    required: true
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
AIReportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AIReport', AIReportSchema);
