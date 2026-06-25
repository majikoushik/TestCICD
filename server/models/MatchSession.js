'use strict';

const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema(
  {
    providerId: mongoose.Schema.Types.ObjectId,
    providerName: String,
    specialty: String,
    matchScore: Number,
    scoreBreakdown: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const matchSessionSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  requestedByName: {
    type: String,
  },
  specialty: {
    type: String,
  },
  patientInsurance: {
    type: String,
  },
  patientCity: {
    type: String,
  },
  patientState: {
    type: String,
  },
  urgency: {
    type: String,
    enum: ['routine', 'urgent', 'emergency'],
    default: 'routine',
  },
  resultsCount: {
    type: Number,
  },
  topMatchScore: {
    type: Number,
  },
  selectedProviderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProviderMatchProfile',
    default: null,
  },
  selectedProviderName: {
    type: String,
  },
  selectedMatchScore: {
    type: Number,
  },
  linkedReferralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral',
  },
  suggestions: {
    type: [suggestionSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

matchSessionSchema.index({ requestedBy: 1, createdAt: -1 });
matchSessionSchema.index({ specialty: 1 });

module.exports = mongoose.model('MatchSession', matchSessionSchema);
