import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  Tooltip,
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Token as TokenIcon,
} from '@mui/icons-material';
import adminProviderService from '../../services/adminProviderService';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`provider-tabpanel-${index}`}
      aria-labelledby={`provider-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital', 'lab', 'provider', 'nurse'];
const ACCOUNT_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];
const ONBOARDING_STATUSES = ['pending_email', 'profile_incomplete', 'doc_pending', 'under_review', 'verified', 'rejected'];

const AdminProviders = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [tabValue, setTabValue] = useState(0);

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);

  // Edit dialog — one state var per editable field
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editAccountStatus, setEditAccountStatus] = useState('pending');
  const [editKycVerified, setEditKycVerified] = useState(false);
  const [editOnboardingStatus, setEditOnboardingStatus] = useState('pending_email');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [editTokenBalance, setEditTokenBalance] = useState(0);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminProviderService.getAllProviders();
      if (response.success) {
        setProviders(response.data);
        setFilteredProviders(response.data);
      } else {
        setError(response.error || 'Failed to load providers');
      }
    } catch (err) {
      setError('Failed to load providers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProviders(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProviders(providers);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredProviders(providers.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.organization?.toLowerCase().includes(q) ||
        p.specialty?.toLowerCase().includes(q)
      ));
    }
  }, [searchQuery, providers]);

  const handleTabChange = (_, v) => setTabValue(v);
  const handleChangePage = (_, p) => setPage(p);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const handleViewDetails = (provider) => {
    setCurrentProvider(provider);
    setDetailDialogOpen(true);
  };

  const handleEditClick = (provider) => {
    setCurrentProvider(provider);
    setEditFirstName(provider.firstName || '');
    setEditLastName(provider.lastName || '');
    setEditEmail(provider.email || '');
    setEditRole(provider.role || '');
    setEditOrganization(provider.organization || '');
    setEditSpecialty(provider.specialty || '');
    setEditIsActive(provider.isActive !== false);
    setEditAccountStatus(provider.accountStatus || 'pending');
    setEditKycVerified(provider.kycVerified || false);
    setEditOnboardingStatus(provider.onboardingStatus || 'pending_email');
    setEditProfileImage(provider.profileImage || '');
    setEditTokenBalance(provider.tokenBalance || 0);
    setSaveError(null);
    setSaveSuccess(false);
    setEditDialogOpen(true);
  };

  const handleSaveProvider = async () => {
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const id = currentProvider._id || currentProvider.id;
      const response = await adminProviderService.updateProvider(id, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        role: editRole,
        organization: editOrganization,
        specialty: editSpecialty,
        isActive: editIsActive,
        accountStatus: editAccountStatus,
        kycVerified: editKycVerified,
        onboardingStatus: editOnboardingStatus,
        profileImage: editProfileImage,
        tokenBalance: Number(editTokenBalance),
      });
      if (response.success) {
        await fetchProviders();
        setSaveSuccess(true);
        setTimeout(() => { setEditDialogOpen(false); setSaveSuccess(false); }, 1500);
      } else {
        setSaveError(response.error || 'Failed to update provider');
      }
    } catch (err) {
      setSaveError('Failed to update provider');
    } finally {
      setSaveLoading(false);
    }
  };

  const openConfirmDialog = (action, provider, title, message) => {
    setCurrentProvider(provider);
    setConfirmAction(action);
    setConfirmTitle(title);
    setConfirmMessage(message);
    if (action === 'reject') setRejectionReason('');
    if (action === 'suspend') setSuspensionReason('');
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    setConfirmDialogOpen(false);
    setLoading(true);
    try {
      let response;
      const id = currentProvider._id || currentProvider.id;
      switch (confirmAction) {
        case 'approve':   response = await adminProviderService.approveProvider(id); break;
        case 'reject':    response = await adminProviderService.rejectProvider(id, rejectionReason); setRejectionReason(''); break;
        case 'suspend':   response = await adminProviderService.suspendProvider(id, suspensionReason); setSuspensionReason(''); break;
        case 'reactivate': response = await adminProviderService.reactivateProvider(id); break;
        case 'delete':    response = await adminProviderService.deleteProvider(id); break;
        default: setLoading(false); return;
      }
      if (!response.success) setError(response.error || `Failed to ${confirmAction} provider`);
      await fetchProviders();
    } catch (err) {
      setError(`Failed to ${confirmAction} provider. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': case 'verified': case 'active': return 'success';
      case 'pending': case 'doc_pending': case 'under_review': return 'warning';
      case 'pending_email': case 'profile_incomplete': return 'info';
      case 'rejected': case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getOnboardingLabel = (status) => ({
    pending_email:      'Email Unverified',
    profile_incomplete: 'Profile Incomplete',
    doc_pending:        'Doc Pending',
    under_review:       'Under Review',
    verified:           'Verified',
    rejected:           'Rejected',
  }[status] || status || '—');

  const fmt = (date) => date ? new Date(date).toLocaleDateString() : '—';
  const fmtFull = (date) => date ? new Date(date).toLocaleString() : '—';

  const getFilteredProvidersByStatus = (status) =>
    status === 'all' ? filteredProviders : filteredProviders.filter(p => p.accountStatus === status);

  const renderProviderTable = (status) => {
    const displayProviders = getFilteredProvidersByStatus(status);
    return (
      <TableContainer component={Paper}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Specialty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>KYC Verified</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayProviders
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((provider) => (
                <TableRow key={provider._id || provider.id}>
                  <TableCell>{provider.name}</TableCell>
                  <TableCell>{provider.email}</TableCell>
                  <TableCell>{provider.organization}</TableCell>
                  <TableCell>{provider.specialty || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip label={provider.accountStatus || 'pending'} color={getStatusColor(provider.accountStatus)} size="small" />
                      <Chip label={getOnboardingLabel(provider.onboardingStatus)} color={getStatusColor(provider.onboardingStatus)} size="small" variant="outlined" />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {provider.kycVerified
                      ? <Chip icon={<CheckCircleIcon />} label="Verified" color="success" size="small" />
                      : <Chip icon={<CancelIcon />} label="Not Verified" color="default" size="small" />}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" color="primary" onClick={() => handleViewDetails(provider)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => handleEditClick(provider)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {provider.accountStatus === 'pending' && (
                      <>
                        <Tooltip title="Approve">
                          <IconButton size="small" color="success" onClick={() => openConfirmDialog('approve', provider, 'Approve Provider', `Approve ${provider.name}?`)}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton size="small" color="error" onClick={() => openConfirmDialog('reject', provider, 'Reject Provider', `Reject ${provider.name}?`)}>
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {provider.isActive !== false ? (
                      <Tooltip title="Suspend">
                        <IconButton size="small" color="error" onClick={() => openConfirmDialog('suspend', provider, 'Suspend Provider', `Suspend ${provider.name}?`)}>
                          <LockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reactivate">
                        <IconButton size="small" color="success" onClick={() => openConfirmDialog('reactivate', provider, 'Reactivate Provider', `Reactivate ${provider.name}?`)}>
                          <LockOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => openConfirmDialog('delete', provider, 'Delete Provider', `Delete ${provider.name}? This cannot be undone.`)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            {displayProviders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">No providers found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // ── Detail row helper ──────────────────────────────────────────────────────
  const DetailRow = ({ label, value }) => (
    <Box sx={{ display: 'flex', py: 0.75 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160, color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ flex: 1 }}>{value ?? '—'}</Typography>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>Provider Management</Typography>
        <TextField
          size="small"
          label="Search Providers"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{ endAdornment: <SearchIcon color="action" /> }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <ModernLoadingIndicator message="Loading providers..." />
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="All Providers" />
              <Tab label="Pending Approval" />
              <Tab label="Approved" />
              <Tab label="Rejected" />
              <Tab label="Suspended" />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>{renderProviderTable('all')}</TabPanel>
          <TabPanel value={tabValue} index={1}>{renderProviderTable('pending')}</TabPanel>
          <TabPanel value={tabValue} index={2}>{renderProviderTable('approved')}</TabPanel>
          <TabPanel value={tabValue} index={3}>{renderProviderTable('rejected')}</TabPanel>
          <TabPanel value={tabValue} index={4}>{renderProviderTable('suspended')}</TabPanel>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredProviders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      {/* ── Provider Details Dialog ─────────────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 0 }}>Provider Details</DialogTitle>
        <DialogContent>
          {currentProvider && (
            <Box sx={{ mt: 2 }}>
              {/* Profile header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar
                  src={currentProvider.profileImage || undefined}
                  sx={{ width: 72, height: 72, bgcolor: 'primary.main' }}
                >
                  {!currentProvider.profileImage && <PersonIcon sx={{ fontSize: 40 }} />}
                </Avatar>
                <Box>
                  <Typography variant="h6">{currentProvider.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{currentProvider.email}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip label={currentProvider.role} size="small" color="primary" variant="outlined" />
                    <Chip label={currentProvider.accountStatus || 'pending'} size="small" color={getStatusColor(currentProvider.accountStatus)} />
                    {currentProvider.isActive !== false
                      ? <Chip label="Active" size="small" color="success" />
                      : <Chip label="Inactive" size="small" color="default" />}
                  </Box>
                </Box>
              </Box>

              <Grid container spacing={2}>
                {/* Basic Information */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Basic Information</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <DetailRow label="First Name" value={currentProvider.firstName} />
                      <DetailRow label="Last Name" value={currentProvider.lastName} />
                      <DetailRow label="Email" value={currentProvider.email} />
                      <DetailRow label="Organization" value={currentProvider.organization} />
                      <DetailRow label="Specialty" value={currentProvider.specialty} />
                      <DetailRow label="Role" value={currentProvider.role} />
                      <DetailRow label="Wallet Address" value={currentProvider.walletAddress} />
                      <DetailRow label="Blockchain ID" value={currentProvider.blockchainId} />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Account Status */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Account Status</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Box sx={{ display: 'flex', py: 0.75, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160, color: 'text.secondary' }}>Account Status</Typography>
                        <Chip label={currentProvider.accountStatus || 'pending'} size="small" color={getStatusColor(currentProvider.accountStatus)} />
                      </Box>
                      <Box sx={{ display: 'flex', py: 0.75, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160, color: 'text.secondary' }}>Is Active</Typography>
                        <Chip label={currentProvider.isActive !== false ? 'Yes' : 'No'} size="small" color={currentProvider.isActive !== false ? 'success' : 'default'} />
                      </Box>
                      <Box sx={{ display: 'flex', py: 0.75, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160, color: 'text.secondary' }}>KYC Verified</Typography>
                        <Chip label={currentProvider.kycVerified ? 'Verified' : 'Not Verified'} size="small" color={currentProvider.kycVerified ? 'success' : 'default'} />
                      </Box>
                      <Box sx={{ display: 'flex', py: 0.75, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160, color: 'text.secondary' }}>Onboarding Status</Typography>
                        <Chip label={getOnboardingLabel(currentProvider.onboardingStatus)} size="small" color={getStatusColor(currentProvider.onboardingStatus)} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Token & Financials */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Token & Financial</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Box sx={{ display: 'flex', py: 0.75, alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160, color: 'text.secondary' }}>Token Balance</Typography>
                        <TokenIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight={700} color="primary">
                          {currentProvider.tokenBalance ?? 0} tokens
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Timestamps */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Activity</Typography>
                      <Divider sx={{ mb: 1 }} />
                      <DetailRow label="Created" value={fmtFull(currentProvider.createdAt)} />
                      <DetailRow label="Last Login" value={fmtFull(currentProvider.lastLogin)} />
                      <DetailRow label="Login Attempts" value={currentProvider.loginAttempts ?? 0} />
                    </CardContent>
                  </Card>
                </Grid>

                {/* KYC Documents */}
                {currentProvider.kycDocuments && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>KYC Documents</Typography>
                        <Divider sx={{ mb: 1 }} />
                        <DetailRow label="License Number" value={currentProvider.kycDocuments.licenseNumber} />
                        <DetailRow label="License Expiry" value={fmt(currentProvider.kycDocuments.licenseExpiry)} />
                        <DetailRow label="Verified At" value={fmt(currentProvider.kycDocuments.verifiedAt)} />
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Rejection / Suspension notes */}
                {(currentProvider.rejectionReason || currentProvider.suspensionReason || currentProvider.kycRejectionReason) && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ borderColor: 'error.light' }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} color="error" gutterBottom>Notes</Typography>
                        <Divider sx={{ mb: 1 }} />
                        {currentProvider.rejectionReason && <DetailRow label="Rejection Reason" value={currentProvider.rejectionReason} />}
                        {currentProvider.suspensionReason && <DetailRow label="Suspension Reason" value={currentProvider.suspensionReason} />}
                        {currentProvider.kycRejectionReason && <DetailRow label="KYC Rejection" value={currentProvider.kycRejectionReason} />}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Actions */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>Actions</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {currentProvider.accountStatus === 'pending' && (
                          <>
                            <Button variant="contained" color="success" onClick={() => { setDetailDialogOpen(false); openConfirmDialog('approve', currentProvider, 'Approve Provider', `Approve ${currentProvider.name}?`); }}>Approve</Button>
                            <Button variant="contained" color="error" onClick={() => { setDetailDialogOpen(false); openConfirmDialog('reject', currentProvider, 'Reject Provider', `Reject ${currentProvider.name}?`); }}>Reject</Button>
                          </>
                        )}
                        {currentProvider.isActive !== false ? (
                          <Button variant="outlined" color="error" onClick={() => { setDetailDialogOpen(false); openConfirmDialog('suspend', currentProvider, 'Suspend Provider', `Suspend ${currentProvider.name}?`); }}>Suspend</Button>
                        ) : (
                          <Button variant="outlined" color="success" onClick={() => { setDetailDialogOpen(false); openConfirmDialog('reactivate', currentProvider, 'Reactivate Provider', `Reactivate ${currentProvider.name}?`); }}>Reactivate</Button>
                        )}
                        <Button variant="outlined" color="primary" onClick={() => { setDetailDialogOpen(false); handleEditClick(currentProvider); }}>Edit</Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Provider Dialog ────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onClose={() => !saveLoading && setEditDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit Provider: {currentProvider?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {saveError   && <Alert severity="error"   sx={{ mb: 2 }}>{saveError}</Alert>}
            {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>Provider updated successfully!</Alert>}

            <Grid container spacing={2}>
              {/* ── Left column ── */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Identity</Typography>
                <TextField fullWidth label="First Name" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Last Name" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Organization" value={editOrganization} onChange={(e) => setEditOrganization(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Specialty" value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} sx={{ mb: 2 }} />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Role</InputLabel>
                  <Select value={editRole} label="Role" onChange={(e) => setEditRole(e.target.value)}>
                    {PROVIDER_ROLES.map(r => <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField fullWidth label="Profile Image URL" value={editProfileImage} onChange={(e) => setEditProfileImage(e.target.value)} sx={{ mb: 2 }} placeholder="https://..." />
              </Grid>

              {/* ── Right column ── */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Account & Status</Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Account Status</InputLabel>
                  <Select value={editAccountStatus} label="Account Status" onChange={(e) => setEditAccountStatus(e.target.value)}>
                    {ACCOUNT_STATUSES.map(s => <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Onboarding Status</InputLabel>
                  <Select value={editOnboardingStatus} label="Onboarding Status" onChange={(e) => setEditOnboardingStatus(e.target.value)}>
                    {ONBOARDING_STATUSES.map(s => <MenuItem key={s} value={s}>{getOnboardingLabel(s)}</MenuItem>)}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Token Balance"
                  type="number"
                  value={editTokenBalance}
                  onChange={(e) => setEditTokenBalance(e.target.value)}
                  inputProps={{ min: 0 }}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  <FormControlLabel
                    control={<Switch checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} color="primary" />}
                    label={<Typography variant="body2">Is Active: <strong>{editIsActive ? 'Yes' : 'No'}</strong></Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={editKycVerified} onChange={(e) => setEditKycVerified(e.target.checked)} color="success" />}
                    label={<Typography variant="body2">KYC Verified: <strong>{editKycVerified ? 'Yes' : 'No'}</strong></Typography>}
                  />
                </Box>

                {editProfileImage && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">Preview:</Typography>
                    <Avatar src={editProfileImage} sx={{ width: 48, height: 48 }} />
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saveLoading}>Cancel</Button>
          <Button onClick={handleSaveProvider} variant="contained" color="primary" disabled={saveLoading}>
            {saveLoading ? <ModernLoadingIndicator size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirmation Dialog ─────────────────────────────────────────────── */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{confirmTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>{confirmMessage}</Typography>
          {confirmAction === 'reject' && (
            <TextField fullWidth label="Rejection Reason" variant="outlined" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} multiline rows={3} sx={{ mt: 2 }} />
          )}
          {confirmAction === 'suspend' && (
            <TextField fullWidth label="Suspension Reason" variant="outlined" value={suspensionReason} onChange={(e) => setSuspensionReason(e.target.value)} multiline rows={3} sx={{ mt: 2 }} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={['delete', 'reject', 'suspend'].includes(confirmAction) ? 'error' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminProviders;
