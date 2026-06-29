/**
 * Polygon EVM adapter for ClinicToken (CLT).
 *
 * When POLYGON_RPC_URL and CLINICTOKEN_ADDRESS are set in .env this module
 * performs real on-chain operations via ethers.js v6.  When those env vars are
 * absent it falls back to a no-op mock so the server continues working in
 * development / synthetic mode without any config.
 *
 * Environment variables:
 *   POLYGON_RPC_URL        — JSON-RPC endpoint (Amoy: https://rpc-amoy.polygon.technology)
 *   CLINICTOKEN_ADDRESS    — Deployed ClinicToken contract address
 *   PRIVATE_KEY            — Platform wallet private key (owner of ClinicToken)
 *   POLYGON_NETWORK        — Human-readable name (default: 'amoy')
 */

const logger = require('../utils/logger');

// Minimal ABI — only the functions we call
const CLINIC_TOKEN_ABI = [
  'function mint(address to, uint256 amount, string reason) external',
  'function adminBurn(address from, uint256 amount, string reason) external',
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function cap() external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event TokensMinted(address indexed to, uint256 amount, string reason)',
  'event TokensBurned(address indexed from, uint256 amount, string reason)',
];

// 1 CLT = 1e18 wei (standard 18-decimal ERC-20)
const CLT_DECIMALS = 18n;
const ONE_CLT = 10n ** CLT_DECIMALS;

function cltToWei(clt) {
  return BigInt(Math.round(clt)) * ONE_CLT;
}

function weiToClt(wei) {
  return Number(BigInt(wei) / ONE_CLT);
}

// ── Live client factory (lazy-init) ──────────────────────────────────────────

let _provider = null;
let _signer   = null;
let _contract = null;

function isConfigured() {
  return Boolean(process.env.POLYGON_RPC_URL && process.env.CLINICTOKEN_ADDRESS && process.env.PRIVATE_KEY);
}

async function getContract() {
  if (_contract) return _contract;
  if (!isConfigured()) return null;

  try {
    const { ethers } = require('ethers');
    _provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    _signer   = new ethers.Wallet(process.env.PRIVATE_KEY, _provider);
    _contract = new ethers.Contract(process.env.CLINICTOKEN_ADDRESS, CLINIC_TOKEN_ABI, _signer);
    logger.info('Polygon adapter initialised', {
      network:  process.env.POLYGON_NETWORK || 'amoy',
      contract: process.env.CLINICTOKEN_ADDRESS,
      wallet:   _signer.address,
    });
    return _contract;
  } catch (err) {
    logger.error('Polygon adapter init failed — falling back to mock', { error: err.message });
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Mint CLT tokens to a wallet address on-chain.
 * Falls back to a mock response when not configured.
 *
 * @param {string} toAddress  Recipient EVM wallet address (0x…)
 * @param {number} amountCLT  Amount in whole CLT units
 * @param {string} reason     Reason string stored on-chain in the event
 * @returns {{ txHash: string|null, mock: boolean, amountCLT: number }}
 */
async function mintOnChain(toAddress, amountCLT, reason) {
  const contract = await getContract();
  if (!contract) {
    logger.debug('Polygon.mintOnChain — mock mode', { toAddress, amountCLT, reason });
    return { txHash: null, mock: true, amountCLT };
  }
  try {
    const tx = await contract.mint(toAddress, cltToWei(amountCLT), reason || 'earn');
    const receipt = await tx.wait(1); // wait for 1 confirmation
    logger.info('On-chain mint confirmed', { toAddress, amountCLT, txHash: receipt.hash });
    return { txHash: receipt.hash, mock: false, amountCLT };
  } catch (err) {
    logger.error('On-chain mint failed', { toAddress, amountCLT, error: err.message });
    throw err;
  }
}

/**
 * Admin-burn CLT tokens from a wallet address on-chain.
 * Requires the platform signer to have an allowance from `fromAddress`.
 */
async function burnOnChain(fromAddress, amountCLT, reason) {
  const contract = await getContract();
  if (!contract) {
    logger.debug('Polygon.burnOnChain — mock mode', { fromAddress, amountCLT, reason });
    return { txHash: null, mock: true, amountCLT };
  }
  try {
    const tx = await contract.adminBurn(fromAddress, cltToWei(amountCLT), reason || 'admin-burn');
    const receipt = await tx.wait(1);
    logger.info('On-chain burn confirmed', { fromAddress, amountCLT, txHash: receipt.hash });
    return { txHash: receipt.hash, mock: false, amountCLT };
  } catch (err) {
    logger.error('On-chain burn failed', { fromAddress, amountCLT, error: err.message });
    throw err;
  }
}

/**
 * Fetch on-chain balance for a wallet address (in whole CLT units).
 */
async function getOnChainBalance(walletAddress) {
  const contract = await getContract();
  if (!contract) return null;
  try {
    const bal = await contract.balanceOf(walletAddress);
    return weiToClt(bal);
  } catch (err) {
    logger.warn('getOnChainBalance failed', { walletAddress, error: err.message });
    return null;
  }
}

/**
 * Fetch contract-level supply stats.
 */
async function getTokenStats() {
  const contract = await getContract();
  if (!contract) return null;
  try {
    const [supply, cap] = await Promise.all([contract.totalSupply(), contract.cap()]);
    return {
      totalSupply: weiToClt(supply),
      cap:         weiToClt(cap),
      circulating: weiToClt(supply),
    };
  } catch (err) {
    logger.warn('getTokenStats failed', { error: err.message });
    return null;
  }
}

/**
 * Verify a transaction hash on-chain and return its status.
 * Returns null when not in live mode.
 */
async function verifyOnChainTx(txHash) {
  if (!isConfigured()) return null;
  try {
    const { ethers } = require('ethers');
    const provider = _provider || new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return { found: false, confirmed: false };
    return {
      found:       true,
      confirmed:   receipt.status === 1,
      blockNumber: Number(receipt.blockNumber),
      gasUsed:     receipt.gasUsed.toString(),
      network:     process.env.POLYGON_NETWORK || 'amoy',
    };
  } catch (err) {
    logger.warn('verifyOnChainTx failed', { txHash, error: err.message });
    return null;
  }
}

/**
 * Get the current ERC-20 allowance that `ownerAddress` has granted to
 * `spenderAddress` (the platform wallet).  Returns null in mock mode.
 */
async function getOnChainAllowance(ownerAddress, spenderAddress) {
  const contract = await getContract();
  if (!contract) return null;
  try {
    const raw = await contract.allowance(ownerAddress, spenderAddress);
    return weiToClt(raw);
  } catch (err) {
    logger.warn('getOnChainAllowance failed', { ownerAddress, error: err.message });
    return null;
  }
}

/**
 * Sign and broadcast an ERC-20 `approve` transaction using the provider's
 * decrypted private key.  This is needed before `adminBurn` can succeed.
 *
 * @param {string} fromPrivateKey  Plaintext private key of the provider wallet
 * @param {string} spenderAddress  Platform wallet address that will be approved
 * @param {number} amountCLT       Amount to approve in whole CLT units
 */
async function approveFromPrivateKey(fromPrivateKey, spenderAddress, amountCLT) {
  if (!isConfigured()) return { txHash: null, mock: true };
  try {
    const { ethers } = require('ethers');
    const provider = _provider || new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const signer = new ethers.Wallet(fromPrivateKey, provider);
    const contract = new ethers.Contract(process.env.CLINICTOKEN_ADDRESS, CLINIC_TOKEN_ABI, signer);
    const tx = await contract.approve(spenderAddress, cltToWei(amountCLT));
    const receipt = await tx.wait(1);
    logger.info('On-chain approve confirmed', { spenderAddress, amountCLT, txHash: receipt.hash });
    return { txHash: receipt.hash, mock: false };
  } catch (err) {
    logger.error('approveFromPrivateKey failed', { spenderAddress, amountCLT, error: err.message });
    throw err;
  }
}

/**
 * Full approve-then-burn flow using stored encrypted private key.
 * Decrypts key from Wallet collection, approves the platform address, then burns.
 *
 * Falls back gracefully when:
 *   - Polygon not configured   → MongoDB ledger burn (no allowance needed)
 *   - No encrypted key stored  → throws — admin must request manual approval
 */
async function burnOnChainWithStoredKey(userId, amountCLT, reason) {
  if (!isConfigured()) return { txHash: null, mock: true, method: 'ledger' };

  const { decryptPrivateKey } = require('./identity');
  const Wallet = require('../models/Wallet');

  const walletDoc = await Wallet.findOne({ userId: String(userId) }).select('+encryptedPrivateKey').lean();
  if (!walletDoc) throw new Error('No wallet found for provider');
  if (!walletDoc.encryptedPrivateKey) {
    throw new Error(
      'No encrypted private key stored for this provider. ' +
      'The provider must manually call approve() on the ClinicToken contract ' +
      `to grant the platform allowance of ${amountCLT} CLT before admin burn can execute on-chain.`
    );
  }

  const privateKey = decryptPrivateKey(walletDoc.encryptedPrivateKey);
  if (!privateKey) throw new Error('Failed to decrypt provider private key — check WALLET_ENCRYPTION_KEY');

  const platformAddress = _signer ? _signer.address : null;
  if (!platformAddress) {
    const { ethers } = require('ethers');
    await getContract(); // initialise signer
  }
  const spender = _signer.address;

  // 1. Approve platform to spend
  const approveTx = await approveFromPrivateKey(privateKey, spender, amountCLT);
  logger.info('Provider approved platform for burn', { userId, amountCLT, approveTxHash: approveTx.txHash });

  // 2. Platform burns
  const burnTx = await burnOnChain(walletDoc.walletAddress, amountCLT, reason);
  return { txHash: burnTx.txHash, approveTxHash: approveTx.txHash, mock: false, method: 'on-chain' };
}

module.exports = {
  isConfigured,
  mintOnChain,
  burnOnChain,
  burnOnChainWithStoredKey,
  getOnChainBalance,
  getOnChainAllowance,
  approveFromPrivateKey,
  getTokenStats,
  verifyOnChainTx,
  // Expose for Transfer event listener
  getContract,
  CLINIC_TOKEN_ABI,
};
