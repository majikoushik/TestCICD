const mongoose = require('mongoose');

const ProviderProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, ref: 'User' },

  // NPI data
  npi: { type: String, unique: true, sparse: true, trim: true },
  npiData: { type: mongoose.Schema.Types.Mixed, default: {} }, // raw NPPES response

  // Profile fields (editable by provider, pre-filled from NPI)
  credential: { type: String, default: '' },
  specialty: { type: String, default: '' },
  taxonomyCode: { type: String, default: '' },
  enumerationType: { type: String, default: 'NPI-1' }, // NPI-1=individual, NPI-2=org
  organizationName: { type: String, default: '' },
  gender: { type: String, default: '' },
  phone: { type: String, default: '' },
  fax: { type: String, default: '' },
  address: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
  },

  // KYC documents
  licenseNumber: { type: String, default: '' },
  licenseState: { type: String, default: '' },
  deaNumber: { type: String, default: '' },
  kycDocumentPath: { type: String, default: '' }, // server file path (private)
  kycDocumentOriginalName: { type: String, default: '' },

  // KYC review
  kycStatus: {
    type: String,
    enum: ['pending_email', 'pending_docs', 'under_review', 'verified', 'rejected'],
    default: 'pending_email',
  },
  kycReviewedBy: { type: String, ref: 'User', default: null },
  kycReviewedAt: { type: Date, default: null },
  kycRejectionReason: { type: String, default: '' },

  // Onboarding checklist steps
  onboardingSteps: {
    profile_created:    { type: Boolean, default: true },
    email_verified:     { type: Boolean, default: false },
    profile_reviewed:   { type: Boolean, default: false },
    docs_uploaded:      { type: Boolean, default: false },
    first_patient:      { type: Boolean, default: false },
    first_referral:     { type: Boolean, default: false },
    colleague_invited:  { type: Boolean, default: false },
  },

  // Colleague invite tracking
  invitesSent: [{ email: String, sentAt: { type: Date, default: Date.now } }],
}, { timestamps: true });

ProviderProfileSchema.index({ npi: 1 });
ProviderProfileSchema.index({ kycStatus: 1 });

module.exports = mongoose.model('ProviderProfile', ProviderProfileSchema);
