import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Avatar,
  IconButton,
  Typography
} from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Done as DoneIcon,
  Close as CloseIcon,
  Notes as NotesIcon
} from '@mui/icons-material';

export default function ReferralStatusUpdate({ currentStatus, onStatusUpdate }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [notes, setNotes] = useState('');

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    setDialogOpen(true);
    handleClose();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedStatus(null);
    setNotes('');
  };

  const handleStatusConfirm = () => {
    onStatusUpdate(selectedStatus, notes);
    handleDialogClose();
  };

  // Define available status transitions based on current status
  const getAvailableStatusTransitions = () => {
    switch (currentStatus) {
      case 'pending':
        return [
          { status: 'accepted', label: 'Accept', icon: <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} /> },
          { status: 'rejected', label: 'Reject', icon: <CancelIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> }
        ];
      case 'accepted':
        return [
          { status: 'completed', label: 'Complete', icon: <DoneIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} /> },
          { status: 'cancelled', label: 'Cancel', icon: <CancelIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> }
        ];
      case 'completed':
        return [];
      case 'rejected':
        return [];
      case 'cancelled':
        return [];
      default:
        return [];
    }
  };

  const availableTransitions = getAvailableStatusTransitions();

  // Map the selected status to a header avatar color/icon for the confirm dialog
  const getStatusDialogAvatar = () => {
    switch (selectedStatus) {
      case 'accepted':
        return { color: 'info.main', icon: <CheckCircleIcon fontSize="small" /> };
      case 'completed':
        return { color: 'success.main', icon: <DoneIcon fontSize="small" /> };
      case 'rejected':
      case 'cancelled':
        return { color: 'error.main', icon: <CancelIcon fontSize="small" /> };
      default:
        return { color: 'primary.main', icon: <CheckCircleIcon fontSize="small" /> };
    }
  };
  const statusDialogAvatar = getStatusDialogAvatar();

  // If no transitions available, disable the button
  if (availableTransitions.length === 0) {
    return (
      <Button
        variant="outlined"
        endIcon={<KeyboardArrowDownIcon />}
        disabled
      >
        Update Status
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outlined"
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleClick}
      >
        Update Status
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {availableTransitions.map((transition) => (
          <MenuItem 
            key={transition.status} 
            onClick={() => handleStatusSelect(transition.status)}
          >
            {transition.icon}
            {transition.label}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: statusDialogAvatar.color }}>
            {statusDialogAvatar.icon}
          </Avatar>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            {selectedStatus === 'accepted' && 'Accept Referral'}
            {selectedStatus === 'rejected' && 'Reject Referral'}
            {selectedStatus === 'completed' && 'Complete Referral'}
            {selectedStatus === 'cancelled' && 'Cancel Referral'}
          </Typography>
          <IconButton aria-label="close" onClick={handleDialogClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            {selectedStatus === 'accepted' && 'Are you sure you want to accept this referral?'}
            {selectedStatus === 'rejected' && 'Are you sure you want to reject this referral?'}
            {selectedStatus === 'completed' && 'Are you sure you want to mark this referral as completed?'}
            {selectedStatus === 'cancelled' && 'Are you sure you want to cancel this referral?'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Notes"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                  <NotesIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button
            onClick={handleStatusConfirm}
            variant="contained"
            startIcon={statusDialogAvatar.icon}
            color={
              selectedStatus === 'accepted' ? 'primary' :
              selectedStatus === 'completed' ? 'success' :
              selectedStatus === 'rejected' || selectedStatus === 'cancelled' ? 'error' :
              'primary'
            }
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
