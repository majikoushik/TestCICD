/**
 * Blockchain utility functions for transaction verification.
 *
 * Behaviour:
 *   - When POLYGON_RPC_URL + CLINICTOKEN_ADDRESS are set in env  → queries real Polygon node
 *   - Otherwise                                                   → queries local BlockchainTransaction collection (MongoDB ledger)
 *
 * This means the function is always honest — it never returns random success/failure.
 */

const logger = require('./logger');

/**
 * Verify a blockchain transaction by its ID / hash.
 * In live-chain mode the ID is an on-chain tx hash; in ledger mode it is the
 * transactionId stored in BlockchainTransaction.
 *
 * @param {string} txHash
 * @returns {Promise<Object>} { verified, txHash, blockNumber, timestamp, confirmations, hash, source }
 */
const verifyBlockchainTransaction = async (txHash) => {
  try {
    // ── Live Polygon mode ──────────────────────────────────────────────────────
    if (process.env.POLYGON_RPC_URL && txHash && txHash.startsWith('0x') && txHash.length === 66) {
      const polygon = require('../blockchain/polygon');
      const result = await polygon.verifyOnChainTx(txHash);
      if (!result) return { verified: false, txHash, error: 'Could not reach Polygon node' };
      return { ...result, txHash, source: 'polygon' };
    }

    // ── MongoDB ledger mode (default) ──────────────────────────────────────────
    const BlockchainTransaction = require('../models/BlockchainTransaction');
    const record = await BlockchainTransaction.findOne({ transactionId: txHash }).lean();
    if (!record) {
      return { verified: false, txHash, error: 'Transaction not found in ledger' };
    }

    // Re-derive hash from stored data and compare
    const { createHash } = require('crypto');
    const recomputed = createHash('sha256').update(JSON.stringify(record.data)).digest('hex');
    const hashValid = recomputed === record.hash;

    // Verify chain link (previousHash must match the prior record's hash)
    let chainValid = true;
    if (record.previousHash && record.previousHash !== 'genesis') {
      const prev = await BlockchainTransaction.findOne({ hash: record.previousHash }).lean();
      chainValid = Boolean(prev);
    }

    return {
      verified: hashValid && chainValid,
      txHash,
      blockNumber: record.blockNumber || null,
      timestamp: record.timestamp,
      confirmations: 1,       // Single-node: confirmed on write
      hash: record.hash,
      hashValid,
      chainValid,
      source: 'ledger',
    };
  } catch (error) {
    logger.error('Blockchain verification error', { error: error.message });
    return { verified: false, error: error.message || 'Failed to verify transaction' };
  }
};

/**
 * Get full transaction details.
 * @param {string} txHash
 * @returns {Promise<Object>}
 */
const getTransactionDetails = async (txHash) => {
  try {
    if (process.env.POLYGON_RPC_URL && txHash && txHash.startsWith('0x') && txHash.length === 66) {
      const { ethers } = require('ethers');
      const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash),
      ]);
      if (!tx) throw new Error('Transaction not found on chain');
      return {
        verified: receipt ? receipt.status === 1 : false,
        txHash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value || 0n) + ' MATIC',
        gasUsed: receipt ? Number(receipt.gasUsed) : null,
        source: 'polygon',
      };
    }

    // Ledger mode
    const BlockchainTransaction = require('../models/BlockchainTransaction');
    const record = await BlockchainTransaction.findOne({ transactionId: txHash }).lean();
    if (!record) throw new Error('Transaction not found in ledger');
    const result = await verifyBlockchainTransaction(txHash);
    return { ...result, type: record.type, data: record.data };
  } catch (error) {
    logger.error('Error getting transaction details', { error: error.message });
    throw error;
  }
};

module.exports = { verifyBlockchainTransaction, getTransactionDetails };
