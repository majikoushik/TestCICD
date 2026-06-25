import React, { useState } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Typography,
  Popover,
  Paper,
  Divider,
  Link,
  Snackbar
} from '@mui/material';
import {
  Link as LinkIcon,
  ContentCopy as ContentCopyIcon,
  Verified as VerifiedIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

/**
 * BlockchainBadge component
 * 
 * A reusable component to display blockchain transaction information
 * 
 * @param {Object} props
 * @param {string} props.transactionId - The blockchain transaction ID
 * @param {string} props.status - The transaction status (confirmed, pending, failed)
 * @param {string} props.timestamp - The transaction timestamp
 * @param {string} props.network - The blockchain network name
 * @param {string} props.explorerUrl - The blockchain explorer URL
 * @param {string} props.type - The type of transaction (consent, payment, data)
 * @param {boolean} props.compact - Whether to use a compact display
 */
export default function BlockchainBadge({
  transactionId,
  status = 'confirmed',
  timestamp,
  network = 'ClinicTrust Network',
  explorerUrl,
  type = 'transaction',
  compact = false
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Handle click to open popover
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle close popover
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(transactionId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };
  
  // Format transaction ID for display
  const formatTransactionId = (id) => {
    if (!id) return '';
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 6)}`;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get icon and color based on status
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return { icon: <VerifiedIcon fontSize="small" />, color: 'success' };
      case 'pending':
        return { icon: <ScheduleIcon fontSize="small" />, color: 'warning' };
      case 'failed':
        return { icon: <ErrorIcon fontSize="small" />, color: 'error' };
      default:
        return { icon: <VerifiedIcon fontSize="small" />, color: 'primary' };
    }
  };
  
  const statusConfig = getStatusConfig();
  const open = Boolean(anchorEl);
  const id = open ? 'blockchain-popover' : undefined;
  
  // Get label based on type
  const getLabel = () => {
    switch (type.toLowerCase()) {
      case 'consent':
        return 'Consent Record';
      case 'payment':
        return 'Payment Record';
      case 'data':
        return 'Data Record';
      default:
        return 'Blockchain Record';
    }
  };
  
  // Compact version just shows the badge
  if (compact) {
    return (
      <Tooltip title={`${getLabel()}: ${transactionId}`}>
        <Chip
          icon={statusConfig.icon}
          label={formatTransactionId(transactionId)}
          color={statusConfig.color}
          size="small"
          variant="outlined"
          onClick={handleClick}
        />
      </Tooltip>
    );
  }
  
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Chip
          icon={statusConfig.icon}
          label={`${getLabel()}: ${formatTransactionId(transactionId)}`}
          color={statusConfig.color}
          size="small"
          variant="outlined"
          onClick={handleClick}
        />
      </Box>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Paper sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="subtitle1" gutterBottom>
            {getLabel()}
          </Typography>
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Transaction ID
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mr: 1 }}>
                {transactionId}
              </Typography>
              <IconButton size="small" onClick={handleCopy}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Status
            </Typography>
            <Chip
              icon={statusConfig.icon}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              color={statusConfig.color}
              size="small"
            />
          </Box>
          
          {timestamp && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Timestamp
              </Typography>
              <Typography variant="body2">
                {formatDate(timestamp)}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Network
            </Typography>
            <Typography variant="body2">
              {network}
            </Typography>
          </Box>
          
          {explorerUrl && (
            <Box sx={{ mt: 2 }}>
              <Link
                href={`${explorerUrl}/tx/${transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <LinkIcon fontSize="small" sx={{ mr: 0.5 }} />
                View in Blockchain Explorer
              </Link>
            </Box>
          )}
        </Paper>
      </Popover>
      
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        message="Transaction ID copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
