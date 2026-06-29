/**
 * Blockchain identity management for ClinicTrust AI
 * Handles user registration on the blockchain network and wallet management.
 * Wallet data is persisted to MongoDB (Wallet + BlockchainIdentity collections).
 *
 * When ethers.js is available, each user gets a real BIP-44 HD wallet derived
 * from a master mnemonic (WALLET_MASTER_MNEMONIC env var).  The derived private
 * key is AES-256-GCM encrypted with WALLET_ENCRYPTION_KEY before storage so
 * the DB never holds plaintext keys.  When ethers is unavailable (or the env
 * vars are absent) the code falls back to the original pseudo-random address.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// ── Wallet encryption helpers ─────────────────────────────────────────────────

function encryptPrivateKey(privateKey) {
  const key = process.env.WALLET_ENCRYPTION_KEY;
  if (!key) return null; // encryption disabled — don't store private key
  const keyBuf = Buffer.from(key.padEnd(32).slice(0, 32), 'utf8');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptPrivateKey(ciphertext) {
  const key = process.env.WALLET_ENCRYPTION_KEY;
  if (!key || !ciphertext) return null;
  const [ivHex, tagHex, encHex] = ciphertext.split(':');
  const keyBuf = Buffer.from(key.padEnd(32).slice(0, 32), 'utf8');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── HD wallet generation ──────────────────────────────────────────────────────

async function generateHDWallet(userId) {
  try {
    const { ethers } = require('ethers');
    const mnemonic = process.env.WALLET_MASTER_MNEMONIC;
    if (mnemonic) {
      // Deterministic wallet per user from master mnemonic (BIP-44 path m/44'/60'/0'/0/<index>)
      const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
      // Use a hash-derived index so different users get different paths without storing an index counter
      const indexBuf = crypto.createHash('sha256').update(userId).digest();
      const index = indexBuf.readUInt32BE(0) % 0x80000000; // keep within non-hardened range
      const derived = hdNode.derivePath(`m/44'/60'/0'/0/${index}`);
      return { address: derived.address, privateKey: derived.privateKey };
    }
    // No master mnemonic — generate a random wallet
    const wallet = ethers.Wallet.createRandom();
    return { address: wallet.address, privateKey: wallet.privateKey };
  } catch (e) {
    // ethers not installed or env not ready — fallback to pseudo-random address
    logger.warn('HD wallet generation unavailable, using pseudo-random address', { reason: e.message });
    return { address: `0x${crypto.randomBytes(20).toString('hex')}`, privateKey: null };
  }
}

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

    const blockchainId = `user_${crypto.randomBytes(8).toString('hex')}`;
    const registeredAt = new Date();

    const { address: walletAddress, privateKey } = await generateHDWallet(String(userId));
    const encryptedKey = privateKey ? encryptPrivateKey(privateKey) : null;

    await Wallet.create({
      userId,
      walletAddress,
      role,
      organization: organization || '',
      registeredAt,
      ...(encryptedKey ? { encryptedPrivateKey: encryptedKey } : {}),
    });
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
  decryptPrivateKey,
};
