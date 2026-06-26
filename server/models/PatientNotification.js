const mongoose = require('mongoose');

const patientNotificationSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientEmail: {
    type: String
  },
  patientPhone: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['appointment_reminder', 'referral_update', 'prior_auth_update', 'lab_result', 'prescription', 'general', 'care_gap', 'campaign'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  channels: [
    {
      type: String,
      enum: ['email', 'sms', 'push', 'in_app']
    }
  ],
  channelStatus: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      deliveredAt: { type: Date },
      error: { type: String },
      messageId: { type: String }
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      deliveredAt: { type: Date },
      error: { type: String },
      sid: { type: String }
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      error: { type: String }
    },
    in_app: {
      sent: { type: Boolean, default: true },
      read: { type: Boolean, default: false },
      readAt: { type: Date }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
    default: 'pending'
  },
  relatedId: {
    type: String
  },
  relatedType: {
    type: String,
    enum: ['referral', 'prior_auth', 'appointment', 'lab', 'prescription', 'campaign']
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationTemplate'
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationCampaign'
  },
  sentBy: {
    type: String,
    ref: 'User'
  },
  sentByName: {
    type: String
  },
  scheduledAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

patientNotificationSchema.index({ patientId: 1, status: 1 });
patientNotificationSchema.index({ campaignId: 1 });

module.exports = mongoose.model('PatientNotification', patientNotificationSchema);
