const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userName: String,
  userEmail: String,
  userRole: String,
  ipAddress: String,
  userAgent: String,
  successful: {
    type: Boolean,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  collection: 'loginhistories',
});

// Compound index for admin audit queries (filter by user + date range)
loginHistorySchema.index({ userId: 1, timestamp: -1 });
// TTL: auto-delete records older than 1 year
loginHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
