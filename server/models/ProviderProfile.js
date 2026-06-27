const mongoose = require('mongoose');

const ProviderProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, ref: 'User' },

  // NPI data
  npi: { type: String, unique: true, sparse: true, trim: true },
  npiData: { type: mongoose.Schema.Types.Mixed, default: {} }, // raw NPPES response

  // Profile fields (editable by provider, pre-filled from NPI)
  credential: { type: String, default: '' },
  specialty: { type: String, default: '' },          // primary specialty (backward compat)
  specialties: { type: [String], default: [] },       // multi-select list
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

  // Referral & practice details
  acceptingNewPatients: { type: Boolean, default: true },
  telehealthAvailable:  { type: Boolean, default: false },
  ageGroupsTreated:     { type: [String], default: [] }, // e.g. ['Adult', 'Geriatric']
  languagesSpoken:      { type: [String], default: [] }, // e.g. ['English', 'Spanish']
  insuranceAccepted:    { type: [String], default: [] }, // e.g. ['Medicare', 'Aetna']
  boardCertifications:  { type: [String], default: [] }, // e.g. ['ABIM', 'ABFM']
  hospitalAffiliations: { type: [String], default: [] }, // e.g. ['Mass General', 'UCSF']
  conditionsTreated:    { type: [String], default: [] }, // e.g. ['Diabetes', 'Hypertension']

  // KYC documents
  licenseNumber: { type: String, default: '' },
  licenseState: { type: String, default: '' },
  deaNumber: { type: String, default: '' },
  kycDocumentPath: { type: String, default: '' }, // server file path (private)
  kycDocumentOriginalName: { type: String, default: '' },

  // KYC review
  kycStatus: {
    type: String,
    enum: ['pending_email', 'profile_incomplete', 'doc_pending', 'under_review', 'verified', 'rejected'],
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
  },
}, { timestamps: true });

ProviderProfileSchema.index({ npi: 1 });
ProviderProfileSchema.index({ kycStatus: 1 });

module.exports = mongoose.model('ProviderProfile', ProviderProfileSchema);
