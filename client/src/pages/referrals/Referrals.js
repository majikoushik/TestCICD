import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import * as referralService from '../../services/referralService';
import { 
  fetchReferrals, 
  setFilters as setReferralsFilters, 
  setPagination, 
  selectAllReferrals, 
  selectReferralsLoading, 
  selectReferralsError, 
  selectReferralsFilters, 
  selectReferralsPagination,
  selectTotalReferrals 
} from '../../redux/slices/referralsSlice';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Alert,
  Badge,
  Divider,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Done as DoneIcon,
  Check as CheckIcon,
  TrendingUp as TrendingUpIcon,
  PriorityHigh as PriorityHighIcon,
  MonetizationOn as MonetizationOnIcon
} from '@mui/icons-material';
import { ModernLoadingIndicator } from '../../components/common';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`referrals-tabpanel-${index}`}
      aria-labelledby={`referrals-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Referrals() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get state from Redux store using selectors
  const referrals = useSelector(selectAllReferrals);
  const loading = useSelector(selectReferralsLoading);
  const error = useSelector(selectReferralsError);
  const { page: currentPage, pageSize: rowsPerPage } = useSelector(selectReferralsPagination);
  const reduxFilters = useSelector(selectReferralsFilters);
  const searchTerm = reduxFilters.searchTerm || '';
  const sortField = reduxFilters.sortBy || 'createdAt';
  const sortDirection = reduxFilters.sortOrder || 'desc';
  const totalReferrals = useSelector(selectTotalReferrals);
  
  // Local UI state
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedReferralId, setSelectedReferralId] = useState(null);
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null);
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);
  // Status counts for badges
  const [statusCounts, setStatusCounts] = useState({
    all: 25,
    pending: 8,
    accepted: 6,
    completed: 5,
    rejected: 3,
    cancelled: 3
  });
  // Local filters state for the filter menu
  const [localFilters, setLocalFilters] = useState({
    status: reduxFilters.status || 'all',
    urgency: reduxFilters.urgency || 'all'
  });

  // Function to load referrals using Redux thunk - memoized with useCallback
  const loadReferrals = useCallback(() => {
    dispatch(fetchReferrals({
      page: currentPage,
      limit: rowsPerPage,
      search: searchTerm,
      sortBy: sortField,
      sortOrder: sortDirection,
      status: reduxFilters.status,
      priority: reduxFilters.urgency
    }));
  }, [dispatch, currentPage, rowsPerPage, searchTerm, 
      sortField, sortDirection, reduxFilters.status, reduxFilters.urgency]);

  // Initial load
  useEffect(() => {
    loadReferrals();
    
    // Fetch status counts for badges
    // Commented out for now to use hardcoded values
    /*
    const fetchStatusCounts = async () => {
      try {
        const response = await referralService.getReferralStatusCounts();
        setStatusCounts(response);
      } catch (error) {
        console.error('Error fetching referral status counts:', error);
      }
    };
    
    fetchStatusCounts();
    */
  }, [loadReferrals]);

  // Update local filters when Redux filters change
  useEffect(() => {
    setLocalFilters({
      status: reduxFilters.status || 'all',
      urgency: reduxFilters.urgency || 'all'
    });
  }, [reduxFilters.status, reduxFilters.urgency]);
  
  // Handle tab changes
  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
    
    // Update filters based on tab
    let statusFilter = 'all';
    if (newValue === 1) { // Pending
      statusFilter = 'pending';
    } else if (newValue === 2) { // Accepted
      statusFilter = 'accepted';
    } else if (newValue === 3) { // Completed
      statusFilter = 'completed';
    }
    else if (newValue === 4) { // Rejected
      statusFilter = 'rejected';
    }
    else if (newValue === 5) { // Cancelled
      statusFilter = 'cancelled';
    }
    
    dispatch(setReferralsFilters({ status: statusFilter }));
  }, [dispatch]);

  // Original handleTabChange is now replaced with the useCallback version above

  const handleChangePage = useCallback((event, newPage) => {
    dispatch(setPagination({ page: newPage + 1 })); // Convert 0-indexed to 1-indexed for Redux
  }, [dispatch]);

  const handleChangeRowsPerPage = useCallback((event) => {
    dispatch(setPagination({ 
      pageSize: parseInt(event.target.value, 10),
      page: 1 // Reset to first page
    }));
  }, [dispatch]);
  
  const handleSort = useCallback((field) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    dispatch(setReferralsFilters({
      sortBy: field,
      sortOrder: isAsc ? 'desc' : 'asc'
    }));
  }, [dispatch, sortField, sortDirection]);

  const handleSearchChange = useCallback((event) => {
    dispatch(setReferralsFilters({ searchTerm: event.target.value }));
  }, [dispatch]);

  const handleCreateReferral = () => {
    navigate('/app/referrals/create');
  };

  const handleReferralClick = (referralId) => {
    navigate(`/app/referrals/${referralId}`);
  };

  const handleMenuOpen = (event, referralId) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedReferralId(referralId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedReferralId(null);
  };

  const handleFilterMenuOpen = useCallback((event) => {
    setFilterMenuAnchorEl(event.currentTarget);
  }, []);

  const handleFilterMenuClose = useCallback(() => {
    setFilterMenuAnchorEl(null);
  }, []);

  const handleFilterChange = useCallback((filterType, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const applyFilters = useCallback(() => {
    dispatch(setReferralsFilters({
      status: localFilters.status,
      urgency: localFilters.urgency
    }));
    handleFilterMenuClose();
  }, [dispatch, localFilters, handleFilterMenuClose]);

  const resetFilters = useCallback(() => {
    setLocalFilters({
      status: 'all',
      urgency: 'all'
    });
    dispatch(setReferralsFilters({
      status: 'all',
      urgency: 'all'
    }));
    handleFilterMenuClose();
  }, [dispatch, handleFilterMenuClose]);

  const handleSortMenuOpen = useCallback((event) => {
    setSortMenuAnchorEl(event.currentTarget);
  }, []);

  const handleSortMenuClose = useCallback(() => {
    setSortMenuAnchorEl(null);
  }, []);

  const handleUpdateStatus = (status) => {
    // In a real app, this would call an API to update the referral status
    const updatedReferrals = referrals.map(ref => {
      if (ref.id === selectedReferralId) {
        return { ...ref, status };
      }
      return ref;
    });
    
    // We don't need to set referrals locally since we're using Redux
    // The referrals will be updated via API call
    handleMenuClose();
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

  // Get status chip for referrals
  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip size="small" icon={<ScheduleIcon />} label="Pending" color="warning" />;
      case 'accepted':
        return <Chip size="small" icon={<CheckCircleIcon />} label="Accepted" color="info" />;
      case 'completed':
        return <Chip size="small" icon={<DoneIcon />} label="Completed" color="success" />;
      case 'rejected':
        return <Chip size="small" icon={<CancelIcon />} label="Rejected" color="error" />;
      case 'cancelled':
        return <Chip size="small" icon={<CancelIcon />} label="Cancelled" color="default" />;
      default:
        return <Chip size="small" label={status} />;
    }
  };

  // Get urgency chip for referrals
  const getUrgencyChip = (urgency) => {
    switch (urgency) {
      case 'routine':
        return <Chip size="small" label="Routine" color="default" variant="outlined" />;
      case 'urgent':
        return <Chip size="small" label="Urgent" color="warning" variant="outlined" />;
      case 'emergency':
        return <Chip size="small" label="Emergency" color="error" variant="outlined" />;
      default:
        return <Chip size="small" label={urgency} variant="outlined" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="dots" message="Loading referrals..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Referrals
      </Typography>
      
      {/* Performance Metrics */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Completed Referrals Growth */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'success.light', 
                color: 'success.dark',
                p: 1.5,
                borderRadius: 2,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircleIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5, fontSize: '0.9em' }} />
                  +20% referral completed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Compared to previous quarter
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* High-Risk Referrals */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'warning.light', 
                color: 'warning.dark',
                p: 1.5,
                borderRadius: 2,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PriorityHighIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'warning.main', mr: 0.5, fontSize: '0.9em' }} />
                  +35% high-risk referrals
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Urgent cases requiring attention
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Referral Revenue */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'info.light', 
                color: 'info.dark',
                p: 1.5,
                borderRadius: 2,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MonetizationOnIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'info.main', mr: 0.5, fontSize: '0.9em' }} />
                  +40% referral revenue
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Increased billing efficiency
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Manage Referrals
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateReferral}
        >
          Create Referral
        </Button>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="referral tabs">
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  All
                  <Badge 
                    badgeContent={25} 
                    color="primary" 
                    sx={{ ml: 1 }}
                    max={999}
                    showZero
                  />
                </Box>
              } 
              id="referrals-tab-0" 
              aria-controls="referrals-tabpanel-0" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Pending
                  <Badge 
                    badgeContent={8} 
                    color="warning" 
                    sx={{ ml: 1 }}
                    max={999}
                    showZero
                  />
                </Box>
              } 
              id="referrals-tab-1" 
              aria-controls="referrals-tabpanel-1" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Accepted
                  <Badge 
                    badgeContent={6} 
                    color="info" 
                    sx={{ ml: 1 }}
                    max={999}
                    showZero
                  />
                </Box>
              } 
              id="referrals-tab-2" 
              aria-controls="referrals-tabpanel-2" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Completed
                  <Badge 
                    badgeContent={5} 
                    color="success" 
                    sx={{ ml: 1 }}
                    max={999}
                    showZero
                  />
                </Box>
              } 
              id="referrals-tab-3" 
              aria-controls="referrals-tabpanel-3" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Rejected
                  <Badge 
                    badgeContent={3} 
                    color="error" 
                    sx={{ ml: 1 }}
                    max={999}
                    showZero
                  />
                </Box>
              } 
              id="referrals-tab-4" 
              aria-controls="referrals-tabpanel-4" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Cancelled
                  <Badge 
                    badgeContent={3} 
                    color="error" 
                    sx={{ ml: 1 }}
                    max={999}
                    showZero
                  />
                </Box>
              } 
              id="referrals-tab-5" 
              aria-controls="referrals-tabpanel-5" 
            />
          </Tabs>
        </Box>
        
        <Box sx={{ px: 3, pt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="Search referrals..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              color="primary"
              startIcon={
                <Badge 
                  color="secondary" 
                  variant="dot" 
                  invisible={reduxFilters.status === 'all' && reduxFilters.urgency === 'all'}
                >
                  <FilterListIcon />
                </Badge>
              }
              onClick={handleFilterMenuOpen}
              sx={{ mr: 2 }}

            >
              Filter
            </Button>
            {/* <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateReferral}
            >
              New Referral
            </Button> */}
          </Box>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <ReferralsTable
            referrals={referrals}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleReferralClick={handleReferralClick}
            handleMenuOpen={handleMenuOpen}
            getStatusChip={getStatusChip}
            getUrgencyChip={getUrgencyChip}
            formatDate={formatDate}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ReferralsTable
            referrals={referrals}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleReferralClick={handleReferralClick}
            handleMenuOpen={handleMenuOpen}
            getStatusChip={getStatusChip}
            getUrgencyChip={getUrgencyChip}
            formatDate={formatDate}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <ReferralsTable
            referrals={referrals}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleReferralClick={handleReferralClick}
            handleMenuOpen={handleMenuOpen}
            getStatusChip={getStatusChip}
            getUrgencyChip={getUrgencyChip}
            formatDate={formatDate}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <ReferralsTable
            referrals={referrals}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleReferralClick={handleReferralClick}
            handleMenuOpen={handleMenuOpen}
            getStatusChip={getStatusChip}
            getUrgencyChip={getUrgencyChip}
            formatDate={formatDate}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={4}>
          <ReferralsTable
            referrals={referrals}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleReferralClick={handleReferralClick}
            handleMenuOpen={handleMenuOpen}
            getStatusChip={getStatusChip}
            getUrgencyChip={getUrgencyChip}
            formatDate={formatDate}
          />
        </TabPanel>
      </Paper>
      
      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleUpdateStatus('accepted')}>
          <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
          Accept Referral
        </MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('completed')}>
          <DoneIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
          Mark as Completed
        </MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('rejected')}>
          <CancelIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
          Reject Referral
        </MenuItem>
        <MenuItem onClick={() => navigate(`/app/referrals/${selectedReferralId}`)}>
          View Details
        </MenuItem>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchorEl}
        open={Boolean(sortMenuAnchorEl)}
        onClose={handleSortMenuClose}
      >
        <MenuItem onClick={() => handleSort('createdAt')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Date Created
            {sortField === 'createdAt' && (
              <Typography variant="caption" color="primary">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Typography>
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleSort('patient')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Patient Name
            {sortField === 'patient' && (
              <Typography variant="caption" color="primary">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Typography>
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleSort('urgency')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Urgency
            {sortField === 'urgency' && (
              <Typography variant="caption" color="primary">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Typography>
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleSort('status')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Status
            {sortField === 'status' && (
              <Typography variant="caption" color="primary">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Typography>
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleSort('appointmentDate')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Appointment Date
            {sortField === 'appointmentDate' && (
              <Typography variant="caption" color="primary">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Typography>
            )}
          </Box>
        </MenuItem>
      </Menu>
      
      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchorEl}
        open={Boolean(filterMenuAnchorEl)}
        onClose={handleFilterMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">Status</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('status', 'all')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            All
            {localFilters.status === 'all' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('status', 'pending')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Pending
            {localFilters.status === 'pending' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('status', 'accepted')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Accepted
            {localFilters.status === 'accepted' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('status', 'completed')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Completed
            {localFilters.status === 'completed' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('status', 'rejected')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Rejected
            {localFilters.status === 'rejected' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('status', 'cancelled')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Cancelled
            {localFilters.status === 'cancelled' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <Typography variant="subtitle2">Urgency</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('urgency', 'all')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            All
            {localFilters.urgency === 'all' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('urgency', 'routine')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Routine
            {localFilters.urgency === 'routine' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('urgency', 'urgent')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Urgent
            {localFilters.urgency === 'urgent' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('urgency', 'emergency')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Emergency
            {localFilters.urgency === 'emergency' && (
              <CheckIcon fontSize="small" color="primary" />
            )}
          </Box>
        </MenuItem>
        <Divider />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
          <Button size="small" onClick={resetFilters}>
            Reset
          </Button>
          <Button size="small" variant="contained" color="primary" onClick={applyFilters}>
            Apply
          </Button>
        </Box>
      </Menu>
    </Container>
  );
}

// Separate component for the referrals table to avoid repetition
function ReferralsTable({
  referrals,
  currentPage,
  rowsPerPage,
  handleChangePage,
  handleChangeRowsPerPage,
  handleReferralClick,
  handleMenuOpen,
  getStatusChip,
  getUrgencyChip,
  formatDate
}) {
  return (
    <>
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Urgency</TableCell>
              <TableCell>Appointment</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {referrals.map((referral) => {
              const patinetName = referral.patient.name? referral.patient.name : referral.patient.firstName + " " + referral.patient.lastName;
              const referringProviderName = "Dr. " + referral.referringDoctor.firstName + " " + referral.referringDoctor.lastName;
              const receivingProviderName = "Dr. " + referral.receivingDoctor.firstName + " " + referral.receivingDoctor.lastName;
            return (
                <TableRow
                  key={referral.id}
                  hover
                  onClick={() => handleReferralClick(referral.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {patinetName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {referral.patient.patientId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{referral.reason}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {referringProviderName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {referral.referringDoctor.specialty}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {receivingProviderName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {referral.receivingDoctor.specialty}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(referral.status)}</TableCell>
                  <TableCell>{getUrgencyChip(referral.urgency)}</TableCell>
                  <TableCell>{formatDate(referral.appointmentDate)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, referral.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );})}
            {referrals.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  No referrals found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={useSelector(selectTotalReferrals)}
        rowsPerPage={rowsPerPage}
        page={currentPage - 1} /* Convert 1-indexed (Redux) to 0-indexed (MUI) */
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </>
  );
}
