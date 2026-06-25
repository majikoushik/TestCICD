/**
 * Smart contract interactions for ClinicTrust AI
 * Handles patient consent, referrals, and token transactions
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getBlockchainIdentity } = require('./identity');

// Path to store simulated blockchain transactions
const transactionsPath = path.resolve(__dirname, '../blockchain-data/transactions');

// Ensure the transactions directory exists
if (!fs.existsSync(transactionsPath)) {
  fs.mkdirSync(transactionsPath, { recursive: true });
}

/**
 * Create a patient consent record on the blockchain
 * @param {string} patientId - Patient ID
 * @param {string} providerId - Provider ID receiving consent
 * @param {string} accessLevel - Level of access granted
 * @param {Array} dataElements - Specific data elements consent is granted for
 * @param {Date} expiryDate - When consent expires
 * @returns {Promise<Object>} - Transaction details
 */
async function createConsentRecord(patientId, providerId, accessLevel, dataElements, expiryDate) {
  try {
    // Create consent record
    const consentRecord = {
      type: 'consent',
      patientId,
      providerId,
      accessLevel,
      dataElements,
      grantedAt: new Date().toISOString(),
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      status: 'active'
    };
    
    // In production, this would be submitted to the blockchain network
    // For development, we'll simulate a blockchain transaction
    const transactionId = await simulateBlockchainTransaction(consentRecord);
    
    return {
      transactionId,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
  } catch (error) {
    console.error('Error creating consent record:', error);
    throw new Error(`Failed to create consent record: ${error.message}`);
  }
}

/**
 * Verify if a provider has consent to access patient data
 * @param {string} patientId - Patient ID
 * @param {string} providerId - Provider ID
 * @param {string} dataElement - Data element to check access for
 * @returns {Promise<boolean>} - Whether consent exists and is valid
 */
async function verifyConsent(patientId, providerId, dataElement) {
  try {
    // In production, this would query the blockchain for consent records
    // For development, we'll simulate by checking our stored transactions
    const transactions = await getTransactionsByType('consent');
    
    // Find relevant consent records
    const consentRecords = transactions.filter(tx => 
      tx.data.patientId === patientId && 
      tx.data.providerId === providerId &&
      tx.data.status === 'active'
    );
    
    if (consentRecords.length === 0) {
      return false;
    }
    
    // Check if any consent record grants access to the requested data element
    return consentRecords.some(record => {
      // Check if consent has expired
      if (record.data.expiryDate && new Date(record.data.expiryDate) < new Date()) {
        return false;
      }
      
      // Check if consent includes the requested data element
      return record.data.accessLevel === 'full' || 
             (record.data.dataElements && record.data.dataElements.includes(dataElement));
    });
  } catch (error) {
    console.error('Error verifying consent:', error);
    return false;
  }
}

/**
 * Create a referral smart contract
 * @param {Object} referralData - Referral details
 * @returns {Promise<Object>} - Transaction details
 */
async function createReferralContract(referralData) {
  try {
    // Create referral contract
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
        status: 'pending'
      },
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // In production, this would be submitted to the blockchain network
    // For development, we'll simulate a blockchain transaction
    const transactionId = await simulateBlockchainTransaction(referralContract);
    
    return {
      transactionId,
      contractId: `REF-${crypto.randomBytes(8).toString('hex')}`,
      timestamp: new Date().toISOString(),
      status: 'created'
    };
  } catch (error) {
    console.error('Error creating referral contract:', error);
    throw new Error(`Failed to create referral contract: ${error.message}`);
  }
}

/**
 * Update a referral contract status
 * @param {string} transactionId - Original transaction ID
 * @param {string} status - New status
 * @param {Object} updateData - Additional data for the update
 * @returns {Promise<Object>} - Transaction details
 */
async function updateReferralContract(transactionId, status, updateData = {}) {
  try {
    // Get the original transaction
    const originalTx = await getTransaction(transactionId);
    
    if (!originalTx || originalTx.data.type !== 'referral') {
      throw new Error('Referral contract not found');
    }
    
    // Create update transaction
    const updateTransaction = {
      type: 'referral_update',
      originalTransactionId: transactionId,
      status,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // In production, this would be submitted to the blockchain network
    // For development, we'll simulate a blockchain transaction
    const newTransactionId = await simulateBlockchainTransaction(updateTransaction);
    
    return {
      transactionId: newTransactionId,
      originalTransactionId: transactionId,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
  } catch (error) {
    console.error('Error updating referral contract:', error);
    throw new Error(`Failed to update referral contract: ${error.message}`);
  }
}

/**
 * Process a token transaction (earn, spend, transfer)
 * @param {string} fromUserId - User ID sending tokens (or system for rewards)
 * @param {string} toUserId - User ID receiving tokens
 * @param {number} amount - Amount of tokens
 * @param {string} reason - Reason for transaction
 * @param {Object} metadata - Additional transaction metadata
 * @returns {Promise<Object>} - Transaction details
 */
async function processTokenTransaction(fromUserId, toUserId, amount, reason, metadata = {}) {
  try {
    // Create token transaction
    const tokenTransaction = {
      type: 'token',
      fromUserId,
      toUserId,
      amount,
      reason,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    // In production, this would be submitted to the blockchain network
    // For development, we'll simulate a blockchain transaction
    const transactionId = await simulateBlockchainTransaction(tokenTransaction);
    
    return {
      transactionId,
      timestamp: new Date().toISOString(),
      status: 'completed',
      amount
    };
  } catch (error) {
    console.error('Error processing token transaction:', error);
    throw new Error(`Failed to process token transaction: ${error.message}`);
  }
}

/**
 * Simulate a blockchain transaction
 * @param {Object} data - Transaction data
 * @returns {Promise<string>} - Transaction ID
 */
async function simulateBlockchainTransaction(data) {
  return new Promise((resolve, reject) => {
    try {
      // Generate a transaction ID
      const transactionId = `tx_${crypto.randomBytes(16).toString('hex')}`;
      
      // Create transaction object
      const transaction = {
        transactionId,
        timestamp: new Date().toISOString(),
        data,
        hash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
      };
      
      // Save transaction to file
      fs.writeFileSync(
        path.join(transactionsPath, `${transactionId}.json`),
        JSON.stringify(transaction, null, 2)
      );
      
      // Simulate blockchain confirmation delay
      setTimeout(() => {
        resolve(transactionId);
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get a transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} - Transaction data
 */
async function getTransaction(transactionId) {
  try {
    const transactionPath = path.join(transactionsPath, `${transactionId}.json`);
    
    if (!fs.existsSync(transactionPath)) {
      return null;
    }
    
    const transactionData = fs.readFileSync(transactionPath, 'utf8');
    return JSON.parse(transactionData);
  } catch (error) {
    console.error('Error getting transaction:', error);
    return null;
  }
}

/**
 * Get transactions by type
 * @param {string} type - Transaction type
 * @returns {Promise<Array>} - Matching transactions
 */
async function getTransactionsByType(type) {
  try {
    if (!fs.existsSync(transactionsPath)) {
      return [];
    }
    
    const files = fs.readdirSync(transactionsPath);
    const transactions = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const transactionData = fs.readFileSync(path.join(transactionsPath, file), 'utf8');
        const transaction = JSON.parse(transactionData);
        
        if (transaction.data && transaction.data.type === type) {
          transactions.push(transaction);
        }
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error getting transactions by type:', error);
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
  getTransactionsByType
};
