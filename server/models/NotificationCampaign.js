const mongoose = require('mongoose');

const { Schema } = mongoose;

const targetCriteriaSchema = new Schema(
  {
    all: {
      type: Boolean,
      default: false,
    },
    patientIds: {
      type: [String],
      default: [],
    },
    conditions: {
      type: [String],
      default: [],
    },
    riskScoreMin: {
      type: Number,
    },
    riskScoreMax: {
      type: Number,
    },
    insurancePlan: {
      type: String,
    },
  },
  { _id: false }
);

const statsSchema = new Schema(
  {
    totalTargeted: {
      type: Number,
      default: 0,
    },
    totalSent: {
      type: Number,
      default: 0,
    },
    totalDelivered: {
      type: Number,
      default: 0,
    },
    totalFailed: {
      type: Number,
      default: 0,
    },
    totalRead: {
      type: Number,
      default: 0,
    },
    openRate: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const notificationCampaignSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'NotificationTemplate',
  },
  templateName: {
    type: String,
  },
  customSubject: {
    type: String,
  },
  customMessage: {
    type: String,
  },
  targetCriteria: {
    type: targetCriteriaSchema,
    default: () => ({}),
  },
  channels: {
    type: [String],
    enum: ['email', 'sms', 'push', 'in_app'],
    default: [],
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'running', 'completed', 'cancelled'],
    default: 'draft',
  },
  scheduledAt: {
    type: Date,
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  stats: {
    type: statsSchema,
    default: () => ({}),
  },
  notifications: [
    {
      type: Schema.Types.ObjectId,
      ref: 'PatientNotification',
    },
  ],
  createdBy: {
    type: String,
    ref: 'User',
  },
  createdByName: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

notificationCampaignSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('NotificationCampaign', notificationCampaignSchema);
