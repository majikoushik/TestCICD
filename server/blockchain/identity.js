/**
 * Blockchain identity management for ClinicTrust AI
 * Handles user registration on the blockchain network and wallet management
 */

const { FileSystemWallet, Gateway, X509WalletMixin } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Path to the Hyperledger Fabric network configuration
const networkConfigPath = path.resolve(__dirname, '../config/connection-profile.json');
const walletPath = path.resolve(__dirname, '../wallet');

/**
 * Register a new identity on the blockchain network
 * @param {string} userId - User ID to register
 * @param {string} role - User role (doctor, lab, clinic, hospital)
 * @param {string} organization - Organization name
 * @returns {Promise<Object>} - Blockchain ID and wallet address
 */
async function registerBlockchainIdentity(userId, role, organization) {
  try {
    // In a production environment, this would connect to a real Hyperledger Fabric network
    // For development, we'll simulate the blockchain registration
    
    // Generate a unique blockchain ID
    const blockchainId = `user_${crypto.randomBytes(8).toString('hex')}`;
    
    // Generate a wallet address (in production this would be created on the blockchain)
    const walletAddress = `0x${crypto.randomBytes(20).toString('hex')}`;
    
    // Log the registration (in production, this would be a blockchain transaction)
    console.log(`Registered user ${userId} on blockchain with ID ${blockchainId} and wallet ${walletAddress}`);
    
    // In production, we would store the user's credentials in the wallet
    if (!fs.existsSync(walletPath)) {
      fs.mkdirSync(walletPath, { recursive: true });
    }
    
    // Store a record of the registration
    const userRecord = {
      userId,
      blockchainId,
      walletAddress,
      role,
      organization,
      registeredAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(walletPath, `${blockchainId}.json`),
      JSON.stringify(userRecord, null, 2)
    );
    
    return { blockchainId, walletAddress };
  } catch (error) {
    console.error('Error registering blockchain identity:', error);
    throw new Error(`Failed to register blockchain identity: ${error.message}`);
  }
}

/**
 * Get a user's blockchain identity
 * @param {string} blockchainId - Blockchain ID to look up
 * @returns {Promise<Object>} - User's blockchain identity details
 */
async function getBlockchainIdentity(blockchainId) {
  try {
    const identityPath = path.join(walletPath, `${blockchainId}.json`);
    
    if (!fs.existsSync(identityPath)) {
      throw new Error(`Identity not found for ID: ${blockchainId}`);
    }
    
    const identityData = fs.readFileSync(identityPath, 'utf8');
    return JSON.parse(identityData);
  } catch (error) {
    console.error('Error getting blockchain identity:', error);
    throw new Error(`Failed to get blockchain identity: ${error.message}`);
  }
}

/**
 * Verify a blockchain identity
 * @param {string} blockchainId - Blockchain ID to verify
 * @param {string} walletAddress - Wallet address to verify
 * @returns {Promise<boolean>} - Whether the identity is valid
 */
async function verifyBlockchainIdentity(blockchainId, walletAddress) {
  try {
    const identity = await getBlockchainIdentity(blockchainId);
    return identity.walletAddress === walletAddress;
  } catch (error) {
    console.error('Error verifying blockchain identity:', error);
    return false;
  }
}

module.exports = {
  registerBlockchainIdentity,
  getBlockchainIdentity,
  verifyBlockchainIdentity
};
