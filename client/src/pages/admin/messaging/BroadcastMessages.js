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
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { ModernLoadingIndicator } from '../../../components/common';
import EllipsisCell from '../../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../../components/common/adminTableStyles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { formatDateTime } from '../../../utils/dateFormatter';
import * as adminMessagingService from '../../../services/adminMessagingService';

/**
 * BroadcastMessages component for managing system-wide broadcast messages
 */
const BroadcastMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'

  // Row action menu (kebab) — keeps the grid to one action column instead of
  // a row of icon buttons, mirroring AdminProviders.js
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuMessage, setActionMenuMessage] = useState(null);
  const openActionMenu = (event, message) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuMessage(message);
  };
  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuMessage(null);
  };

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium',
    category: 'general',
    status: 'draft',
    sender: 'System Administrator'
  });

  // Fetch broadcast messages on component mount
  useEffect(() => {
    fetchMessages();
  }, []);

  // Fetch messages from the service
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await adminMessagingService.getBroadcastMessages();
      setMessages(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching broadcast messages:', err);
      setError('Failed to load broadcast messages. Please try again later.');
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

  // Open dialog for creating a new message
  const handleCreateMessage = () => {
    setFormMode('create');
    setFormData({
      title: '',
      content: '',
      priority: 'medium',
      category: 'general',
      status: 'draft',
      sender: 'System Administrator'
    });
    setOpenDialog(true);
  };

  // Open dialog for editing an existing message
  const handleEditMessage = (message) => {
    setFormMode('edit');
    setCurrentMessage(message);
    setFormData({
      title: message.title,
      content: message.content,
      priority: message.priority,
      category: message.category,
      status: message.status,
      sender: message.sender
    });
    setOpenDialog(true);
  };

  // Open dialog for viewing message details
  const handleViewMessage = (message) => {
    setCurrentMessage(message);
    setOpenViewDialog(true);
  };

  // Open dialog for confirming message deletion
  const handleDeletePrompt = (message) => {
    setCurrentMessage(message);
    setOpenDeleteDialog(true);
  };

  // Submit form to create or update a message
  const handleSubmit = async () => {
    try {
      if (formMode === 'create') {
        await adminMessagingService.createBroadcastMessage(formData);
      } else {
        await adminMessagingService.updateBroadcastMessage(currentMessage.id, formData);
      }
      setOpenDialog(false);
      fetchMessages();
    } catch (err) {
      console.error('Error saving broadcast message:', err);
      setError('Failed to save broadcast message. Please try again.');
    }
  };

  // Delete a message
  const handleDeleteMessage = async () => {
    try {
      await adminMessagingService.deleteBroadcastMessage(currentMessage.id);
      setOpenDeleteDialog(false);
      fetchMessages();
    } catch (err) {
      console.error('Error deleting broadcast message:', err);
      setError('Failed to delete broadcast message. Please try again.');
    }
  };

  // Send a draft message
  const handleSendMessage = async (message) => {
    try {
      await adminMessagingService.sendBroadcastMessage(message.id);
      fetchMessages();
    } catch (err) {
      console.error('Error sending broadcast message:', err);
      setError('Failed to send broadcast message. Please try again.');
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


  // Shared row-action menu — one instance, opened against whichever row's
  // kebab button was clicked (see openActionMenu/closeActionMenu above).
  const renderActionMenu = () => {
    const message = actionMenuMessage;
    if (!message) return null;
    const runAction = (fn) => { closeActionMenu(); fn(); };
    return (
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => runAction(() => handleViewMessage(message))}>
          <ListItemIcon><VisibilityIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        {message.status === 'draft' && [
          <MenuItem key="edit" onClick={() => runAction(() => handleEditMessage(message))}>
            <ListItemIcon><EditIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>,
          <MenuItem key="send" onClick={() => runAction(() => handleSendMessage(message))}>
            <ListItemIcon><SendIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>Send</ListItemText>
          </MenuItem>,
        ]}
        <MenuItem onClick={() => runAction(() => handleDeletePrompt(message))}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2">
          Broadcast Messages
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateMessage}
        >
          New Message
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
                <TableCell sx={{ width: '24%' }}>Title</TableCell>
                <TableCell sx={{ width: '16%' }}>Sender</TableCell>
                <TableCell sx={{ width: '12%' }}>Priority</TableCell>
                <TableCell sx={{ width: '12%' }}>Status</TableCell>
                <TableCell sx={{ width: '16%' }}>Sent At</TableCell>
                <TableCell sx={{ width: '20%' }}>Read Count</TableCell>
                <TableCell sx={{ width: '48px' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No broadcast messages found.
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((message) => (
                  <TableRow key={message.id} hover sx={tableBodyRowSx}>
                    <TableCell sx={{ width: '24%' }}><EllipsisCell value={message.title} /></TableCell>
                    <TableCell sx={{ width: '16%' }}><EllipsisCell value={message.sender} /></TableCell>
                    <TableCell sx={{ width: '12%' }}>
                      <Chip
                        label={message.priority}
                        color={getPriorityColor(message.priority)}
                        size="small"
                        sx={compactChipSx}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '12%' }}>
                      <Chip
                        label={message.status}
                        color={getStatusColor(message.status)}
                        size="small"
                        sx={compactChipSx}
                      />
                    </TableCell>
                    <TableCell sx={{ width: '16%' }}>{message.sentAt ? formatDateTime(message.sentAt) : 'Not sent'}</TableCell>
                    <TableCell sx={{ width: '20%' }}>
                      {message.status === 'sent' ? `${message.readCount}/${message.recipientCount}` : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ width: '48px' }} align="center">
                      <IconButton size="small" onClick={(e) => openActionMenu(e, message)}>
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

      {/* Create/Edit Message Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {formMode === 'create' ? 'Create New Broadcast Message' : 'Edit Broadcast Message'}
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
                label="Message Content"
                fullWidth
                multiline
                rows={6}
                value={formData.content}
                onChange={handleInputChange}
                required
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
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="feature">Feature Update</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="training">Training</MenuItem>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {formMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Message Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        {currentMessage && (
          <>
            <DialogTitle>{currentMessage.title}</DialogTitle>
            <DialogContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                From: {currentMessage.sender} | 
                Priority: <Chip 
                  label={currentMessage.priority} 
                  color={getPriorityColor(currentMessage.priority)} 
                  size="small" 
                  sx={{ mx: 1 }} 
                /> | 
                Category: {currentMessage.category}
              </Typography>
              
              {currentMessage.sentAt && (
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Sent: {formatDateTime(currentMessage.sentAt)} | 
                  Read by: {currentMessage.readCount}/{currentMessage.recipientCount} recipients
                </Typography>
              )}
              
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="body1" paragraph>
                  {currentMessage.content}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
              {currentMessage.status === 'draft' && (
                <>
                  <Button 
                    onClick={() => {
                      setOpenViewDialog(false);
                      handleEditMessage(currentMessage);
                    }} 
                    color="primary"
                  >
                    Edit
                  </Button>
                  <Button 
                    onClick={() => {
                      setOpenViewDialog(false);
                      handleSendMessage(currentMessage);
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
            Are you sure you want to delete the message "{currentMessage?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteMessage} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BroadcastMessages;
