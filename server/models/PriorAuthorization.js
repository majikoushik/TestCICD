const mongoose = require('mongoose');

const priorAuthSchema = new mongoose.Schema({
  referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral', default: null },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  requestingProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestingProviderName: { type: String, required: true },
  targetProviderName: { type: String, default: '' },
  serviceType: { type: String, required: true },
  serviceCode: { type: String, default: '' },
  diagnosisCodes: [{ code: String, description: String }],
  clinicalNotes: { type: String, required: true },
  urgency: { type: String, enum: ['Routine', 'Urgent', 'Emergent'], default: 'Routine' },
  insurancePlan: { type: String, default: '' },
  memberId: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Denied', 'Appealing', 'Expired'],
    default: 'Pending'
  },
  aiRecommendation: { type: String, enum: ['Approve', 'Deny', 'Review', null], default: null },
  aiConfidenceScore: { type: Number, min: 0, max: 100, default: null },
  aiReasoning: { type: String, default: '' },
  aiAnalyzedAt: { type: Date, default: null },
  reviewerNotes: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  approvedDate: { type: Date, default: null },
  deniedDate: { type: Date, default: null },
  expiryDate: { type: Date, default: null },
  appealNotes: { type: String, default: '' },
  appealSubmittedAt: { type: Date, default: null },
  appealReviewedAt: { type: Date, default: null },
  appealOutcome: { type: String, enum: ['Approved', 'Denied', null], default: null }
}, { timestamps: true });

priorAuthSchema.index({ patientId: 1 });
priorAuthSchema.index({ requestingProviderId: 1 });
priorAuthSchema.index({ status: 1 });
priorAuthSchema.index({ referralId: 1 });

module.exports = mongoose.model('PriorAuthorization', priorAuthSchema);
