const mongoose = require('mongoose');

// Singleton — one document holds all configurable earn rates
const tokenEarnPolicySchema = new mongoose.Schema({
  _singleton: { type: String, default: 'global', unique: true },

  // Referral earn rates
  referralSent: { type: Number, default: 10 },       // completed referral sent
  referralAccepted: { type: Number, default: 5 },    // accepted incoming referral

  // Onboarding (one-time)
  kycVerified: { type: Number, default: 50 },
  profileCompleted: { type: Number, default: 25 },

  // Network
  inviteColleague: { type: Number, default: 20 },

  // Data / research
  dataContribution: { type: Number, default: 15 },   // monthly contribution
  analyticsCompleted: { type: Number, default: 15 },

  // DTx / clinical
  dtxCompleted: { type: Number, default: 0 },        // 0 = disabled by default

  // Appointment
  appointmentCompleted: { type: Number, default: 15 },
}, { timestamps: true });

tokenEarnPolicySchema.statics.getSingleton = async function () {
  let policy = await this.findOne({ _singleton: 'global' });
  if (!policy) {
    policy = await this.create({ _singleton: 'global' });
  }
  return policy;
};

module.exports = mongoose.model('TokenEarnPolicy', tokenEarnPolicySchema);
