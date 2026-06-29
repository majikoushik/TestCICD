const mongoose = require('mongoose');

const conversionRuleSchema = new mongoose.Schema({
  serviceId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['analytics', 'operations', 'research', 'support', 'priority'],
    default: 'operations',
  },
  tokenCost: { type: Number, required: true, min: 1 },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

conversionRuleSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('ConversionRule', conversionRuleSchema);
