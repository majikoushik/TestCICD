const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  readAt: { type: Date, default: null },
}, { _id: false });

const targetedAlertSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  sender: { type: String, required: true },
  sentAt: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'sent', 'scheduled'], default: 'draft' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  category: { type: String, enum: ['general', 'referral', 'policy', 'token', 'system', 'training', 'compliance'], default: 'general' },
  recipients: { type: [recipientSchema], default: [] },
  relatedEntityId: { type: String, default: null },
  relatedEntityType: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

targetedAlertSchema.index({ status: 1 });
targetedAlertSchema.index({ sentAt: -1 });
targetedAlertSchema.index({ 'recipients.id': 1 });

module.exports = mongoose.model('TargetedAlert', targetedAlertSchema);
