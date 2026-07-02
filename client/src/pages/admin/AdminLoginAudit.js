import React, { useState, useEffect, useCallback } from 'react';
import { ModernLoadingIndicator } from '../../components/common';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
  pageHeaderBoxSx,
} from '../../components/common/adminTableStyles';
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
  Chip,
  Button,
  Card,
  CardContent,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Computer as ComputerIcon,
  PhoneAndroid as MobileIcon,
} from '@mui/icons-material';
import { get } from '../../utils/apiUtils';

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseBrowser = (ua = '') => {
  if (!ua || ua === 'unknown') return 'Unknown';
  if (ua.includes('Edg/'))    return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/'))return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'IE';
  return 'Other';
};

const parseOS = (ua = '') => {
  if (!ua || ua === 'unknown') return 'Unknown';
  if (ua.includes('Windows NT 10')) return 'Windows 10/11';
  if (ua.includes('Windows NT'))    return 'Windows';
  if (ua.includes('Mac OS X'))      return 'macOS';
  if (ua.includes('Android'))       return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux'))         return 'Linux';
  return 'Other';
};

const isMobile = (ua = '') =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

const formatDateTime = (dateString) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(dateString));

const exportCSV = (logs) => {
  const header = 'User,Email,Role,IP Address,Timestamp,Browser,OS,Status\n';
  const rows = logs.map(l =>
    [
      `"${l.userName}"`, `"${l.userEmail}"`, l.userRole,
      l.ipAddress, formatDateTime(l.timestamp),
      parseBrowser(l.userAgent), parseOS(l.userAgent),
      l.successful ? 'Success' : 'Failed',
    ].join(',')
  ).join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `login-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Component ─────────────────────────────────────────────────────────────────

const AdminLoginAudit = () => {
  const [auditLogs, setAuditLogs]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(10);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [filterRole, setFilterRole]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate]     = useState('');

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (process.env.REACT_APP_MOCK_API === 'true') {
        const { adminMockData } = await import('../../services/mockData');
        setAuditLogs(adminMockData.auditLogs || []);
        setFilteredLogs(adminMockData.auditLogs || []);
        return;
      }

      const response = await get('/admin/audit/login');
      if (response.success) {
        setAuditLogs(response.data);
        setFilteredLogs(response.data);
      } else {
        setError(response.error || 'Failed to load audit logs');
      }
    } catch (err) {
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAuditLogs(); }, [fetchAuditLogs]);

  // ── Filter ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...auditLogs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.userName?.toLowerCase().includes(q) ||
        l.userEmail?.toLowerCase().includes(q) ||
        l.ipAddress?.toLowerCase().includes(q) ||
        parseBrowser(l.userAgent).toLowerCase().includes(q)
      );
    }

    if (filterRole !== 'all')   result = result.filter(l => l.userRole === filterRole);
    if (filterStatus === 'successful') result = result.filter(l => l.successful);
    if (filterStatus === 'failed')     result = result.filter(l => !l.successful);

    if (filterStartDate) {
      const d = new Date(filterStartDate); d.setHours(0, 0, 0, 0);
      result = result.filter(l => new Date(l.timestamp) >= d);
    }
    if (filterEndDate) {
      const d = new Date(filterEndDate); d.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.timestamp) <= d);
    }

    setFilteredLogs(result);
    setPage(0);
  }, [searchQuery, filterRole, filterStatus, filterStartDate, filterEndDate, auditLogs]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalAttempts  = auditLogs.length;
  const totalSuccess   = auditLogs.filter(l => l.successful).length;
  const totalFailed    = auditLogs.filter(l => !l.successful).length;
  const uniqueUsers    = new Set(auditLogs.map(l => l.userId)).size;

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>

      {/* ── Header ── */}
      <Box sx={{ ...pageHeaderBoxSx, alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>Login Audit</Typography>
          <Typography variant="body2" color="text.secondary">
            All login attempts captured from the authentication system
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Search user / IP / browser"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 220 }}
            InputProps={{ endAdornment: <SearchIcon color="action" fontSize="small" /> }}
          />
          <Button variant="outlined" startIcon={<FilterIcon />} onClick={() => setFilterOpen(v => !v)}>
            Filters
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAuditLogs} disabled={loading} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export visible rows to CSV">
            <span>
              <IconButton onClick={() => exportCSV(filteredLogs)} disabled={filteredLogs.length === 0} color="primary">
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Stats cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Attempts',   value: totalAttempts, color: 'text.primary'   },
          { label: 'Successful',       value: totalSuccess,  color: 'success.main'   },
          { label: 'Failed',           value: totalFailed,   color: 'error.main'     },
          { label: 'Unique Users',     value: uniqueUsers,   color: 'primary.main'   },
        ].map(({ label, value, color }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
                <Typography variant="h4" color={color} fontWeight={700}>{loading ? '—' : value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Filter panel ── */}
      {filterOpen && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Filters</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={filterRole} label="Role" onChange={(e) => setFilterRole(e.target.value)}>
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="superadmin">Super Admin</MenuItem>
                  <MenuItem value="doctor">Doctor</MenuItem>
                  <MenuItem value="provider">Provider</MenuItem>
                  <MenuItem value="nurse">Nurse</MenuItem>
                  <MenuItem value="clinic">Clinic</MenuItem>
                  <MenuItem value="hospital">Hospital</MenuItem>
                  <MenuItem value="lab">Lab</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="successful">Successful</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth size="small" label="From" type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <CalendarIcon fontSize="small" color="action" sx={{ mr: 0.5 }} /> }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth size="small" label="To" type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <CalendarIcon fontSize="small" color="action" sx={{ mr: 0.5 }} /> }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="outlined" fullWidth onClick={handleResetFilters}>Reset</Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ── Table ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <ModernLoadingIndicator message="Loading audit logs..." />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
            <Table size="small" sx={tableSx}>
              <TableHead>
                <TableRow sx={tableHeadRowSx}>
                  <TableCell sx={{ width: '22%' }}>User</TableCell>
                  <TableCell sx={{ width: '12%' }}>Role</TableCell>
                  <TableCell sx={{ width: '14%' }}>IP Address</TableCell>
                  <TableCell sx={{ width: '20%' }}>Browser / OS</TableCell>
                  <TableCell sx={{ width: '18%' }}>Timestamp</TableCell>
                  <TableCell sx={{ width: '14%' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log, idx) => {
                    const browser = parseBrowser(log.userAgent);
                    const os      = parseOS(log.userAgent);
                    const mobile  = isMobile(log.userAgent);
                    return (
                      <TableRow key={idx} hover sx={tableBodyRowSx}>
                        {/* User */}
                        <TableCell sx={{ width: '22%' }}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.userName || '—'}</Typography>
                          <EllipsisCell value={log.userEmail} variant="caption" sx={{ color: 'text.secondary' }} />
                        </TableCell>

                        {/* Role */}
                        <TableCell sx={{ width: '12%' }}>
                          <Chip
                            label={log.userRole}
                            size="small"
                            color={['admin', 'superadmin'].includes(log.userRole) ? 'primary' : 'default'}
                            sx={compactChipSx}
                          />
                        </TableCell>

                        {/* IP */}
                        <TableCell sx={{ width: '14%' }}>
                          <Typography variant="body2" fontFamily="monospace" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.ipAddress || '—'}</Typography>
                        </TableCell>

                        {/* Browser / OS */}
                        <TableCell sx={{ width: '20%' }}>
                          <Tooltip title={log.userAgent} arrow placement="top">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {mobile ? <MobileIcon fontSize="small" color="action" /> : <ComputerIcon fontSize="small" color="action" />}
                              <Box>
                                <Typography variant="body2">{browser}</Typography>
                                <Typography variant="caption" color="text.secondary">{os}</Typography>
                              </Box>
                            </Box>
                          </Tooltip>
                        </TableCell>

                        {/* Timestamp */}
                        <TableCell sx={{ width: '18%' }}>
                          <Typography variant="body2">{formatDateTime(log.timestamp)}</Typography>
                        </TableCell>

                        {/* Status */}
                        <TableCell sx={{ width: '14%' }}>
                          <Chip
                            icon={log.successful ? <CheckCircleIcon /> : <CancelIcon />}
                            label={log.successful ? 'Success' : 'Failed'}
                            color={log.successful ? 'success' : 'error'}
                            size="small"
                            sx={compactChipSx}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}

                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        {auditLogs.length === 0
                          ? 'No login history yet — login events will appear here after the next successful or failed login attempt.'
                          : 'No results match the current filters.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredLogs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </>
      )}
    </Container>
  );
};

export default AdminLoginAudit;
