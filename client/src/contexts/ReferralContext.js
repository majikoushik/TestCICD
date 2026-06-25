import React, { createContext, useContext, useState, useCallback } from 'react';
import { referralService } from '../services';
import { useNotification } from './NotificationContext';
import { useConfirmation } from '../hooks';

// Create referral context
const ReferralContext = createContext({
  referrals: [],
  currentReferral: null,
  loading: false,
  error: null,
  getReferrals: () => {},
  getReferralById: () => {},
  createReferral: () => {},
  updateReferral: () => {},
  deleteReferral: () => {},
  acceptReferral: () => {},
  rejectReferral: () => {},
  completeReferral: () => {},
  cancelReferral: () => {},
  uploadAttachment: () => {},
  deleteAttachment: () => {}
});

/**
 * Custom hook to use the referral context
 * 
 * @returns {Object} Referral context
 */
export const useReferral = () => useContext(ReferralContext);

/**
 * Referral provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const ReferralProvider = ({ children }) => {
  // State
  const [referrals, setReferrals] = useState([]);
  const [currentReferral, setCurrentReferral] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Get notification context
  const { notifySuccess, notifyError } = useNotification();
  
  // Get confirmation hook
  const { confirm, confirmDelete } = useConfirmation();
  
  /**
   * Get all referrals
   * 
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Page size
   * @param {string} options.search - Search term
   * @param {string} options.status - Filter by status
   * @param {string} options.priority - Filter by priority
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort order (asc, desc)
   * @param {string} options.direction - Filter by direction (sent, received)
   * @returns {Promise} Promise that resolves with the referrals list
   */
  const getReferrals = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      const response = await referralService.getReferrals(options);
      setReferrals(response.referrals);
      setPagination(response.pagination);
      return response;
    } catch (err) {
      console.error('Error getting referrals:', err);
      setError('Failed to get referrals');
      notifyError('Failed to get referrals');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Get a referral by ID
   * 
   * @param {string} referralId - Referral ID
   * @returns {Promise} Promise that resolves with the referral data
   */
  const getReferralById = useCallback(async (referralId) => {
    try {
      setLoading(true);
      const referral = await referralService.getReferralById(referralId);
      setCurrentReferral(referral);
      return referral;
    } catch (err) {
      console.error('Error getting referral:', err);
      setError('Failed to get referral details');
      notifyError('Failed to get referral details');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Create a new referral
   * 
   * @param {Object} referralData - Referral data
   * @returns {Promise} Promise that resolves with the created referral
   */
  const createReferral = useCallback(async (referralData) => {
    try {
      setLoading(true);
      const referral = await referralService.createReferral(referralData);
      
      // Update referrals list if it exists
      if (referrals.length > 0) {
        setReferrals(prevReferrals => [referral, ...prevReferrals]);
      }
      
      notifySuccess('Referral created successfully');
      return referral;
    } catch (err) {
      console.error('Error creating referral:', err);
      setError('Failed to create referral');
      notifyError('Failed to create referral');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [referrals, notifySuccess, notifyError]);
  
  /**
   * Update a referral
   * 
   * @param {string} referralId - Referral ID
   * @param {Object} referralData - Updated referral data
   * @returns {Promise} Promise that resolves with the updated referral
   */
  const updateReferral = useCallback(async (referralId, referralData) => {
    try {
      setLoading(true);
      const updatedReferral = await referralService.updateReferral(referralId, referralData);
      
      // Update current referral if it's the same
      if (currentReferral && currentReferral.id === referralId) {
        setCurrentReferral(updatedReferral);
      }
      
      // Update referrals list if it exists
      if (referrals.length > 0) {
        setReferrals(prevReferrals => 
          prevReferrals.map(referral => 
            referral.id === referralId ? updatedReferral : referral
          )
        );
      }
      
      notifySuccess('Referral updated successfully');
      return updatedReferral;
    } catch (err) {
      console.error('Error updating referral:', err);
      setError('Failed to update referral');
      notifyError('Failed to update referral');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentReferral, referrals, notifySuccess, notifyError]);
  
  /**
   * Delete a referral
   * 
   * @param {string} referralId - Referral ID
   * @returns {Promise} Promise that resolves when the referral is deleted
   */
  const deleteReferral = useCallback(async (referralId) => {
    // Confirm deletion
    const confirmed = await confirmDelete({
      title: 'Delete Referral',
      message: 'Are you sure you want to delete this referral? This action cannot be undone.'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      await referralService.deleteReferral(referralId);
      
      // Update referrals list if it exists
      if (referrals.length > 0) {
        setReferrals(prevReferrals => 
          prevReferrals.filter(referral => referral.id !== referralId)
        );
      }
      
      // Clear current referral if it's the same
      if (currentReferral && currentReferral.id === referralId) {
        setCurrentReferral(null);
      }
      
      notifySuccess('Referral deleted successfully');
    } catch (err) {
      console.error('Error deleting referral:', err);
      setError('Failed to delete referral');
      notifyError('Failed to delete referral');
    } finally {
      setLoading(false);
    }
  }, [currentReferral, referrals, confirmDelete, notifySuccess, notifyError]);
  
  /**
   * Accept a referral
   * 
   * @param {string} referralId - Referral ID
   * @param {Object} data - Additional data
   * @returns {Promise} Promise that resolves with the updated referral
   */
  const acceptReferral = useCallback(async (referralId, data = {}) => {
    // Confirm acceptance
    const confirmed = await confirm({
      title: 'Accept Referral',
      message: 'Are you sure you want to accept this referral?',
      confirmLabel: 'Accept',
      type: 'success'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      const updatedReferral = await referralService.acceptReferral(referralId, data);
      
      // Update current referral if it's the same
      if (currentReferral && currentReferral.id === referralId) {
        setCurrentReferral(updatedReferral);
      }
      
      // Update referrals list if it exists
      if (referrals.length > 0) {
        setReferrals(prevReferrals => 
          prevReferrals.map(referral => 
            referral.id === referralId ? updatedReferral : referral
          )
        );
      }
      
      notifySuccess('Referral accepted successfully');
      return updatedReferral;
    } catch (err) {
      console.error('Error accepting referral:', err);
      setError('Failed to accept referral');
      notifyError('Failed to accept referral');
    } finally {
      setLoading(false);
    }
  }, [currentReferral, referrals, confirm, notifySuccess, notifyError]);
  
  /**
   * Reject a referral
   * 
   * @param {string} referralId - Referral ID
   * @param {Object} data - Additional data
   * @returns {Promise} Promise that resolves with the updated referral
   */
  const rejectReferral = useCallback(async (referralId, data = {}) => {
    // Confirm rejection
    const confirmed = await confirm({
      title: 'Reject Referral',
      message: 'Are you sure you want to reject this referral?',
      confirmLabel: 'Reject',
      confirmColor: 'error',
      type: 'warning'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      const updatedReferral = await referralService.rejectReferral(referralId, data);
      
      // Update current referral if it's the same
      if (currentReferral && currentReferral.id === referralId) {
        setCurrentReferral(updatedReferral);
      }
      
      // Update referrals list if it exists
      if (referrals.length > 0) {
        setReferrals(prevReferrals => 
          prevReferrals.map(referral => 
            referral.id === referralId ? updatedReferral : referral
          )
        );
      }
      
      notifySuccess('Referral rejected successfully');
      return updatedReferral;
    } catch (err) {
      console.error('Error rejecting referral:', err);
      setError('Failed to reject referral');
      notifyError('Failed to reject referral');
    } finally {
      setLoading(false);
    }
  }, [currentReferral, referrals, confirm, notifySuccess, notifyError]);
  
  /**
   * Complete a referral
   * 
   * @param {string} referralId - Referral ID
   * @param {Object} data - Additional data
   * @returns {Promise} Promise that resolves with the updated referral
   */
  const completeReferral = useCallback(async (referralId, data = {}) => {
    // Confirm completion
    const confirmed = await confirm({
      title: 'Complete Referral',
      message: 'Are you sure you want to mark this referral as completed?',
      confirmLabel: 'Complete',
      confirmColor: 'success',
      type: 'success'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      const updatedReferral = await referralService.completeReferral(referralId, data);
      
      // Update current referral if it's the same
      if (currentReferral && currentReferral.id === referralId) {
        setCurrentReferral(updatedReferral);
      }
      
      // Update referrals list if it exists
      if (referrals.length > 0) {
        setReferrals(prevReferrals => 
          prevReferrals.map(referral => 
            referral.id === referralId ? updatedReferral : referral
          )
        );
      }
      
      notifySuccess('Referral completed successfully');
      return updatedReferral;
    } catch (err) {
      console.error('Error completing referral:', err);
      setError('Failed to complete referral');
      notifyError('Failed to complete referral');
    } finally {
      setLoading(false);
    }
  }, [currentReferral, referrals, confirm, notifySuccess, notifyError]);
  
  /**
   * Cancel a referral
   * 
   * @param {string} referralId - Referral ID
   * @param {Object} data - Additional data
   * @returns {Promise} Promise that resolves with the updated referral
   */
  const cancelReferral = useCallback(async (referralId, data = {}) => {
    // Confirm cancellation
    const confirmed = await confirm({
      title: 'Cancel Referral',
      message: 'Are you sure you want to cancel this referral?',
      confirmLabel: 'Cancel Referral',
      confirmColor: 'warning',
      type: 'warning'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      const updatedReferral = await referralService.cancelReferral(referralId, data);
      
      // Update current referral if it's the same
      if (currentReferral && currentReferral.id === referralId) {
        setCurrentReferral(updatedReferral);
      }
      
      // Update referrals list if it exists
      if (referrals.length > 0) {
        setReferrals(prevReferrals => 
          prevReferrals.map(referral => 
            referral.id === referralId ? updatedReferral : referral
          )
        );
      }
      
      notifySuccess('Referral cancelled successfully');
      return updatedReferral;
    } catch (err) {
      console.error('Error cancelling referral:', err);
      setError('Failed to cancel referral');
      notifyError('Failed to cancel referral');
    } finally {
      setLoading(false);
    }
  }, [currentReferral, referrals, confirm, notifySuccess, notifyError]);
  
  /**
   * Upload an attachment to a referral
   * 
   * @param {string} referralId - Referral ID
   * @param {File} file - File to upload
   * @returns {Promise} Promise that resolves with the uploaded attachment
   */
  const uploadAttachment = useCallback(async (referralId, file) => {
    try {
      setLoading(true);
      const attachment = await referralService.uploadReferralAttachment(referralId, file);
      
      // Update current referral if it's the same
      if (currentReferral && currentReferral.id === referralId) {
        setCurrentReferral(prevReferral => ({
          ...prevReferral,
          attachments: [...(prevReferral.attachments || []), attachment]
        }));
      }
      
      notifySuccess('Attachment uploaded successfully');
      return attachment;
    } catch (err) {
      console.error('Error uploading attachment:', err);
      setError('Failed to upload attachment');
      notifyError('Failed to upload attachment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentReferral, notifySuccess, notifyError]);
  
  /**
   * Delete a referral attachment
   * 
   * @param {string} referralId - Referral ID
   * @param {string} attachmentId - Attachment ID
   * @returns {Promise} Promise that resolves when the attachment is deleted
   */
  const deleteAttachment = useCallback(async (referralId, attachmentId) => {
    // Confirm deletion
    const confirmed = await confirmDelete({
      title: 'Delete Attachment',
      message: 'Are you sure you want to delete this attachment? This action cannot be undone.'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      await referralService.deleteReferralAttachment(referralId, attachmentId);
      
      // Update current referral if it's the same
      if (currentReferral && currentReferral.id === referralId) {
        setCurrentReferral(prevReferral => ({
          ...prevReferral,
          attachments: (prevReferral.attachments || []).filter(
            attachment => attachment.id !== attachmentId
          )
        }));
      }
      
      notifySuccess('Attachment deleted successfully');
    } catch (err) {
      console.error('Error deleting attachment:', err);
      setError('Failed to delete attachment');
      notifyError('Failed to delete attachment');
    } finally {
      setLoading(false);
    }
  }, [currentReferral, confirmDelete, notifySuccess, notifyError]);
  
  // Context value
  const value = {
    referrals,
    currentReferral,
    loading,
    error,
    pagination,
    getReferrals,
    getReferralById,
    createReferral,
    updateReferral,
    deleteReferral,
    acceptReferral,
    rejectReferral,
    completeReferral,
    cancelReferral,
    uploadAttachment,
    deleteAttachment
  };
  
  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
};
