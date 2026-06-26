const mongoose = require('mongoose');

const providerScheduleSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  providerName: { type: String },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    required: true,
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDurationMinutes: {
    type: Number,
    enum: [15, 20, 30, 45, 60],
    default: 30,
  },
  bufferMinutes: { type: Number, default: 5 },
  maxDailyAppointments: { type: Number, default: 16 },
  appointmentTypes: { type: [String] },
  isActive: { type: Boolean, default: true },
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound index
providerScheduleSchema.index({ providerId: 1, dayOfWeek: 1 });

// Pre-save hook: update updatedAt
providerScheduleSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('ProviderSchedule', providerScheduleSchema);
