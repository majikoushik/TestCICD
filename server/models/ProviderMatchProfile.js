'use strict';

const mongoose = require('mongoose');

const providerMatchProfileSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  providerName: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  specialty: {
    type: String,
    required: true,
    index: true
  },
  subSpecialties: {
    type: [String],
    default: []
  },
  acceptedInsurance: {
    type: [String],
    default: []
  },
  city: {
    type: String
  },
  state: {
    type: String
  },
  zipCode: {
    type: String
  },
  organizationName: {
    type: String
  },
  acceptanceRate: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.85
  },
  avgResponseTimeDays: {
    type: Number,
    default: 3
  },
  totalReferralsReceived: {
    type: Number,
    default: 0
  },
  completedReferrals: {
    type: Number,
    default: 0
  },
  activeReferrals: {
    type: Number,
    default: 0
  },
  tokenBalance: {
    type: Number,
    default: 0
  },
  tokenEarned: {
    type: Number,
    default: 0
  },
  availabilityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  },
  networkParticipation: {
    type: Boolean,
    default: true
  },
  isAcceptingReferrals: {
    type: Boolean,
    default: true
  },
  languagesSpoken: {
    type: [String],
    default: []
  },
  yearsInPractice: {
    type: Number
  },
  boardCertified: {
    type: Boolean,
    default: true
  },
  telehealth: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

providerMatchProfileSchema.index({ specialty: 1, isAcceptingReferrals: 1 });
providerMatchProfileSchema.index({ city: 1, state: 1 });

providerMatchProfileSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('ProviderMatchProfile', providerMatchProfileSchema);
