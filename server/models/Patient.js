const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  _id: {
    type: String,
  },
  patientId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  contactInfo: {
    email: String,
    phone: String,
    address: String
  },
  primaryProvider: {
    type: String,
    ref: 'User',
    required: true
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String
  },
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    notes: String
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date
  }],
  allergies: [{
    allergen: String,
    reaction: String,
    severity: String
  }],
  recentVisits: [{
    date: Date,
    provider: String,
    reason: String,
    notes: String
  }],
  consentRecords: [{
    providerId: {
      type: String,
      ref: 'User'
    },
    providerName: String,
    organization: String,
    accessLevel: {
      type: String,
      enum: ['full', 'partial', 'limited'],
      default: 'limited'
    },
    dataElements: [String],
    consentDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: Date,
    blockchainTransactionId: String
  }],
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
PatientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Patient', PatientSchema);
