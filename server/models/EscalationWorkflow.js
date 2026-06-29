const mongoose = require('mongoose');

const timelineEntrySchema = new mongoose.Schema({
  action: String,
  timestamp: { type: Date, default: Date.now },
  user: String,
}, { _id: false });

const assigneeSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
}, { _id: false });

const resolutionSchema = new mongoose.Schema({
  action: String,
  notes: String,
  timestamp: { type: Date, default: Date.now },
  resolvedBy: assigneeSchema,
}, { _id: false });

const detailsSchema = new mongoose.Schema({
  riskFactors: [String],
  aiRecommendations: [String],
  notes: String,
}, { _id: false });

const escalationWorkflowSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  aiRiskScore: { type: Number, min: 0, max: 1 },
  flaggedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending_review', 'in_progress', 'resolved', 'dismissed'],
    default: 'pending_review',
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  category: {
    type: String,
    enum: ['readmission', 'lab_result', 'medication', 'care_gap', 'general'],
    default: 'general',
  },
  assignedTo: { type: assigneeSchema, default: null },
  details: { type: detailsSchema, default: {} },
  timeline: { type: [timelineEntrySchema], default: [] },
  resolution: { type: resolutionSchema, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

escalationWorkflowSchema.index({ status: 1 });
escalationWorkflowSchema.index({ priority: 1 });
escalationWorkflowSchema.index({ category: 1 });
escalationWorkflowSchema.index({ flaggedAt: -1 });

module.exports = mongoose.model('EscalationWorkflow', escalationWorkflowSchema);
