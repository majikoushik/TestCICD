/**
 * EHI Access Audit Log
 *
 * 21st Century Cures Act — 45 CFR Part 171
 * Health IT developers must log every Electronic Health Information (EHI)
 * access event to demonstrate compliance with the Information Blocking Rule.
 * ONC enforcement has been active since September 1, 2023.
 * Penalty for non-compliant health IT developers: up to $1,000,000 per violation.
 *
 * HIPAA requires a minimum 6-year audit log retention; this schema uses a
 * 7-year TTL index on the timestamp field.
 */
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    timestamp:    { type: Date, default: Date.now, index: true },
    userId:       { type: String, ref: 'User', index: true, default: null },
    userEmail:    { type: String, default: null },
    userRole:     { type: String, default: null },
    action: {
      type: String,
      enum: ['READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'CONSENT_GRANT', 'CONSENT_REVOKE'],
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['Patient', 'Referral', 'Analytics', 'User', 'AdminSetting'],
      required: true,
      index: true,
    },
    resourceId:      { type: String, default: null },
    patientId:       { type: String, default: null, index: true },
    endpoint:        { type: String },
    method:          { type: String },
    ipAddress:       { type: String },
    userAgent:       { type: String },
    responseStatus:  { type: Number },
    oncException:    { type: String, default: null },
  },
  {
    collection: 'ehi_audit_logs',
    timestamps: false,
  }
);

// 7-year TTL — HIPAA minimum is 6 years; one extra for safety
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
