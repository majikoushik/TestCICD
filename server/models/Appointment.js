const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['reminder_24h', 'reminder_1h', 'confirmation', 'cancellation', 'reschedule'],
    },
    sentAt: { type: Date },
    channel: { type: String },
  },
  { _id: false }
);

const rescheduleHistorySchema = new mongoose.Schema(
  {
    fromDate: { type: Date },
    fromStartTime: { type: String },
    toDate: { type: Date },
    toStartTime: { type: String },
    reason: { type: String },
    changedBy: { type: String },
    changedAt: { type: Date },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    unique: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  patientName: { type: String, required: true },
  patientEmail: { type: String },
  patientPhone: { type: String },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  providerName: { type: String, required: true },
  providerSpecialty: { type: String },
  appointmentType: {
    type: String,
    enum: ['new_patient', 'follow_up', 'telehealth', 'urgent', 'procedure'],
    required: true,
    default: 'follow_up',
  },
  status: {
    type: String,
    enum: [
      'scheduled',
      'confirmed',
      'checked_in',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled',
    ],
    default: 'scheduled',
  },
  scheduledDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  durationMinutes: { type: Number, required: true, default: 30 },
  location: {
    type: String,
    enum: ['in_person', 'telehealth'],
    default: 'in_person',
  },
  telehealthLink: { type: String },
  chiefComplaint: { type: String },
  reasonForVisit: { type: String },
  notes: { type: String },
  linkedReferralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
  },
  priorAuthId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriorAuth',
  },
  insuranceVerified: { type: Boolean, default: false },
  intakeCompleted: { type: Boolean, default: false },
  intakeResponses: { type: mongoose.Schema.Types.Mixed },
  remindersSent: { type: [reminderSchema], default: [] },
  rescheduleHistory: { type: [rescheduleHistorySchema], default: [] },
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  cancelledBy: {
    type: String,
    enum: ['patient', 'provider', 'admin'],
  },
  noShowMarkedAt: { type: Date },
  tokenRewardIssued: { type: Boolean, default: false },
  tokenRewardAmount: { type: Number },
  // Outcome fields captured when visit is marked complete
  outcomeNotes: { type: String },
  diagnosis: { type: String },
  followUpNeeded: { type: Boolean, default: false },
  followUpTimeframe: {
    type: String,
    enum: ['1_week', '2_weeks', '1_month', '3_months', '6_months', 'as_needed', ''],
  },
  reminderSentAt: { type: Date },
  createdBy: {
    type: String,
    enum: ['patient', 'provider', 'admin'],
    default: 'patient',
  },
  organizationName: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound indexes
appointmentSchema.index({ patientId: 1, scheduledDate: -1 });
appointmentSchema.index({ providerId: 1, scheduledDate: 1, status: 1 });
appointmentSchema.index({ status: 1, scheduledDate: 1 });

// Pre-validate hook: auto-generate appointmentId
appointmentSchema.pre('validate', async function () {
  if (!this.appointmentId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Appointment').countDocuments();
    this.appointmentId = 'APT-' + year + '-' + String(count + 1).padStart(5, '0');
  }

  // Auto-generate telehealthLink for telehealth type
  if (this.appointmentType === 'telehealth' && !this.telehealthLink) {
    this.telehealthLink =
      'https://telehealth.clinictrustai.com/room/' +
      require('crypto').randomBytes(8).toString('hex');
  }
});

// Pre-save hook: update updatedAt
appointmentSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
