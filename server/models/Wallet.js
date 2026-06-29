const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId:              { type: String, ref: 'User', required: true, unique: true },
  walletAddress:       { type: String, required: true, unique: true },
  role:                { type: String, required: true },
  organization:        { type: String, default: '' },
  registeredAt:        { type: Date, default: Date.now },
  isActive:            { type: Boolean, default: true },
  // AES-256-GCM encrypted private key (format: iv:tag:ciphertext, all hex).
  // Only stored when WALLET_ENCRYPTION_KEY env var is set.
  encryptedPrivateKey: { type: String, default: null, select: false },
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
