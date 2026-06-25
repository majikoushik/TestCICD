import React, { useState } from 'react';
import { ModernLoadingIndicator } from '../../../components/common';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';

export default function ReferralNotes({ notes, onNotesUpdate, status }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if editing is allowed based on referral status
  const canEdit = ['pending', 'accepted'].includes(status);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedNotes(notes);
    setError('');
    setSuccess(false);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedNotes(notes);
    setError('');
    setSuccess(false);
  };

  const handleNotesChange = (e) => {
    setEditedNotes(e.target.value);
  };

  const handleSaveClick = async () => {
    setIsSubmitting(true);
    setError('');
    setSuccess(false);
    
    try {
      // In a real app, this would call an API to update the notes
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update notes
      onNotesUpdate(editedNotes);
      
      // Show success message
      setSuccess(true);
      
      // Exit edit mode after a delay
      setTimeout(() => {
        setIsEditing(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error updating notes:', err);
      setError('Failed to update notes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Referral Notes
        </Typography>
        {canEdit && !isEditing && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEditClick}
          >
            Edit Notes
          </Button>
        )}
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Notes updated successfully!
        </Alert>
      )}
      
      {isEditing ? (
        <Box>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={editedNotes}
            onChange={handleNotesChange}
            variant="outlined"
            placeholder="Enter referral notes..."
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleCancelClick}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={isSubmitting ? <ModernLoadingIndicator variant="button" size={20} /> : <SaveIcon />}
              onClick={handleSaveClick}
              disabled={isSubmitting || editedNotes === notes}
            >
              Save
            </Button>
          </Box>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          {notes ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {notes}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No notes available for this referral.
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}
