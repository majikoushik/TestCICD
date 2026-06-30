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
  Tooltip
} from '@mui/material';
import { ModernLoadingIndicator } from '../../../components/common';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon
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
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Sender</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sent At</TableCell>
                <TableCell>Read Count</TableCell>
                <TableCell>Actions</TableCell>
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
                  <TableRow key={message.id}>
                    <TableCell>{message.title}</TableCell>
                    <TableCell>{message.sender}</TableCell>
                    <TableCell>
                      <Chip
                        label={message.priority}
                        color={getPriorityColor(message.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={message.status}
                        color={getStatusColor(message.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{message.sentAt ? formatDateTime(message.sentAt) : 'Not sent'}</TableCell>
                    <TableCell>
                      {message.status === 'sent' ? `${message.readCount}/${message.recipientCount}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={() => handleViewMessage(message)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {message.status === 'draft' && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleEditMessage(message)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Send">
                            <IconButton
                              size="small"
                              onClick={() => handleSendMessage(message)}
                              color="primary"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeletePrompt(message)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
