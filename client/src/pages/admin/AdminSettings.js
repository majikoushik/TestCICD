import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Paper, Divider,
  List, ListItemButton, ListItemIcon, ListItemText,
  TextField, Switch, Select, MenuItem, FormControl,
  Button, Snackbar, Alert, CircularProgress,
  InputAdornment, IconButton, Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Business as BusinessIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Api as ApiIcon,
  Build as BuildIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { get, put } from '../../utils/apiUtils';
import { setDateFormat } from '../../utils/dateFormatter';

// ── Section configuration ────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'organization', label: 'Organization', icon: BusinessIcon, color: '#1565c0',
    description: 'Platform name, contact info, timezone, and working hours',
  },
  {
    id: 'security', label: 'Security & Access', icon: SecurityIcon, color: '#c62828',
    description: 'Password policy, session limits, MFA, and HIPAA controls',
  },
  {
    id: 'notifications', label: 'Notifications', icon: NotificationsIcon, color: '#e65100',
    description: 'Email, SMS, alert channels, and digest schedule',
  },
  {
    id: 'integrations', label: 'Integrations', icon: ApiIcon, color: '#00695c',
    description: 'FHIR endpoint, EHR system, blockchain, and webhooks',
  },
  {
    id: 'maintenance', label: 'Maintenance', icon: BuildIcon, color: '#424242',
    description: 'Backup schedule, data retention, and system controls',
  },
];

// ── Default form values ──────────────────────────────────────────────────────

const INIT = {
  organization: {
    platformName: 'ClinicTrust AI',
    orgName: 'ClinicTrust Health Network',
    supportEmail: 'support@clinictrust.ai',
    contactPhone: '+1 (555) 123-4567',
    platformUrl: 'https://app.clinictrust.ai',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    workStart: '08:00',
    workEnd: '18:00',
    address: '123 Healthcare Blvd, New York, NY 10001',
  },
  security: {
    minPasswordLen: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpiryDays: 90,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    sessionTimeoutMinutes: 30,
    enforceMFA: false,
    requireHIPAAAgreement: true,
    ipAllowlistEnabled: false,
    auditAllActions: true,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    newReferral: true,
    referralAccepted: true,
    referralCompleted: true,
    paApproved: true,
    paDenied: true,
    kycStatusUpdate: true,
    tokenEarned: false,
    lowTokenBalance: true,
    lowBalanceThreshold: 100,
    systemAlerts: true,
    dailyDigest: false,
    digestTime: '08:00',
  },
  integrations: {
    fhirEndpoint: 'https://fhir.clinictrust.ai/r4',
    ehrSystem: 'Epic',
    ehrApiKey: '',
    ehrApiEndpoint: 'https://api.epic.com/FHIR/R4',
    webhookUrl: 'https://hooks.clinictrust.ai/events',
    webhookSecret: '',
    blockchainNetwork: 'Polygon Testnet',
    blockchainContract: '0x742d35Cc6634C0532925a3b844Bc454Bc9c7F68B',
    emailProvider: 'SendGrid',
    smsProvider: 'Twilio',
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage: "The platform is undergoing scheduled maintenance. We'll be back shortly.",
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetentionDays: 30,
    dataRetentionMonths: 84,
    auditLogRetentionMonths: 84,
    maxUploadMB: 10,
    debugLogging: false,
    allowPublicRegistration: true,
  },
};

// ── Shared layout helpers ────────────────────────────────────────────────────

const Row = ({ label, hint, children, full }) => (
  <Grid item xs={12} sm={full ? 12 : 6}>
    <Box>
      {label && (
        <Typography variant="body2" fontWeight={600} mb={0.5}>{label}</Typography>
      )}
      {hint && (
        <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>{hint}</Typography>
      )}
      {children}
    </Box>
  </Grid>
);

const ToggleRow = ({ label, hint, checked, onChange }) => (
  <Grid item xs={12} sm={6}>
    <Paper
      variant="outlined"
      sx={{
        px: 2, py: 1.5, borderRadius: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <Box sx={{ pr: 1 }}>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">{hint}</Typography>
        )}
      </Box>
      <Switch checked={checked} onChange={e => onChange(e.target.checked)} size="small" />
    </Paper>
  </Grid>
);

const SubHeader = ({ label }) => (
  <Grid item xs={12} sx={{ mt: 1 }}>
    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{label}</Typography>
    <Divider />
  </Grid>
);

// ── Main component ───────────────────────────────────────────────────────────

const AdminSettings = () => {
  const [active, setActive] = useState('organization');
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showEhrKey, setShowEhrKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await get('/admin/settings-map');
        if (res.success && res.data) {
          if (res.data.organization?.dateFormat) setDateFormat(res.data.organization.dateFormat);
          setForm(prev => {
            const next = { ...prev };
            Object.keys(INIT).forEach(section => {
              if (res.data[section] && typeof res.data[section] === 'object') {
                next[section] = { ...INIT[section], ...res.data[section] };
              }
            });
            return next;
          });
        }
      } catch {
        // keep INIT defaults on error
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const f = form[active];

  const set = (field, value) =>
    setForm(prev => ({ ...prev, [active]: { ...prev[active], [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await put(`/admin/settings/${active}`, {
        value: form[active],
        category: active,
        description: `Platform settings — ${active}`,
      });
      if (active === 'organization' && form.organization.dateFormat) {
        setDateFormat(form.organization.dateFormat);
      }
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to save. Please try again.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = SECTIONS.find(s => s.id === active);
  const ActiveIcon = activeMeta?.icon ?? SettingsIcon;

  // ── Section renderers ──────────────────────────────────────────────────────

  const renderOrganization = () => (
    <Grid container spacing={3}>
      <Row label="Platform Name" hint="Displayed in the browser tab and email headers">
        <TextField fullWidth size="small" value={f.platformName}
          onChange={e => set('platformName', e.target.value)} />
      </Row>
      <Row label="Organization Name" hint="Legal entity or clinic network name">
        <TextField fullWidth size="small" value={f.orgName}
          onChange={e => set('orgName', e.target.value)} />
      </Row>
      <Row label="Support Email" hint="Patients and providers reach support here">
        <TextField fullWidth size="small" type="email" value={f.supportEmail}
          onChange={e => set('supportEmail', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }} />
      </Row>
      <Row label="Contact Phone">
        <TextField fullWidth size="small" value={f.contactPhone}
          onChange={e => set('contactPhone', e.target.value)} />
      </Row>
      <Row label="Platform URL" hint="Public base URL used in email links">
        <TextField fullWidth size="small" value={f.platformUrl}
          onChange={e => set('platformUrl', e.target.value)} />
      </Row>
      <Row label="Timezone">
        <FormControl fullWidth size="small">
          <Select value={f.timezone} onChange={e => set('timezone', e.target.value)}>
            <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
            <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
            <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
            <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
            <MenuItem value="UTC">UTC</MenuItem>
          </Select>
        </FormControl>
      </Row>
      <Row label="Date Format">
        <FormControl fullWidth size="small">
          <Select value={f.dateFormat} onChange={e => set('dateFormat', e.target.value)}>
            <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
            <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
            <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</MenuItem>
          </Select>
        </FormControl>
      </Row>
      <Row label="Working Hours" hint="Used for SLA and business-hours calculations">
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" type="time" value={f.workStart}
            onChange={e => set('workStart', e.target.value)} sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">to</Typography>
          <TextField size="small" type="time" value={f.workEnd}
            onChange={e => set('workEnd', e.target.value)} sx={{ flex: 1 }} />
        </Stack>
      </Row>
      <Row label="Office Address" hint="Appears in compliance and billing documents" full>
        <TextField fullWidth size="small" multiline rows={2} value={f.address}
          onChange={e => set('address', e.target.value)} />
      </Row>
    </Grid>
  );

  const renderSecurity = () => (
    <Grid container spacing={3}>
      <SubHeader label="Password Policy" />
      <Row label="Minimum Password Length">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 6, max: 32 }}
          value={f.minPasswordLen} onChange={e => set('minPasswordLen', Number(e.target.value))} />
      </Row>
      <Row label="Password Expiry (days)" hint="0 = never expires">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 0, max: 365 }}
          value={f.passwordExpiryDays} onChange={e => set('passwordExpiryDays', Number(e.target.value))} />
      </Row>
      <ToggleRow label="Require Uppercase Letters" checked={f.requireUppercase} onChange={v => set('requireUppercase', v)} />
      <ToggleRow label="Require Numbers" checked={f.requireNumbers} onChange={v => set('requireNumbers', v)} />
      <ToggleRow label="Require Special Characters" checked={f.requireSpecialChars} onChange={v => set('requireSpecialChars', v)} />

      <SubHeader label="Session & Lockout" />
      <Row label="Max Login Attempts" hint="Account locks after this many failures">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 3, max: 20 }}
          value={f.maxLoginAttempts} onChange={e => set('maxLoginAttempts', Number(e.target.value))} />
      </Row>
      <Row label="Lockout Duration (minutes)">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 5, max: 1440 }}
          value={f.lockoutMinutes} onChange={e => set('lockoutMinutes', Number(e.target.value))} />
      </Row>
      <Row label="Session Timeout (minutes)" hint="Idle sessions are automatically signed out">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 5, max: 480 }}
          value={f.sessionTimeoutMinutes} onChange={e => set('sessionTimeoutMinutes', Number(e.target.value))} />
      </Row>

      <SubHeader label="Compliance & Access" />
      <ToggleRow
        label="Enforce Multi-Factor Authentication"
        hint="Require MFA for all admin users"
        checked={f.enforceMFA}
        onChange={v => set('enforceMFA', v)}
      />
      <ToggleRow
        label="Require HIPAA Agreement on Login"
        hint="Show BAA consent screen on first login"
        checked={f.requireHIPAAAgreement}
        onChange={v => set('requireHIPAAAgreement', v)}
      />
      <ToggleRow
        label="IP Allowlist"
        hint="Restrict admin panel access to approved IPs only"
        checked={f.ipAllowlistEnabled}
        onChange={v => set('ipAllowlistEnabled', v)}
      />
      <ToggleRow
        label="Audit All Admin Actions"
        hint="Log every admin action in the compliance audit trail"
        checked={f.auditAllActions}
        onChange={v => set('auditAllActions', v)}
      />
    </Grid>
  );

  const renderNotifications = () => (
    <Grid container spacing={3}>
      <SubHeader label="Channels" />
      <ToggleRow
        label="Email Notifications"
        hint="Send transactional emails via the configured email provider"
        checked={f.emailEnabled}
        onChange={v => set('emailEnabled', v)}
      />
      <ToggleRow
        label="SMS Notifications"
        hint="Send SMS alerts via the configured SMS provider"
        checked={f.smsEnabled}
        onChange={v => set('smsEnabled', v)}
      />

      <SubHeader label="Referral & PA Events" />
      <ToggleRow label="New Referral Received" checked={f.newReferral} onChange={v => set('newReferral', v)} />
      <ToggleRow label="Referral Accepted" checked={f.referralAccepted} onChange={v => set('referralAccepted', v)} />
      <ToggleRow label="Referral Completed" checked={f.referralCompleted} onChange={v => set('referralCompleted', v)} />
      <ToggleRow label="PA Approved" checked={f.paApproved} onChange={v => set('paApproved', v)} />
      <ToggleRow label="PA Denied" checked={f.paDenied} onChange={v => set('paDenied', v)} />

      <SubHeader label="User & System Events" />
      <ToggleRow label="KYC Status Update" checked={f.kycStatusUpdate} onChange={v => set('kycStatusUpdate', v)} />
      <ToggleRow
        label="Token Earned"
        hint="Notify user when tokens are credited to their account"
        checked={f.tokenEarned}
        onChange={v => set('tokenEarned', v)}
      />
      <ToggleRow
        label="Low Token Balance Alert"
        hint="Warn provider when their balance falls below the threshold"
        checked={f.lowTokenBalance}
        onChange={v => set('lowTokenBalance', v)}
      />
      <Row label="Low Balance Threshold (tokens)">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 0, max: 10000 }}
          value={f.lowBalanceThreshold} onChange={e => set('lowBalanceThreshold', Number(e.target.value))} />
      </Row>
      <ToggleRow
        label="System Alerts"
        hint="Critical errors and infrastructure warnings"
        checked={f.systemAlerts}
        onChange={v => set('systemAlerts', v)}
      />

      <SubHeader label="Daily Digest" />
      <ToggleRow
        label="Enable Daily Digest Email"
        hint="Summary of the previous day's activity sent to admins"
        checked={f.dailyDigest}
        onChange={v => set('dailyDigest', v)}
      />
      <Row label="Digest Send Time">
        <TextField size="small" type="time" value={f.digestTime}
          onChange={e => set('digestTime', e.target.value)} />
      </Row>
    </Grid>
  );

  const renderIntegrations = () => (
    <Grid container spacing={3}>
      <SubHeader label="FHIR & EHR" />
      <Row label="FHIR R4 Base URL" hint="Base URL of your organization's FHIR R4 server" full>
        <TextField fullWidth size="small" value={f.fhirEndpoint}
          onChange={e => set('fhirEndpoint', e.target.value)} />
      </Row>
      <Row label="EHR System">
        <FormControl fullWidth size="small">
          <Select value={f.ehrSystem} onChange={e => set('ehrSystem', e.target.value)}>
            <MenuItem value="Epic">Epic</MenuItem>
            <MenuItem value="Cerner">Cerner (Oracle Health)</MenuItem>
            <MenuItem value="Allscripts">Allscripts</MenuItem>
            <MenuItem value="athenahealth">athenahealth</MenuItem>
            <MenuItem value="eClinicalWorks">eClinicalWorks</MenuItem>
            <MenuItem value="Custom">Custom / Other</MenuItem>
          </Select>
        </FormControl>
      </Row>
      <Row label="EHR API Endpoint">
        <TextField fullWidth size="small" value={f.ehrApiEndpoint}
          onChange={e => set('ehrApiEndpoint', e.target.value)} />
      </Row>
      <Row label="EHR API Key" hint="Stored encrypted at rest">
        <TextField fullWidth size="small" type={showEhrKey ? 'text' : 'password'}
          value={f.ehrApiKey} onChange={e => set('ehrApiKey', e.target.value)}
          placeholder="sk-…"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowEhrKey(v => !v)} edge="end">
                  {showEhrKey
                    ? <VisibilityOffIcon fontSize="small" />
                    : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }} />
      </Row>

      <SubHeader label="Webhooks" />
      <Row label="Webhook URL" hint="Platform events are POST'd here as JSON" full>
        <TextField fullWidth size="small" value={f.webhookUrl}
          onChange={e => set('webhookUrl', e.target.value)} />
      </Row>
      <Row label="Webhook Signing Secret" hint="HMAC-SHA256 secret used to verify payload integrity" full>
        <TextField fullWidth size="small" type={showWebhookSecret ? 'text' : 'password'}
          value={f.webhookSecret} onChange={e => set('webhookSecret', e.target.value)}
          placeholder="whsec_…"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowWebhookSecret(v => !v)} edge="end">
                  {showWebhookSecret
                    ? <VisibilityOffIcon fontSize="small" />
                    : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }} />
      </Row>

      <SubHeader label="Blockchain" />
      <Row label="Network">
        <FormControl fullWidth size="small">
          <Select value={f.blockchainNetwork} onChange={e => set('blockchainNetwork', e.target.value)}>
            <MenuItem value="Polygon Mainnet">Polygon Mainnet</MenuItem>
            <MenuItem value="Polygon Testnet">Polygon Testnet (Amoy)</MenuItem>
            <MenuItem value="Ethereum Mainnet">Ethereum Mainnet</MenuItem>
            <MenuItem value="Sepolia Testnet">Sepolia Testnet</MenuItem>
          </Select>
        </FormControl>
      </Row>
      <Row label="Token Contract Address" hint="Deployed ERC-20 token contract">
        <TextField fullWidth size="small" value={f.blockchainContract}
          onChange={e => set('blockchainContract', e.target.value)}
          InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }} />
      </Row>

      <SubHeader label="Messaging Providers" />
      <Row label="Email Provider">
        <FormControl fullWidth size="small">
          <Select value={f.emailProvider} onChange={e => set('emailProvider', e.target.value)}>
            <MenuItem value="SendGrid">SendGrid</MenuItem>
            <MenuItem value="Mailgun">Mailgun</MenuItem>
            <MenuItem value="AWS SES">AWS SES</MenuItem>
            <MenuItem value="Postmark">Postmark</MenuItem>
          </Select>
        </FormControl>
      </Row>
      <Row label="SMS Provider">
        <FormControl fullWidth size="small">
          <Select value={f.smsProvider} onChange={e => set('smsProvider', e.target.value)}>
            <MenuItem value="Twilio">Twilio</MenuItem>
            <MenuItem value="AWS SNS">AWS SNS</MenuItem>
            <MenuItem value="Vonage">Vonage</MenuItem>
          </Select>
        </FormControl>
      </Row>
    </Grid>
  );

  const renderMaintenance = () => (
    <Grid container spacing={3}>
      {f.maintenanceMode && (
        <Grid item xs={12}>
          <Alert severity="warning">
            Maintenance mode is currently <strong>ON</strong>. All non-admin users see the maintenance page.
          </Alert>
        </Grid>
      )}
      <ToggleRow
        label="Maintenance Mode"
        hint="Blocks all non-admin access and shows the maintenance message"
        checked={f.maintenanceMode}
        onChange={v => set('maintenanceMode', v)}
      />
      <Row label="Maintenance Message" hint="Message shown to users while maintenance mode is active" full>
        <TextField fullWidth size="small" multiline rows={2}
          value={f.maintenanceMessage} onChange={e => set('maintenanceMessage', e.target.value)} />
      </Row>

      <SubHeader label="Backup & Recovery" />
      <ToggleRow
        label="Automatic Backups"
        hint="Scheduled database backups to cloud storage"
        checked={f.autoBackup}
        onChange={v => set('autoBackup', v)}
      />
      <Row label="Backup Frequency">
        <FormControl fullWidth size="small">
          <Select value={f.backupFrequency} onChange={e => set('backupFrequency', e.target.value)}>
            <MenuItem value="hourly">Hourly</MenuItem>
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
          </Select>
        </FormControl>
      </Row>
      <Row label="Backup Retention (days)">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 1, max: 365 }}
          value={f.backupRetentionDays} onChange={e => set('backupRetentionDays', Number(e.target.value))} />
      </Row>

      <SubHeader label="Data Retention (HIPAA Compliance)" />
      <Row label="Medical Records Retention (months)" hint="HIPAA requires a minimum of 84 months (7 years)">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 84, max: 360 }}
          value={f.dataRetentionMonths} onChange={e => set('dataRetentionMonths', Number(e.target.value))} />
      </Row>
      <Row label="Audit Log Retention (months)" hint="Security and access audit log retention period">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 12, max: 360 }}
          value={f.auditLogRetentionMonths} onChange={e => set('auditLogRetentionMonths', Number(e.target.value))} />
      </Row>
      <Row label="Max File Upload Size (MB)" hint="Applies to document and image uploads across the platform">
        <TextField fullWidth size="small" type="number" inputProps={{ min: 1, max: 100 }}
          value={f.maxUploadMB} onChange={e => set('maxUploadMB', Number(e.target.value))} />
      </Row>

      <SubHeader label="Developer Options" />
      <ToggleRow
        label="Debug Logging"
        hint="Write verbose server logs — disable in production"
        checked={f.debugLogging}
        onChange={v => set('debugLogging', v)}
      />
      <ToggleRow
        label="Allow Public Registration"
        hint="Enable self-service signup for new provider accounts"
        checked={f.allowPublicRegistration}
        onChange={v => set('allowPublicRegistration', v)}
      />
    </Grid>
  );

  const RENDERERS = {
    organization: renderOrganization,
    security: renderSecurity,
    notifications: renderNotifications,
    integrations: renderIntegrations,
    maintenance: renderMaintenance,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
      {/* Page header */}
      <Paper
        elevation={0}
        sx={{
          mb: 3, p: 3,
          background: 'linear-gradient(135deg, #1565c0 0%, #0288d1 60%, #00acc1 100%)',
          borderRadius: 3,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon sx={{ fontSize: 42, opacity: 0.9 }} />
          <Box>
            <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
              Platform Settings
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              Configure organization details, security policy, notifications, integrations, and maintenance controls.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Two-column layout */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>

        {/* Left sidebar */}
        <Paper
          elevation={1}
          sx={{
            width: 220,
            flexShrink: 0,
            borderRadius: 3,
            overflow: 'hidden',
            position: 'sticky',
            top: 80,
          }}
        >
          <List dense disablePadding>
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <React.Fragment key={s.id}>
                  {i > 0 && <Divider />}
                  <ListItemButton
                    onClick={() => setActive(s.id)}
                    selected={isActive}
                    sx={{
                      py: 1.5,
                      pl: 2,
                      borderLeft: isActive ? `3px solid ${s.color}` : '3px solid transparent',
                      '&.Mui-selected': {
                        bgcolor: alpha(s.color, 0.08),
                        '&:hover': { bgcolor: alpha(s.color, 0.12) },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Icon sx={{ fontSize: 20, color: isActive ? s.color : 'action.active' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={s.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? s.color : 'text.primary',
                        fontSize: '0.83rem',
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                </React.Fragment>
              );
            })}
          </List>
        </Paper>

        {/* Main content */}
        <Paper elevation={1} sx={{ flex: 1, borderRadius: 3, overflow: 'hidden' }}>
          {/* Section header bar */}
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: alpha(activeMeta?.color || '#1976d2', 0.04),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: alpha(activeMeta?.color || '#1976d2', 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ActiveIcon sx={{ fontSize: 24, color: activeMeta?.color || '#1976d2' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {activeMeta?.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activeMeta?.description}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: activeMeta?.color,
                '&:hover': { bgcolor: activeMeta?.color, filter: 'brightness(0.88)' },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                flexShrink: 0,
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </Box>

          {/* Form area */}
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              (RENDERERS[active] ?? (() => null))()
            )}
          </Box>
        </Paper>
      </Box>

      {/* Feedback snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          elevation={6}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminSettings;
