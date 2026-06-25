import { get, post, put } from '../utils/apiUtils';
import { adminMockData } from './mockData';

/**
 * Service for handling admin referral operations
 */
const adminReferralService = {
  /**
   * Get all referrals
   * @returns {Promise<Object>} Object containing referrals data and stats
   */
  getAllReferrals: async () => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          success: true,
          data: {
            referrals: adminMockData.referrals,
            stats: adminMockData.referralStats
          }
        };
      }

      // Make API call using apiUtils
      const response = await get('/admin/referrals');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching referrals:', error);
      throw error;
    }
  },

  /**
   * Get referral by ID
   * @param {string} referralId - Referral ID
   * @returns {Promise<Object>} Referral object
   */
  getReferralById: async (referralId) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Find referral in mock data
        const referral = adminMockData.referrals.find(r => r.id === referralId);
        
        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!referral) {
          throw new Error('Referral not found');
        }
        
        return {
          success: true,
          data: referral
        };
      }

      // Make API call using apiUtils
      const response = await get(`/admin/referrals/${referralId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error fetching referral with ID ${referralId}:`, error);
      throw error;
    }
  },

  /**
   * Update referral status
   * @param {string} referralId - Referral ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated referral object
   */
  updateReferral: async (referralId, updateData) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Find and update referral in mock data (this doesn't actually persist)
        const referralIndex = adminMockData.referrals.findIndex(r => r.id === referralId);
        
        if (referralIndex === -1) {
          throw new Error('Referral not found');
        }
        
        // Create updated referral object
        const updatedReferral = {
          ...adminMockData.referrals[referralIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          message: 'Referral updated successfully',
          data: updatedReferral
        };
      }

      // Make API call using apiUtils
      const response = await put(`/admin/referrals/${referralId}`, updateData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error updating referral with ID ${referralId}:`, error);
      throw error;
    }
  },

  /**
   * Resolve a referral dispute
   * @param {string} referralId - Referral ID
   * @param {Object} resolutionData - Resolution data
   * @returns {Promise<Object>} Updated referral object
   */
  resolveDispute: async (referralId, resolutionData) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find referral in mock data
        const referralIndex = adminMockData.referrals.findIndex(r => r.id === referralId);
        
        if (referralIndex === -1) {
          throw new Error('Referral not found');
        }
        
        // Create updated referral object with resolved dispute
        const updatedReferral = {
          ...adminMockData.referrals[referralIndex],
          dispute: {
            ...adminMockData.referrals[referralIndex].dispute,
            status: 'resolved',
            resolution: resolutionData.resolution,
            resolvedBy: resolutionData.resolvedBy || 'Admin',
            resolvedAt: new Date().toISOString(),
            notes: resolutionData.notes
          },
          updatedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          message: 'Dispute resolved successfully',
          data: updatedReferral
        };
      }

      // Make API call using apiUtils
      const response = await post(`/admin/referrals/${referralId}/resolve-dispute`, resolutionData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error resolving dispute for referral with ID ${referralId}:`, error);
      throw error;
    }
  },

  /**
   * Process payment for a referral
   * @param {string} referralId - Referral ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Updated referral object
   */
  processPayment: async (referralId, paymentData) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Find referral in mock data
        const referralIndex = adminMockData.referrals.findIndex(r => r.id === referralId);
        
        if (referralIndex === -1) {
          throw new Error('Referral not found');
        }
        
        // Create updated referral object with payment processed
        const updatedReferral = {
          ...adminMockData.referrals[referralIndex],
          payment: {
            ...adminMockData.referrals[referralIndex].payment,
            status: 'processed',
            amount: paymentData.amount,
            processedBy: paymentData.processedBy || 'Admin',
            processedAt: new Date().toISOString(),
            transactionHash: paymentData.transactionHash,
            notes: paymentData.notes
          },
          updatedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          message: 'Payment processed successfully',
          data: updatedReferral
        };
      }

      // Make API call using apiUtils
      const response = await post(`/admin/referrals/${referralId}/process-payment`, paymentData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error processing payment for referral with ID ${referralId}:`, error);
      throw error;
    }
  },

  /**
   * Verify blockchain transaction
   * @param {string} transactionHash - Transaction hash
   * @returns {Promise<Object>} Transaction verification result
   */
  verifyTransaction: async (transactionHash) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate verification result (success for demo purposes)
        const isValid = transactionHash && transactionHash.length > 10;
        
        return {
          success: true,
          data: {
            verified: isValid,
            transactionHash,
            timestamp: isValid ? new Date().toISOString() : null,
            amount: isValid ? '150.00' : null,
            sender: isValid ? '0x1234567890abcdef' : null,
            recipient: isValid ? '0xabcdef1234567890' : null,
            blockNumber: isValid ? 12345678 : null,
            message: isValid ? 'Transaction verified successfully' : 'Invalid transaction hash'
          }
        };
      }

      // Make API call using apiUtils
      const response = await get(`/admin/blockchain/verify/${transactionHash}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error verifying transaction with hash ${transactionHash}:`, error);
      throw error;
    }
  },

  /**
   * Get referral statistics
   * @returns {Promise<Object>} Referral statistics
   */
  getReferralStats: async () => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 700));
        return {
          success: true,
          data: adminMockData.referralStats
        };
      }

      // Make API call using apiUtils
      const response = await get('/admin/referrals/stats');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching referral statistics:', error);
      throw error;
    }
  }
};

export default adminReferralService;
