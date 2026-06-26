const mongoose = require('mongoose');

const dtxProgramSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    vendor: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['mental_health', 'metabolic', 'musculoskeletal', 'cardiovascular', 'behavioral', 'respiratory', 'neurology', 'general'],
      required: true,
    },
    description: { type: String, required: true },
    conditions: [{ type: String }],
    evidenceLevel: {
      type: String,
      enum: ['fda_cleared', 'fda_authorized', 'peer_reviewed', 'evidence_based', 'clinical_study'],
      default: 'evidence_based',
    },
    durationWeeks: { type: Number },
    deliveryFormat: {
      type: String,
      enum: ['app', 'web', 'both', 'coaching', 'hybrid'],
      default: 'app',
    },
    contentTypes: [{ type: String }],
    highlights: [{ type: String }],
    contraindications: [{ type: String }],
    tokenReward: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    integrationUrl: { type: String },
    prescriptionCount: { type: Number, default: 0 },
    avgEngagementScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DtxProgram', dtxProgramSchema);
