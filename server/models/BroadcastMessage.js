const mongoose = require('mongoose');

const broadcastMessageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  sender: { type: String, required: true },
  sentAt: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'sent', 'scheduled'], default: 'draft' },
  scheduledAt: { type: Date, default: null },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  category: { type: String, enum: ['general', 'security', 'training', 'policy', 'token', 'system', 'compliance'], default: 'general' },
  recipientCount: { type: Number, default: 0 },
  readCount: { type: Number, default: 0 },
  targetAudience: { type: String, enum: ['all', 'providers', 'admins'], default: 'all' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

broadcastMessageSchema.index({ status: 1 });
broadcastMessageSchema.index({ sentAt: -1 });
broadcastMessageSchema.index({ priority: 1 });
broadcastMessageSchema.index({ category: 1 });

module.exports = mongoose.model('BroadcastMessage', broadcastMessageSchema);
