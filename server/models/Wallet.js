const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId:        { type: String, ref: 'User', required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true },
  role:          { type: String, required: true },
  organization:  { type: String, default: '' },
  registeredAt:  { type: Date, default: Date.now },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
