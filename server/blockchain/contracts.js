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

    const transactionId = await simulateBlockchainTransaction(tokenTransaction);
    return { transactionId, timestamp: new Date().toISOString(), status: 'completed', amount };
  } catch (error) {
    logger.error('Error processing token transaction', { error: error.message, stack: error.stack });
    throw new Error(`Failed to process token transaction: ${error.message}`);
  }
}

/**
 * Simulate a blockchain transaction — saves to MongoDB instead of files.
 * @param {Object} data - Transaction data
 * @returns {Promise<string>} - Transaction ID
 */
async function simulateBlockchainTransaction(data) {
  const BlockchainTransaction = require('../models/BlockchainTransaction');

  const transactionId = `tx_${crypto.randomBytes(16).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const timestamp = new Date();

  await BlockchainTransaction.create({ transactionId, type: data.type, data, hash, timestamp });

  // Simulate blockchain confirmation delay
  await new Promise(resolve => setTimeout(resolve, 100));

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
