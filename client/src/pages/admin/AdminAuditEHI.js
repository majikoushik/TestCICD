import React, { useState, useEffect, useCallback } from 'react';
import { ModernLoadingIndicator } from '../../components/common';
import { get } from '../../utils/apiUtils';
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
} from '@mui/material';
import {
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';


const ACTION_COLORS = {
  READ: 'default',
  CREATE: 'primary',
  UPDATE: 'info',
  DELETE: 'error',
  EXPORT: 'success',
  CONSENT_GRANT: 'secondary',
  CONSENT_REVOKE: 'warning',
};

const AdminAuditEHI = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);

  const [filterAction, setFilterAction] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [stats, setStats] = useState({ total: 0, allowed: 0, blocked: 0, exports: 0 });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: rowsPerPage });
      if (filterAction) params.set('action', filterAction);
      if (filterResourceType) params.set('resourceType', filterResourceType);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);

      const data = await get('/admin/audit/ehi', Object.fromEntries(params));

      setLogs(data.data || []);
      setTotal(data.total || 0);

      // Derive stats from unfiltered totals when on first page with no filters
      if (!filterAction && !filterResourceType && !filterStartDate && !filterEndDate && page === 0) {
        const allLogs = data.data || [];
        setStats({
          total: data.total,
          allowed: allLogs.filter(l => l.responseStatus < 400).length,
          blocked: allLogs.filter(l => l.responseStatus === 403).length,
          exports: allLogs.filter(l => l.action === 'EXPORT').length,
        });
      }
    } catch (err) {
      setError(err?.message || 'Failed to load EHI audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterAction, filterResourceType, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setFilterAction('');
    setFilterResourceType('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(0);
  };

  const formatDateTime = (dateString) =>
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(dateString));

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h4" component="h1">
            EHI Access Audit Log
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFilterOpen(o => !o)}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLogs}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Compliance log under <strong>ONC 21st Century Cures Act — 45 CFR Part 171</strong>.
        Records are retained for 7 years per HIPAA requirements.
      </Alert>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total EHI Events', value: stats.total, color: 'text.primary' },
          { label: 'Access Allowed', value: stats.allowed, color: 'success.main' },
          { label: 'Access Blocked (403)', value: stats.blocked, color: 'error.main' },
          { label: 'EHI Exports', value: stats.exports, color: 'primary.main' },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card>
              <CardContent sx={{ pb: '16px !important' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {s.label}
                </Typography>
                <Typography variant="h4" color={s.color}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      {filterOpen && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Filter Logs</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select value={filterAction} label="Action" onChange={e => { setFilterAction(e.target.value); setPage(0); }}>
                  <MenuItem value="">All Actions</MenuItem>
                  {['READ','CREATE','UPDATE','DELETE','EXPORT','CONSENT_GRANT','CONSENT_REVOKE'].map(a => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Resource Type</InputLabel>
                <Select value={filterResourceType} label="Resource Type" onChange={e => { setFilterResourceType(e.target.value); setPage(0); }}>
                  <MenuItem value="">All Types</MenuItem>
                  {['Patient','Referral','Analytics','User','AdminSetting'].map(r => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="From Date" type="date"
                value={filterStartDate}
                onChange={e => { setFilterStartDate(e.target.value); setPage(0); }}
                InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <CalendarIcon fontSize="small" color="action" sx={{ mr: 1 }} /> }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="To Date" type="date"
                value={filterEndDate}
                onChange={e => { setFilterEndDate(e.target.value); setPage(0); }}
                InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: <CalendarIcon fontSize="small" color="action" sx={{ mr: 1 }} /> }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={handleResetFilters}>Reset Filters</Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <ModernLoadingIndicator message="Loading EHI audit logs..." />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>HTTP</TableCell>
                  <TableCell>ONC Exception</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log, idx) => (
                  <TableRow key={log._id || idx} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell>{log.userEmail || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.userRole || 'unknown'}
                        size="small"
                        color={log.userRole === 'admin' || log.userRole === 'superadmin' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        color={ACTION_COLORS[log.action] || 'default'}
                      />
                    </TableCell>
                    <TableCell>{log.resourceType}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.responseStatus}
                        size="small"
                        color={log.responseStatus < 400 ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {log.oncException ? (
                        <Tooltip title={`ONC Exception: ${log.oncException}`}>
                          <Chip label={log.oncException} size="small" color="warning" variant="outlined" />
                        </Tooltip>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{log.ipAddress || '—'}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No EHI audit events found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </>
      )}
    </Container>
  );
};

export default AdminAuditEHI;
