import React, { useState } from 'react';
import { ModernLoadingIndicator } from '../../../components/common';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { formatDate } from '../../../utils/dateFormatter';

export default function ReferralBilling({ billing: billingProp, onBillingUpdate, status }) {
  const billing = billingProp || {};
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingData, setBillingData] = useState({
    amount: billing.amount ?? '',
    currency: billing.currency || 'USD',
    insuranceClaim: {
      claimId: billing.insuranceClaim?.claimId || '',
      status: billing.insuranceClaim?.status || 'pending',
      amount: billing.insuranceClaim?.amount || 0
    }
  });

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    // Reset form data
    setBillingData({
      amount: billing.amount ?? '',
      currency: billing.currency || 'USD',
      insuranceClaim: {
        claimId: billing.insuranceClaim?.claimId || '',
        status: billing.insuranceClaim?.status || 'pending',
        amount: billing.insuranceClaim?.amount || 0
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setBillingData({
        ...billingData,
        [parent]: {
          ...billingData[parent],
          [child]: value
        }
      });
    } else {
      setBillingData({
        ...billingData,
        [name]: value
      });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // In a real app, this would call an API to update the billing information
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update billing information
      const updatedBilling = {
        ...billing,
        ...billingData,
        insuranceClaim: {
          ...billing.insuranceClaim,
          ...billingData.insuranceClaim,
          submissionDate: billingData.insuranceClaim.claimId ? new Date().toISOString() : null
        }
      };
      
      onBillingUpdate(updatedBilling);
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating billing information:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status chip for billing
  const getBillingStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip size="small" icon={<ScheduleIcon />} label="Pending" color="warning" />;
      case 'processed':
        return <Chip size="small" icon={<CheckCircleIcon />} label="Processed" color="info" />;
      case 'settled':
        return <Chip size="small" icon={<CheckCircleIcon />} label="Settled" color="success" />;
      case 'disputed':
        return <Chip size="small" icon={<WarningIcon />} label="Disputed" color="error" />;
      default:
        return <Chip size="small" label={status} />;
    }
  };

  // Format currency
  const formatCurrency = (amount, currency) => {
    if (amount == null || amount === '' || isNaN(Number(amount))) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(Number(amount));
  };

  // Check if editing is allowed based on referral status
  const canEdit = ['pending', 'accepted'].includes(status);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Billing Information
        </Typography>
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleOpenDialog}
          >
            Update Billing
          </Button>
        )}
      </Box>
      
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Amount
            </Typography>
            <Typography variant="h6">
              {formatCurrency(billing.amount, billing.currency)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Billing Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {getBillingStatusChip(billing.status)}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1">
              Insurance Claim
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Claim ID
            </Typography>
            <Typography variant="body1">
              {billing.insuranceClaim?.claimId || 'Not submitted'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Claim Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {billing.insuranceClaim?.status ? 
                getBillingStatusChip(billing.insuranceClaim.status) : 
                <Chip size="small" label="Not submitted" />
              }
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Claim Amount
            </Typography>
            <Typography variant="body1">
              {billing.insuranceClaim?.amount ? 
                formatCurrency(billing.insuranceClaim.amount, billing.currency) : 
                'N/A'
              }
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Submission Date
            </Typography>
            <Typography variant="body1">
              {billing.insuranceClaim?.submissionDate ?
                formatDate(billing.insuranceClaim.submissionDate) :
                'Not submitted'
              }
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1">
              Blockchain Information
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Smart Contract ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {billing.smartContractId}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Transaction ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {billing.transactionId}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Update Billing Information</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Amount"
                name="amount"
                type="number"
                fullWidth
                value={billingData.amount}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: billingData.currency === 'USD' ? '$' : '',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Currency"
                name="currency"
                fullWidth
                value={billingData.currency}
                onChange={handleInputChange}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="CAD">CAD</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Insurance Claim
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Claim ID"
                name="insuranceClaim.claimId"
                fullWidth
                value={billingData.insuranceClaim.claimId}
                onChange={handleInputChange}
                helperText="Leave blank if not submitted"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Claim Status"
                name="insuranceClaim.status"
                fullWidth
                value={billingData.insuranceClaim.status}
                onChange={handleInputChange}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="processed">Processed</MenuItem>
                <MenuItem value="settled">Settled</MenuItem>
                <MenuItem value="disputed">Disputed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Claim Amount"
                name="insuranceClaim.amount"
                type="number"
                fullWidth
                value={billingData.insuranceClaim.amount}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: billingData.currency === 'USD' ? '$' : '',
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <ModernLoadingIndicator variant="button" size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
