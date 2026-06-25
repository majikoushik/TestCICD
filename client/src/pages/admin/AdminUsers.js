import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Alert,
  Snackbar,
  FormControlLabel,
  Switch
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  LockOpen as LockOpenIcon,
  Key as KeyIcon,
  ContentCopy as ContentCopyIcon,
  FilterList as FilterListIcon,
  PersonAdd as PersonAddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import adminUserService from '../../services/adminUserService';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the adminUserService to get all users
      const response = await adminUserService.getAllUsers();
      
      if (response.success) {
        setUsers(response.data);
        setFilteredUsers(response.data);
      } else {
        setError('Failed to load users: ' + (response.error || 'Unknown error'));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = [...users];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(query) || 
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }
    
    // Apply active status filter
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }
    
    setFilteredUsers(filtered);
    // Reset pagination when filters change
    setPage(0);
  }, [searchQuery, users, filterRole, filterStatus]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddUser = () => {
    setCurrentUser({
      name: '',
      email: '',
      role: 'user',
      isActive: true
    });
    setEditRole('user');
    setEditIsActive(true);
    setEditDialogOpen(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSaveUser = async () => {
    try {
      setSaveLoading(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      // Validate form
      if (!currentUser.name || !currentUser.email || !editRole) {
        setSaveError('Please fill in all required fields');
        setSaveLoading(false);
        return;
      }
      
      let response;
      
      // Check if we're creating a new user or updating an existing one
      if (currentUser._id || currentUser.id) {
        // Update existing user
        response = await adminUserService.updateUser(currentUser._id || currentUser.id, {
          role: editRole,
          isActive: editIsActive
        });
        
        if (response.success) {
          // Update the user in the state
          setUsers(users.map(u => 
            (u._id || u.id) === (currentUser._id || currentUser.id) ? response.data : u
          ));
          
          // Show success message
          setSnackbarMessage(`User ${currentUser.name} updated successfully`);
        }
      } else {
        // Create new user
        response = await adminUserService.createUser({
          name: currentUser.name,
          email: currentUser.email,
          role: editRole,
          isActive: editIsActive
        });
        
        if (response.success) {
          // Add the new user to the state
          setUsers([response.data, ...users]);
          
          // Show temporary password if provided
          if (response.data.tempPassword) {
            setTempPassword(response.data.tempPassword);
            setCurrentUser(response.data);
            setShowTempPassword(true);
          } else {
            // Show success message
            setSnackbarMessage(`User ${currentUser.name} created successfully`);
          }
        }
      }
      
      if (response.success) {
        setSaveSuccess(true);
        
        // Close the dialog after a short delay
        setTimeout(() => {
          setEditDialogOpen(false);
          setSnackbarOpen(true);
        }, 1500);
      } else {
        setSaveError(response.error || 'Failed to save user');
      }
      
      setSaveLoading(false);
    } catch (err) {
      console.error('Error saving user:', err);
      setSaveError(err.response?.data?.error || 'Failed to save user');
      setSaveLoading(false);
    }
  };

  const openConfirmDialog = (action, user, title, message) => {
    setCurrentUser(user);
    setConfirmAction(action);
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    try {
      setDeleteLoading(true);
      setError(null);
      
      const userId = currentUser._id || currentUser.id;
      
      // Call the adminUserService to delete the user
      const response = await adminUserService.deleteUser(userId);
      
      if (response.success) {
        // Remove the user from the state
        setUsers(users.filter(u => (u._id || u.id) !== userId));
        
        // Close the confirmation dialog
        setConfirmDialogOpen(false);
        
        // Show success message
        setSnackbarMessage(`User ${currentUser.name} deleted successfully`);
        setSnackbarOpen(true);
      } else {
        setError(response.error || 'Failed to delete user');
      }
      
      setDeleteLoading(false);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.error || 'Failed to delete user');
      setDeleteLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleUnlockAccount = async () => {
    try {
      setDeleteLoading(true); // Reuse the loading state
      setError(null);
      
      const userId = currentUser._id || currentUser.id;
      
      // Call the adminUserService to unlock the account
      const response = await adminUserService.unlockAccount(userId);
      
      if (response.success) {
        // Update the user in the state
        setUsers(users.map(u => 
          (u._id || u.id) === userId
            ? { ...u, loginAttempts: 0, lockedUntil: null } 
            : u
        ));
        
        // Close the confirmation dialog
        setConfirmDialogOpen(false);
        
        // Show success message
        setSnackbarMessage(`${currentUser.name}'s account unlocked successfully`);
        setSnackbarOpen(true);
      } else {
        setError(response.error || 'Failed to unlock account');
      }
      
      setDeleteLoading(false);
    } catch (err) {
      console.error('Error unlocking account:', err);
      setError(err.response?.data?.error || 'Failed to unlock account');
      setDeleteLoading(false);
      setConfirmDialogOpen(false);
    }
  };


  const handleResetPassword = async () => {
    try {
      setDeleteLoading(true); // Reuse the loading state
      setError(null);
      setTempPassword('');
      
      const userId = currentUser._id || currentUser.id;
      
      // Call the adminUserService to reset the password
      const response = await adminUserService.resetPassword(userId);
      
      if (response.success) {
        // Store the temporary password
        setTempPassword(response.data.tempPassword);
        setShowTempPassword(true);
      } else {
        setError(response.error || 'Failed to reset password');
        setConfirmDialogOpen(false);
      }
      
      setDeleteLoading(false);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.response?.data?.error || 'Failed to reset password');
      setDeleteLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleConfirmAction = async () => {
    switch (confirmAction) {
      case 'delete':
        await handleDeleteUser();
        break;
      case 'unlock':
        await handleUnlockAccount();
        break;
      case 'reset-password':
        await handleResetPassword();
        break;
      default:
        setConfirmDialogOpen(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'doctor':
        return 'primary';
      case 'nurse':
        return 'success';
      case 'receptionist':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="500">
            User Management
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddUser}
            startIcon={<PersonAddIcon />}
            sx={{ px: 3, py: 1 }}
          >
            Add New User
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            label="Search Users"
            placeholder="Search by name, email or role"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mr: 2, flexGrow: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {loading && searchQuery ? (
                    <ModernLoadingIndicator size={20} />
                  ) : (
                    <SearchIcon color="action" />
                  )}
                </InputAdornment>
              ),
            }}
            disabled={loading}
          />
          <Button
            onClick={() => setFilterDialogOpen(true)}
            variant="outlined"
            startIcon={<FilterListIcon />}
            sx={{ mr: 2, minWidth: '100px' }}
            color={filterRole !== 'all' || filterStatus !== 'all' ? "primary" : "inherit"}
          >
            Filter
            {(filterRole !== 'all' || filterStatus !== 'all') && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  bgcolor: 'primary.main',
                  borderRadius: '50%',
                  ml: 1,
                }}
              />
            )}
          </Button>
          <Button
            onClick={fetchUsers}
            variant="outlined"
            startIcon={loading ? <ModernLoadingIndicator size={20} /> : <RefreshIcon />}
            disabled={loading}
            sx={{ minWidth: '100px' }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
           <ModernLoadingIndicator message="Loading alerts..." />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                  <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Created</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', py: 2 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No users found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                      <TableRow hover key={user._id || user.id}>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" fontWeight="500">{user.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2">{user.email}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip 
                            label={user.role} 
                            color={getRoleColor(user.role)}
                            size="small"
                            sx={{ fontWeight: 500, minWidth: '80px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip 
                            label={user.isActive !== false ? 'Active' : 'Inactive'} 
                            color={user.isActive !== false ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 500, minWidth: '80px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => {
                                setCurrentUser({ ...user });
                                setEditRole(user.role);
                                setEditIsActive(user.isActive);
                                setEditDialogOpen(true);
                              }}
                              title="Edit User"
                              sx={{ mx: 0.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            
                            {/* Unlock Account Button - only show if account is locked */}
                            {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                              <IconButton 
                                size="small" 
                                color="warning"
                                onClick={() => openConfirmDialog(
                                  'unlock',
                                  user,
                                  'Unlock Account',
                                  `Are you sure you want to unlock ${user.name}'s account?`
                                )}
                                title="Unlock Account"
                                sx={{ mx: 0.5 }}
                              >
                                <LockOpenIcon fontSize="small" />
                              </IconButton>
                            )}
                            
                            {/* Reset Password Button */}
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => openConfirmDialog(
                                'reset-password',
                                user,
                                'Reset Password',
                                `Are you sure you want to reset ${user.name}'s password? They will receive a temporary password.`
                              )}
                              title="Reset Password"
                              sx={{ mx: 0.5 }}
                            >
                              <KeyIcon fontSize="small" />
                            </IconButton>
                            
                            {/* Delete User Button */}
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => openConfirmDialog(
                                'delete',
                                user,
                                'Delete User',
                                `Are you sure you want to delete ${user.name}?`
                              )}
                              disabled={user.role === 'admin' || user.role === 'superadmin'}
                              title={user.role === 'admin' || user.role === 'superadmin' ? 'Cannot delete admin users' : 'Delete User'}
                              sx={{ mx: 0.5 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredUsers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ 
              borderTop: '1px solid rgba(224, 224, 224, 1)',
              '& .MuiTablePagination-toolbar': { 
                height: 56,
                minHeight: 56,
                pl: 2
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontSize: '0.875rem'
              }
            }}
          />
        </Paper>
      )}
      
      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !saveLoading && setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {currentUser && (currentUser._id || currentUser.id) ? 'Edit User' : 'Add New User'}
          </Typography>
          <IconButton onClick={() => !saveLoading && setEditDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          
          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              User saved successfully!
            </Alert>
          )}
          
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={currentUser?.name || ''}
            onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
            required
            error={!currentUser?.name}
            helperText={!currentUser?.name ? 'Name is required' : ''}
            disabled={saveLoading}
          />
          
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={currentUser?.email || ''}
            onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
            required
            error={!currentUser?.email}
            helperText={currentUser && (currentUser._id || currentUser.id) ? 'Email cannot be changed' : !currentUser?.email ? 'Email is required' : ''}
            disabled={saveLoading || (currentUser && (currentUser._id || currentUser.id))}
          />
          
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Role</InputLabel>
            <Select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              disabled={saveLoading}
              label="Role"
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="provider">Provider</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="superadmin">Super Admin</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                color="success"
                disabled={saveLoading}
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
          
          {!currentUser?._id && !currentUser?.id && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1 }}>
              A temporary password will be generated for the new user. They will be required to change it on first login.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            disabled={saveLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveUser} 
            color="primary" 
            variant="contained"
            disabled={saveLoading || !currentUser?.name || !currentUser?.email || !editRole}
          >
            {saveLoading ? <ModernLoadingIndicator size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !deleteLoading && setConfirmDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{confirmTitle}</Typography>
          <IconButton onClick={() => !deleteLoading && setConfirmDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 1 }}>
            <Typography>{confirmMessage}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={() => setConfirmDialogOpen(false)} 
            disabled={deleteLoading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            color={confirmAction === 'delete' ? 'error' : confirmAction === 'unlock' ? 'warning' : 'primary'} 
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading && <ModernLoadingIndicator size={20} color="inherit" />}
          >
            {deleteLoading ? 'Processing...' : confirmAction === 'delete' ? 'Delete' : confirmAction === 'unlock' ? 'Unlock' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Temporary Password Dialog */}
      <Dialog
        open={showTempPassword}
        onClose={() => setShowTempPassword(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Temporary Password Generated</Typography>
          <IconButton onClick={() => setShowTempPassword(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 1 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="500">
                A temporary password has been generated for {currentUser?.name}.
              </Typography>
            </Alert>
            
            <TextField
              fullWidth
              label="Temporary Password"
              value={tempPassword}
              margin="normal"
              sx={{ mt: 2, mb: 2 }}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      setSnackbarMessage('Password copied to clipboard');
                      setSnackbarOpen(true);
                    }}
                    edge="end"
                    color="primary"
                    title="Copy to clipboard"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                ),
              }}
            />
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Please provide this temporary password to the user. They will be required to change it on their next login.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setShowTempPassword(false)} 
            variant="contained" 
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Filter Users</Typography>
          <IconButton onClick={() => setFilterDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                label="Role"
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="provider">Provider</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="superadmin">Super Admin</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={() => {
              setFilterRole('all');
              setFilterStatus('all');
            }}
            variant="outlined"
          >
            Reset Filters
          </Button>
          <Button 
            onClick={() => setFilterDialogOpen(false)}
            variant="contained"
            color="primary"
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminUsers;
