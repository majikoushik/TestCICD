import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as referralService from '../../services/referralService';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Done as DoneIcon,
  EventAvailable as BookApptIcon,
} from '@mui/icons-material';

// Import components
import ReferralStatusUpdate from './components/ReferralStatusUpdate';
import ReferralPatientInfo from './components/ReferralPatientInfo';
import ReferralBilling from './components/ReferralBilling';
import ReferralAttachedRecords from './components/ReferralAttachedRecords';
import ReferralNotes from './components/ReferralNotes';
import { ModernLoadingIndicator } from '../../components/common';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`referral-tabpanel-${index}`}
      aria-labelledby={`referral-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ReferralDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        setLoading(true);
        
        // Fetch referral details using the service
        const response = await referralService.getReferralById(id);
        console.log(response);
        setReferral(response);
      } catch (err) {
        console.error('Error fetching referral details:', err);
        setError('Failed to load referral details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReferral();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      // Use the appropriate service function based on the new status
      let response;
      switch(newStatus) {
        case 'accepted':
          response = await referralService.acceptReferral(id);
          break;
        case 'rejected':
          response = await referralService.rejectReferral(id);
          break;
        case 'completed':
          response = await referralService.completeReferral(id);
          break;
        case 'cancelled':
          response = await referralService.cancelReferral(id);
          break;
        default:
          // For other statuses, use a generic update
          response = await referralService.updateReferral(id, { status: newStatus });
      }
      
      // Update the local state with the response
      // Handle the response structure correctly - it may be wrapped in a data property
      const referralData = response.data ? response.data : response;
      setReferral(referralData);
    } catch (err) {
      console.error('Error updating referral status:', err);
      setError('Failed to update referral status. Please try again.');
    }
  };

  const handleBillingUpdate = async (billingData) => {
    try {
      // Update the referral with new billing data
      const updatedReferral = await referralService.updateReferral(id, {
        billing: {
          ...referral.billing,
          ...billingData
        }
      });
      
      // Update the local state with the response
      setReferral(updatedReferral);
    } catch (err) {
      console.error('Error updating billing information:', err);
      setError('Failed to update billing information. Please try again.');
    }
  };

  const handleNotesUpdate = async (notes) => {
    try {
      // Update the referral with new notes
      const updatedReferral = await referralService.updateReferral(id, { notes });
      
      // Update the local state with the response
      setReferral(updatedReferral);
    } catch (err) {
      console.error('Error updating notes:', err);
      setError('Failed to update notes. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status chip for referral
  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip icon={<ScheduleIcon />} label="Pending" color="warning" />;
      case 'accepted':
        return <Chip icon={<CheckCircleIcon />} label="Accepted" color="info" />;
      case 'completed':
        return <Chip icon={<DoneIcon />} label="Completed" color="success" />;
      case 'rejected':
        return <Chip icon={<CancelIcon />} label="Rejected" color="error" />;
      case 'cancelled':
        return <Chip icon={<CancelIcon />} label="Cancelled" color="default" />;
      default:
        return <Chip label={status} />;
    }
  };

  // Get urgency chip for referral
  const getUrgencyChip = (urgency) => {
    switch (urgency) {
      case 'routine':
        return <Chip label="Routine" color="default" variant="outlined" />;
      case 'urgent':
        return <Chip label="Urgent" color="warning" variant="outlined" />;
      case 'emergency':
        return <Chip label="Emergency" color="error" variant="outlined" />;
      default:
        return <Chip label={urgency} variant="outlined" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="dots" message="Loading referral details..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate('/app/referrals')}
        >
          Back to Referrals
        </Button>
      </Container>
    );
  }

  if (!referral) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Referral not found</Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate('/app/referrals')}
        >
          Back to Referrals
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Referral Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/app/referrals')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Referral Details
          </Typography>
        </Box>
        {referral && !['completed', 'rejected', 'cancelled'].includes(referral.status) && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<BookApptIcon />}
            onClick={() => {
              const providerId = referral.receivingProvider?._id || referral.receivingDoctor?._id || '';
              navigate(`/app/appointments/book?referralId=${id}&providerId=${providerId}`);
            }}
          >
            Schedule Appointment
          </Button>
        )}
      </Box>
      
      {/* Referral Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6">
              {referral.reason}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography variant="body1" sx={{ mr: 2 }}>
                Status: {getStatusChip(referral.status)}
              </Typography>
              <Typography variant="body1">
                Urgency: {getUrgencyChip(referral.urgency)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <ReferralStatusUpdate 
              currentStatus={referral.status} 
              onStatusUpdate={handleStatusUpdate} 
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Patient
            </Typography>
            <Typography variant="body1">
              {referral?.patient ? `${referral?.patient?.name} (${referral?.patient?.patientId})` : 'No patient data'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Referring Provider
            </Typography>
            <Typography variant="body1">
              {referral.referringDoctor ? referral.referringDoctor?.name : 'No provider data'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {referral.referringDoctor ? referral.referringDoctor.organization : ''}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Receiving Provider
            </Typography>
            <Typography variant="body1">
              {referral.receivingDoctor ? referral.receivingDoctor?.name : 'No provider data'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {referral.receivingDoctor ? referral.receivingDoctor.organization : ''}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Created Date
            </Typography>
            <Typography variant="body1">
              {formatDate(referral.createdAt)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Appointment Date
            </Typography>
            <Typography variant="body1">
              {formatDate(referral.appointmentDate)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Blockchain Transaction
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {referral.billing?.transactionId ? referral.billing.transactionId : 'No transaction data'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Referral Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="referral tabs">
            <Tab label="Patient Information" id="referral-tab-0" aria-controls="referral-tabpanel-0" />
            <Tab label="Notes" id="referral-tab-1" aria-controls="referral-tabpanel-1" />
            <Tab label="Attached Records" id="referral-tab-2" aria-controls="referral-tabpanel-2" />
            <Tab label="Billing" id="referral-tab-3" aria-controls="referral-tabpanel-3" />
          </Tabs>
        </Box>
        
        {/* Patient Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <ReferralPatientInfo patient={referral.patient} />
        </TabPanel>
        
        {/* Notes Tab */}
        <TabPanel value={tabValue} index={1}>
          <ReferralNotes 
            notes={referral.notes} 
            onNotesUpdate={handleNotesUpdate} 
            status={referral.status}
          />
        </TabPanel>
        
        {/* Attached Records Tab */}
        <TabPanel value={tabValue} index={2}>
          <ReferralAttachedRecords 
            attachedRecords={referral.attachementRecords} 
            patientId={referral?.patient?.id}
          />
        </TabPanel>
        
        {/* Billing Tab */}
        <TabPanel value={tabValue} index={3}>
          <ReferralBilling 
            billing={referral.billing} 
            onBillingUpdate={handleBillingUpdate}
            status={referral.status}
          />
        </TabPanel>
      </Paper>
    </Container>
  );
}
