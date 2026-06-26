const mongoose = require('mongoose');

const scheduleExceptionSchema = new mongoose.Schema({
  providerId: {
    type: String,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['unavailable', 'extra_hours', 'modified_hours'],
    required: true
  },
  startTime: {
    type: String
  },
  endTime: {
    type: String
  },
  reason: {
    type: String,
    enum: ['vacation', 'holiday', 'conference', 'emergency', 'training', 'other'],
    default: 'other'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

scheduleExceptionSchema.index({ providerId: 1, date: 1 });

module.exports = mongoose.model('ScheduleException', scheduleExceptionSchema);
