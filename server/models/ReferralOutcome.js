const mongoose = require('mongoose');

const referralOutcomeSchema = new mongoose.Schema({
  referralId: { type: String, ref: 'Referral', required: true, unique: true },
  providerId: { type: String, ref: 'User', required: true },
  patientId: { type: String, ref: 'Patient' },
  specialty: { type: String },
  // Acceptance
  accepted: { type: Boolean, default: null },
  acceptedAt: { type: Date },
  rejectionReason: { type: String },
  // Appointment
  appointmentScheduled: { type: Boolean, default: false },
  appointmentDate: { type: Date },
  appointmentAttended: { type: Boolean, default: null },
  noShowReason: { type: String },
  // Clinical outcome
  outcomeRating: { type: Number, min: 1, max: 5 },  // 1-5 stars from referring provider
  patientSatisfaction: { type: Number, min: 1, max: 5 },
  timeToAppointmentDays: { type: Number },
  readmissionWithin30Days: { type: Boolean, default: false },
  // Feedback
  referringProviderFeedback: { type: String },
  // Computed score (0-100) used by matching engine
  outcomeScore: { type: Number, default: null },
  outcomeComputedAt: { type: Date },
}, { timestamps: true });

// Compute a single outcome score from all signals
referralOutcomeSchema.methods.computeOutcomeScore = function() {
  let score = 50; // baseline
  if (this.accepted === true) score += 20;
  else if (this.accepted === false) score -= 30;
  if (this.appointmentAttended === true) score += 15;
  else if (this.appointmentAttended === false) score -= 10;
  if (this.outcomeRating) score += (this.outcomeRating - 3) * 5; // -10 to +10
  if (this.patientSatisfaction) score += (this.patientSatisfaction - 3) * 3;
  if (this.readmissionWithin30Days) score -= 20;
  if (this.timeToAppointmentDays !== null && this.timeToAppointmentDays !== undefined) {
    if (this.timeToAppointmentDays <= 7) score += 10;
    else if (this.timeToAppointmentDays <= 14) score += 5;
    else if (this.timeToAppointmentDays > 30) score -= 5;
  }
  this.outcomeScore = Math.max(0, Math.min(100, score));
  this.outcomeComputedAt = new Date();
  return this.outcomeScore;
};

// Aggregate outcome score for a provider
referralOutcomeSchema.statics.getProviderOutcomeScore = async function(providerId, lookbackDays = 180) {
  const since = new Date(Date.now() - lookbackDays * 86400000);
  const outcomes = await this.find({
    providerId,
    outcomeScore: { $ne: null },
    createdAt: { $gte: since },
  }).select('outcomeScore');
  if (!outcomes.length) return null;
  return outcomes.reduce((s, o) => s + o.outcomeScore, 0) / outcomes.length;
};

referralOutcomeSchema.index({ providerId: 1, createdAt: -1 });
referralOutcomeSchema.index({ referralId: 1 });

module.exports = mongoose.model('ReferralOutcome', referralOutcomeSchema);
