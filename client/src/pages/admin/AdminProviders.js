import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import adminProviderService from '../../services/adminProviderService';

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`provider-tabpanel-${index}`}
      aria-labelledby={`provider-tab-${index}`}
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

const AdminProviders = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the adminProviderService to fetch providers
      const response = await adminProviderService.getAllProviders();
      
      if (response.success) {
        setProviders(response.data);
        setFilteredProviders(response.data);
      } else {
        setError(response.error || 'Failed to load providers');
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError('Failed to load providers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProviders(providers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = providers.filter(provider => 
        provider.name?.toLowerCase().includes(query) || 
        provider.email?.toLowerCase().includes(query) ||
        provider.organization?.toLowerCase().includes(query) ||
        provider.specialty?.toLowerCase().includes(query)
      );
      setFilteredProviders(filtered);
    }
  }, [searchQuery, providers]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (provider) => {
    setCurrentProvider(provider);
    setDetailDialogOpen(true);
  };

  const handleEditClick = (provider) => {
    setCurrentProvider(provider);
    setEditRole(provider.role || '');
    setEditIsActive(provider.status === 'active'); // Set based on status
    setEditDialogOpen(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSaveProvider = async () => {
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      // Prepare updated provider data
      const providerData = {
        role: editRole,
        status: editIsActive ? 'active' : 'inactive'
      };
      
      // Call the service to update the provider
      const response = await adminProviderService.updateProvider(
        currentProvider.id, 
        providerData
      );
      
      if (response.success) {
        // Refresh the providers list
        await fetchProviders();
        setSaveSuccess(true);
        
        // Close dialog after a delay
        setTimeout(() => {
          setEditDialogOpen(false);
          setSaveSuccess(false);
        }, 1500);
      } else {
        setSaveError(response.error || 'Failed to update provider');
      }
    } catch (err) {
      console.error('Error updating provider:', err);
      setSaveError('Failed to update provider');
    } finally {
      setSaveLoading(false);
    }
  };

  const openConfirmDialog = (action, provider, title, message) => {
    setCurrentProvider(provider);
    setConfirmAction(action);
    setConfirmTitle(title);
    setConfirmMessage(message);
    
    // Reset reason fields when opening dialog
    if (action === 'reject') {
      setRejectionReason('');
    } else if (action === 'suspend') {
      setSuspensionReason('');
    }
    
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    // Close the dialog
    setConfirmDialogOpen(false);
    setLoading(true);
    
    try {
      let response;
      
      switch (confirmAction) {
        case 'approve':
          response = await adminProviderService.approveProvider(currentProvider.id);
          break;
          
        case 'reject':
          response = await adminProviderService.rejectProvider(currentProvider.id, rejectionReason);
          setRejectionReason('');
          break;
          
        case 'suspend':
          response = await adminProviderService.suspendProvider(currentProvider.id, suspensionReason);
          setSuspensionReason('');
          break;
          
        case 'reactivate':
          response = await adminProviderService.reactivateProvider(currentProvider.id);
          break;
          
        case 'delete':
          response = await adminProviderService.deleteProvider(currentProvider.id);
          break;
          
        default:
          setLoading(false);
          return;
      }
      
      if (!response.success) {
        setError(response.error || `Failed to ${confirmAction} provider`);
      }
      
      // Refresh the providers list
      await fetchProviders();
    } catch (err) {
      console.error(`Error performing ${confirmAction} action:`, err);
      setError(`Failed to ${confirmAction} provider. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const getFilteredProvidersByStatus = (status) => {
    if (status === 'all') {
      return filteredProviders;
    }
    return filteredProviders.filter(provider => provider.status === status);
  };

  const renderProviderTable = (status) => {
    const displayProviders = getFilteredProvidersByStatus(status);
    
    return (
      <TableContainer component={Paper}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Specialty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>KYC Verified</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayProviders
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((provider) => (
                <TableRow key={provider.id || provider._id}>
                  <TableCell>{provider.name}</TableCell>
                  <TableCell>{provider.email}</TableCell>
                  <TableCell>{provider.organization}</TableCell>
                  <TableCell>{provider.specialty}</TableCell>
                  <TableCell>
                    <Chip 
                      label={provider.status} 
                      color={getStatusColor(provider.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {provider.kycVerified ? (
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        label="Verified" 
                        color="success" 
                        size="small"
                      />
                    ) : (
                      <Chip 
                        icon={<CancelIcon />} 
                        label="Not Verified" 
                        color="default" 
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleViewDetails(provider)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleEditClick(provider)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {provider.status === 'pending' && (
                      <>
                        <IconButton 
                          size="small" 
                          color="success"
                          onClick={() => openConfirmDialog(
                            'approve', 
                            provider, 
                            'Approve Provider', 
                            `Are you sure you want to approve ${provider.name}?`
                          )}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => openConfirmDialog(
                            'reject', 
                            provider, 
                            'Reject Provider', 
                            `Are you sure you want to reject ${provider.name}?`
                          )}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    {provider.status === 'active' ? (
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => openConfirmDialog(
                          'suspend', 
                          provider, 
                          'Suspend Provider', 
                          `Are you sure you want to suspend ${provider.name}?`
                        )}
                      >
                        <LockIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton 
                        size="small" 
                        color="success"
                        onClick={() => openConfirmDialog(
                          'reactivate', 
                          provider, 
                          'Reactivate Provider', 
                          `Are you sure you want to reactivate ${provider.name}?`
                        )}
                      >
                        <LockOpenIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => openConfirmDialog(
                        'delete', 
                        provider, 
                        'Delete Provider', 
                        `Are you sure you want to delete ${provider.name}? This action cannot be undone.`
                      )}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            
            {displayProviders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No providers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Provider Management
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            label="Search Providers"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mr: 2 }}
            InputProps={{
              endAdornment: <SearchIcon color="action" />
            }}
          />
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
           <ModernLoadingIndicator message="Loading alerts..." />
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="provider tabs">
              <Tab label="All Providers" />
              <Tab label="Pending Approval" />
              <Tab label="Approved" />
              <Tab label="Rejected" />
              <Tab label="Suspended" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            {renderProviderTable('all')}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderProviderTable('pending')}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderProviderTable('approved')}
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            {renderProviderTable('rejected')}
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            {renderProviderTable('suspended')}
          </TabPanel>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredProviders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
      
      {/* Provider Details Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Provider Details
        </DialogTitle>
        
        <DialogContent>
          {currentProvider && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Basic Information
                    </Typography>
                    <Typography variant="body2">
                      <strong>Name:</strong> {currentProvider.name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {currentProvider.email}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Organization:</strong> {currentProvider.organization}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Specialty:</strong> {currentProvider.specialty}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {' '}
                      <Chip 
                        label={currentProvider.accountStatus} 
                        color={getStatusColor(currentProvider.accountStatus)}
                        size="small"
                      />
                    </Typography>
                    <Typography variant="body2">
                      <strong>Active:</strong> {currentProvider.isActive ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Created:</strong> {new Date(currentProvider.createdAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      KYC Information
                    </Typography>
                    <Typography variant="body2">
                      <strong>KYC Verified:</strong> {currentProvider.kycVerified ? 'Yes' : 'No'}
                    </Typography>
                    {currentProvider.kycDocuments && (
                      <>
                        <Typography variant="body2">
                          <strong>License Number:</strong> {currentProvider.kycDocuments.licenseNumber}
                        </Typography>
                        <Typography variant="body2">
                          <strong>License Expiry:</strong> {' '}
                          {currentProvider.kycDocuments.licenseExpiry ? 
                            new Date(currentProvider.kycDocuments.licenseExpiry).toLocaleDateString() : 
                            'N/A'}
                        </Typography>
                        {currentProvider.kycDocuments.verifiedAt && (
                          <Typography variant="body2">
                            <strong>Verified At:</strong> {' '}
                            {new Date(currentProvider.kycDocuments.verifiedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </>
                    )}
                    {currentProvider.rejectionReason && (
                      <Typography variant="body2" color="error">
                        <strong>Rejection Reason:</strong> {currentProvider.rejectionReason}
                      </Typography>
                    )}
                    {currentProvider.suspensionReason && (
                      <Typography variant="body2" color="error">
                        <strong>Suspension Reason:</strong> {currentProvider.suspensionReason}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Actions
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {currentProvider.accountStatus === 'pending' && (
                        <>
                          <Button 
                            variant="contained" 
                            color="success"
                            onClick={() => {
                              setDetailDialogOpen(false);
                              openConfirmDialog(
                                'approve', 
                                currentProvider, 
                                'Approve Provider', 
                                `Are you sure you want to approve ${currentProvider.name}?`
                              );
                            }}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="contained" 
                            color="error"
                            onClick={() => {
                              setDetailDialogOpen(false);
                              openConfirmDialog(
                                'reject', 
                                currentProvider, 
                                'Reject Provider', 
                                `Are you sure you want to reject ${currentProvider.name}?`
                              );
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {currentProvider.isActive ? (
                        <Button 
                          variant="contained" 
                          color="error"
                          onClick={() => {
                            setDetailDialogOpen(false);
                            openConfirmDialog(
                              'suspend', 
                              currentProvider, 
                              'Suspend Provider', 
                              `Are you sure you want to suspend ${currentProvider.name}?`
                            );
                          }}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button 
                          variant="contained" 
                          color="success"
                          onClick={() => {
                            setDetailDialogOpen(false);
                            openConfirmDialog(
                              'activate', 
                              currentProvider, 
                              'Activate Provider', 
                              `Are you sure you want to activate ${currentProvider.name}?`
                            );
                          }}
                        >
                          Activate
                        </Button>
                      )}
                      <Button 
                        variant="outlined" 
                        color="primary"
                        onClick={() => {
                          setDetailDialogOpen(false);
                          handleEditClick(currentProvider);
                        }}
                      >
                        Edit
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Provider Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => !saveLoading && setEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Edit Provider: {currentProvider?.name}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {saveError}
              </Alert>
            )}
            
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Provider updated successfully!
              </Alert>
            )}
            
            <Typography variant="subtitle2" gutterBottom>
              Provider ID
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {currentProvider?._id || currentProvider?.id}
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              Email
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {currentProvider?.email}
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2, mt: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={editRole}
                label="Role"
                onChange={(e) => setEditRole(e.target.value)}
              >
                <MenuItem value="provider">Provider</MenuItem>
                <MenuItem value="reviewer">Reviewer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="superadmin">Super Admin</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  color="primary"
                />
              }
              label={editIsActive ? 'Active' : 'Inactive'}
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setEditDialogOpen(false)} 
            disabled={saveLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveProvider} 
            variant="contained" 
            color="primary"
            disabled={saveLoading}
          >
            {saveLoading ? <ModernLoadingIndicator size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialogOpen} 
        onClose={() => setConfirmDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {confirmTitle}
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            {confirmMessage}
          </Typography>
          
          {confirmAction === 'reject' && (
            <TextField
              fullWidth
              label="Rejection Reason"
              variant="outlined"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
          )}
          
          {confirmAction === 'suspend' && (
            <TextField
              fullWidth
              label="Suspension Reason"
              variant="outlined"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            variant="contained" 
            color={confirmAction === 'delete' || confirmAction === 'reject' || confirmAction === 'suspend' ? 'error' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminProviders;
