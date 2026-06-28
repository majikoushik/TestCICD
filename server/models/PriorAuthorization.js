const mongoose = require('mongoose');

const priorAuthSchema = new mongoose.Schema({
  referralId: { type: String, ref: 'Referral', default: null },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  requestingProviderId: { type: String, ref: 'User', required: true },
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

  // AI analysis results
  aiRecommendation: { type: String, enum: ['Approve', 'Deny', 'Review', null], default: null },
  aiConfidenceScore: { type: Number, min: 0, max: 100, default: null },
  aiReasoning: { type: String, default: '' },
  aiKeyFactors: [{ type: String }],
  aiSuggestedAction: { type: String, default: '' },
  aiGuidelinesCited: [{ type: String }],
  aiAnalyzedAt: { type: Date, default: null },
  autoApproved: { type: Boolean, default: false },

  // Review decision
  reviewerNotes: { type: String, default: '' },
  reviewedBy: { type: String, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  denialReasonCode: { type: String, default: '' },
  denialReasonDescription: { type: String, default: '' },

  // Approval window
  approvedDate: { type: Date, default: null },
  deniedDate: { type: Date, default: null },
  approvalDurationDays: { type: Number, default: 90 },
  expiryDate: { type: Date, default: null },

  // Appeal
  appealNotes: { type: String, default: '' },
  appealCount: { type: Number, default: 0 },
  appealSubmittedAt: { type: Date, default: null },
  appealDeadlineDate: { type: Date, default: null },
  appealReviewedAt: { type: Date, default: null },
  appealOutcome: { type: String, enum: ['Approved', 'Denied', null], default: null },

  // Escalation tracking — prevents duplicate admin alerts
  escalationSentAt: { type: Date, default: null },

  // Renewal tracking
  renewedFromId: { type: String, default: null },

  // Provider–Admin clinical communication thread
  notes: [{
    authorId:    { type: String, default: null },
    authorEmail: { type: String, default: '' },
    authorRole:  { type: String, default: '' },
    message:     { type: String, required: true },
    createdAt:   { type: Date, default: Date.now },
  }],
}, { timestamps: true });

priorAuthSchema.index({ patientId: 1 });
priorAuthSchema.index({ requestingProviderId: 1 });
priorAuthSchema.index({ status: 1 });
priorAuthSchema.index({ referralId: 1 });
priorAuthSchema.index({ expiryDate: 1 });
priorAuthSchema.index({ urgency: 1, status: 1, escalationSentAt: 1 });

module.exports = mongoose.model('PriorAuthorization', priorAuthSchema);
