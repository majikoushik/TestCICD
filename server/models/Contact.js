const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, trim: true, lowercase: true },
    phone:        { type: String, trim: true, default: '' },
    organization: { type: String, trim: true, default: '' },
    inquiryType:  {
      type: String,
      enum: ['general', 'sales', 'support', 'partnership', 'demo'],
      default: 'general',
    },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status:  {
      type: String,
      enum: ['new', 'read', 'responded', 'closed'],
      default: 'new',
    },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

ContactSchema.index({ status: 1, createdAt: -1 });
ContactSchema.index({ email: 1 });

module.exports = mongoose.model('Contact', ContactSchema);
