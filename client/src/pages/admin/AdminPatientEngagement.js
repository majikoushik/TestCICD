import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Grid, Card, CardContent, LinearProgress,
  Divider, Tabs, Tab, Checkbox, FormControlLabel, Slider
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  NotificationsActive as EngagementIcon,
  Campaign as CampaignIcon,
  Description as TemplateIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Launch as LaunchIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import adminEngagementService from '../../services/adminEngagementService';
import EllipsisCell from '../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';

// ============================================================================
// CONSTANTS
// ============================================================================

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push' },
  { value: 'in_app', label: 'In-App' }
];

const TYPE_OPTIONS = [
  { value: 'appointment_reminder', label: 'Appointment Reminder' },
  { value: 'referral_update', label: 'Referral Update' },
  { value: 'prior_auth_update', label: 'Prior Auth Update' },
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'general', label: 'General' },
  { value: 'care_gap', label: 'Care Gap' },
  { value: 'campaign', label: 'Campaign' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'read', label: 'Read' }
];

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTypeLabel(type) {
  const found = TYPE_OPTIONS.find(t => t.value === type);
  if (found) return found.label;
  return type
    ? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '—';
}

function getTypeColor(type) {
  const map = {
    appointment_reminder: 'primary',
    referral_update: 'secondary',
    prior_auth_update: 'warning',
    lab_result: 'success',
    prescription: 'info',
    general: 'default',
    care_gap: 'error',
    campaign: 'secondary'
  };
  return map[type] || 'default';
}

function getPriorityColor(priority) {
  const map = { low: 'default', normal: 'info', high: 'warning', urgent: 'error' };
  return map[priority] || 'default';
}

function getStatusColor(status) {
  const map = {
    pending: 'warning',
    sent: 'info',
    delivered: 'success',
    failed: 'error',
    read: 'default'
  };
  return map[status] || 'default';
}

function getCampaignStatusColor(status) {
  const map = {
    draft: 'default',
    scheduled: 'info',
    running: 'warning',
    completed: 'success',
    cancelled: 'error'
  };
  return map[status] || 'default';
}

function getChannelLabel(value) {
  const found = CHANNEL_OPTIONS.find(c => c.value === value);
  return found ? found.label : value;
}

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ label, count, color, icon }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={`${color}.main`}>{count}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CHANNEL CHECKBOXES
// ============================================================================

function ChannelCheckboxes({ value, onChange }) {
  const handleToggle = (ch) => {
    if (value.includes(ch)) {
      onChange(value.filter(v => v !== ch));
    } else {
      onChange([...value, ch]);
    }
  };
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {CHANNEL_OPTIONS.map(opt => (
        <FormControlLabel
          key={opt.value}
          control={
            <Checkbox
              size="small"
              checked={value.includes(opt.value)}
              onChange={() => handleToggle(opt.value)}
            />
          }
          label={opt.label}
          sx={{ mr: 1 }}
        />
      ))}
    </Box>
  );
}

// ============================================================================
// DEFAULT FORM FACTORIES
// ============================================================================

function defaultSendForm() {
  return { patientId: '', title: '', message: '', type: 'general', priority: 'normal', channels: ['email'] };
}

function defaultTemplateForm() {
  return {
    name: '',
    description: '',
    type: 'general',
    subject: '',
    body: '',
    smsBody: '',
    pushTitle: '',
    defaultChannels: ['email'],
    variables: '',
    isActive: true
  };
}

function defaultCampaignForm() {
  return {
    name: '',
    description: '',
    templateId: '',
    channels: ['email'],
    customMessage: '',
    scheduledAt: '',
    targetCriteria: {
      all: false,
      conditions: '',
      riskScoreMin: 0,
      insurancePlan: ''
    }
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminPatientEngagement() {
  // Tab
  const [activeTab, setActiveTab] = useState(0);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState(null);

  // Campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState(null);

  // Send notification dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendForm, setSendForm] = useState(defaultSendForm());

  // View notification dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm());

  // Campaign dialog
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState(defaultCampaignForm());

  // Shared action loading
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================================================
  // DATA LOADERS
  // ============================================================================

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminEngagementService.getNotifications({
        status: filterStatus,
        type: filterType,
        search: searchQuery,
        page,
        rowsPerPage
      });
      const payload = res?.data || res || {};
      const inner = payload.notifications ? payload : (payload.data || payload);
      setNotifications(inner.notifications || []);
      setTotal(inner.total ?? (inner.notifications ? inner.notifications.length : 0));
      setStats(inner.stats || {});
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, searchQuery, page, rowsPerPage]);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplateLoading(true);
      setTemplateError(null);
      const res = await adminEngagementService.getTemplates();
      const payload = res?.data || res || {};
      const inner = payload.templates ? payload : (payload.data || payload);
      setTemplates(Array.isArray(inner.templates) ? inner.templates : (Array.isArray(inner) ? inner : []));
    } catch {
      setTemplateError('Failed to load templates.');
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaignLoading(true);
      setCampaignError(null);
      const res = await adminEngagementService.getCampaigns();
      const payload = res?.data || res || {};
      const inner = payload.campaigns ? payload : (payload.data || payload);
      setCampaigns(Array.isArray(inner.campaigns) ? inner.campaigns : (Array.isArray(inner) ? inner : []));
    } catch {
      setCampaignError('Failed to load campaigns.');
    } finally {
      setCampaignLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 0) loadNotifications();
  }, [activeTab, loadNotifications]);

  useEffect(() => {
    if (activeTab === 1) loadTemplates();
  }, [activeTab, loadTemplates]);

  useEffect(() => {
    if (activeTab === 2) {
      loadCampaigns();
      loadTemplates();
    }
  }, [activeTab, loadCampaigns, loadTemplates]);

  // ============================================================================
  // NOTIFICATION HANDLERS
  // ============================================================================

  const handleSendNotification = async () => {
    try {
      setActionLoading(true);
      await adminEngagementService.sendNotification(sendForm);
      setSendDialogOpen(false);
      setSendForm(defaultSendForm());
      loadNotifications();
    } catch {
      setError('Failed to send notification.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await adminEngagementService.deleteNotification(id);
      loadNotifications();
    } catch {
      setError('Failed to delete notification.');
    }
  };

  const handleViewNotification = (notif) => {
    setSelectedNotification(notif);
    setViewDialogOpen(true);
  };

  // ============================================================================
  // TEMPLATE HANDLERS
  // ============================================================================

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(defaultTemplateForm());
    setTemplateDialogOpen(true);
  };

  const handleOpenEditTemplate = (tmpl) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      name: tmpl.name || '',
      description: tmpl.description || '',
      type: tmpl.type || 'general',
      subject: tmpl.subject || '',
      body: tmpl.body || '',
      smsBody: tmpl.smsBody || '',
      pushTitle: tmpl.pushTitle || '',
      defaultChannels: Array.isArray(tmpl.defaultChannels) ? tmpl.defaultChannels : [],
      variables: Array.isArray(tmpl.variables) ? tmpl.variables.join(', ') : (tmpl.variables || ''),
      isActive: tmpl.isActive !== undefined ? tmpl.isActive : true
    });
    setTemplateDialogOpen(true);
  };

  const handleSubmitTemplate = async () => {
    try {
      setActionLoading(true);
      if (editingTemplate) {
        await adminEngagementService.updateTemplate(editingTemplate._id, templateForm);
      } else {
        await adminEngagementService.createTemplate(templateForm);
      }
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm(defaultTemplateForm());
      loadTemplates();
    } catch {
      setTemplateError('Failed to save template.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await adminEngagementService.deleteTemplate(id);
      loadTemplates();
    } catch {
      setTemplateError('Failed to delete template.');
    }
  };

  // ============================================================================
  // CAMPAIGN HANDLERS
  // ============================================================================

  const handleOpenCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm(defaultCampaignForm());
    setCampaignDialogOpen(true);
  };

  const handleSubmitCampaign = async () => {
    try {
      setActionLoading(true);
      await adminEngagementService.createCampaign(campaignForm);
      setCampaignDialogOpen(false);
      setEditingCampaign(null);
      setCampaignForm(defaultCampaignForm());
      loadCampaigns();
    } catch {
      setCampaignError('Failed to save campaign.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLaunchCampaign = async (id) => {
    if (!window.confirm('Launch this campaign? Notifications will be sent to targeted patients.')) return;
    try {
      await adminEngagementService.launchCampaign(id);
      loadCampaigns();
    } catch {
      setCampaignError('Failed to launch campaign.');
    }
  };

  const handleCancelCampaign = async (id) => {
    if (!window.confirm('Cancel this running campaign?')) return;
    try {
      await adminEngagementService.cancelCampaign(id);
      loadCampaigns();
    } catch {
      setCampaignError('Failed to cancel campaign.');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await adminEngagementService.deleteCampaign(id);
      loadCampaigns();
    } catch {
      setCampaignError('Failed to delete campaign.');
    }
  };

  // ============================================================================
  // COMPUTED STATS
  // ============================================================================

  const computedStats = {
    total: stats.total != null ? stats.total : notifications.length,
    delivered: stats.delivered != null ? stats.delivered : notifications.filter(n => n.status === 'delivered').length,
    pending: stats.pending != null ? stats.pending : notifications.filter(n => n.status === 'pending').length,
    failed: stats.failed != null ? stats.failed : notifications.filter(n => n.status === 'failed').length
  };

  const handleTabRefresh = () => {
    if (activeTab === 0) loadNotifications();
    else if (activeTab === 1) loadTemplates();
    else loadCampaigns();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EngagementIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">Patient Engagement</Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleTabRefresh}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<EngagementIcon />} iconPosition="start" label="Notifications" />
          <Tab icon={<TemplateIcon />} iconPosition="start" label="Templates" />
          <Tab icon={<CampaignIcon />} iconPosition="start" label="Campaigns" />
        </Tabs>
      </Paper>

      {/* ================================================================== */}
      {/* TAB 0: NOTIFICATIONS                                                */}
      {/* ================================================================== */}
      {activeTab === 0 && (
        <>
          {/* Stat Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <StatCard label="Total Sent" count={computedStats.total} color="primary" icon={<SendIcon />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Delivered" count={computedStats.delivered} color="success" icon={<CheckIcon />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Pending" count={computedStats.pending} color="warning" icon={<ScheduleIcon />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Failed" count={computedStats.failed} color="error" icon={<ErrorIcon />} />
            </Grid>
          </Grid>

          {/* Filter Bar */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search patient, title..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 0.5 }} /> }}
                sx={{ minWidth: 240 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {TYPE_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Refresh">
                <IconButton onClick={loadNotifications}><RefreshIcon /></IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { setSendForm(defaultSendForm()); setSendDialogOpen(true); }}
              >
                Send Notification
              </Button>
            </Box>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Notifications Table */}
          <Paper>
            {loading && <LinearProgress />}
            <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
              <Table size="small" sx={tableSx}>
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ width: '18%' }}>Patient Name</TableCell>
                    <TableCell sx={{ width: '16%' }}>Type</TableCell>
                    <TableCell sx={{ width: '18%' }}>Channels</TableCell>
                    <TableCell sx={{ width: '10%' }}>Priority</TableCell>
                    <TableCell sx={{ width: '12%' }}>Status</TableCell>
                    <TableCell sx={{ width: '18%' }}>Date</TableCell>
                    <TableCell sx={{ width: '8%' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && notifications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No notifications found.
                      </TableCell>
                    </TableRow>
                  )}
                  {notifications.map(notif => (
                    <TableRow key={notif._id} hover sx={tableBodyRowSx}>
                      <TableCell sx={{ width: '18%' }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {notif.patientName || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          {notif.patientId}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ width: '16%' }}>
                        <Chip
                          label={getTypeLabel(notif.type)}
                          color={getTypeColor(notif.type)}
                          size="small"
                          variant="outlined"
                          sx={compactChipSx}
                        />
                      </TableCell>
                      <TableCell sx={{ width: '18%' }}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(notif.channels || []).map(ch => (
                            <Chip key={ch} label={getChannelLabel(ch)} size="small" variant="outlined" sx={compactChipSx} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ width: '10%' }}>
                        <Chip
                          label={capitalize(notif.priority)}
                          color={getPriorityColor(notif.priority)}
                          size="small"
                          sx={compactChipSx}
                        />
                      </TableCell>
                      <TableCell sx={{ width: '12%' }}>
                        <Chip
                          label={capitalize(notif.status)}
                          color={getStatusColor(notif.status)}
                          size="small"
                          sx={compactChipSx}
                        />
                      </TableCell>
                      <TableCell sx={{ width: '18%' }}>
                        <Typography variant="body2" noWrap>
                          {formatDate(notif.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ width: '8%' }} align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewNotification(notif)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteNotification(notif._id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Paper>
        </>
      )}

      {/* ================================================================== */}
      {/* TAB 1: TEMPLATES                                                    */}
      {/* ================================================================== */}
      {activeTab === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateTemplate}
            >
              Create Template
            </Button>
          </Box>

          {templateError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setTemplateError(null)}>
              {templateError}
            </Alert>
          )}

          {templateLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Grid container spacing={2}>
            {!templateLoading && templates.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  No templates found. Create your first template.
                </Paper>
              </Grid>
            )}
            {templates.map(tmpl => (
              <Grid item xs={12} sm={6} md={4} key={tmpl._id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                        {tmpl.name}
                      </Typography>
                      <Chip
                        label={getTypeLabel(tmpl.type)}
                        color={getTypeColor(tmpl.type)}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={tmpl.isActive ? 'Active' : 'Inactive'}
                        color={tmpl.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {tmpl.description || 'No description provided.'}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    {Array.isArray(tmpl.variables) && tmpl.variables.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                          Variables
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {tmpl.variables.map(v => (
                            <Chip key={v} label={`{{${v}}}`} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {Array.isArray(tmpl.defaultChannels) && tmpl.defaultChannels.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                          Default Channels
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {tmpl.defaultChannels.map(ch => (
                            <Chip key={ch} label={getChannelLabel(ch)} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>

                  <Box sx={{
                    px: 2, py: 1,
                    borderTop: 1, borderColor: 'divider',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      Used {tmpl.usageCount || 0} times
                    </Typography>
                    <Box>
                      <Tooltip title="Edit Template">
                        <IconButton size="small" onClick={() => handleOpenEditTemplate(tmpl)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Template">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteTemplate(tmpl._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* ================================================================== */}
      {/* TAB 2: CAMPAIGNS                                                    */}
      {/* ================================================================== */}
      {activeTab === 2 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateCampaign}
            >
              Create Campaign
            </Button>
          </Box>

          {campaignError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCampaignError(null)}>
              {campaignError}
            </Alert>
          )}

          <Paper>
            {campaignLoading && <LinearProgress />}
            <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
              <Table size="small" sx={tableSx}>
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ width: '22%' }}>Name</TableCell>
                    <TableCell sx={{ width: '16%' }}>Template</TableCell>
                    <TableCell sx={{ width: '11%' }}>Status</TableCell>
                    <TableCell sx={{ width: '10%' }}>Targeted</TableCell>
                    <TableCell sx={{ width: '9%' }}>Sent</TableCell>
                    <TableCell sx={{ width: '11%' }}>Open Rate</TableCell>
                    <TableCell sx={{ width: '13%' }}>Created</TableCell>
                    <TableCell sx={{ width: '8%' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!campaignLoading && campaigns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No campaigns found. Create your first campaign.
                      </TableCell>
                    </TableRow>
                  )}
                  {campaigns.map(camp => (
                    <TableRow key={camp._id} hover sx={tableBodyRowSx}>
                      <TableCell sx={{ width: '22%' }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{camp.name}</Typography>
                        {camp.description && (
                          <EllipsisCell value={camp.description} variant="caption" sx={{ color: 'text.secondary' }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ width: '16%' }}>
                        <EllipsisCell value={camp.templateName} />
                      </TableCell>
                      <TableCell sx={{ width: '11%' }}>
                        <Chip
                          label={capitalize(camp.status)}
                          color={getCampaignStatusColor(camp.status)}
                          size="small"
                          sx={compactChipSx}
                        />
                      </TableCell>
                      <TableCell sx={{ width: '10%' }}>{camp.targeted ?? '—'}</TableCell>
                      <TableCell sx={{ width: '9%' }}>{camp.sent ?? '—'}</TableCell>
                      <TableCell sx={{ width: '11%' }}>
                        {camp.openRate != null ? `${Number(camp.openRate).toFixed(1)}%` : '—'}
                      </TableCell>
                      <TableCell sx={{ width: '13%' }}>
                        <Typography variant="body2" noWrap>
                          {formatDate(camp.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ width: '8%' }} align="center">
                        {(camp.status === 'draft' || camp.status === 'scheduled') && (
                          <Tooltip title="Launch Campaign">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleLaunchCampaign(camp._id)}
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {camp.status === 'running' && (
                          <Tooltip title="Cancel Campaign">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleCancelCampaign(camp._id)}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(camp.status === 'draft' || camp.status === 'cancelled') && (
                          <Tooltip title="Delete Campaign">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteCampaign(camp._id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* ================================================================== */}
      {/* DIALOG: SEND NOTIFICATION                                           */}
      {/* ================================================================== */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Patient Notification</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Patient ID"
              value={sendForm.patientId}
              onChange={(e) => setSendForm(f => ({ ...f, patientId: e.target.value }))}
              size="small"
              fullWidth
              required
              placeholder="e.g. P001"
            />
            <TextField
              label="Title"
              value={sendForm.title}
              onChange={(e) => setSendForm(f => ({ ...f, title: e.target.value }))}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Message"
              value={sendForm.message}
              onChange={(e) => setSendForm(f => ({ ...f, message: e.target.value }))}
              size="small"
              fullWidth
              required
              multiline
              rows={4}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={sendForm.type}
                label="Type"
                onChange={(e) => setSendForm(f => ({ ...f, type: e.target.value }))}
              >
                {TYPE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={sendForm.priority}
                label="Priority"
                onChange={(e) => setSendForm(f => ({ ...f, priority: e.target.value }))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Channels
              </Typography>
              <ChannelCheckboxes
                value={sendForm.channels}
                onChange={(channels) => setSendForm(f => ({ ...f, channels }))}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendNotification}
            disabled={
              actionLoading ||
              !sendForm.patientId ||
              !sendForm.title ||
              !sendForm.message ||
              sendForm.channels.length === 0
            }
            startIcon={<SendIcon />}
          >
            {actionLoading ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================== */}
      {/* DIALOG: VIEW NOTIFICATION                                           */}
      {/* ================================================================== */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Notification Details</DialogTitle>
        <DialogContent dividers>
          {selectedNotification && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Patient Name</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedNotification.patientName || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Patient ID</Typography>
                  <Typography variant="body2">{selectedNotification.patientId || '—'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Title</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedNotification.title}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Message</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedNotification.message}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <Box mt={0.5}>
                    <Chip
                      label={getTypeLabel(selectedNotification.type)}
                      color={getTypeColor(selectedNotification.type)}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Priority</Typography>
                  <Box mt={0.5}>
                    <Chip
                      label={capitalize(selectedNotification.priority)}
                      color={getPriorityColor(selectedNotification.priority)}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box mt={0.5}>
                    <Chip
                      label={capitalize(selectedNotification.status)}
                      color={getStatusColor(selectedNotification.status)}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2">{formatDate(selectedNotification.createdAt)}</Typography>
                </Grid>
              </Grid>

              <Divider />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Channel Delivery Status
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
                  <Table size="small" sx={tableSx}>
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell sx={{ width: '20%' }}>Channel</TableCell>
                        <TableCell sx={{ width: '20%' }} align="center">Sent</TableCell>
                        <TableCell sx={{ width: '20%' }} align="center">Delivered</TableCell>
                        <TableCell sx={{ width: '40%' }}>Details / Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(selectedNotification.channelDelivery || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>
                            No delivery data available.
                          </TableCell>
                        </TableRow>
                      )}
                      {(selectedNotification.channelDelivery || []).map(cd => (
                        <TableRow key={cd.channel} sx={tableBodyRowSx}>
                          <TableCell sx={{ width: '20%' }}>{getChannelLabel(cd.channel)}</TableCell>
                          <TableCell sx={{ width: '20%' }} align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                              {cd.sent
                                ? <CheckIcon color="success" fontSize="small" />
                                : <ErrorIcon color="error" fontSize="small" />}
                              {cd.sentAt && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                                  {formatDate(cd.sentAt)}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ width: '20%' }} align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                              {cd.delivered
                                ? <CheckIcon color="success" fontSize="small" />
                                : <ErrorIcon color="error" fontSize="small" />}
                              {cd.deliveredAt && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                                  {formatDate(cd.deliveredAt)}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ width: '40%' }}>
                            {cd.error ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                                  Failed
                                </Typography>
                                <Typography variant="caption" color="error.main" sx={{ wordBreak: 'break-word' }}>
                                  {cd.error}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================== */}
      {/* DIALOG: CREATE / EDIT TEMPLATE                                      */}
      {/* ================================================================== */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? 'Edit Template' : 'Create Template'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                  size="small"
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={templateForm.type}
                    label="Type"
                    onChange={(e) => setTemplateForm(f => ({ ...f, type: e.target.value }))}
                  >
                    {TYPE_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(f => ({ ...f, description: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Subject (Email)"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Body"
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm(f => ({ ...f, body: e.target.value }))}
                  size="small"
                  fullWidth
                  multiline
                  rows={6}
                  helperText="Use {{variableName}} for placeholders"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="SMS Body"
                  value={templateForm.smsBody}
                  onChange={(e) => setTemplateForm(f => ({ ...f, smsBody: e.target.value }))}
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Shorter version for SMS (max 160 chars)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Push Title"
                  value={templateForm.pushTitle}
                  onChange={(e) => setTemplateForm(f => ({ ...f, pushTitle: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Variables"
                  value={templateForm.variables}
                  onChange={(e) => setTemplateForm(f => ({ ...f, variables: e.target.value }))}
                  size="small"
                  fullWidth
                  helperText="Comma-separated: patientName, appointmentDate"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Default Channels
                </Typography>
                <ChannelCheckboxes
                  value={templateForm.defaultChannels}
                  onChange={(defaultChannels) => setTemplateForm(f => ({ ...f, defaultChannels }))}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={templateForm.isActive}
                      onChange={(e) => setTemplateForm(f => ({ ...f, isActive: e.target.checked }))}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitTemplate}
            disabled={actionLoading || !templateForm.name}
          >
            {actionLoading ? 'Saving...' : (editingTemplate ? 'Save Changes' : 'Create Template')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================== */}
      {/* DIALOG: CREATE CAMPAIGN                                             */}
      {/* ================================================================== */}
      <Dialog
        open={campaignDialogOpen}
        onClose={() => setCampaignDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Campaign Name"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm(f => ({ ...f, name: e.target.value }))}
                  size="small"
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth required>
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={campaignForm.templateId}
                    label="Template"
                    onChange={(e) => setCampaignForm(f => ({ ...f, templateId: e.target.value }))}
                  >
                    {templates.map(t => (
                      <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm(f => ({ ...f, description: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Channels
                </Typography>
                <ChannelCheckboxes
                  value={campaignForm.channels}
                  onChange={(channels) => setCampaignForm(f => ({ ...f, channels }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Custom Message (Optional)"
                  value={campaignForm.customMessage}
                  onChange={(e) => setCampaignForm(f => ({ ...f, customMessage: e.target.value }))}
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Leave blank to use the template body"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Schedule Date and Time"
                  type="datetime-local"
                  value={campaignForm.scheduledAt}
                  onChange={(e) => setCampaignForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="Leave blank to save as draft"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider />
                <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 1 }}>
                  Target Criteria
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={campaignForm.targetCriteria.all}
                      onChange={(e) =>
                        setCampaignForm(f => ({
                          ...f,
                          targetCriteria: { ...f.targetCriteria, all: e.target.checked }
                        }))
                      }
                    />
                  }
                  label="Target All Patients"
                />
              </Grid>

              {!campaignForm.targetCriteria.all && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Conditions"
                      value={campaignForm.targetCriteria.conditions}
                      onChange={(e) =>
                        setCampaignForm(f => ({
                          ...f,
                          targetCriteria: { ...f.targetCriteria, conditions: e.target.value }
                        }))
                      }
                      size="small"
                      fullWidth
                      placeholder="diabetes, hypertension"
                      helperText="Comma-separated diagnosis conditions"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Insurance Plan"
                      value={campaignForm.targetCriteria.insurancePlan}
                      onChange={(e) =>
                        setCampaignForm(f => ({
                          ...f,
                          targetCriteria: { ...f.targetCriteria, insurancePlan: e.target.value }
                        }))
                      }
                      size="small"
                      fullWidth
                      placeholder="BlueCross"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Minimum Risk Score: {campaignForm.targetCriteria.riskScoreMin}
                    </Typography>
                    <Slider
                      value={campaignForm.targetCriteria.riskScoreMin}
                      onChange={(_, val) =>
                        setCampaignForm(f => ({
                          ...f,
                          targetCriteria: { ...f.targetCriteria, riskScoreMin: val }
                        }))
                      }
                      min={0}
                      max={100}
                      step={5}
                      marks={[
                        { value: 0, label: '0' },
                        { value: 25, label: '25' },
                        { value: 50, label: '50' },
                        { value: 75, label: '75' },
                        { value: 100, label: '100' }
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitCampaign}
            disabled={
              actionLoading ||
              !campaignForm.name ||
              !campaignForm.templateId ||
              campaignForm.channels.length === 0
            }
          >
            {actionLoading ? 'Saving...' : 'Create Campaign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
