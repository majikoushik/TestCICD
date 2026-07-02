import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Autocomplete,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  Divider,
  Menu
} from '@mui/material';
import { ModernLoadingIndicator } from '../../../components/common';
import EllipsisCell from '../../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
  pageHeaderBoxSx,
} from '../../../components/common/adminTableStyles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { formatDateTime } from '../../../utils/dateFormatter';
import * as adminMessagingService from '../../../services/adminMessagingService';

// Percentages sum to 100% — with tableLayout: 'fixed' (see tableSx) this
// guarantees the grid always fits its container, no horizontal scroll and no
// column silently clipped off-screen.
const ALERT_COLUMN_WIDTHS = {
  title: '24%', sender: '16%', priority: '10%', status: '10%',
  recipients: '12%', sentAt: '16%', readStatus: '12%', actions: '48px',
};

/**
 * TargetedAlerts component for managing alerts targeted to specific providers
 */
const TargetedAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'

  // Row action menu (kebab) — keeps the grid to one action column instead of
  // a row of icon buttons, so it never needs horizontal scroll on narrow screens
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuAlert, setActionMenuAlert] = useState(null);
  const openActionMenu = (event, alert) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuAlert(alert);
  };
  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuAlert(null);
  };

  // Mock providers for recipient selection
  const [providers] = useState([
    { id: 'user-1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@clinictrust.ai' },
    { id: 'user-2', name: 'Dr. Michael Chen', email: 'michael.chen@clinictrust.ai' },
    { id: 'user-3', name: 'Dr. Emily Rodriguez', email: 'emily.rodriguez@clinictrust.ai' },
    { id: 'user-4', name: 'Dr. Robert Davis', email: 'robert.davis@clinictrust.ai' },
    { id: 'user-5', name: 'Dr. Lisa Wilson', email: 'lisa.wilson@clinictrust.ai' }
  ]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium',
    category: 'general',
    status: 'draft',
    sender: 'System Administrator',
    recipients: [],
    relatedEntityId: '',
    relatedEntityType: ''
  });

  // Fetch targeted alerts on component mount
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Fetch alerts from the service
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await adminMessagingService.getTargetedAlerts();
      setAlerts(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching targeted alerts:', err);
      setError('Failed to load targeted alerts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle recipients selection change
  const handleRecipientsChange = (event, newValue) => {
    setFormData({
      ...formData,
      recipients: newValue
    });
  };

  // Open dialog for creating a new alert
  const handleCreateAlert = () => {
    setFormMode('create');
    setFormData({
      title: '',
      content: '',
      priority: 'medium',
      category: 'general',
      status: 'draft',
      sender: 'System Administrator',
      recipients: [],
      relatedEntityId: '',
      relatedEntityType: ''
    });
    setOpenDialog(true);
  };

  // Open dialog for editing an existing alert
  const handleEditAlert = (alert) => {
    setFormMode('edit');
    setCurrentAlert(alert);
    
    // Find full provider objects for recipients
    const recipientObjects = alert.recipients.map(recipient => {
      const provider = providers.find(p => p.id === recipient.id);
      return provider || recipient;
    });
    
    setFormData({
      title: alert.title,
      content: alert.content,
      priority: alert.priority,
      category: alert.category,
      status: alert.status,
      sender: alert.sender,
      recipients: recipientObjects,
      relatedEntityId: alert.relatedEntityId || '',
      relatedEntityType: alert.relatedEntityType || ''
    });
    setOpenDialog(true);
  };

  // Open dialog for viewing alert details
  const handleViewAlert = (alert) => {
    setCurrentAlert(alert);
    setOpenViewDialog(true);
  };

  // Open dialog for confirming alert deletion
  const handleDeletePrompt = (alert) => {
    setCurrentAlert(alert);
    setOpenDeleteDialog(true);
  };

  // Submit form to create or update an alert
  const handleSubmit = async () => {
    try {
      // Format recipients to include only necessary data
      const formattedData = {
        ...formData,
        recipients: formData.recipients.map(recipient => ({
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          readAt: null
        }))
      };
      
      if (formMode === 'create') {
        await adminMessagingService.createTargetedAlert(formattedData);
      } else {
        await adminMessagingService.updateTargetedAlert(currentAlert.id, formattedData);
      }
      setOpenDialog(false);
      fetchAlerts();
    } catch (err) {
      console.error('Error saving targeted alert:', err);
      setError('Failed to save targeted alert. Please try again.');
    }
  };

  // Delete an alert
  const handleDeleteAlert = async () => {
    try {
      await adminMessagingService.deleteTargetedAlert(currentAlert.id);
      setOpenDeleteDialog(false);
      fetchAlerts();
    } catch (err) {
      console.error('Error deleting targeted alert:', err);
      setError('Failed to delete targeted alert. Please try again.');
    }
  };

  // Send a draft alert
  const handleSendAlert = async (alert) => {
    try {
      await adminMessagingService.sendTargetedAlert(alert.id);
      fetchAlerts();
    } catch (err) {
      console.error('Error sending targeted alert:', err);
      setError('Failed to send targeted alert. Please try again.');
    }
  };

  // Get color for priority chip
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  // Get color for status chip
  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get read status count
  const getReadCount = (recipients) => {
    if (!recipients || recipients.length === 0) return '0/0';
    const readCount = recipients.filter(r => r.readAt).length;
    return `${readCount}/${recipients.length}`;
  };

  // Shared row-action menu — one instance, opened against whichever row's
  // kebab button was clicked (see openActionMenu/closeActionMenu above).
  const renderActionMenu = () => {
    const alert = actionMenuAlert;
    if (!alert) return null;
    const runAction = (fn) => { closeActionMenu(); fn(); };
    return (
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => runAction(() => handleViewAlert(alert))}>
          <ListItemIcon><VisibilityIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        {alert.status === 'draft' && [
          <MenuItem key="edit" onClick={() => runAction(() => handleEditAlert(alert))}>
            <ListItemIcon><EditIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>,
          <MenuItem key="send" onClick={() => runAction(() => handleSendAlert(alert))}>
            <ListItemIcon><SendIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Send</ListItemText>
          </MenuItem>,
        ]}
        <Divider />
        <MenuItem onClick={() => runAction(() => handleDeletePrompt(alert))}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>
    );
  };

  return (
    <Box>
      <Box sx={pageHeaderBoxSx}>
        <Typography variant="h6" component="h2">
          Targeted Alerts
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateAlert}
        >
          New Alert
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
           <ModernLoadingIndicator message="Loading alerts..." />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
          <Table size="small" sx={tableSx}>
            <TableHead>
              <TableRow sx={tableHeadRowSx}>
                <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.title }}>Title</TableCell>
                <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.sender }}>Sender</TableCell>
                <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.priority }}>Priority</TableCell>
                <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.status }}>Status</TableCell>
                <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.recipients }}>Recipients</TableCell>
                <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.sentAt }}>Sent At</TableCell>
                <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.readStatus }}>Read Status</TableCell>
                <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.actions }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No targeted alerts found.
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow key={alert.id} hover sx={tableBodyRowSx}>
                    <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.title }}>
                      <EllipsisCell value={alert.title} />
                    </TableCell>
                    <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.sender }}>
                      <EllipsisCell value={alert.sender} />
                    </TableCell>
                    <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.priority }}>
                      <Chip
                        label={alert.priority}
                        color={getPriorityColor(alert.priority)}
                        size="small"
                        sx={compactChipSx}
                      />
                    </TableCell>
                    <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.status }}>
                      <Chip
                        label={alert.status}
                        color={getStatusColor(alert.status)}
                        size="small"
                        sx={compactChipSx}
                      />
                    </TableCell>
                    <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.recipients }}>{alert.recipients?.length || 0}</TableCell>
                    <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.sentAt }}>{alert.sentAt ? formatDateTime(alert.sentAt) : 'Not sent'}</TableCell>
                    <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.readStatus }}>{getReadCount(alert.recipients)}</TableCell>
                    <TableCell sx={{ width: ALERT_COLUMN_WIDTHS.actions }} align="center">
                      <IconButton size="small" onClick={(e) => openActionMenu(e, alert)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {renderActionMenu()}

      {/* Create/Edit Alert Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {formMode === 'create' ? 'Create New Targeted Alert' : 'Edit Targeted Alert'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Title"
                fullWidth
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="content"
                label="Alert Content"
                fullWidth
                multiline
                rows={6}
                value={formData.content}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                id="recipients"
                options={providers}
                getOptionLabel={(option) => `${option.name} (${option.email})`}
                value={formData.recipients}
                onChange={handleRecipientsChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Recipients"
                    placeholder="Select recipients"
                    required
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
                        {option.name.charAt(0)}
                      </Avatar>
                      {option.name} ({option.email})
                    </Box>
                  </li>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  label="Category"
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="referral">Referral</MenuItem>
                  <MenuItem value="policy">Policy</MenuItem>
                  <MenuItem value="token">Token</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="sent">Send Immediately</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="sender"
                label="Sender"
                fullWidth
                value={formData.sender}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="relatedEntityId"
                label="Related Entity ID (optional)"
                fullWidth
                value={formData.relatedEntityId}
                onChange={handleInputChange}
                placeholder="e.g., REF-12345"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Related Entity Type (optional)</InputLabel>
                <Select
                  name="relatedEntityType"
                  value={formData.relatedEntityType}
                  onChange={handleInputChange}
                  label="Related Entity Type (optional)"
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="referral">Referral</MenuItem>
                  <MenuItem value="patient">Patient</MenuItem>
                  <MenuItem value="policy">Policy</MenuItem>
                  <MenuItem value="transaction">Transaction</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={formData.recipients.length === 0}
          >
            {formMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Alert Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        {currentAlert && (
          <>
            <DialogTitle>{currentAlert.title}</DialogTitle>
            <DialogContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                From: {currentAlert.sender} | 
                Priority: <Chip 
                  label={currentAlert.priority} 
                  color={getPriorityColor(currentAlert.priority)} 
                  size="small" 
                  sx={{ mx: 1 }} 
                /> | 
                Category: {currentAlert.category}
              </Typography>
              
              {currentAlert.sentAt && (
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Sent: {formatDateTime(currentAlert.sentAt)}
                </Typography>
              )}
              
              {currentAlert.relatedEntityId && (
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Related: {currentAlert.relatedEntityType} ({currentAlert.relatedEntityId})
                </Typography>
              )}
              
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="body1" paragraph>
                  {currentAlert.content}
                </Typography>
              </Box>
              
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Recipients ({currentAlert.recipients?.length || 0})
              </Typography>
              
              <List sx={{ bgcolor: 'background.paper' }}>
                {currentAlert.recipients?.map((recipient, index) => (
                  <React.Fragment key={recipient.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={recipient.name}
                        secondary={
                          <>
                            {recipient.email}
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              {recipient.readAt ? (
                                <>
                                  <CheckIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    Read at {formatDateTime(recipient.readAt)}
                                  </Typography>
                                </>
                              ) : (
                                <>
                                  <ClearIcon color="action" fontSize="small" sx={{ mr: 0.5 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    Not read yet
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </>
                        }
                      />
                    </ListItem>
                    {index < currentAlert.recipients.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
              {currentAlert.status === 'draft' && (
                <>
                  <Button 
                    onClick={() => {
                      setOpenViewDialog(false);
                      handleEditAlert(currentAlert);
                    }} 
                    color="primary"
                  >
                    Edit
                  </Button>
                  <Button 
                    onClick={() => {
                      setOpenViewDialog(false);
                      handleSendAlert(currentAlert);
                    }} 
                    variant="contained" 
                    color="primary"
                  >
                    Send
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the alert "{currentAlert?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteAlert} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TargetedAlerts;
