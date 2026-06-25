const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'appointment_reminder',
      'referral_update',
      'prior_auth_update',
      'lab_result',
      'prescription',
      'general',
      'care_gap',
      'campaign'
    ],
    required: true
  },
  subject: {
    type: String,
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  smsBody: {
    type: String,
    maxlength: 160,
    trim: true
  },
  pushTitle: {
    type: String,
    trim: true
  },
  defaultChannels: {
    type: [String],
    enum: ['email', 'sms', 'push', 'in_app'],
    default: ['in_app']
  },
  variables: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

notificationTemplateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
