const mongoose = require('mongoose');

const aiConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },  // e.g. 'priorAuth.autoApproveThreshold'
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  category: { type: String, enum: ['priorAuth', 'riskScore', 'referralMatching', 'escalation', 'ambient', 'global'], required: true },
  label: { type: String },
  description: { type: String },
  dataType: { type: String, enum: ['number', 'boolean', 'string', 'object'], default: 'number' },
  minValue: { type: Number },
  maxValue: { type: Number },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

aiConfigSchema.statics.get = async function(key, defaultValue) {
  const config = await this.findOne({ key });
  return config ? config.value : defaultValue;
};

aiConfigSchema.statics.set = async function(key, value, updatedBy) {
  return this.findOneAndUpdate(
    { key },
    { value, updatedBy },
    { upsert: true, new: true }
  );
};

aiConfigSchema.statics.getCategory = async function(category) {
  const configs = await this.find({ category });
  const result = {};
  configs.forEach(c => {
    const parts = c.key.split('.');
    const field = parts[parts.length - 1];
    result[field] = c.value;
  });
  return result;
};

module.exports = mongoose.model('AIConfig', aiConfigSchema);
