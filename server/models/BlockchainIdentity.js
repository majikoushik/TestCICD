const mongoose = require('mongoose');

// Stores the blockchain-specific identity, related to Wallet via walletAddress
const blockchainIdentitySchema = new mongoose.Schema({
  blockchainId:  { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true }, // FK to Wallet.walletAddress
  registeredAt:  { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('BlockchainIdentity', blockchainIdentitySchema);
