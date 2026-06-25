import { useState, useCallback } from 'react';
import { ConfirmationDialog } from '../components/common';

/**
 * Custom hook for confirmation dialogs
 * 
 * @returns {Object} Confirmation dialog methods and state
 */
export default function useConfirmation() {
  // Dialog state
  const [dialogState, setDialogState] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmColor: 'primary',
    type: 'warning',
    loading: false,
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  /**
   * Open a confirmation dialog
   * 
   * @param {Object} options - Dialog options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} options.confirmLabel - Confirm button label
   * @param {string} options.cancelLabel - Cancel button label
   * @param {string} options.confirmColor - Confirm button color
   * @param {string} options.type - Dialog type (delete, warning, success)
   * @returns {Promise} Promise that resolves with the confirmation result
   */
  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed with this action?',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        confirmColor: options.confirmColor || 'primary',
        type: options.type || 'warning',
        loading: false,
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, loading: true }));
          resolve(true);
          setDialogState(prev => ({ ...prev, open: false, loading: false }));
        },
        onCancel: () => {
          resolve(false);
          setDialogState(prev => ({ ...prev, open: false }));
        }
      });
    });
  }, []);
  
  /**
   * Open a delete confirmation dialog
   * 
   * @param {Object} options - Dialog options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} options.confirmLabel - Confirm button label
   * @param {string} options.cancelLabel - Cancel button label
   * @returns {Promise} Promise that resolves with the confirmation result
   */
  const confirmDelete = useCallback((options = {}) => {
    return confirm({
      title: options.title || 'Confirm Deletion',
      message: options.message || 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmLabel: options.confirmLabel || 'Delete',
      cancelLabel: options.cancelLabel || 'Cancel',
      confirmColor: 'error',
      type: 'delete',
      ...options
    });
  }, [confirm]);
  
  /**
   * Open a discard confirmation dialog
   * 
   * @param {Object} options - Dialog options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} options.confirmLabel - Confirm button label
   * @param {string} options.cancelLabel - Cancel button label
   * @returns {Promise} Promise that resolves with the confirmation result
   */
  const confirmDiscard = useCallback((options = {}) => {
    return confirm({
      title: options.title || 'Discard Changes',
      message: options.message || 'Are you sure you want to discard your changes? This action cannot be undone.',
      confirmLabel: options.confirmLabel || 'Discard',
      cancelLabel: options.cancelLabel || 'Cancel',
      confirmColor: 'warning',
      type: 'warning',
      ...options
    });
  }, [confirm]);
  
  /**
   * Close the confirmation dialog
   */
  const closeDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, open: false }));
  }, []);
  
  // Render the confirmation dialog
  const renderDialog = () => {
    return (
      <ConfirmationDialog
        open={dialogState.open}
        onClose={dialogState.onCancel}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        confirmColor={dialogState.confirmColor}
        type={dialogState.type}
        loading={dialogState.loading}
      />
    );
  };
  
  return {
    confirm,
    confirmDelete,
    confirmDiscard,
    closeDialog,
    dialogOpen: dialogState.open,
    renderDialog
  };
}
