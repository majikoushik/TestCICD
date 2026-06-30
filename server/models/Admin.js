const mongoose = require('mongoose');

const AdminSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['security', 'ai', 'blockchain', 'notifications', 'general', 'billing', 'organization', 'integrations', 'maintenance']
  },
  description: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastModifiedBy: {
    type: String,
    ref: 'User'
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster queries
AdminSettingSchema.index({ key: 1 });
AdminSettingSchema.index({ category: 1 });

module.exports = mongoose.model('AdminSetting', AdminSettingSchema);
