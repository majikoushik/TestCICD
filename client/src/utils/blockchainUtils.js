/**
 * Blockchain Utilities
 * 
 * This utility provides functions for blockchain-related operations
 */

/**
 * Format a blockchain transaction ID for display
 * 
 * @param {string} transactionId - Transaction ID to format
 * @param {number} displayLength - Number of characters to display
 * @returns {string} Formatted transaction ID
 */
export const formatTransactionId = (transactionId, displayLength = 8) => {
  if (!transactionId) return '';
  
  const halfLength = Math.floor(displayLength / 2);
  
  if (transactionId.length <= displayLength) {
    return transactionId;
  }
  
  return `${transactionId.substring(0, halfLength)}...${transactionId.substring(transactionId.length - halfLength)}`;
};

/**
 * Generate a blockchain explorer URL for a transaction
 * 
 * @param {string} transactionId - Transaction ID
 * @param {string} network - Blockchain network
 * @returns {string} Explorer URL
 */
export const getExplorerUrl = (transactionId, network = 'main') => {
  if (!transactionId) return '';
  
  // Get the explorer base URL based on the network
  const getBaseUrl = () => {
    switch (network.toLowerCase()) {
      case 'main':
      case 'mainnet':
        return process.env.REACT_APP_BLOCKCHAIN_EXPLORER_URL || 'https://explorer.clinictrust.ai';
      case 'test':
      case 'testnet':
        return process.env.REACT_APP_BLOCKCHAIN_EXPLORER_TEST_URL || 'https://test-explorer.clinictrust.ai';
      case 'dev':
      case 'development':
        return process.env.REACT_APP_BLOCKCHAIN_EXPLORER_DEV_URL || 'http://localhost:8080';
      default:
        return process.env.REACT_APP_BLOCKCHAIN_EXPLORER_URL || 'https://explorer.clinictrust.ai';
    }
  };
  
  const baseUrl = getBaseUrl();
  return `${baseUrl}/tx/${transactionId}`;
};

/**
 * Verify a blockchain transaction
 * 
 * @param {string} transactionId - Transaction ID to verify
 * @param {Function} callback - Callback function
 * @returns {Promise} Promise that resolves with the verification result
 */
export const verifyTransaction = async (transactionId) => {
  if (!transactionId) {
    return { verified: false, error: 'No transaction ID provided' };
  }
  
  try {
    // In a real app, this would call the blockchain API to verify the transaction
    // For this demo, we'll simulate the API call
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate verification result
    const mockResult = {
      verified: true,
      timestamp: new Date().toISOString(),
      block: {
        number: 12345678,
        hash: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t'
      },
      network: 'ClinicTrustNetwork'
    };
    
    return mockResult;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return { verified: false, error: error.message || 'Failed to verify transaction' };
  }
};

/**
 * Get the status of a blockchain transaction
 * 
 * @param {string} transactionId - Transaction ID to check
 * @returns {Promise} Promise that resolves with the transaction status
 */
export const getTransactionStatus = async (transactionId) => {
  if (!transactionId) {
    return { status: 'unknown', error: 'No transaction ID provided' };
  }
  
  try {
    // In a real app, this would call the blockchain API to get the transaction status
    // For this demo, we'll simulate the API call
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate transaction status
    const mockStatus = {
      status: 'confirmed',
      confirmations: 12,
      timestamp: new Date().toISOString(),
      block: {
        number: 12345678,
        hash: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t'
      }
    };
    
    return mockStatus;
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return { status: 'unknown', error: error.message || 'Failed to get transaction status' };
  }
};

/**
 * Format a blockchain address for display
 * 
 * @param {string} address - Address to format
 * @param {number} displayLength - Number of characters to display
 * @returns {string} Formatted address
 */
export const formatAddress = (address, displayLength = 8) => {
  return formatTransactionId(address, displayLength);
};

/**
 * Generate a mock transaction ID for testing
 * 
 * @returns {string} Mock transaction ID
 */
export const generateMockTransactionId = () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '0x';
  
  for (let i = 0; i < 30; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

/**
 * Get the network name from a network ID
 * 
 * @param {string} networkId - Network ID
 * @returns {string} Network name
 */
export const getNetworkName = (networkId) => {
  const networks = {
    '1': 'ClinicTrust Mainnet',
    '2': 'ClinicTrust Testnet',
    '3': 'ClinicTrust Development'
  };
  
  return networks[networkId] || 'Unknown Network';
};
