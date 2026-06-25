import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { blockchainService } from '../../services';
import { ModernLoadingIndicator } from '../../components/common';

const BlockchainTransactionDetails = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        setLoading(true);
        const data = await blockchainService.getTransactionDetails(transactionId);
        setTransaction(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching transaction details:', err);
        setError('Failed to load transaction details. Please try again later.');
        setLoading(false);
      }
    };

    if (transactionId) {
      fetchTransactionDetails();
    }
  }, [transactionId]);

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/blockchain/history')}
          sx={{ mb: 2 }}
        >
          Back to Transaction History
        </Button>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Transaction Details
        {transaction && (
          <Chip 
            label={transaction.event} 
            color={getEventColor(transaction.event)} 
            size="small"
            sx={{ ml: 2 }}
          />
        )}
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <ModernLoadingIndicator variant="pulse" message="Loading transaction details..." />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : transaction ? (
        <Box>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <DetailItem 
                  label="Transaction Hash" 
                  value={transaction.hash} 
                  copyable 
                  monospace
                />
              </Grid>
              <Grid item xs={12} md={4}>
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

          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Transaction Information
            </Typography>
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
                  value={new Date(transaction.timestamp).toLocaleString()} 
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
          </Paper>

          {transaction.logs && transaction.logs.length > 0 && (
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
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
                  {log.topics && log.topics.map((topic, i) => (
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
            </Paper>
          )}
          
          {transaction.decodedData && (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Decoded Data
              </Typography>
              <pre style={{ 
                overflowX: 'auto', 
                backgroundColor: '#f5f5f5', 
                padding: '16px',
                borderRadius: '4px'
              }}>
                {JSON.stringify(transaction.decodedData, null, 2)}
              </pre>
            </Paper>
          )}
        </Box>
      ) : (
        <Alert severity="warning">
          Transaction not found. The transaction ID may be invalid or the transaction may not exist.
        </Alert>
      )}
    </Container>
  );
};

export default BlockchainTransactionDetails;
