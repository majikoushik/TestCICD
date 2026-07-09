import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import { formatDateTime } from '../../utils/dateFormatter';
import {
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';

/**
 * Transaction Details Dialog Component
 * 
 * Displays detailed information about a blockchain transaction
 */
const TransactionDetails = ({ open, onClose, transaction, loading, error }) => {
  const [copiedField, setCopiedField] = React.useState(null);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getExplorerUrl = (hash) => {
    // Replace with actual blockchain explorer URL (e.g., Etherscan for Ethereum)
    return `https://sepolia.etherscan.io/tx/${hash}`;
  };

  const getEventColor = (event) => {
    switch (event) {
      case 'ReferralCreated':
        return 'primary';
      case 'ReferralAccepted':
        return 'success';
      case 'ReferralRejected':
        return 'error';
      case 'TokenTransfer':
        return 'secondary';
      case 'TokenReward':
        return 'warning';
      default:
        return 'default';
    }
  };

  const DetailItem = ({ label, value, copyable, monospace }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography 
          variant="body2" 
          sx={{ 
            wordBreak: 'break-all',
            ...(monospace && { fontFamily: 'monospace' })
          }}
        >
          {value}
        </Typography>
        {copyable && (
          <Tooltip title={copiedField === label ? "Copied!" : "Copy to clipboard"}>
            <IconButton 
              size="small" 
              onClick={() => handleCopy(value, label)}
              sx={{ ml: 1 }}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Transaction Details
        {transaction && (
          <Chip 
            label={transaction.event} 
            color={getEventColor(transaction.event)} 
            size="small"
            sx={{ ml: 2 }}
          />
        )}
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <ModernLoadingIndicator message="Loading transaction details..." />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : transaction ? (
          <Box>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <DetailItem 
                    label="Transaction Hash" 
                    value={transaction.hash} 
                    copyable 
                    monospace
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      View on Explorer
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      endIcon={<OpenInNewIcon />}
                      href={getExplorerUrl(transaction.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on Blockchain Explorer
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <DetailItem 
                  label="Block Number" 
                  value={transaction.blockNumber} 
                  copyable
                />
                <DetailItem 
                  label="From" 
                  value={transaction.from} 
                  copyable 
                  monospace
                />
                <DetailItem 
                  label="To" 
                  value={transaction.to} 
                  copyable 
                  monospace
                />
                <DetailItem 
                  label="Timestamp" 
                  value={formatDateTime(transaction.timestamp)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DetailItem 
                  label="Status" 
                  value={transaction.status} 
                />
                <DetailItem 
                  label="Confirmations" 
                  value={transaction.confirmations} 
                />
                {transaction.gasUsed && (
                  <DetailItem 
                    label="Gas Used" 
                    value={transaction.gasUsed} 
                  />
                )}
                {transaction.gasPrice && (
                  <DetailItem 
                    label="Gas Price" 
                    value={transaction.gasPrice} 
                  />
                )}
              </Grid>
            </Grid>

            {transaction.logs && transaction.logs.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>
                  Event Logs
                </Typography>
                
                {transaction.logs.map((log, index) => (
                  <Paper 
                    key={index} 
                    variant="outlined" 
                    sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Log #{index + 1}
                    </Typography>
                    <DetailItem 
                      label="Address" 
                      value={log.address} 
                      copyable 
                      monospace
                    />
                    {log.topics.map((topic, i) => (
                      <DetailItem 
                        key={i}
                        label={`Topic ${i}`} 
                        value={topic} 
                        copyable 
                        monospace
                      />
                    ))}
                    <DetailItem 
                      label="Data" 
                      value={log.data} 
                      copyable 
                      monospace
                    />
                  </Paper>
                ))}
              </>
            )}
          </Box>
        ) : (
          <Typography>No transaction data available</Typography>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionDetails;
