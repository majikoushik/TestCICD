const mongoose = require('mongoose');

const waitlistEntrySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientEmail: {
    type: String
  },
  patientPhone: {
    type: String
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerName: {
    type: String
  },
  appointmentType: {
    type: String,
    default: 'follow_up'
  },
  urgency: {
    type: String,
    enum: ['routine', 'urgent'],
    default: 'routine'
  },
  preferredDates: {
    type: [Date],
    default: []
  },
  preferredTimeOfDay: {
    type: String,
    enum: ['morning', 'afternoon', 'any'],
    default: 'any'
  },
  status: {
    type: String,
    enum: ['waiting', 'offered', 'booked', 'expired'],
    default: 'waiting'
  },
  offeredSlot: {
    date: { type: Date },
    startTime: { type: String },
    endTime: { type: String }
  },
  offeredAt: {
    type: Date
  },
  responseDeadline: {
    type: Date
  },
  linkedAppointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

waitlistEntrySchema.index({ providerId: 1, status: 1 });
waitlistEntrySchema.index({ patientId: 1 });

module.exports = mongoose.model('WaitlistEntry', waitlistEntrySchema);
