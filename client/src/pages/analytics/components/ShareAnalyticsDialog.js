import React, { useState, useEffect } from 'react';
import { ModernLoadingIndicator } from '../../../components/common';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Divider,
  Box,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Share as ShareIcon
} from '@mui/icons-material';

export default function ShareAnalyticsDialog({ open, onClose, onShare, sharedWith = [] }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [accessLevel, setAccessLevel] = useState('view');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available users to share with
  useEffect(() => {
    const fetchUsers = async () => {
      if (!open) return;
      
      try {
        setLoading(true);
        
        // In a real app, this would be an API call to fetch users
        // For this demo, we'll simulate the data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate user data
        const mockUsers = [
          {
            id: 'user-2',
            name: 'Dr. Robert Chen',
            organization: 'City Medical Center',
            role: 'doctor'
          },
          {
            id: 'user-3',
            name: 'Dr. Emily Taylor',
            organization: 'Community Health Partners',
            role: 'doctor'
          },
          {
            id: 'user-4',
            name: 'Dr. Michael Brown',
            organization: 'Premier Medical Group',
            role: 'doctor'
          },
          {
            id: 'user-5',
            name: 'Central Hospital',
            organization: 'Central Hospital',
            role: 'hospital'
          },
          {
            id: 'user-6',
            name: 'Advanced Diagnostics',
            organization: 'Advanced Diagnostics',
            role: 'lab'
          }
        ];
        
        // Filter out users that are already shared with
        const filteredUsers = mockUsers.filter(
          user => !sharedWith.some(shared => shared.user.id === user.id)
        );
        
        setUsers(filteredUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [open, sharedWith]);

  const handleUserChange = (event) => {
    setSelectedUser(event.target.value);
  };

  const handleAccessLevelChange = (event) => {
    setAccessLevel(event.target.value);
  };

  const handleSubmit = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    
    try {
      await onShare(selectedUser, accessLevel);
      
      // Reset form
      setSelectedUser('');
      setAccessLevel('view');
    } catch (err) {
      console.error('Error sharing analytics:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedUser('');
    setAccessLevel('view');
    onClose();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Analytics Report</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Share this analytics report with other healthcare providers. You can control their access level.
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
          <InputLabel id="user-select-label">Share with</InputLabel>
          <Select
            labelId="user-select-label"
            id="user-select"
            value={selectedUser}
            label="Share with"
            onChange={handleUserChange}
            disabled={loading || users.length === 0}
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} ({user.organization})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="access-level-label">Access Level</InputLabel>
          <Select
            labelId="access-level-label"
            id="access-level"
            value={accessLevel}
            label="Access Level"
            onChange={handleAccessLevelChange}
          >
            <MenuItem value="view">View Only</MenuItem>
            <MenuItem value="edit">View and Edit</MenuItem>
            <MenuItem value="share">View, Edit and Share</MenuItem>
          </Select>
        </FormControl>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <ModernLoadingIndicator size={24} />
          </Box>
        )}
        
        {users.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', my: 2 }}>
            No available users to share with.
          </Typography>
        )}
        
        {sharedWith.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Already Shared With
            </Typography>
            <List>
              {sharedWith.map((share, index) => (
                <React.Fragment key={share.user.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={share.user.name}
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {share.user.organization}
                          </Typography>
                          {" — "}
                          Shared on: {formatDate(share.sharedAt)}
                          <Box sx={{ mt: 0.5 }}>
                            <Chip 
                              label={`Access: ${share.accessLevel}`} 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                            />
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                  {index < sharedWith.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!selectedUser || isSubmitting}
          startIcon={isSubmitting ? <ModernLoadingIndicator size={20} /> : <ShareIcon />}
        >
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
}
