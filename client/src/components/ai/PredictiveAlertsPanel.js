import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  Refresh,
  Visibility,
  Done,
  Close,
  NotificationsActive,
} from '@mui/icons-material';
import { get, patch } from '../../utils/apiUtils';
import { formatDateTime } from '../../utils/dateFormatter';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

const SEVERITY_CONFIG = {
  critical: { color: 'error', icon: Error, label: 'Critical', chipColor: '#d32f2f', bgColor: '#fff5f5' },
  high: { color: 'warning', icon: Warning, label: 'High', chipColor: '#ed6c02', bgColor: '#fff8f0' },
  medium: { color: 'info', icon: Info, label: 'Medium', chipColor: '#0288d1', bgColor: '#f0f7ff' },
  low: { color: 'success', icon: CheckCircle, label: 'Low', chipColor: '#2e7d32', bgColor: '#f0faf0' },
};

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

function AlertCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Skeleton variant="rounded" width={70} height={24} />
          <Skeleton variant="text" width={160} />
        </Box>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Skeleton variant="rounded" width={100} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
        </Box>
      </CardContent>
    </Card>
  );
}

function ResolveDialog({ open, alert, onClose, onConfirm, loading }) {
  const [wasActionTaken, setWasActionTaken] = useState(false);
  const [notes, setNotes] = useState('');

  const handleClose = () => {
    setWasActionTaken(false);
    setNotes('');
    onClose();
  };

  const handleConfirm = () => {
    onConfirm({ wasActionTaken, notes });
    setWasActionTaken(false);
    setNotes('');
  };

  if (!alert) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Resolve Alert</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Resolving: <strong>{alert.title}</strong> for <strong>{alert.patientName}</strong>
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <FormControlLabel
          control={
            <Checkbox
              checked={wasActionTaken}
              onChange={(e) => setWasActionTaken(e.target.checked)}
              color="primary"
            />
          }
          label="Was clinical action taken based on this alert?"
        />
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Notes (optional)"
          placeholder="Describe the action taken or reason for resolution..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 2 }}
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Done />}
        >
          {loading ? 'Resolving...' : 'Confirm Resolve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AlertCard({ alert, onAcknowledge, onResolve, onDismiss, actionLoading }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
  const SeverityIcon = cfg.icon;
  const isLoading = actionLoading === alert._id || actionLoading === alert.id;

  const formattedTime = alert.generatedAt
    ? formatDateTime(alert.generatedAt)
    : alert.createdAt
    ? formatDateTime(alert.createdAt)
    : 'Unknown time';

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderLeft: `4px solid ${cfg.chipColor}`,
        backgroundColor: cfg.bgColor,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<SeverityIcon fontSize="small" />}
              label={cfg.label}
              size="small"
              sx={{ backgroundColor: cfg.chipColor, color: '#fff', fontWeight: 700 }}
            />
            {alert.type && (
              <Chip label={alert.type} size="small" variant="outlined" />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
            {formattedTime}
          </Typography>
        </Box>

        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
          {alert.patientName || 'Unknown Patient'}
        </Typography>

        <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
          {alert.title}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {alert.description}
        </Typography>

        {alert.recommendation && (
          <Box
            sx={{
              backgroundColor: 'rgba(0,0,0,0.04)',
              borderRadius: 1,
              px: 1.5,
              py: 1,
              mb: 1.5,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              RECOMMENDATION
            </Typography>
            <Typography variant="body2">{alert.recommendation}</Typography>
          </Box>
        )}

        <Divider sx={{ mb: 1.5 }} />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {alert.status !== 'acknowledged' && alert.status !== 'resolved' && (
            <Tooltip title="Mark as acknowledged — you have seen this alert">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={isLoading ? <CircularProgress size={14} /> : <Visibility />}
                  onClick={() => onAcknowledge(alert)}
                  disabled={isLoading}
                >
                  Acknowledge
                </Button>
              </span>
            </Tooltip>
          )}

          {alert.status !== 'resolved' && (
            <Tooltip title="Resolve and record outcome">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={isLoading ? <CircularProgress size={14} /> : <Done />}
                  onClick={() => onResolve(alert)}
                  disabled={isLoading}
                >
                  Resolve
                </Button>
              </span>
            </Tooltip>
          )}

          <Tooltip title="Dismiss this alert">
            <span>
              <Button
                size="small"
                variant="text"
                color="inherit"
                startIcon={isLoading ? <CircularProgress size={14} /> : <Close />}
                onClick={() => onDismiss(alert)}
                disabled={isLoading}
                sx={{ color: 'text.secondary' }}
              >
                Dismiss
              </Button>
            </span>
          </Tooltip>

          {alert.status === 'acknowledged' && (
            <Chip label="Acknowledged" size="small" color="info" variant="outlined" />
          )}
          {alert.status === 'resolved' && (
            <Chip label="Resolved" size="small" color="success" variant="outlined" />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function PredictiveAlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [resolveDialog, setResolveDialog] = useState({ open: false, alert: null });
  const [resolveLoading, setResolveLoading] = useState(false);
  const autoRefreshRef = useRef(null);

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await get('/predictive-alerts');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.alerts)
        ? data.alerts
        : [];
      setAlerts(list);
    } catch (err) {
      setError(err.message || 'Failed to load predictive alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    autoRefreshRef.current = setInterval(() => fetchAlerts(true), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(autoRefreshRef.current);
  }, [fetchAlerts]);

  const handleAcknowledge = async (alert) => {
    const id = alert._id || alert.id;
    setActionLoading(id);
    setActionError(null);
    try {
      await patch(`/predictive-alerts/${id}/acknowledge`);
      setAlerts((prev) =>
        prev.map((a) => (a._id === id || a.id === id ? { ...a, status: 'acknowledged' } : a))
      );
    } catch (err) {
      setActionError(`Acknowledge failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenResolve = (alert) => {
    setResolveDialog({ open: true, alert });
  };

  const handleCloseResolve = () => {
    setResolveDialog({ open: false, alert: null });
  };

  const handleConfirmResolve = async ({ wasActionTaken, notes }) => {
    const alert = resolveDialog.alert;
    const id = alert._id || alert.id;
    setResolveLoading(true);
    setActionError(null);
    try {
      await patch(`/predictive-alerts/${id}/resolve`, { wasActionTaken, notes });
      setAlerts((prev) =>
        prev.map((a) =>
          a._id === id || a.id === id ? { ...a, status: 'resolved' } : a
        )
      );
      handleCloseResolve();
    } catch (err) {
      setActionError(`Resolve failed: ${err.message}`);
    } finally {
      setResolveLoading(false);
    }
  };

  const handleDismiss = async (alert) => {
    const id = alert._id || alert.id;
    setActionLoading(id);
    setActionError(null);
    try {
      await patch(`/predictive-alerts/${id}/dismiss`);
      setAlerts((prev) => prev.filter((a) => a._id !== id && a.id !== id));
    } catch (err) {
      setActionError(`Dismiss failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const activeAlerts = alerts.filter((a) => a.status !== 'resolved' && a.status !== 'dismissed');

  const severityCounts = SEVERITY_ORDER.reduce((acc, sev) => {
    acc[sev] = activeAlerts.filter((a) => a.severity === sev).length;
    return acc;
  }, {});

  const alertTypes = Array.from(new Set(activeAlerts.map((a) => a.type).filter(Boolean)));

  const filteredAlerts = activeAlerts.filter((a) => {
    const matchesSeverity = filterSeverity === 'all' || a.severity === filterSeverity;
    const matchesType = filterType === 'all' || a.type === filterType;
    return matchesSeverity && matchesType;
  });

  const groupedAlerts = SEVERITY_ORDER.reduce((acc, sev) => {
    const group = filteredAlerts.filter((a) => a.severity === sev);
    if (group.length > 0) acc[sev] = group;
    return acc;
  }, {});

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsActive color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Predictive Alerts
          </Typography>
        </Box>
        <Tooltip title="Refresh alerts">
          <IconButton onClick={() => fetchAlerts(true)} disabled={loading || refreshing} size="small">
            {refreshing ? <CircularProgress size={18} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary badges */}
      {!loading && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {SEVERITY_ORDER.map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            const count = severityCounts[sev];
            if (count === 0) return null;
            return (
              <Badge key={sev} badgeContent={count} color={cfg.color}>
                <Chip
                  label={cfg.label}
                  size="small"
                  sx={{ backgroundColor: cfg.chipColor, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setFilterSeverity(filterSeverity === sev ? 'all' : sev)}
                />
              </Badge>
            );
          })}
        </Box>
      )}

      {/* Filters */}
      {!loading && activeAlerts.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={filterSeverity}
              label="Severity"
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <MenuItem value="all">All Severities</MenuItem>
              {SEVERITY_ORDER.map((sev) => (
                <MenuItem key={sev} value={sev}>
                  {SEVERITY_CONFIG[sev].label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {alertTypes.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={filterType}
                label="Alert Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                {alertTypes.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      )}

      {/* Action error */}
      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {/* Fetch error */}
      {error && !loading && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => fetchAlerts()}>
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Loading skeletons */}
      {loading && (
        <Box>
          {[1, 2, 3].map((i) => (
            <AlertCardSkeleton key={i} />
          ))}
        </Box>
      )}

      {/* Alert groups */}
      {!loading && !error && (
        <>
          {Object.keys(groupedAlerts).length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
                color: 'text.secondary',
              }}
            >
              <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={500}>
                No active alerts — your patients are on track
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Predictive alerts will appear here when the AI detects risk factors.
              </Typography>
            </Box>
          ) : (
            Object.entries(groupedAlerts).map(([severity, group]) => {
              const cfg = SEVERITY_CONFIG[severity];
              return (
                <Box key={severity} sx={{ mb: 3 }}>
                  <Typography
                    variant="overline"
                    fontWeight={700}
                    sx={{ color: cfg.chipColor, letterSpacing: 1.5, display: 'block', mb: 1 }}
                  >
                    {cfg.label} ({group.length})
                  </Typography>
                  {group.map((alert) => (
                    <AlertCard
                      key={alert._id || alert.id}
                      alert={alert}
                      onAcknowledge={handleAcknowledge}
                      onResolve={handleOpenResolve}
                      onDismiss={handleDismiss}
                      actionLoading={actionLoading}
                    />
                  ))}
                </Box>
              );
            })
          )}
        </>
      )}

      {/* Resolve dialog */}
      <ResolveDialog
        open={resolveDialog.open}
        alert={resolveDialog.alert}
        onClose={handleCloseResolve}
        onConfirm={handleConfirmResolve}
        loading={resolveLoading}
      />
    </Box>
  );
}
