/**
 * Blockchain identity management for ClinicTrust AI
 * Handles user registration on the blockchain network and wallet management.
 * Wallet data is persisted to MongoDB (Wallet + BlockchainIdentity collections).
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Register a new identity on the blockchain network.
 * Creates a Wallet document and a linked BlockchainIdentity document in MongoDB.
 * @param {string} userId - User ID to register
 * @param {string} role - User role (doctor, lab, clinic, hospital)
 * @param {string} organization - Organization name
 * @returns {Promise<Object>} - { blockchainId, walletAddress }
 */
async function registerBlockchainIdentity(userId, role, organization) {
  try {
    const Wallet = require('../models/Wallet');
    const BlockchainIdentity = require('../models/BlockchainIdentity');

    const blockchainId   = `user_${crypto.randomBytes(8).toString('hex')}`;
    const walletAddress  = `0x${crypto.randomBytes(20).toString('hex')}`;
    const registeredAt   = new Date();

    await Wallet.create({ userId, walletAddress, role, organization: organization || '', registeredAt });
    await BlockchainIdentity.create({ blockchainId, walletAddress, registeredAt });

    logger.info('Registered user on blockchain', { userId, blockchainId, walletAddress });
    return { blockchainId, walletAddress };
  } catch (error) {
    logger.error('Error registering blockchain identity', { error: error.message, stack: error.stack });
    throw new Error(`Failed to register blockchain identity: ${error.message}`);
  }
}

/**
 * Get a user's blockchain identity by blockchainId.
 * @param {string} blockchainId
 * @returns {Promise<Object>} - { userId, blockchainId, walletAddress, role, organization, registeredAt }
 */
async function getBlockchainIdentity(blockchainId) {
  try {
    const BlockchainIdentity = require('../models/BlockchainIdentity');
    const Wallet = require('../models/Wallet');

    const identity = await BlockchainIdentity.findOne({ blockchainId });
    if (!identity) throw new Error(`Identity not found for ID: ${blockchainId}`);

    const wallet = await Wallet.findOne({ walletAddress: identity.walletAddress });
    return {
      userId:        wallet ? wallet.userId        : null,
      blockchainId,
      walletAddress: identity.walletAddress,
      role:          wallet ? wallet.role          : null,
      organization:  wallet ? wallet.organization  : null,
      registeredAt:  identity.registeredAt,
    };
  } catch (error) {
    logger.error('Error getting blockchain identity', { error: error.message, stack: error.stack });
    throw new Error(`Failed to get blockchain identity: ${error.message}`);
  }
}

/**
 * Verify that a blockchainId maps to the given walletAddress.
 * @param {string} blockchainId
 * @param {string} walletAddress
 * @returns {Promise<boolean>}
 */
async function verifyBlockchainIdentity(blockchainId, walletAddress) {
  try {
    const BlockchainIdentity = require('../models/BlockchainIdentity');
    const identity = await BlockchainIdentity.findOne({ blockchainId });
    return identity ? identity.walletAddress === walletAddress : false;
  } catch (error) {
    logger.error('Error verifying blockchain identity', { error: error.message, stack: error.stack });
    return false;
  }
}

module.exports = {
  registerBlockchainIdentity,
  getBlockchainIdentity,
  verifyBlockchainIdentity,
};
