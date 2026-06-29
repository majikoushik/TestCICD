const mongoose = require('mongoose');

const predictiveAlertSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientName: { type: String },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['readmission_risk', 'care_gap', 'medication_adherence', 'risk_score_increase', 'overdue_followup', 'lab_trend'],
    required: true,
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  recommendation: { type: String },
  riskScore: { type: Number },          // current risk score
  previousRiskScore: { type: Number },  // for risk_score_increase alerts
  deltaScore: { type: Number },         // riskScore - previousRiskScore
  daysSinceLastVisit: { type: Number }, // for care_gap alerts
  daysOverdue: { type: Number },        // for overdue_followup alerts
  status: { type: String, enum: ['active', 'acknowledged', 'resolved', 'dismissed'], default: 'active' },
  acknowledgedAt: { type: Date },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  dismissedAt: { type: Date },
  dismissedReason: { type: String },
  // Feedback for feedback loop
  wasActionTaken: { type: Boolean, default: null },
  outcomeNotes: { type: String },
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },  // alerts auto-expire after N days
}, { timestamps: true });

predictiveAlertSchema.index({ providerId: 1, status: 1, generatedAt: -1 });
predictiveAlertSchema.index({ patientId: 1, type: 1 });
predictiveAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PredictiveAlert', predictiveAlertSchema);
