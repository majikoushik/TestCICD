import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Alert, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  IconButton, Chip, Tabs, Tab, Grid, Card, CardContent, Tooltip, Badge
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon
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
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterHasDispute, setFilterHasDispute] = useState('all');
    const [filterProvider] = useState('');
    const [statsDialogOpen, setStatsDialogOpen] = useState(false);
    const [referralStats, setReferralStats] = useState(null);
    
    useEffect(() => {
      const fetchReferrals = async () => {
        try {
          setLoading(true);
          
          // Get referrals from service
          const response = await adminReferralService.getAllReferrals();
          
          if (response.success) {
            // Backend returns { success, data: [...] } — data is the array directly
            const list = Array.isArray(response.data) ? response.data : (response.data?.referrals || []);
            setReferrals(list);
            setFilteredReferrals(list);
            setReferralStats(response.data?.stats || null);
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
          filtered = filtered.filter(referral => {
            const pat = referral.patient || {};
            const refProv = referral.referringProvider || {};
            const recProv = referral.receivingProvider || {};
            const patName = (pat.name || [pat.firstName, pat.lastName].filter(Boolean).join(' ')).toLowerCase();
            const refName = (refProv.firstName || refProv.name || '').toLowerCase();
            const recName = (recProv.firstName || recProv.name || '').toLowerCase();
            return patName.includes(query) || refName.includes(query) || recName.includes(query) || (referral.reason || '').toLowerCase().includes(query);
          });
        }

        // Apply status filter
        if (filterStatus !== 'all') {
          filtered = filtered.filter(referral => referral.status === filterStatus);
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
    

      const getStatusColor = (status) => {
        switch (status) {
          case 'completed': return 'success';
          case 'pending':   return 'warning';
          case 'accepted':  return 'info';
          case 'cancelled': return 'default';
          case 'rejected':  return 'error';
          default:          return 'default';
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
          case 0: return filteredReferrals;
          case 1: return filteredReferrals.filter(ref => ref.status === 'pending');
          case 2: return filteredReferrals.filter(ref => ref.status === 'accepted');
          case 3: return filteredReferrals.filter(ref => ref.status === 'completed');
          case 4: return filteredReferrals.filter(ref => ref.status === 'cancelled' || ref.status === 'rejected');
          default: return filteredReferrals;
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
                  .map((referral) => {
                    const refId = referral._id || referral.id;
                    const patient = referral.patient || {};
                    const patientName = patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || '—';
                    const refProv = referral.referringProvider || {};
                    const recProv = referral.receivingProvider || {};
                    const refProvName = refProv.firstName ? `Dr. ${refProv.firstName} ${refProv.lastName || ''}`.trim() : (refProv.name || '—');
                    const recProvName = recProv.firstName ? `Dr. ${recProv.firstName} ${recProv.lastName || ''}`.trim() : (recProv.name || '—');
                    const billingStatus = referral.billing?.status || 'pending';
                    return (
                    <TableRow key={refId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{patientName}</Typography>
                        <Typography variant="caption" color="text.secondary">{patient.patientId}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{refProvName}</Typography>
                        <Typography variant="caption" color="text.secondary">{refProv.specialty}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{recProvName}</Typography>
                        <Typography variant="caption" color="text.secondary">{recProv.specialty}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={referral.status} color={getStatusColor(referral.status)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={referral.urgency || 'routine'} color={referral.urgency === 'emergency' ? 'error' : referral.urgency === 'urgent' ? 'warning' : 'default'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{formatDate(referral.createdAt)}</TableCell>
                      <TableCell>
                        <Chip label={billingStatus} color={getPaymentStatusColor(billingStatus)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">None</Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary" onClick={() => handleViewDetails(referral)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );})}
                
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
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
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
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'pending').length} color="warning">
                      Pending
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'accepted').length} color="info">
                      Accepted
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'completed').length} color="success">
                      Completed
                    </Badge>
                  } />
                  <Tab label={
                    <Badge badgeContent={filteredReferrals.filter(ref => ref.status === 'cancelled' || ref.status === 'rejected').length} color="error">
                      Cancelled/Rejected
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
          {currentReferral && (() => {
            const cp = currentReferral;
            const pat = cp.patient || {};
            const refProv = cp.referringProvider || {};
            const recProv = cp.receivingProvider || {};
            const patName = pat.name || [pat.firstName, pat.lastName].filter(Boolean).join(' ') || '—';
            const refName = refProv.firstName ? `Dr. ${refProv.firstName} ${refProv.lastName || ''}`.trim() : (refProv.name || '—');
            const recName = recProv.firstName ? `Dr. ${recProv.firstName} ${recProv.lastName || ''}`.trim() : (recProv.name || '—');
            return (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Patient Information</Typography>
                    <Typography variant="body2"><strong>Patient ID:</strong> {pat.patientId || '—'}</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {patName}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Referral Status</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}><strong>Status:</strong></Typography>
                      <Chip label={cp.status} color={getStatusColor(cp.status)} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}><strong>Urgency:</strong></Typography>
                      <Chip label={cp.urgency || 'routine'} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="body2"><strong>Created:</strong> {formatDate(cp.createdAt)}</Typography>
                    {cp.completionDate && (
                      <Typography variant="body2"><strong>Completed:</strong> {formatDate(cp.completionDate)}</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Referring Provider</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {refName}</Typography>
                    <Typography variant="body2"><strong>Specialty:</strong> {refProv.specialty || '—'}</Typography>
                    <Typography variant="body2"><strong>Organization:</strong> {refProv.organization || '—'}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Receiving Provider</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {recName}</Typography>
                    <Typography variant="body2"><strong>Specialty:</strong> {recProv.specialty || '—'}</Typography>
                    <Typography variant="body2"><strong>Organization:</strong> {recProv.organization || '—'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Referral Details</Typography>
                    <Typography variant="body2"><strong>Reason:</strong> {cp.reason}</Typography>
                    {cp.notes && <Typography variant="body2"><strong>Notes:</strong> {cp.notes}</Typography>}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Billing</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 1 }}><strong>Status:</strong></Typography>
                      <Chip label={cp.billing?.status || 'pending'} color={getPaymentStatusColor(cp.billing?.status)} size="small" />
                    </Box>
                    {cp.billing?.amount && <Typography variant="body2"><strong>Amount:</strong> ${cp.billing.amount}</Typography>}
                    {cp.billing?.transactionId && <Typography variant="body2"><strong>Tx ID:</strong> {cp.billing.transactionId}</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            );
          })()}
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