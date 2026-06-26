import React, { useState, useEffect, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Grid, Button, Chip, Alert,
  LinearProgress, Stepper, Step, StepLabel, StepContent, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar
} from '@mui/material';
import {
  CheckCircle as CheckIcon, RadioButtonUnchecked as EmptyIcon,
  Email as EmailIcon, VerifiedUser as KycIcon, Person as ProfileIcon,
  PersonAdd as InviteIcon, MedicalServices as PatientIcon,
  Send as ReferralIcon, HourglassTop as PendingIcon, Lock as LockIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import onboardingService from '../../services/onboardingService';
import { useAuth } from '../../contexts';

const STEPS = [
  { key: 'profile_created',   label: 'Profile Created',         icon: <ProfileIcon />,  detail: 'Your account has been created.',   time: null,   locked: false },
  { key: 'email_verified',    label: 'Verify Your Email',       icon: <EmailIcon />,    detail: 'Click the link we sent to your email.', time: '2 min', locked: false, action: 'email' },
  { key: 'profile_reviewed',  label: 'Review Your Profile',     icon: <ProfileIcon />,  detail: 'Confirm your practice information.', time: '2 min', locked: true,  action: 'profile' },
  { key: 'docs_uploaded',     label: 'Upload Verification',     icon: <KycIcon />,      detail: 'Provide your medical license number.', time: '3 min', locked: true,  action: 'docs' },
  { key: 'first_patient',     label: 'Add Your First Patient',  icon: <PatientIcon />,  detail: 'Add a patient record to get started.', time: '2 min', locked: true,  action: 'patient' },
  { key: 'first_referral',    label: 'Send a Referral',         icon: <ReferralIcon />, detail: 'Send your first referral through the platform.', time: '3 min', locked: true, action: 'referral' },
  { key: 'colleague_invited', label: 'Invite a Colleague',      icon: <InviteIcon />,   detail: 'Grow the network by inviting a colleague.', time: '1 min', locked: true, action: 'invite' },
];

const STATUS_META = {
  pending_email: { label: 'Pending Email Verification', color: 'warning', icon: <EmailIcon /> },
  pending_docs:  { label: 'Documents Required', color: 'warning', icon: <KycIcon /> },
  under_review:  { label: 'Under Review (1-2 business days)', color: 'info', icon: <PendingIcon /> },
  verified:      { label: 'Verified - Full Access Granted', color: 'success', icon: <CheckIcon /> },
  rejected:      { label: 'Verification Rejected', color: 'error', icon: <KycIcon /> },
};

export default function OnboardingWall() {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { logout } = useAuth();
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [resendCooldown, setResendCooldown] = useState(0);

  // Doc upload dialog
  const [docDialog, setDocDialog] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await onboardingService.getStatus();
      if (res.success) setStatusData(res.data);
    } catch (e) {
      console.error('Failed to load onboarding status', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await onboardingService.resendVerification();
      showSnack('Verification email resent!');
      let t = 60;
      setResendCooldown(t);
      const iv = setInterval(() => { t--; setResendCooldown(t); if (t <= 0) clearInterval(iv); }, 1000);
    } catch (e) {
      showSnack('Failed to resend email', 'error');
    }
  };

  const handleDocSubmit = async () => {
    if (!licenseNumber.trim()) { showSnack('License number is required', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('licenseNumber', licenseNumber);
      fd.append('licenseState', licenseState);
      if (docFile) fd.append('document', docFile);
      await onboardingService.uploadDocuments(fd);
      showSnack('Documents submitted! Under review now.');
      setDocDialog(false);
      loadStatus();
    } catch (e) {
      showSnack(e.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteSending(true);
    try {
      await onboardingService.sendInvite(inviteEmail);
      showSnack(`Invite sent to ${inviteEmail}!`);
      setInviteDialog(false);
      setInviteEmail('');
      loadStatus();
    } catch (e) {
      showSnack('Failed to send invite', 'error');
    } finally {
      setInviteSending(false);
    }
  };

  const handleAction = (action) => {
    switch (action) {
      case 'email':   handleResend(); break;
      case 'profile': startTransition(() => navigate('/app/profile')); break;
      case 'docs':    setDocDialog(true); break;
      case 'patient': startTransition(() => navigate('/app/patients/add')); break;
      case 'referral': startTransition(() => navigate('/app/referrals/create')); break;
      case 'invite':  setInviteDialog(true); break;
    }
  };

  const handleLogout = async () => {
    await logout();
    startTransition(() => navigate('/login'));
  };

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  if (loading) return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );

  const steps = statusData?.steps || {};
  const kycStatus = statusData?.kycStatus || 'pending_email';
  const statusMeta = STATUS_META[kycStatus] || STATUS_META.pending_email;
  const completedCount = Object.values(steps).filter(Boolean).length;
  const totalSteps = STEPS.length;
  const progress = Math.round((completedCount / totalSteps) * 100);

  // Determine which steps are unlocked
  const emailDone = steps.email_verified;
  const docsDone = steps.docs_uploaded;

  const isUnlocked = (key) => {
    if (key === 'profile_created') return true;
    if (key === 'email_verified') return true;
    if (!emailDone) return false; // everything else needs email verified
    if (key === 'profile_reviewed') return true;
    if (key === 'docs_uploaded') return true;
    if (key === 'colleague_invited') return true;
    // patient and referral need docs uploaded
    if (!docsDone && (key === 'first_patient' || key === 'first_referral')) return false;
    return true;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={800} mb={0.5}>Complete Your Setup</Typography>
            <Typography color="text.secondary">Finish these steps to get full access to ClinicTrust AI</Typography>
          </Box>
          <Button startIcon={<LogoutIcon />} onClick={handleLogout} color="inherit" variant="outlined" size="small">
            Sign Out
          </Button>
        </Box>

        {/* KYC Status Banner */}
        <Alert
          severity={statusMeta.color}
          icon={statusMeta.icon}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <strong>Account Status:</strong> {statusMeta.label}
          {kycStatus === 'rejected' && statusData?.kycRejectionReason && (
            <Box mt={0.5}>Reason: {statusData.kycRejectionReason}</Box>
          )}
          {kycStatus === 'under_review' && (
            <Box mt={0.5} fontSize="0.85em">Our team will review your documents within 1-2 business days. You'll receive an email when approved.</Box>
          )}
        </Alert>

        {/* Progress */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography fontWeight={600}>Setup Progress</Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main">{progress}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
            {completedCount} of {totalSteps} steps completed
          </Typography>
        </Paper>

        {/* Steps */}
        <Grid container spacing={2}>
          {STEPS.map((s, i) => {
            const done = !!steps[s.key];
            const unlocked = isUnlocked(s.key);
            return (
              <Grid item xs={12} key={s.key}>
                <Paper
                  elevation={done ? 0 : 2}
                  sx={{
                    p: 2.5, borderRadius: 2,
                    border: done ? '1px solid' : '1px solid transparent',
                    borderColor: done ? 'success.light' : 'transparent',
                    bgcolor: done ? 'success.50' : !unlocked ? 'grey.50' : 'background.paper',
                    opacity: !unlocked ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box sx={{ color: done ? 'success.main' : !unlocked ? 'text.disabled' : 'primary.main' }}>
                        {done ? <CheckIcon fontSize="large" /> : !unlocked ? <LockIcon /> : <EmptyIcon fontSize="large" />}
                      </Box>
                      <Box>
                        <Typography fontWeight={600} color={done ? 'success.dark' : !unlocked ? 'text.disabled' : 'text.primary'}>
                          {s.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{s.detail}</Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} flexShrink={0} ml={2}>
                      {s.time && !done && (
                        <Chip label={s.time} size="small" variant="outlined" />
                      )}
                      {done && <Chip label="Done" size="small" color="success" />}
                      {!done && unlocked && s.action && (
                        <Button size="small" variant="contained" onClick={() => handleAction(s.action)}>
                          {s.action === 'email' ? (resendCooldown > 0 ? `${resendCooldown}s` : 'Resend') : 'Start'}
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* All done + under review message */}
        {kycStatus === 'under_review' && (
          <Paper elevation={0} sx={{ p: 3, mt: 3, textAlign: 'center', bgcolor: 'info.50', borderRadius: 2, border: '1px solid', borderColor: 'info.light' }}>
            <PendingIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
            <Typography variant="h6" fontWeight={700} mb={1}>You're all set!</Typography>
            <Typography color="text.secondary">
              Our team is reviewing your verification documents. You'll receive an email within 1-2 business days once approved.
            </Typography>
          </Paper>
        )}
      </Container>

      {/* Document Upload Dialog */}
      <Dialog open={docDialog} onClose={() => setDocDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Upload Verification Document</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Provide your state medical license number. Optionally upload a photo of your license or government ID.
          </Typography>
          <TextField fullWidth required label="Medical License Number" value={licenseNumber}
            onChange={e => setLicenseNumber(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="License State (e.g. NY)" value={licenseState}
            onChange={e => setLicenseState(e.target.value.toUpperCase().slice(0, 2))} sx={{ mb: 2 }} />
          <Button variant="outlined" component="label" fullWidth>
            {docFile ? docFile.name : 'Upload License / ID (optional, PDF/JPG/PNG)'}
            <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setDocFile(e.target.files[0])} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleDocSubmit} disabled={uploading}>
            {uploading ? <CircularProgress size={20} color="inherit" /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Invite a Colleague</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Enter their email address and we'll send them an invitation to join ClinicTrust AI.
          </Typography>
          <TextField fullWidth label="Colleague's Email" type="email" value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInvite} disabled={inviteSending || !inviteEmail}>
            {inviteSending ? <CircularProgress size={20} color="inherit" /> : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
