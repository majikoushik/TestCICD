import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ModernLoadingIndicator } from '../../components/common';
import axios from 'axios';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  VerifiedUser as VerifiedUserIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';

export default function Profile() {
  const { currentUser, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    organization: '',
    specialty: '',
    phone: '',
    address: '',
    bio: ''
  });
  const [blockchainData, setBlockchainData] = useState({
    blockchainId: '',
    walletAddress: '',
    registrationDate: '',
    verificationStatus: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCopiedAlert, setShowCopiedAlert] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be an API call to fetch profile data
        // For this demo, we'll simulate the data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate profile data
        const mockProfileData = {
          name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@cityclinic.com',
          organization: 'City Medical Center',
          specialty: 'Family Medicine',
          phone: '(555) 123-4567',
          address: '123 Medical Plaza, Suite 456, Anytown, USA 12345',
          bio: 'Board-certified family physician with over 10 years of experience in primary care. Special interest in preventive medicine and chronic disease management.'
        };
        
        // Simulate blockchain data
        const mockBlockchainData = {
          blockchainId: 'bid_a1b2c3d4e5f6g7h8i9j0',
          walletAddress: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
          registrationDate: new Date(2023, 0, 15).toISOString(),
          verificationStatus: 'verified'
        };
        
        setProfileData(mockProfileData);
        setBlockchainData(mockBlockchainData);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    // Reset form to original data
    setProfileData({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      organization: currentUser?.organization || '',
      specialty: currentUser?.specialty || '',
      phone: currentUser?.phone || '',
      address: currentUser?.address || '',
      bio: currentUser?.bio || ''
    });
    setIsEditing(false);
    setError('');
  };

  const handleSaveClick = async () => {
    setUpdating(true);
    setError('');
    
    try {
      // In a real app, this would be an API call to update profile
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful response
      console.log('Profile updated:', profileData);
      
      // Update auth context
      await updateProfile(profileData);
      
      setSuccess(true);
      setIsEditing(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setShowCopiedAlert(true);
    
    // Hide copied alert after 2 seconds
    setTimeout(() => {
      setShowCopiedAlert(false);
    }, 2000);
  };

  const handleVerifyDialogOpen = () => {
    setVerifyDialogOpen(true);
  };

  const handleVerifyDialogClose = () => {
    setVerifyDialogOpen(false);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get verification status chip
  const getVerificationStatusChip = (status) => {
    switch (status) {
      case 'verified':
        return <Chip icon={<VerifiedUserIcon />} label="Verified" color="success" />;
      case 'pending':
        return <Chip label="Pending Verification" color="warning" />;
      case 'unverified':
        return <Chip label="Unverified" color="default" />;
      default:
        return <Chip label={status} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="pulse" message="Loading profile data..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully!
        </Alert>
      )}
      
      <Grid container spacing={4}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: { xs: 3, md: 0 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Profile Information
              </Typography>
              {!isEditing ? (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                >
                  Edit Profile
                </Button>
              ) : (
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancelClick}
                    sx={{ mr: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={updating ? <ModernLoadingIndicator variant="button" size={20} /> : <SaveIcon />}
                    onClick={handleSaveClick}
                    disabled={updating}
                  >
                    Save
                  </Button>
                </Box>
              )}
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Organization"
                  name="organization"
                  value={profileData.organization}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Specialty"
                  name="specialty"
                  value={profileData.specialty}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={profileData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  multiline
                  rows={4}
                  value={profileData.bio}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Blockchain Identity */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <PersonIcon />
              </Avatar>
              <Typography variant="h5">
                Blockchain Identity
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              {getVerificationStatusChip(blockchainData.verificationStatus)}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Blockchain ID
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', mr: 1, wordBreak: 'break-all' }}>
                  {blockchainData.blockchainId}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleCopyToClipboard(blockchainData.blockchainId)}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Wallet Address
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', mr: 1, wordBreak: 'break-all' }}>
                  {blockchainData.walletAddress}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleCopyToClipboard(blockchainData.walletAddress)}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Registration Date
              </Typography>
              <Typography variant="body1">
                {formatDate(blockchainData.registrationDate)}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {blockchainData.verificationStatus !== 'verified' && (
              <Button
                variant="contained"
                fullWidth
                onClick={handleVerifyDialogOpen}
              >
                Verify Identity
              </Button>
            )}
            
            {blockchainData.verificationStatus === 'verified' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Your blockchain identity is verified and active on the network.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Copied to clipboard alert */}
      <Snackbar
        open={showCopiedAlert}
        autoHideDuration={2000}
        onClose={() => setShowCopiedAlert(false)}
        message="Copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      
      {/* Verification Dialog */}
      <Dialog
        open={verifyDialogOpen}
        onClose={handleVerifyDialogClose}
        aria-labelledby="verify-dialog-title"
      >
        <DialogTitle id="verify-dialog-title">
          Verify Blockchain Identity
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            To verify your blockchain identity, we need to confirm your professional credentials.
            This process typically takes 1-2 business days and requires the following:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 2 }}>
            <li>
              <Typography variant="body2">
                Professional license or certification
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Government-issued ID
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Proof of employment at your organization
              </Typography>
            </li>
          </Box>
          <DialogContentText sx={{ mt: 2 }}>
            Once verified, your blockchain identity will be recognized across the ClinicTrust network,
            enabling you to participate in secure data sharing and token transactions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleVerifyDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={handleVerifyDialogClose}>
            Start Verification
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
