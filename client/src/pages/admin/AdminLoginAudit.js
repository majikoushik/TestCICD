import React, { useState, useEffect } from 'react';
import { ModernLoadingIndicator } from '../../components/common'; 
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Chip,
  Button,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon, CalendarToday as CalendarIcon } from '@mui/icons-material';
import { adminMockData } from '../../services/mockData';

const AdminLoginAudit = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [totalSuccessfulLogins, setTotalSuccessfulLogins] = useState(0);
  const [totalFailedLogins, setTotalFailedLogins] = useState(0);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use mock data directly
        const mockLogs = adminMockData.auditLogs;
        setAuditLogs(mockLogs);
        setFilteredLogs(mockLogs);
        
        // Calculate statistics
        const successful = mockLogs.filter(log => log.successful).length;
        const failed = mockLogs.filter(log => !log.successful).length;
        setTotalSuccessfulLogins(successful);
        setTotalFailedLogins(failed);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        setError('Failed to load audit logs. Please try again later.');
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterRole, filterStatus, filterStartDate, filterEndDate, auditLogs]);

  const applyFilters = () => {
    let filtered = [...auditLogs];
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.userName?.toLowerCase().includes(query) || 
        log.userEmail?.toLowerCase().includes(query) ||
        log.ipAddress?.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(log => log.userRole === filterRole);
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(log => {
        if (filterStatus === 'successful') return log.successful;
        if (filterStatus === 'failed') return !log.successful;
        return true;
      });
    }
    
    // Apply date filters
    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
    }
    
    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.timestamp) <= endDate);
    }
    
    setFilteredLogs(filtered);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Login Audit Logs
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
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            Filters
          </Button>
        </Box>
      </Box>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Total Login Attempts
              </Typography>
              <Typography variant="h3">
                {totalSuccessfulLogins + totalFailedLogins}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main" gutterBottom>
                Successful Logins
              </Typography>
              <Typography variant="h3" color="success.main">
                {totalSuccessfulLogins}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main" gutterBottom>
                Failed Logins
              </Typography>
              <Typography variant="h3" color="error.main">
                {totalFailedLogins}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Filter Panel */}
      {filterOpen && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filter Audit Logs
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>User Role</InputLabel>
                <Select
                  value={filterRole}
                  label="User Role"
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="provider">Provider</MenuItem>
                  <MenuItem value="doctor">Doctor</MenuItem>
                  <MenuItem value="nurse">Nurse</MenuItem>
                  <MenuItem value="unknown">Unknown</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Login Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Login Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="successful">Successful</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Start Date"
                type="date"
                value={filterStartDate || ''}
                onChange={(e) => setFilterStartDate(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <CalendarIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  ),
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="End Date"
                type="date"
                value={filterEndDate || ''}
                onChange={(e) => setFilterEndDate(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <CalendarIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  ),
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={handleResetFilters}
                  sx={{ mr: 1 }}
                >
                  Reset Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
      
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
          <TableContainer component={Paper}>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User Agent</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log, index) => (
                    <TableRow key={index}>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>{log.userEmail}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.userRole} 
                          size="small"
                          color={log.userRole === 'admin' || log.userRole === 'superadmin' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.userAgent}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.successful ? 'Success' : 'Failed'} 
                          color={log.successful ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredLogs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Container>
  );
};

export default AdminLoginAudit;
