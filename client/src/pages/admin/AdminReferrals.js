import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, TablePagination, Alert, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, 
  IconButton, Chip, Tabs, Tab, Grid, Card, CardContent, Divider, Tooltip, Badge
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  History as HistoryIcon,
  AttachMoney as MoneyIcon,
  VerifiedUser as VerifiedUserIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PriorityHigh as PriorityHighIcon
} from '@mui/icons-material';
import adminReferralService from '../../services/adminReferralService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Tab Panel Component
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
const AdminReferrals = () => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredReferrals, setFilteredReferrals] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [currentReferral, setCurrentReferral] = useState(null);
    const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterHasDispute, setFilterHasDispute] = useState('all');
    const [filterProvider, setFilterProvider] = useState('');
    const [disputeResolution, setDisputeResolution] = useState('');
    const [disputeAmount, setDisputeAmount] = useState('');
    const [disputeNotes, setDisputeNotes] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentTxHash, setPaymentTxHash] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [statsDialogOpen, setStatsDialogOpen] = useState(false);
    const [referralStats, setReferralStats] = useState(null);
    
    useEffect(() => {
      const fetchReferrals = async () => {
        try {
          setLoading(true);
          
          // Get referrals from service
          const response = await adminReferralService.getAllReferrals();
          
          if (response.success) {
            setReferrals(response.data?.referrals || []);
            setFilteredReferrals(response.data?.referrals || []);
            setReferralStats(response.data?.stats || {});
          } else {
            throw new Error('Failed to fetch referrals');
          }
          
          setLoading(false);
        } catch (err) {
          console.error('Error fetching referrals:', err);
          setError('Failed to load referral data. Please try again later.');
          setLoading(false);
        }
      };
  
      fetchReferrals();
    }, []);

    useEffect(() => {
        let filtered = referrals;
        
        // Apply search filter
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(referral => 
            referral.patientName?.toLowerCase().includes(query) || 
            referral.referringProviderName?.toLowerCase().includes(query) ||
            referral.targetProviderName?.toLowerCase().includes(query) ||
            referral.reason?.toLowerCase().includes(query) ||
            referral.patientId?.toLowerCase().includes(query)
          );
        }
        
        // Apply status filter
        if (filterStatus !== 'all') {
          filtered = filtered.filter(referral => referral.status === filterStatus);
        }
        
        // Apply dispute filter
        if (filterHasDispute !== 'all') {
          filtered = filtered.filter(referral => 
            filterHasDispute === 'yes' ? referral.hasDispute : !referral.hasDispute
          );
        }
        
        // Apply provider filter
        if (filterProvider) {
          filtered = filtered.filter(referral => 
            referral.referringProviderId === filterProvider || 
            referral.targetProviderId === filterProvider
          );
        }
        
        setFilteredReferrals(filtered);
        setPage(0);
      }, [searchQuery, filterStatus, filterHasDispute, filterProvider, referrals]);
    
      const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setPage(0);
      };
    
      const handleChangePage = (event, newPage) => {
        setPage(newPage);
      };
    
      const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      };
    
      const handleViewDetails = (referral) => {
        setCurrentReferral(referral);
        setDetailDialogOpen(true);
      };
    
      const handleOpenDisputeDialog = (referral) => {
        setCurrentReferral(referral);
        
        if (referral.dispute) {
          setDisputeResolution(referral.dispute.status === 'Resolved' ? referral.dispute.resolution : '');
          setDisputeAmount(referral.dispute?.requestedAmount != null ? referral.dispute.requestedAmount.toString() : '');
          setDisputeNotes(referral.dispute.notes || '');
        } else {
          setDisputeResolution('');
          setDisputeAmount('');
          setDisputeNotes('');
        }
        
        setDisputeDialogOpen(true);
      };
    
      const handleResolveDispute = async () => {
        try {
          setLoading(true);
          
          const resolutionData = {
            resolution: disputeResolution,
            resolvedBy: 'Admin User',
            notes: disputeNotes
          };
          
          const response = await adminReferralService.resolveDispute(currentReferral.id, resolutionData);
          
          if (response.success) {
            // Update the referral in the list
            const updatedReferrals = referrals.map(ref => 
              ref.id === currentReferral.id ? response.data : ref
            );
            
            setReferrals(updatedReferrals);
            setFilteredReferrals(updatedReferrals);
            setCurrentReferral(response.data);
          } else {
            throw new Error('Failed to resolve dispute');
          }
          
          setDisputeDialogOpen(false);
          setLoading(false);
        } catch (error) {
          console.error('Error resolving dispute:', error);
          setLoading(false);
        }
      };
    
      const handleOpenPaymentDialog = (referral) => {
        setCurrentReferral(referral);
        setPaymentAmount(referral.paymentAmount ? referral.paymentAmount.toString() : '');
        setPaymentTxHash('');
        setPaymentNotes('');
        setPaymentDialogOpen(true);
      };
    
      const handleProcessPayment = async () => {
        try {
          setLoading(true);
          
          const paymentData = {
            amount: paymentAmount,
            processedBy: 'Admin User',
            transactionHash: paymentTxHash,
            notes: paymentNotes
          };
          
          const response = await adminReferralService.processPayment(currentReferral.id, paymentData);
          
          if (response.success) {
            // Update the referral in the list
            const updatedReferrals = referrals.map(ref => 
              ref.id === currentReferral.id ? response.data : ref
            );
            
            setReferrals(updatedReferrals);
            setFilteredReferrals(updatedReferrals);
            setCurrentReferral(response.data);
          } else {
            throw new Error('Failed to process payment');
          }
          
          setPaymentDialogOpen(false);
          setLoading(false);
        } catch (error) {
          console.error('Error processing payment:', error);
          setLoading(false);
        }
      };
    
      const handleVerifyTransaction = async (txHash) => {
        try {
          setVerificationLoading(true);
          setVerificationResult(null);
          
          const response = await adminReferralService.verifyTransaction(txHash);
          
          if (response.success) {
            setVerificationResult(response.data);
          } else {
            throw new Error('Failed to verify transaction');
          }
          
          setVerificationLoading(false);
        } catch (error) {
          console.error('Error verifying transaction:', error);
          setVerificationLoading(false);
          setVerificationResult({
            verified: false,
            message: 'Error verifying transaction'
          });
        }
      };
    
      const handleOpenVerifyDialog = (referral) => {
        setCurrentReferral(referral);
        setVerificationResult(null);
        setVerifyDialogOpen(true);
      };

      const getStatusColor = (status) => {
        switch (status) {
          case 'Completed':
            return 'success';
          case 'Pending':
            return 'warning';
          case 'Approved':
            return 'info';
          case 'Cancelled':
            return 'error';
          default:
            return 'default';
        }
      };
    
      const getPriorityColor = (priority) => {
        switch (priority) {
          case 'Critical':
            return 'error';
          case 'High':
            return 'warning';
          case 'Medium':
            return 'info';
          case 'Low':
            return 'success';
          default:
            return 'default';
        }
      };
    
      const getPaymentStatusColor = (status) => {
        switch (status) {
          case 'Paid':
            return 'success';
          case 'Pending':
            return 'warning';
          case 'Disputed':
            return 'error';
          case 'Cancelled':
            return 'default';
          default:
            return 'default';
        }
      };
    
      const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
      };
    
      const getFilteredReferralsByTab = (tabIndex) => {
        switch (tabIndex) {
          case 0: // All Referrals
            return filteredReferrals;
          case 1: // Pending Referrals
            return filteredReferrals.filter(ref => ref.status === 'Pending');
          case 2: // Active Referrals
            return filteredReferrals.filter(ref => ref.status === 'Approved');
          case 3: // Completed Referrals
            return filteredReferrals.filter(ref => ref.status === 'Completed');
          case 4: // Disputed Referrals
            return filteredReferrals.filter(ref => ref.hasDispute);
          default:
            return filteredReferrals;
        }
      };

      const renderReferralsTable = (tabIndex) => {
        const displayReferrals = getFilteredReferralsByTab(tabIndex);
        
        return (
          <TableContainer component={Paper}>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>From Provider</TableCell>
                  <TableCell>To Provider</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Dispute</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayReferrals
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>{referral.patientName}</TableCell>
                      <TableCell>{referral.referringProviderName}</TableCell>
                      <TableCell>{referral.targetProviderName}</TableCell>
                      <TableCell>
                        <Chip 
                          label={referral.status} 
                          color={getStatusColor(referral.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={referral.priority} 
                          color={getPriorityColor(referral.priority)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(referral.createdAt)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={referral.paymentStatus} 
                          color={getPaymentStatusColor(referral.paymentStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {referral.hasDispute ? (
                          <Tooltip title={referral.dispute.status === 'Resolved' ? 'Dispute resolved' : 'Active dispute'}>
                            <Chip 
                              icon={referral.dispute.status === 'Resolved' ? <CheckCircleIcon /> : <WarningIcon />} 
                              label={referral.dispute.status} 
                              color={referral.dispute.status === 'Resolved' ? 'success' : 'error'} 
                              size="small"
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            None
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleViewDetails(referral)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        
                        {referral.hasDispute && referral.dispute.status !== 'Resolved' && (
                          <IconButton 
                            size="small" 
                            color="warning"
                            onClick={() => handleOpenDisputeDialog(referral)}
                          >
                            <WarningIcon fontSize="small" />
                          </IconButton>
                        )}
                        
                        {(referral.status === 'Completed' && referral.paymentStatus !== 'Paid') && (
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleOpenPaymentDialog(referral)}
                          >
                            <MoneyIcon fontSize="small" />
                          </IconButton>
                        )}
                        
                        {referral.paymentTxHash && (
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => handleOpenVerifyDialog(referral)}
                          >
                            <VerifiedUserIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                
                {displayReferrals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No referrals found
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
              Referral Management
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                size="small"
                label="Search"
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mr: 2 }}
                InputProps={{
                  endAdornment: <SearchIcon color="action" />
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                <InputLabel>Has Dispute</InputLabel>
                <Select
                  value={filterHasDispute}
                  label="Has Dispute"
                  onChange={(e) => setFilterHasDispute(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                startIcon={<AssessmentIcon />}
                onClick={() => setStatsDialogOpen(true)}
              >
                View Stats
              </Button>
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
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="referral tabs">
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.length} color="primary">
                      All Referrals
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'Pending').length} color="warning">
                      Pending
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'Approved').length} color="info">
                      Active
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'Completed').length} color="success">
                      Completed
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.hasDispute).length} color="error">
                      Disputed
                    </Badge>
                  } />
                </Tabs>
              </Box>
              
              <TabPanel value={tabValue} index={0}>
                {renderReferralsTable(0)}
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                {renderReferralsTable(1)}
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                {renderReferralsTable(2)}
              </TabPanel>
              <TabPanel value={tabValue} index={3}>
                {renderReferralsTable(3)}
              </TabPanel>
              <TabPanel value={tabValue} index={4}>
                {renderReferralsTable(4)}
              </TabPanel>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={getFilteredReferralsByTab(tabValue).length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}

                {/* Referral Details Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Referral Details
        </DialogTitle>
        
        <DialogContent>
          {currentReferral && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Patient Information
                    </Typography>
                    <Typography variant="body2">
                      <strong>Patient ID:</strong> {currentReferral.patientId}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Patient Name:</strong> {currentReferral.patientName}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Referral Status
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        <strong>Status:</strong>
                      </Typography>
                      <Chip 
                        label={currentReferral.status} 
                        color={getStatusColor(currentReferral.status)}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        <strong>Priority:</strong>
                      </Typography>
                      <Chip 
                        label={currentReferral.priority} 
                        color={getPriorityColor(currentReferral.priority)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2">
                      <strong>Created:</strong> {formatDate(currentReferral.createdAt)}
                    </Typography>
                    {currentReferral.completedAt && (
                      <Typography variant="body2">
                        <strong>Completed:</strong> {formatDate(currentReferral.completedAt)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Referring Provider
                    </Typography>
                    <Typography variant="body2">
                      <strong>Name:</strong> {currentReferral.referringProviderName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Specialty:</strong> {currentReferral.referringProviderSpecialty}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Target Provider
                    </Typography>
                    <Typography variant="body2">
                      <strong>Name:</strong> {currentReferral.targetProviderName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Specialty:</strong> {currentReferral.targetProviderSpecialty}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Referral Details
                    </Typography>
                    <Typography variant="body2">
                      <strong>Reason:</strong> {currentReferral.reason}
                    </Typography>
                    {currentReferral.notes && (
                      <Typography variant="body2">
                        <strong>Notes:</strong> {currentReferral.notes}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Payment Information
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        <strong>Status:</strong>
                      </Typography>
                      <Chip 
                        label={currentReferral.paymentStatus} 
                        color={getPaymentStatusColor(currentReferral.paymentStatus)}
                        size="small"
                      />
                    </Box>
                    {currentReferral.paymentAmount && (
                      <Typography variant="body2">
                        <strong>Amount:</strong> ${currentReferral.paymentAmount}
                      </Typography>
                    )}
                    {currentReferral.paymentTxHash && (
                      <Typography variant="body2">
                        <strong>Transaction:</strong> {currentReferral.paymentTxHash.substring(0, 10)}...
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {currentReferral.hasDispute && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Dispute Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          <strong>Status:</strong>
                        </Typography>
                        <Chip 
                          label={currentReferral.dispute.status} 
                          color={currentReferral.dispute.status === 'Resolved' ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2">
                        <strong>Initiated By:</strong> {currentReferral.dispute.initiatorName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Reason:</strong> {currentReferral.dispute.reason}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Requested Amount:</strong> ${currentReferral.dispute.requestedAmount}
                      </Typography>
                      {currentReferral.dispute.status === 'Resolved' && (
                        <>
                          <Typography variant="body2">
                            <strong>Resolution:</strong> {currentReferral.dispute.resolution}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Final Amount:</strong> ${currentReferral.dispute.finalAmount}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Resolved On:</strong> {formatDate(currentReferral.dispute.resolvedAt)}
                          </Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Actions
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {currentReferral.hasDispute && currentReferral.dispute.status !== 'Resolved' && (
                        <Button 
                          variant="outlined" 
                          color="warning"
                          startIcon={<WarningIcon />}
                          onClick={() => {
                            setDetailDialogOpen(false);
                            handleOpenDisputeDialog(currentReferral);
                          }}
                        >
                          Resolve Dispute
                        </Button>
                      )}
                      
                      {(currentReferral.status === 'Completed' && currentReferral.paymentStatus !== 'Paid') && (
                        <Button 
                          variant="outlined" 
                          color="success"
                          startIcon={<MoneyIcon />}
                          onClick={() => {
                            setDetailDialogOpen(false);
                            handleOpenPaymentDialog(currentReferral);
                          }}
                        >
                          Process Payment
                        </Button>
                      )}
                      
                      {currentReferral.paymentTxHash && (
                        <Button 
                          variant="outlined" 
                          color="info"
                          startIcon={<VerifiedUserIcon />}
                          onClick={() => {
                            setDetailDialogOpen(false);
                            handleOpenVerifyDialog(currentReferral);
                          }}
                        >
                          Verify Transaction
                        </Button>
                      )}
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

      {/* Statistics Dialog */}
      <Dialog 
        open={statsDialogOpen} 
        onClose={() => setStatsDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Referral Statistics
        </DialogTitle>
        
        <DialogContent>
          {referralStats && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Referral Overview</Typography>
                    <Typography variant="body2">
                      <strong>Total Referrals:</strong> {referralStats.totalReferrals}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Pending:</strong> {referralStats.pendingReferrals}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Active:</strong> {referralStats.approvedReferrals}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Completed:</strong> {referralStats.completedReferrals}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Cancelled:</strong> {referralStats.cancelledReferrals}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Dispute Statistics</Typography>
                    <Typography variant="body2">
                      <strong>Active Disputes:</strong> {referralStats.activeDisputes}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Average Completion Time:</strong> {referralStats.averageCompletionTime} days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Top Referrers</Typography>
                    {referralStats.topReferrers && referralStats.topReferrers.map((referrer, index) => (
                      <Typography key={index} variant="body2">
                        <strong>{referrer.providerName}:</strong> {referrer.count} referrals
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Monthly Trends</Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={referralStats.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke="#8884d8" name="Referrals" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Top Receivers</Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={referralStats.topReceivers}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="providerName" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#82ca9d" name="Referrals Received" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setStatsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminReferrals;