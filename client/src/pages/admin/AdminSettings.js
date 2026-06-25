import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Alert, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import { useNavigate, useParams } from 'react-router-dom';
import { adminMockData } from '../../services/mockData';
import SettingCard from '../../components/admin/SettingCard';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

// Function to get authentication token from localStorage
const getToken = () => {
  return localStorage.getItem('authToken') || '';
};

const AdminSettings = () => {
  const { category } = useParams();
  const [activeTab, setActiveTab] = useState(category || 'general');
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentSetting, setCurrentSetting] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'security', label: 'Security' },
    { value: 'ai', label: 'AI Configuration' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'notifications', label: 'Notifications' },
    { value: 'billing', label: 'Billing' }
  ];

  useEffect(() => {
    if (category && !categories.find(c => c.value === category)) {
      navigate('/admin/settings/general', { replace: true });
    } else if (category) {
      setActiveTab(category);
    }
  }, [category, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use mock data directly
        if (activeTab) {
          // Filter settings by category
          const categorySettings = adminMockData.settings[activeTab] || [];
          setSettings(categorySettings);
        } else {
          // Combine all settings from different categories
          const allSettings = Object.values(adminMockData.settings).flat();
          setSettings(allSettings);
        }
        
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching ${activeTab} settings:`, err);
        setError(`Failed to load ${activeTab} settings. Please try again later.`);
        setLoading(false);
      }
    };

    fetchSettings();
  }, [activeTab]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    navigate(`/admin/settings/${newValue}`);
  };

  const handleEditClick = (setting) => {
    setCurrentSetting(setting);
    setEditValue(typeof setting.value === 'boolean' ? setting.value : JSON.stringify(setting.value, null, 2));
    setEditDescription(setting.description);
    setEditIsActive(setting.isActive);
    setEditDialogOpen(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSaveSetting = async () => {
    try {
      setSaveLoading(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      // Parse the value based on the original type
      let parsedValue = editValue;
      if (typeof currentSetting.value === 'boolean') {
        parsedValue = editValue === 'true' || editValue === true;
      } else if (typeof currentSetting.value === 'number') {
        parsedValue = Number(editValue);
      } else if (typeof currentSetting.value === 'object') {
        try {
          parsedValue = JSON.parse(editValue);
        } catch (e) {
          setSaveError('Invalid JSON format');
          setSaveLoading(false);
          return;
        }
      }
      
      const token = getToken();
      await axios.put(`/api/admin/settings/${currentSetting.key}`, {
        value: parsedValue,
        description: editDescription,
        isActive: editIsActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the settings in the state
      setSettings(settings.map(s => 
        s.key === currentSetting.key 
          ? { ...s, value: parsedValue, description: editDescription, isActive: editIsActive } 
          : s
      ));
      
      setSaveSuccess(true);
      setSaveLoading(false);
      
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        setEditDialogOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Error saving setting:', err);
      setSaveError(err.response?.data?.error || 'Failed to save setting');
      setSaveLoading(false);
    }
  };

  const handleInitializeSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      await axios.post('/api/admin/initialize', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Reload settings
      const response = await axios.get(`/api/admin/settings/${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSettings(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error initializing settings:', err);
      setError(`Failed to initialize settings. ${err.response?.data?.error || 'Please try again later.'}`);
      setLoading(false);
    }
  };

  const renderSettingValue = (setting) => {
    const { value } = setting;
    
    if (typeof value === 'boolean') {
      return value ? 'Enabled' : 'Disabled';
    } else if (typeof value === 'object') {
      return JSON.stringify(value);
    } else {
      return String(value);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Platform Settings
        </Typography>
        
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={handleInitializeSettings}
        >
          Initialize Default Settings
        </Button>
      </Box>
      
      <Typography variant="subtitle1" color="textSecondary" paragraph>
        Configure all aspects of the ClinicTrust AI platform
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map((category) => (
            <Tab 
              key={category.value} 
              value={category.value} 
              label={category.label} 
            />
          ))}
        </Tabs>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <ModernLoadingIndicator variant="pulse" message="Loading settings..." />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : settings.length === 0 ? (
        <Box textAlign="center" py={5}>
          <Typography variant="h6" color="textSecondary">
            No settings found for this category
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={handleInitializeSettings}
          >
            Initialize Default Settings
          </Button>
        </Box>
      ) : (
        <Box>
          {settings.map((setting) => (
            <SettingCard
              key={setting.key}
              setting={setting}
              value={renderSettingValue(setting)}
              onEdit={() => handleEditClick(setting)}
            />
          ))}
        </Box>
      )}
      
      {/* Edit Setting Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => !saveLoading && setEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Edit Setting: {currentSetting?.key}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {saveError}
              </Alert>
            )}
            
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Setting updated successfully!
              </Alert>
            )}
            
            <Typography variant="subtitle2" gutterBottom>
              Setting Key
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {currentSetting?.key}
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              Category
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {currentSetting?.category}
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Value
            </Typography>
            {typeof currentSetting?.value === 'boolean' ? (
              <FormControlLabel
                control={
                  <Switch
                    checked={editValue === true || editValue === 'true'}
                    onChange={(e) => setEditValue(e.target.checked)}
                    color="primary"
                  />
                }
                label={editValue === true || editValue === 'true' ? 'Enabled' : 'Disabled'}
              />
            ) : (
              <TextField
                fullWidth
                multiline={typeof currentSetting?.value === 'object'}
                rows={typeof currentSetting?.value === 'object' ? 4 : 1}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
              />
            )}
            
            <TextField
              label="Description"
              fullWidth
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              variant="outlined"
              sx={{ mb: 2, mt: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  color="primary"
                />
              }
              label={editIsActive ? 'Active' : 'Inactive'}
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setEditDialogOpen(false)} 
            disabled={saveLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSetting} 
            variant="contained" 
            color="primary"
            disabled={saveLoading}
          >
            {saveLoading ? <ModernLoadingIndicator size="small" variant="circular" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminSettings;
