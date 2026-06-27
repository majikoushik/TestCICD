'use strict';

const mongoose = require('mongoose');

// Reusable sub-schema for a single calculated metric
const metricSchema = new mongoose.Schema(
  {
    value: { type: Number, default: 0 },
    trend: { type: Number, default: 0 },  // % change vs previous period (+ = improved)
    unit:  { type: String, enum: ['percent', 'count', 'score', 'days', 'rate'], default: 'count' },
    label: { type: String, default: '' },
  },
  { _id: false }
);

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    // Unique run ID — used to deduplicate and reference from logs
    snapshotId: { type: String, required: true, unique: true },

    // 'global' = all patients/providers on the platform
    // 'provider' = scoped to one provider's patient panel
    scope:   { type: String, enum: ['global', 'provider'], default: 'global' },
    scopeId: { type: String, default: null }, // provider _id when scope='provider'

    // Calendar window this snapshot covers
    period: {
      from: { type: Date },
      to:   { type: Date },
    },

    computedAt:  { type: Date, default: Date.now },
    computedBy:  { type: String, default: 'job' }, // 'job', userId, or 'cron'
    durationMs:  { type: Number, default: 0 },

    // ── Core patient-care metrics ──────────────────────────────────────────
    metrics: {
      patientEngagement:    metricSchema,
      treatmentAdherence:   metricSchema,
      missedAppointments:   metricSchema,

      riskDistribution: {
        high:   { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        low:    { type: Number, default: 0 },
        total:  { type: Number, default: 0 },
      },

      // ── Referral quality ───────────────────────────────────────────────
      referralVolume:         metricSchema,
      referralAcceptanceRate: metricSchema,

      // ── Provider health (global scope only) ───────────────────────────
      activeProviders: metricSchema,
      totalPatients:   metricSchema,

      // ── Patient Analytics (Tab 1) ──────────────────────────────────────
      pendingReferrals: metricSchema,

      patientDemographics: {
        type: [{ ageGroup: String, count: Number, percentage: Number, _id: false }],
        default: [],
      },
      topConditions: {
        type: [{ name: String, count: Number, _id: false }],
        default: [],
      },
      patientMonthlyTrends: {
        type: [{ month: String, newPatients: Number, _id: false }],
        default: [],
      },

      // ── Referral Analytics (Tab 2) ─────────────────────────────────────
      referralsBySpecialty: {
        type: [{ specialty: String, count: Number, percentage: Number, _id: false }],
        default: [],
      },
      referralStatusDistribution: {
        type: [{ status: String, count: Number, _id: false }],
        default: [],
      },
      referralMonthlyTrends: {
        type: [{ month: String, sent: Number, accepted: Number, completed: Number, _id: false }],
        default: [],
      },
      referralProviderConversion: {
        type: [{ provider: String, specialty: String, sent: Number, accepted: Number, completed: Number, rate: Number, _id: false }],
        default: [],
      },
    },

    errors: [String],
  },
  { timestamps: true }
);

// Fast latest-snapshot lookup: scope + scopeId, most-recent first
analyticsSnapshotSchema.index({ scope: 1, scopeId: 1, computedAt: -1 });

module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
