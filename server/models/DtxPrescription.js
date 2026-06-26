const mongoose = require('mongoose');

const dtxPrescriptionSchema = new mongoose.Schema(
  {
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'DtxProgram', required: true },
    programName: { type: String },
    programVendor: { type: String },
    programCategory: { type: String },
    providerId: { type: String, ref: 'User', required: true },
    providerName: { type: String },
    patientName: { type: String, required: true },
    patientId: { type: String },
    patientEmail: { type: String },
    patientPhone: { type: String },
    status: {
      type: String,
      enum: ['prescribed', 'enrolled', 'active', 'completed', 'dropped'],
      default: 'prescribed',
    },
    linkedReferralId: { type: String, ref: 'Referral' },
    prescribedAt: { type: Date, default: Date.now },
    enrolledAt: { type: Date },
    completedAt: { type: Date },
    droppedAt: { type: Date },
    engagementScore: { type: Number, min: 0, max: 100 },
    outcomeNotes: { type: String },
    clinicalNotes: { type: String },
    tokenRewardIssued: { type: Boolean, default: false },
    tokenRewardAmount: { type: Number },
    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DtxPrescription', dtxPrescriptionSchema);
