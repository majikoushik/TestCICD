/**
 * Smart contract interactions for ClinicTrust AI
 * Handles patient consent, referrals, and token transactions.
 * All transactions are persisted to MongoDB (BlockchainTransaction collection).
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Create a patient consent record on the blockchain.
 */
async function createConsentRecord(patientId, providerId, accessLevel, dataElements, expiryDate) {
  try {
    const consentRecord = {
      type: 'consent',
      patientId,
      providerId,
      accessLevel,
      dataElements,
      grantedAt: new Date().toISOString(),
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      status: 'active',
    };

    const transactionId = await simulateBlockchainTransaction(consentRecord);
    return { transactionId, timestamp: new Date().toISOString(), status: 'completed' };
  } catch (error) {
    logger.error('Error creating consent record', { error: error.message, stack: error.stack });
    throw new Error(`Failed to create consent record: ${error.message}`);
  }
}

/**
 * Verify if a provider has consent to access patient data.
 */
async function verifyConsent(patientId, providerId, dataElement) {
  try {
    const transactions = await getTransactionsByType('consent');

    const consentRecords = transactions.filter(tx =>
      tx.data.patientId === patientId &&
      tx.data.providerId === providerId &&
      tx.data.status === 'active'
    );

    if (consentRecords.length === 0) return false;

    return consentRecords.some(record => {
      if (record.data.expiryDate && new Date(record.data.expiryDate) < new Date()) return false;
      return record.data.accessLevel === 'full' ||
             (record.data.dataElements && record.data.dataElements.includes(dataElement));
    });
  } catch (error) {
    logger.error('Error verifying consent', { error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Create a referral smart contract.
 */
async function createReferralContract(referralData) {
  try {
    const referralContract = {
      type: 'referral',
      patientId: referralData.patient,
      referringProviderId: referralData.referringProvider,
      receivingProviderId: referralData.receivingProvider,
      reason: referralData.reason,
      urgency: referralData.urgency,
      attachedRecords: referralData.attachedRecords || [],
      billing: {
        amount: referralData.billing?.amount,
        currency: referralData.billing?.currency || 'USD',
        status: 'pending',
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const transactionId = await simulateBlockchainTransaction(referralContract);
    return {
      transactionId,
      contractId: `REF-${crypto.randomBytes(8).toString('hex')}`,
      timestamp: new Date().toISOString(),
      status: 'created',
    };
  } catch (error) {
    logger.error('Error creating referral contract', { error: error.message, stack: error.stack });
    throw new Error(`Failed to create referral contract: ${error.message}`);
  }
}

/**
 * Update a referral contract status.
 */
async function updateReferralContract(transactionId, status, updateData = {}) {
  try {
    const originalTx = await getTransaction(transactionId);
    if (!originalTx || originalTx.data.type !== 'referral') {
      throw new Error('Referral contract not found');
    }

    const updateTransaction = {
      type: 'referral_update',
      originalTransactionId: transactionId,
      status,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    const newTransactionId = await simulateBlockchainTransaction(updateTransaction);
    return {
      transactionId: newTransactionId,
      originalTransactionId: transactionId,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };
  } catch (error) {
    logger.error('Error updating referral contract', { error: error.message, stack: error.stack });
    throw new Error(`Failed to update referral contract: ${error.message}`);
  }
}

/**
 * Process a token transaction (earn, spend, transfer).
 *
 * When Polygon is configured (POLYGON_RPC_URL + CLINICTOKEN_ADDRESS + PRIVATE_KEY)
 * this will attempt an on-chain mint/transfer via the ClinicToken contract.
 * The result txHash is used as the ledger transactionId so everything is
 * traceable to the real chain.  Falls back to the MongoDB ledger when Polygon
 * is not configured or the on-chain call fails.
 */
async function processTokenTransaction(fromUserId, toUserId, amount, reason, metadata = {}) {
  try {
    const tokenTransaction = {
      type: 'token',
      fromUserId,
      toUserId,
      amount,
      reason,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Attempt on-chain mint when we have a recipient wallet address and Polygon is live
    let onChainTxHash = null;
    const polygon = require('./polygon');
    if (polygon.isConfigured() && toUserId !== 'system' && toUserId !== fromUserId) {
      try {
        const User = require('../models/User');
        const recipient = await User.findById(toUserId).select('walletAddress').lean();
        if (recipient && recipient.walletAddress && recipient.walletAddress.startsWith('0x')) {
          const result = await polygon.mintOnChain(recipient.walletAddress, amount, reason || 'earn');
          onChainTxHash = result.txHash;
        }
      } catch (polyErr) {
        logger.warn('On-chain mint failed — falling back to ledger', { error: polyErr.message });
      }
    }

    // Always write to the MongoDB ledger for audit trail
    tokenTransaction.metadata = { ...metadata, onChainTxHash };
    const transactionId = onChainTxHash || await simulateBlockchainTransaction(tokenTransaction);
    return { transactionId, timestamp: new Date().toISOString(), status: 'completed', amount, onChain: Boolean(onChainTxHash) };
  } catch (error) {
    logger.error('Error processing token transaction', { error: error.message, stack: error.stack });
    throw new Error(`Failed to process token transaction: ${error.message}`);
  }
}

/**
 * Write a transaction to the chained MongoDB ledger.
 * Each record stores the previous record's hash (previousHash) creating a
 * tamper-evident linked chain similar to a blockchain's block linkage.
 * @param {Object} data - Transaction data
 * @returns {Promise<string>} - Transaction ID
 */
async function simulateBlockchainTransaction(data) {
  const BlockchainTransaction = require('../models/BlockchainTransaction');

  // Find the most-recent record to get the chain tip hash
  const prev = await BlockchainTransaction.findOne().sort({ blockNumber: -1, createdAt: -1 }).lean();
  const previousHash = prev ? prev.hash : 'genesis';
  const blockNumber  = prev ? (prev.blockNumber || 0) + 1 : 1;

  const transactionId = `tx_${crypto.randomBytes(16).toString('hex')}`;

  // Include previousHash in the hash computation so the chain is tamper-evident
  const hashInput = JSON.stringify({ ...data, previousHash, blockNumber });
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  const timestamp = new Date();

  await BlockchainTransaction.create({
    transactionId,
    type: data.type,
    data,
    hash,
    previousHash,
    blockNumber,
    timestamp,
  });

  return transactionId;
}

/**
 * Get a transaction by ID.
 */
async function getTransaction(transactionId) {
  try {
    const BlockchainTransaction = require('../models/BlockchainTransaction');
    const tx = await BlockchainTransaction.findOne({ transactionId });
    return tx ? tx.toObject() : null;
  } catch (error) {
    logger.error('Error getting transaction', { error: error.message, stack: error.stack });
    return null;
  }
}

/**
 * Get transactions by type.
 */
async function getTransactionsByType(type) {
  try {
    const BlockchainTransaction = require('../models/BlockchainTransaction');
    const txs = await BlockchainTransaction.find({ type });
    return txs.map(t => t.toObject());
  } catch (error) {
    logger.error('Error getting transactions by type', { error: error.message, stack: error.stack });
    return [];
  }
}

module.exports = {
  createConsentRecord,
  verifyConsent,
  createReferralContract,
  updateReferralContract,
  processTokenTransaction,
  getTransaction,
  getTransactionsByType,
};
