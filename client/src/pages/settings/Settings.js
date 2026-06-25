import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  InputAdornment,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  DataUsage as DataUsageIcon,
  Language as LanguageIcon
} from '@mui/icons-material';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    security: {
      twoFactorEnabled: false,
      loginNotifications: true,
      passwordExpiryDays: 90
    },
    notifications: {
      emailNotifications: true,
      referralNotifications: true,
      tokenTransactionNotifications: true,
      analyticsNotifications: true,
      marketingEmails: false
    },
    privacy: {
      shareAnonymizedData: true,
      allowAIAnalysis: true,
      participateInResearch: true,
      dataRetentionMonths: 24
    },
    preferences: {
      language: 'en',
      theme: 'light',
      dashboardView: 'detailed'
    }
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be an API call to fetch user settings
        // For this demo, we'll simulate the data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // We're using the default settings defined above
        // In a real app, we would set the settings from the API response
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSettingChange = (section, setting, value) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [setting]: value
      }
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  const handleTogglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handlePasswordDialogOpen = () => {
    setPasswordDialogOpen(true);
    setPasswordError('');
    setPasswordSuccess(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
  };

  const validatePasswordForm = () => {
    if (!passwordData.currentPassword) {
      setPasswordError('Current password is required');
      return false;
    }
    
    if (!passwordData.newPassword) {
      setPasswordError('New password is required');
      return false;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return false;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setSaving(true);
    
    try {
      // In a real app, this would be an API call to change the password
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful response
      console.log('Password changed');
      
      setPasswordSuccess(true);
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Close dialog after a delay
      setTimeout(() => {
        setPasswordDialogOpen(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Failed to change password. Please check your current password and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      // In a real app, this would be an API call to save settings
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful response
      console.log('Settings saved:', settings);
      
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="pulse" message="Loading settings..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab 
              icon={<SecurityIcon />} 
              iconPosition="start" 
              label="Security" 
              id="settings-tab-0" 
              aria-controls="settings-tabpanel-0" 
            />
            <Tab 
              icon={<NotificationsIcon />} 
              iconPosition="start" 
              label="Notifications" 
              id="settings-tab-1" 
              aria-controls="settings-tabpanel-1" 
            />
            <Tab 
              icon={<DataUsageIcon />} 
              iconPosition="start" 
              label="Privacy & Data" 
              id="settings-tab-2" 
              aria-controls="settings-tabpanel-2" 
            />
            <Tab 
              icon={<LanguageIcon />} 
              iconPosition="start" 
              label="Preferences" 
              id="settings-tab-3" 
              aria-controls="settings-tabpanel-3" 
            />
          </Tabs>
        </Box>
        
        {/* Security Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Two-Factor Authentication" 
                secondary="Add an extra layer of security to your account" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.security.twoFactorEnabled}
                  onChange={(e) => handleSettingChange('security', 'twoFactorEnabled', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Login Notifications" 
                secondary="Receive notifications when your account is accessed from a new device" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.security.loginNotifications}
                  onChange={(e) => handleSettingChange('security', 'loginNotifications', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Password Expiry" 
                secondary="Number of days before you need to change your password" 
              />
              <ListItemSecondaryAction>
                <TextField
                  type="number"
                  value={settings.security.passwordExpiryDays}
                  onChange={(e) => handleSettingChange('security', 'passwordExpiryDays', parseInt(e.target.value))}
                  InputProps={{ inputProps: { min: 30, max: 365 } }}
                  sx={{ width: 80 }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Change Password" 
                secondary="Update your account password" 
              />
              <ListItemSecondaryAction>
                <Button 
                  variant="outlined" 
                  onClick={handlePasswordDialogOpen}
                >
                  Change
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>
        
        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Notification Settings
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Email Notifications" 
                secondary="Receive important notifications via email" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Referral Notifications" 
                secondary="Receive notifications about referral updates" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.notifications.referralNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'referralNotifications', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Token Transaction Notifications" 
                secondary="Receive notifications about token transactions" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.notifications.tokenTransactionNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'tokenTransactionNotifications', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Analytics Notifications" 
                secondary="Receive notifications when analytics reports are completed" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.notifications.analyticsNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'analyticsNotifications', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Marketing Emails" 
                secondary="Receive updates about new features and services" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.notifications.marketingEmails}
                  onChange={(e) => handleSettingChange('notifications', 'marketingEmails', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>
        
        {/* Privacy & Data Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Privacy & Data Settings
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Share Anonymized Data" 
                secondary="Allow your anonymized data to be used for network analytics" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.privacy.shareAnonymizedData}
                  onChange={(e) => handleSettingChange('privacy', 'shareAnonymizedData', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Allow AI Analysis" 
                secondary="Allow AI to analyze your data for insights and recommendations" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.privacy.allowAIAnalysis}
                  onChange={(e) => handleSettingChange('privacy', 'allowAIAnalysis', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Participate in Research" 
                secondary="Allow your anonymized data to be used for healthcare research" 
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.privacy.participateInResearch}
                  onChange={(e) => handleSettingChange('privacy', 'participateInResearch', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Data Retention Period" 
                secondary="Number of months to retain your data" 
              />
              <ListItemSecondaryAction>
                <TextField
                  select
                  value={settings.privacy.dataRetentionMonths}
                  onChange={(e) => handleSettingChange('privacy', 'dataRetentionMonths', parseInt(e.target.value))}
                  SelectProps={{
                    native: true,
                  }}
                  sx={{ width: 100 }}
                >
                  <option value={12}>12 months</option>
                  <option value={24}>24 months</option>
                  <option value={36}>36 months</option>
                  <option value={48}>48 months</option>
                  <option value={60}>60 months</option>
                </TextField>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
          
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              All data sharing is governed by our privacy policy and complies with healthcare regulations.
              Your data is stored securely on the blockchain with appropriate access controls.
            </Typography>
          </Alert>
        </TabPanel>
        
        {/* Preferences Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Preference Settings
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Language" 
                secondary="Select your preferred language" 
              />
              <ListItemSecondaryAction>
                <TextField
                  select
                  value={settings.preferences.language}
                  onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                  SelectProps={{
                    native: true,
                  }}
                  sx={{ width: 120 }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                </TextField>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Theme" 
                secondary="Select your preferred theme" 
              />
              <ListItemSecondaryAction>
                <TextField
                  select
                  value={settings.preferences.theme}
                  onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                  SelectProps={{
                    native: true,
                  }}
                  sx={{ width: 120 }}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </TextField>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Dashboard View" 
                secondary="Select your preferred dashboard layout" 
              />
              <ListItemSecondaryAction>
                <TextField
                  select
                  value={settings.preferences.dashboardView}
                  onChange={(e) => handleSettingChange('preferences', 'dashboardView', e.target.value)}
                  SelectProps={{
                    native: true,
                  }}
                  sx={{ width: 120 }}
                >
                  <option value="simple">Simple</option>
                  <option value="detailed">Detailed</option>
                  <option value="compact">Compact</option>
                </TextField>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={saving ? <ModernLoadingIndicator size="small" variant="circular" /> : <SaveIcon />}
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
      
      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={handlePasswordDialogClose}
        aria-labelledby="password-dialog-title"
      >
        <DialogTitle id="password-dialog-title">
          Change Password
        </DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          
          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password changed successfully!
            </Alert>
          )}
          
          <DialogContentText>
            Please enter your current password and a new password.
          </DialogContentText>
          
          <TextField
            margin="dense"
            label="Current Password"
            type={showPasswords.currentPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            name="currentPassword"
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleTogglePasswordVisibility('currentPassword')}
                    edge="end"
                  >
                    {showPasswords.currentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="New Password"
            type={showPasswords.newPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            name="newPassword"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleTogglePasswordVisibility('newPassword')}
                    edge="end"
                  >
                    {showPasswords.newPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Confirm New Password"
            type={showPasswords.confirmPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            name="confirmPassword"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleTogglePasswordVisibility('confirmPassword')}
                    edge="end"
                  >
                    {showPasswords.confirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePasswordDialogClose}>Cancel</Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained"
            disabled={saving}
          >
            {saving ? <ModernLoadingIndicator size="small" variant="circular" /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
