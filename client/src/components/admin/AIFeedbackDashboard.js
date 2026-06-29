import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { get, post } from '../../../utils/apiUtils';

// Human-readable labels for alert types
const ALERT_TYPE_LABELS = {
  readmission_risk: 'Readmission Risk',
  care_gap: 'Care Gap',
  medication_adherence: 'Medication Adherence',
  chronic_disease: 'Chronic Disease',
  preventive_care: 'Preventive Care',
  high_utilization: 'High Utilization',
  fall_risk: 'Fall Risk',
  mental_health: 'Mental Health'
};

const formatAlertType = (type) => ALERT_TYPE_LABELS[type] || type;

const formatPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${Math.round(Number(value))}%`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
};

// Gauge card with a labeled LinearProgress bar
const GaugeCard = ({ title, percent, description, color }) => {
  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: color || 'primary.main', mb: 1 }}>
          {formatPercent(percent)}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={safePercent}
          sx={{
            height: 10,
            borderRadius: 5,
            mb: 1.5,
            backgroundColor: 'action.hover',
            '& .MuiLinearProgress-bar': { backgroundColor: color || 'primary.main', borderRadius: 5 }
          }}
        />
        {description && (
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// PA accuracy breakdown card
const PAAccuracyCard = ({ accuracy }) => {
  const percent = accuracy?.percent ?? null;
  const correct = accuracy?.correct ?? 0;
  const falsePositive = accuracy?.false_positive ?? 0;
  const falseNegative = accuracy?.false_negative ?? 0;
  const total = correct + falsePositive + falseNegative;

  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          PA Recommendation Accuracy
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
          {formatPercent(percent)}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={safePercent}
          sx={{
            height: 10,
            borderRadius: 5,
            mb: 2,
            backgroundColor: 'action.hover',
            '& .MuiLinearProgress-bar': { backgroundColor: 'success.main', borderRadius: 5 }
          }}
        />
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {formatPercent(percent)} correct based on provider feedback
        </Typography>
        {total > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
            <Chip
              icon={<CheckCircleIcon fontSize="small" />}
              label={`${correct} Correct`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<CancelIcon fontSize="small" />}
              label={`${falsePositive} False Positive`}
              size="small"
              color="error"
              variant="outlined"
            />
            <Chip
              icon={<WarningIcon fontSize="small" />}
              label={`${falseNegative} False Negative`}
              size="small"
              color="warning"
              variant="outlined"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Last computed card
const LastComputedCard = ({ lastComputed }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        Last Computed
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
        {lastComputed ? formatDate(lastComputed) : '—'}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        {lastComputed
          ? 'Feedback loop metrics were last refreshed at this time.'
          : 'Feedback loop has not run yet.'}
      </Typography>
    </CardContent>
  </Card>
);

// Alert type breakdown table
const AlertBreakdownTable = ({ breakdown }) => {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Alert Accuracy by Type
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Alert Type</strong></TableCell>
              <TableCell align="right"><strong>Total Alerts</strong></TableCell>
              <TableCell align="right"><strong>With Provider Action</strong></TableCell>
              <TableCell align="right"><strong>Action Rate</strong></TableCell>
              <TableCell align="center"><strong>Rating</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakdown.map((row) => {
              const actionRate = Number(row.action_rate ?? row.actionRate ?? 0);
              const ratingColor =
                actionRate >= 70 ? 'success' : actionRate >= 40 ? 'warning' : 'error';
              return (
                <TableRow key={row.alert_type || row.alertType} hover>
                  <TableCell>
                    {formatAlertType(row.alert_type || row.alertType)}
                  </TableCell>
                  <TableCell align="right">{row.total ?? row.count ?? 0}</TableCell>
                  <TableCell align="right">
                    {row.actioned ?? row.action_count ?? '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, actionRate)}
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'action.hover',
                          '& .MuiLinearProgress-bar': { borderRadius: 3 }
                        }}
                        color={ratingColor}
                      />
                      <Typography variant="body2">{formatPercent(actionRate)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={actionRate >= 70 ? 'Good' : actionRate >= 40 ? 'Fair' : 'Low'}
                      size="small"
                      color={ratingColor}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const AIFeedbackDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runningLoop, setRunningLoop] = useState(false);
  const [runSuccess, setRunSuccess] = useState(false);
  const [runError, setRunError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get('/admin/ai-config?category=metrics');
      // Support various response shapes: { data: { metrics: ... } }, { metrics: ... }, or direct
      const data = response?.data ?? response;
      setMetrics(data?.metrics ?? data ?? null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load feedback metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleRunFeedbackLoop = async () => {
    setRunningLoop(true);
    setRunSuccess(false);
    setRunError(null);
    try {
      await post('/admin/ai-management/feedback-loop', {});
      setRunSuccess(true);
      // Re-fetch metrics after a short delay to pick up newly computed values
      setTimeout(() => {
        fetchMetrics();
      }, 1500);
    } catch (err) {
      setRunError(err?.response?.data?.message || err?.message || 'Failed to trigger feedback loop.');
    } finally {
      setRunningLoop(false);
    }
  };

  // Derive display values from metrics
  const alertActionRate = metrics?.alertActionRate ?? metrics?.alert_action_rate ?? null;
  const paAccuracy = metrics?.paAccuracy ?? metrics?.pa_accuracy ?? null;
  const lastComputed = metrics?.lastComputed ?? metrics?.last_computed ?? null;
  const alertBreakdown = metrics?.alertBreakdown ?? metrics?.alert_breakdown ?? [];

  const hasData = metrics !== null && (
    alertActionRate !== null || paAccuracy !== null || lastComputed !== null || alertBreakdown.length > 0
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AnalyticsIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            AI Feedback Loop Metrics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchMetrics}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRunFeedbackLoop}
            disabled={runningLoop || loading}
            startIcon={runningLoop ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            size="small"
          >
            {runningLoop ? 'Running…' : 'Run Feedback Loop Now'}
          </Button>
        </Box>
      </Box>

      {/* Run loop status messages */}
      {runSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRunSuccess(false)}>
          Feedback loop triggered successfully. Metrics will update shortly.
        </Alert>
      )}
      {runError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRunError(null)}>
          {runError}
        </Alert>
      )}

      {/* Fetch error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty state */}
      {!loading && !error && !hasData && (
        <Alert severity="info" icon={<AnalyticsIcon />}>
          No feedback data yet — alerts need provider feedback to compute accuracy.
        </Alert>
      )}

      {/* Metric cards */}
      {!loading && hasData && (
        <>
          <Grid container spacing={3} sx={{ mb: 1 }}>
            <Grid item xs={12} md={4}>
              <GaugeCard
                title="Alert Action Rate"
                percent={alertActionRate}
                description={`${formatPercent(alertActionRate)} of predictive alerts led to provider action`}
                color="#1976d2"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <PAAccuracyCard accuracy={paAccuracy} />
            </Grid>
            <Grid item xs={12} md={4}>
              <LastComputedCard lastComputed={lastComputed} />
            </Grid>
          </Grid>

          {/* Alert type breakdown table */}
          <AlertBreakdownTable breakdown={alertBreakdown} />
        </>
      )}
    </Box>
  );
};

export default AIFeedbackDashboard;
