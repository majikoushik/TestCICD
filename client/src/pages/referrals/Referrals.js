import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchReferrals,
  setFilters as setReferralsFilters,
  setPagination,
  updateReferralStatus,
  clearStatusUpdateError,
  selectAllReferrals,
  selectReferralsLoading,
  selectReferralsError,
  selectReferralsFilters,
  selectReferralsPagination,
  selectTotalReferrals,
  selectStatusUpdate
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
  Grid,
  Snackbar
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
import EllipsisCell from '../../components/common/EllipsisCell';
import EllipsisHeaderCell from '../../components/common/EllipsisHeaderCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';
import { formatDate } from '../../utils/dateFormatter';

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
  const statusUpdate = useSelector(selectStatusUpdate);
  const searchTerm = reduxFilters.searchTerm || '';
  const sortField = reduxFilters.sortBy || 'createdAt';
  const sortDirection = reduxFilters.sortOrder || 'desc';
  // Local UI state
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedReferralId, setSelectedReferralId] = useState(null);
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null);
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);
  // Local filters state for the filter menu
  const [localFilters, setLocalFilters] = useState({
    status: reduxFilters.status || 'all',
    urgency: reduxFilters.urgency || 'all'
  });
  // True until the very first fetch completes — prevents full-page flash on every refetch
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  const selectedReferral = referrals.find((r) => (r._id || r.id) === selectedReferralId);
  const searchDebounceRef = useRef(null);
  const prevSearchRef = useRef(searchTerm);

  // Single effect with the real values as deps (not a memoized function reference).
  // Debounce only when the search term itself changed; all other changes (pagination,
  // filters, tab) are immediate so there is no artificial 300ms delay on those.
  // The timer-in-cleanup pattern also prevents React 18 StrictMode double-fire:
  // StrictMode cancels the first timer before it fires, the second run reschedules it.
  useEffect(() => {
    const searchChanged = searchTerm !== prevSearchRef.current;
    prevSearchRef.current = searchTerm;
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      dispatch(fetchReferrals({
        page: currentPage,
        limit: rowsPerPage,
        search: searchTerm,
        sortBy: sortField,
        sortOrder: sortDirection,
        status: reduxFilters.status,
        priority: reduxFilters.urgency,
      }));
    }, searchChanged ? 300 : 0);
    return () => clearTimeout(searchDebounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage, searchTerm, sortField, sortDirection, reduxFilters.status, reduxFilters.urgency]);

  // Flip isInitialLoad off as soon as the first fetch completes
  useEffect(() => {
    if (isInitialLoad && !loading) setIsInitialLoad(false);
  }, [loading, isInitialLoad]);

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

  const handleSortMenuClose = useCallback(() => {
    setSortMenuAnchorEl(null);
  }, []);

  const handleUpdateStatus = async (status) => {
    const referralId = selectedReferralId;
    handleMenuClose();
    if (!referralId) return;

    const statusLabels = {
      accepted: 'accepted',
      rejected: 'rejected',
      completed: 'marked as completed',
      cancelled: 'cancelled',
    };

    try {
      await dispatch(updateReferralStatus({ referralId, status })).unwrap();
      setActionSuccess(`Referral ${statusLabels[status] || 'updated'} successfully.`);
      // Refresh counts/list from the server so any server-side side effects
      // (token rewards, email notifications) are reflected consistently.
      dispatch(fetchReferrals({
        page: currentPage,
        limit: rowsPerPage,
        search: searchTerm,
        sortBy: sortField,
        sortOrder: sortDirection,
        status: reduxFilters.status,
        priority: reduxFilters.urgency,
      }));
    } catch (err) {
      // Error surfaces via statusUpdate.error in the Redux store / Snackbar below
    }
  };

  // Format date for display (falls back to "Not scheduled" when absent)
  const formatAppointmentDate = (dateString) => formatDate(dateString) || 'Not scheduled';

  // Get status chip for referrals
  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip size="small" icon={<ScheduleIcon />} label="Pending" color="warning" sx={compactChipSx} />;
      case 'accepted':
        return <Chip size="small" icon={<CheckCircleIcon />} label="Accepted" color="info" sx={compactChipSx} />;
      case 'completed':
        return <Chip size="small" icon={<DoneIcon />} label="Completed" color="success" sx={compactChipSx} />;
      case 'rejected':
        return <Chip size="small" icon={<CancelIcon />} label="Rejected" color="error" sx={compactChipSx} />;
      case 'cancelled':
        return <Chip size="small" icon={<CancelIcon />} label="Cancelled" color="default" sx={compactChipSx} />;
      default:
        return <Chip size="small" label={status} sx={compactChipSx} />;
    }
  };

  // Get urgency chip for referrals
  const getUrgencyChip = (urgency) => {
    switch (urgency) {
      case 'routine':
        return <Chip size="small" label="Routine" color="default" variant="outlined" sx={compactChipSx} />;
      case 'urgent':
        return <Chip size="small" label="Urgent" color="warning" variant="outlined" sx={compactChipSx} />;
      case 'emergency':
        return <Chip size="small" label="Emergency" color="error" variant="outlined" sx={compactChipSx} />;
      default:
        return <Chip size="small" label={urgency} variant="outlined" sx={compactChipSx} />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={Boolean(actionSuccess)}
        autoHideDuration={4000}
        onClose={() => setActionSuccess('')}
        message={actionSuccess}
      />
      <Snackbar
        open={Boolean(statusUpdate.error)}
        autoHideDuration={5000}
        onClose={() => dispatch(clearStatusUpdateError())}
      >
        <Alert severity="error" onClose={() => dispatch(clearStatusUpdateError())}>
          {statusUpdate.error}
        </Alert>
      </Snackbar>

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
                    sx={{ ml: 2 }}
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
                    sx={{ ml: 2 }}
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
                    sx={{ ml: 2 }}
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
                    sx={{ ml: 2 }}
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
                    sx={{ ml: 2 }}
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
                    sx={{ ml: 2 }}
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
        
        {/* First-time load: spinner inside the paper, tabs/search remain visible */}
        {isInitialLoad && loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <ModernLoadingIndicator variant="dots" message="Loading referrals..." />
          </Box>
        ) : (
          /* Subsequent fetches (tab change, search, pagination): dim the table, no full remount */
          <Box sx={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
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
                formatDate={formatAppointmentDate}
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
                formatDate={formatAppointmentDate}
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
                formatDate={formatAppointmentDate}
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
                formatDate={formatAppointmentDate}
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
                formatDate={formatAppointmentDate}
              />
            </TabPanel>
          </Box>
        )}
      </Paper>
      
      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {selectedReferral?.status === 'pending' && (
          <MenuItem onClick={() => handleUpdateStatus('accepted')}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
            Accept Referral
          </MenuItem>
        )}
        {selectedReferral?.status === 'pending' && (
          <MenuItem onClick={() => handleUpdateStatus('rejected')}>
            <CancelIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
            Reject Referral
          </MenuItem>
        )}
        {selectedReferral?.status === 'accepted' && (
          <MenuItem onClick={() => handleUpdateStatus('completed')}>
            <DoneIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
            Mark as Completed
          </MenuItem>
        )}
        {!['pending', 'accepted'].includes(selectedReferral?.status) && (
          <MenuItem disabled>
            No status actions available
          </MenuItem>
        )}
        <Divider />
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
  // Percentages sum to 100% — with tableLayout: 'fixed' this guarantees the
  // table always fits the container's width on any screen size, no horizontal
  // scrollbar and no column ever silently clipped off-screen.
  const COLUMN_WIDTHS = {
    patient: '18%', reason: '18%', from: '15%', to: '15%',
    status: '11%', urgency: '11%', appointment: '12%', actions: '48px',
  };

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
        <Table size="small" sx={tableSx}>
          <TableHead>
            <TableRow sx={tableHeadRowSx}>
              <EllipsisHeaderCell label="Patient" sx={{ width: COLUMN_WIDTHS.patient }} />
              <EllipsisHeaderCell label="Reason" sx={{ width: COLUMN_WIDTHS.reason }} />
              <EllipsisHeaderCell label="From" sx={{ width: COLUMN_WIDTHS.from }} />
              <EllipsisHeaderCell label="To" sx={{ width: COLUMN_WIDTHS.to }} />
              <EllipsisHeaderCell label="Status" sx={{ width: COLUMN_WIDTHS.status }} />
              <EllipsisHeaderCell label="Urgency" sx={{ width: COLUMN_WIDTHS.urgency }} />
              <EllipsisHeaderCell label="Appointment" sx={{ width: COLUMN_WIDTHS.appointment }} />
              <EllipsisHeaderCell label="Actions" sx={{ width: COLUMN_WIDTHS.actions }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {referrals.map((referral) => {
              const referralId = referral._id || referral.id;
              const patient = referral.patient || {};
              const patientName = patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown';
              const refProvider = referral.referringProvider || {};
              const recProvider = referral.receivingProvider || {};
              const referringName = refProvider.firstName || refProvider.name ? `Dr. ${refProvider.firstName || ''} ${refProvider.lastName || refProvider.name || ''}`.trim() : '—';
              const receivingName = recProvider.firstName || recProvider.name ? `Dr. ${recProvider.firstName || ''} ${recProvider.lastName || recProvider.name || ''}`.trim() : '—';
            return (
                <TableRow
                  key={referralId}
                  hover
                  onClick={() => handleReferralClick(referralId)}
                  sx={{ ...tableBodyRowSx, cursor: 'pointer' }}
                >
                  <TableCell sx={{ width: COLUMN_WIDTHS.patient }}>
                    <Box>
                      <EllipsisCell value={patientName} sx={{ fontWeight: 'medium' }} />
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {patient.patientId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ width: COLUMN_WIDTHS.reason }}><EllipsisCell value={referral.reason} /></TableCell>
                  <TableCell sx={{ width: COLUMN_WIDTHS.from }}>
                    <EllipsisCell value={referringName} />
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {refProvider.specialty}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: COLUMN_WIDTHS.to }}>
                    <EllipsisCell value={receivingName} />
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {recProvider.specialty}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: COLUMN_WIDTHS.status }}>{getStatusChip(referral.status)}</TableCell>
                  <TableCell sx={{ width: COLUMN_WIDTHS.urgency }}>{getUrgencyChip(referral.urgency)}</TableCell>
                  <TableCell sx={{ width: COLUMN_WIDTHS.appointment }}>{formatDate(referral.appointmentDate)}</TableCell>
                  <TableCell align="right" sx={{ width: COLUMN_WIDTHS.actions }}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, referralId)}
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
