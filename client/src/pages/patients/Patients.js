import React, { useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ModernLoadingIndicator } from '../../components/common';
import { 
  fetchPatients, 
  setFilters as setPatientsFilters, 
  setPagination, 
  selectAllPatients, 
  selectPatientsLoading, 
  selectPatientsError, 
  selectPatientsFilters, 
  selectPatientsPagination 
} from '../../redux/slices/patientsSlice';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  Alert,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  LocalHospital as LocalHospitalIcon,
  AccessTime as AccessTimeIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

function Patients() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get state from Redux store using selectors
  const patients = useSelector(selectAllPatients);
  const loading = useSelector(selectPatientsLoading);
  const error = useSelector(selectPatientsError);
  const reduxFilters = useSelector(selectPatientsFilters);
  const pagination = useSelector(selectPatientsPagination);
  
  // Local UI state
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = React.useState(null);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = React.useState(null);
  const [selectedPatient, setSelectedPatient] = React.useState(null);
  
  // Memoized derived values from Redux state
  const filteredPatients = useMemo(() => patients, [patients]);
  const totalPatients = useMemo(() => pagination.totalItems, [pagination.totalItems]);
  const currentPage = useMemo(() => pagination.page - 1, [pagination.page]); // Convert 1-indexed to 0-indexed for MUI
  const rowsPerPage = useMemo(() => pagination.pageSize, [pagination.pageSize]);
  const sortField = useMemo(() => reduxFilters.sortBy, [reduxFilters.sortBy]);
  const sortDirection = useMemo(() => reduxFilters.sortOrder, [reduxFilters.sortOrder]);
  const searchTerm = useMemo(() => reduxFilters.searchTerm, [reduxFilters.searchTerm]);
  
  // Local UI state for filter menu
  const [localFilters, setLocalFilters] = React.useState({
    riskLevel: reduxFilters.status || 'all',
    gender: reduxFilters.gender || 'all'
  });

  // Function to load patients using Redux thunk - memoized with useCallback
  const loadPatients = useCallback(() => {
    dispatch(fetchPatients({
      page: pagination.page,
      limit: pagination.pageSize,
      search: reduxFilters.searchTerm,
      sortBy: reduxFilters.sortBy,
      sortOrder: reduxFilters.sortOrder,
      riskLevel: reduxFilters.status,
      gender: reduxFilters.gender
    }));
  }, [dispatch, pagination.page, pagination.pageSize, reduxFilters.searchTerm, 
      reduxFilters.sortBy, reduxFilters.sortOrder, reduxFilters.status, reduxFilters.gender]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadPatients]);

  // No need for this effect anymore since loadPatients is memoized with the dependencies

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
    dispatch(setPatientsFilters({
      sortBy: field,
      sortOrder: isAsc ? 'desc' : 'asc'
    }));
  }, [dispatch, sortField, sortDirection]);

  const handleSearchChange = useCallback((event) => {
    dispatch(setPatientsFilters({
      searchTerm: event.target.value
    }));
  }, [dispatch]);

  const handleAddPatient = useCallback(() => {
    navigate('/app/patients/add');
  }, [navigate]);

  const handlePatientClick = useCallback((patientId) => {
    navigate(`/app/patients/${patientId}`);
  }, [navigate]);

  const handleFilterClick = useCallback((event) => {
    setFilterMenuAnchorEl(event.currentTarget);
  }, []);

  const handleFilterClose = useCallback(() => {
    setFilterMenuAnchorEl(null);
  }, []);

  const handleActionClick = useCallback((event, patient) => {
    event.stopPropagation();
    setSelectedPatient(patient);
    setActionMenuAnchorEl(event.currentTarget);
  }, []);

  const handleActionClose = useCallback(() => {
    setActionMenuAnchorEl(null);
  }, []);

  const handleViewDetails = useCallback(() => {
    if (selectedPatient) {
      navigate(`/app/patients/${selectedPatient.patientId}`);
    }
    handleActionClose();
  }, [selectedPatient, navigate, handleActionClose]);

  const handleCreateReferral = useCallback(() => {
    if (selectedPatient) {
      navigate(`/app/referrals/create?patientId=${selectedPatient.patientId}`);
    }
    handleActionClose();
  }, [selectedPatient, navigate, handleActionClose]);

  const handleScheduleAppointment = useCallback(() => {
    if (selectedPatient) {
      navigate(`/app/appointments/schedule?patientId=${selectedPatient.patientId}`);
    }
    handleActionClose();
  }, [selectedPatient, navigate, handleActionClose]);
  
  const handleFilterMenuClose = () => {
    setFilterMenuAnchorEl(null);
  };
  const handleFilterChange = useCallback((filterType, value) => {
    // Update local state first
    setLocalFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    
    // Then update Redux state based on filter type
    switch (filterType) {
      case 'riskLevel':
        dispatch(setPatientsFilters({
          status: value === 'all' ? '' : value
        }));
        break;
      case 'gender':
        dispatch(setPatientsFilters({
          gender: value === 'all' ? '' : value
        }));
        break;
      default:
        break;
    }
    handleFilterMenuClose();
  }, [dispatch]);

  const clearFilters = useCallback(() => {
    // Reset local state
    setLocalFilters({
      riskLevel: 'all',
      gender: 'all'
    });
    
    // Reset Redux filters
    dispatch(setPatientsFilters({
      searchTerm: '',
      status: '',
      gender: '',
      sortBy: 'lastName',
      sortOrder: 'asc'
    }));
    
    // Close filter menu
    handleFilterClose();
  }, [dispatch, handleFilterClose]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  }, []);

  const calculateAge = useCallback((dateOfBirth) => {
    // Handle null or undefined date
    if (!dateOfBirth) {
      console.log('Warning: dateOfBirth is null or undefined');
      return 'N/A';
    }
    
    try {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      
      // Check for invalid date
      if (isNaN(dob.getTime())) {
        console.log('Warning: Invalid date format for dateOfBirth:', dateOfBirth);
        return 'N/A';
      }
      
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      // If birthday hasn't occurred yet this year, subtract 1
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'N/A';
    }
  }, []);

  const getRiskLevel = useCallback((score) => {
    if (score >= 70) {
      return { level: 'High', color: 'error' };
    } else if (score >= 30) {
      return { level: 'Medium', color: 'warning' };
    } else {
      return { level: 'Low', color: 'success' };
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="pulse" message="Loading patients data..." />
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
        Patients
      </Typography>
      
      {/* Business Insights Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Patient Engagement Metric */}
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
                <TimelineIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5, fontSize: '0.9em' }} />
                  +28% patient engagement
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Higher app usage and follow-ups
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Treatment Adherence */}
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
                <CheckCircleIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'info.main', mr: 0.5, fontSize: '0.9em' }} />
                  +45% treatment adherence
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Improved medication compliance
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Appointment Attendance */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'primary.light', 
                color: 'primary.dark',
                p: 1.5,
                borderRadius: 2,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AccessTimeIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'primary.main', mr: 0.5, fontSize: '0.9em' }} />
                  -32% missed appointments
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Better scheduling and reminders
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Patient Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddPatient}
        >
          Add Patient
        </Button>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search patients..."
            variant="outlined"
            size="small"
            value={reduxFilters.searchTerm}
            onChange={handleSearchChange}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Box>
            <Tooltip title="Filter">
              <IconButton onClick={handleFilterClick}>
                <FilterListIcon />
                {(reduxFilters.status !== 'all' || reduxFilters.gender !== 'all') && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      bgcolor: 'primary.main',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: 8,
                      right: 8
                    }}
                  />
                )}
              </IconButton>
            </Tooltip>
            
            {/* Filter Menu */}
            <Menu
              anchorEl={filterMenuAnchorEl}
              open={Boolean(filterMenuAnchorEl)}
              onClose={handleFilterClose}
            >
              <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                Risk Level
              </Typography>
              <MenuItem 
                selected={reduxFilters.status === 'all'}
                onClick={() => handleFilterChange('riskLevel', 'all')}
              >
                <ListItemText>All</ListItemText>
                {reduxFilters.status === 'all' && (
                  <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
              </MenuItem>
              <MenuItem 
                selected={reduxFilters.status === 'high'}
                onClick={() => handleFilterChange('riskLevel', 'high')}
              >
                <ListItemText>High Risk</ListItemText>
                {reduxFilters.status === 'high' && (
                  <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
              </MenuItem>
              <MenuItem 
                selected={reduxFilters.status === 'medium'}
                onClick={() => handleFilterChange('riskLevel', 'medium')}
              >
                <ListItemText>Medium Risk</ListItemText>
                {reduxFilters.status === 'medium' && (
                  <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
              </MenuItem>
              <MenuItem 
                selected={reduxFilters.status === 'low'}
                onClick={() => handleFilterChange('riskLevel', 'low')}
              >
                <ListItemText>Low Risk</ListItemText>
                {reduxFilters.status === 'low' && (
                  <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
              </MenuItem>
              
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                Gender
              </Typography>
              <MenuItem 
                selected={reduxFilters.gender === 'all'}
                onClick={() => handleFilterChange('gender', 'all')}
              >
                <ListItemText>All</ListItemText>
                {reduxFilters.gender === 'all' && (
                  <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
              </MenuItem>
              <MenuItem 
                selected={reduxFilters.gender === 'male'}
                onClick={() => handleFilterChange('gender', 'male')}
              >
                <ListItemText>Male</ListItemText>
                {reduxFilters.gender === 'male' && (
                  <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
              </MenuItem>
              <MenuItem 
                selected={reduxFilters.gender === 'female'}
                onClick={() => handleFilterChange('gender', 'female')}
              >
                <ListItemText>Female</ListItemText>
                {reduxFilters.gender === 'female' && (
                  <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
              </MenuItem>
              <MenuItem 
                selected={reduxFilters.gender === 'other'}
                onClick={() => handleFilterChange('gender', 'other')}
              >
                <ListItemText>Other</ListItemText>
                {reduxFilters.gender === 'other' && (
                  <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                    <CheckCircleIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                )}
              </MenuItem>
              
              <Divider sx={{ my: 1 }} />
              
              <MenuItem onClick={clearFilters}>
                <ListItemIcon>
                  <ClearIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Clear Filters</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
            <TableRow>
                <TableCell>Patient ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Age / Gender</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Risk Level</TableCell>
                {/* <TableCell>Last Visit</TableCell> */}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPatients
                .slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage)
                .map((patient) => {
                  const riskInfo = getRiskLevel(patient.riskScore);
                  const name = patient.name? patient.name : patient.firstName + " " + patient.lastName;
                  const email = patient.email ? patient.email : patient.contactInfo.email;
                  return (
                    <TableRow
                      key={patient.patientId}
                      hover
                      onClick={() => handlePatientClick(patient.patientId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{patient.patientId}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 1, bgcolor: 'primary.light' }}>
                            <PersonIcon />
                          </Avatar>
                          {name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {calculateAge(patient.birthDate)} / {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{email}</Typography>
                        <Typography variant="body2" color="text.secondary">{patient.contactInfo.phone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={riskInfo.level}
                          color={riskInfo.color}
                          size="small"
                          icon={riskInfo.level === 'High' ? <WarningIcon /> : undefined}
                        />
                      </TableCell>
                      {/* <TableCell>{formatDate(patient.lastVisit)}</TableCell> */}
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleActionClick(e, patient)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {filteredPatients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    No patients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalPatients}
          rowsPerPage={pagination.pageSize}
          page={currentPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {Math.min(filteredPatients.length, (currentPage + 1) * rowsPerPage)} of {totalPatients} patients
        </Typography>
      </Box>
      
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleViewDetails}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Patient Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCreateReferral}>
          <ListItemIcon>
            <FilterListIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create Referral</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleScheduleAppointment}>
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Schedule Appointment</ListItemText>
        </MenuItem>
      </Menu>
    </Container>
  );
}

// Export as memoized component to prevent unnecessary re-renders
export default memo(Patients);
