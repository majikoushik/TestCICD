/**
 * ClinicToken on-chain event listener.
 *
 * When POLYGON_RPC_URL and CLINICTOKEN_ADDRESS are configured this module
 * starts a WebSocket (or polling) listener for Transfer events on the live
 * contract.  On each Transfer it syncs the recipient's on-chain balance back
 * into User.tokenBalance so the two sources of truth stay aligned.
 *
 * The listener is started once at server boot (called from index.js) and is
 * silently skipped when the env vars are absent.
 */

const logger = require('../utils/logger');
const polygon = require('./polygon');

// How long to wait before attempting to reconnect after a provider error
const RECONNECT_DELAY_MS = 30_000;

let _listenerActive = false;

/**
 * Start listening for on-chain Transfer events.
 * Idempotent — calling multiple times only starts one listener.
 */
async function startEventListener() {
  if (_listenerActive) return;
  if (!polygon.isConfigured()) {
    logger.debug('Blockchain event listener skipped — Polygon not configured');
    return;
  }

  try {
    await _attach();
  } catch (err) {
    logger.error('Failed to start blockchain event listener', { error: err.message });
  }
}

async function _attach() {
  const contract = await polygon.getContract();
  if (!contract) return;

  logger.info('Blockchain Transfer event listener attached');
  _listenerActive = true;

  // ethers v6: contract.on(eventFilter, handler)
  contract.on('Transfer', async (from, to, value, event) => {
    try {
      const { ethers } = require('ethers');
      // Convert wei → whole CLT
      const amountCLT = Number(BigInt(value) / (10n ** 18n));
      if (amountCLT === 0) return;

      logger.info('On-chain Transfer detected', {
        from,
        to,
        amountCLT,
        txHash: event.log?.transactionHash,
      });

      await _syncBalance(to, event.log?.transactionHash);
      // Also sync sender (their balance decreased)
      if (from !== ethers.ZeroAddress) {
        await _syncBalance(from, event.log?.transactionHash);
      }
    } catch (err) {
      logger.error('Transfer event handler error', { error: err.message });
    }
  });

  // Reconnect on provider errors
  contract.runner?.provider?.on?.('error', async (err) => {
    logger.warn('Blockchain provider error — reconnecting in 30s', { error: err.message });
    _listenerActive = false;
    setTimeout(() => startEventListener().catch(() => {}), RECONNECT_DELAY_MS);
  });
}

/**
 * Fetch the live on-chain balance for a wallet address and write it to the
 * corresponding User document.
 */
async function _syncBalance(walletAddress, txHash) {
  if (!walletAddress || walletAddress === '0x0000000000000000000000000000000000000000') return;
  try {
    const onChainBalance = await polygon.getOnChainBalance(walletAddress);
    if (onChainBalance === null) return;

    const User = require('../models/User');
    const updated = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: { tokenBalance: onChainBalance } },
      { new: true }
    );
    if (updated) {
      logger.info('Synced on-chain balance → User', {
        walletAddress,
        newBalance: onChainBalance,
        txHash: txHash || 'n/a',
      });
    }
  } catch (err) {
    logger.warn('_syncBalance failed', { walletAddress, error: err.message });
  }
}

module.exports = { startEventListener };
