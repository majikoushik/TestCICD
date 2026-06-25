import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography
} from '@mui/material';
import { ModernLoadingIndicator } from './index';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

/**
 * ConfirmationDialog component
 * 
 * A reusable confirmation dialog component for user confirmations
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when the dialog is closed
 * @param {Function} props.onConfirm - Function to call when the user confirms
 * @param {string} props.title - The dialog title
 * @param {string} props.message - The dialog message
 * @param {string} props.confirmLabel - The label for the confirm button
 * @param {string} props.cancelLabel - The label for the cancel button
 * @param {string} props.confirmColor - The color for the confirm button
 * @param {string} props.type - The type of confirmation (delete, warning, success)
 * @param {boolean} props.loading - Whether the confirmation action is loading
 */
export default function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  type = 'warning',
  loading = false
}) {
  // Get the icon based on the type
  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <DeleteIcon color="error" fontSize="large" />;
      case 'success':
        return <CheckCircleIcon color="success" fontSize="large" />;
      case 'warning':
      default:
        return <WarningIcon color="warning" fontSize="large" />;
    }
  };
  
  // Get button color based on type
  const getButtonColor = () => {
    if (confirmColor !== 'primary') {
      return confirmColor;
    }
    
    switch (type) {
      case 'delete':
        return 'error';
      case 'success':
        return 'success';
      case 'warning':
      default:
        return 'primary';
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ mr: 1 }}>
            {getIcon()}
          </Box>
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button 
          onClick={onConfirm} 
          color={getButtonColor()}
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <ModernLoadingIndicator variant="button" size={20} /> : undefined}
          autoFocus
        >
          {loading ? 'Processing...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
