const mongoose = require('mongoose');

const appointmentTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  defaultDurationMinutes: {
    type: Number,
    default: 30
  },
  color: {
    type: String,
    default: '#2196F3'
  },
  icon: {
    type: String
  },
  requiresPriorAuth: {
    type: Boolean,
    default: false
  },
  requiresReferral: {
    type: Boolean,
    default: false
  },
  telehealthEligible: {
    type: Boolean,
    default: false
  },
  bufferBeforeMinutes: {
    type: Number,
    default: 5
  },
  bufferAfterMinutes: {
    type: Number,
    default: 5
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AppointmentType', appointmentTypeSchema);
