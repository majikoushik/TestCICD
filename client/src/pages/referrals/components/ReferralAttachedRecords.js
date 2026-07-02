import React, { useState } from 'react';
import { ModernLoadingIndicator } from '../../../components/common';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Chip,
  Divider,
  Alert,
  Grid,
  Avatar,
  InputAdornment
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Add as AddIcon,
  VerifiedUser as VerifiedUserIcon,
  RemoveRedEye as ViewIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Tag as TagIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';

export default function ReferralAttachedRecords({ attachedRecords, patientId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordData, setRecordData] = useState({
    recordType: '',
    recordId: '',
    accessGranted: true
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordContent, setRecordContent] = useState(null);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setRecordData({
      recordType: '',
      recordId: '',
      accessGranted: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    const newValue = name === 'accessGranted' ? checked : value;
    
    setRecordData({
      ...recordData,
      [name]: newValue
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // In a real app, this would call an API to attach a record
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful response
      console.log('Record attached:', recordData);
      
      handleCloseDialog();
      
      // In a real app, we would refresh the list of attached records
      // For this demo, we'll just close the dialog
    } catch (error) {
      console.error('Error attaching record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRecord = async (record) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
    setLoading(true);
    
    try {
      // In a real app, this would call an API to fetch the record content
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate record content
      let content;
      
      switch (record.recordType) {
        case 'Lab Results':
          content = {
            title: 'Complete Blood Count (CBC)',
            date: '2023-06-10',
            results: [
              { test: 'White Blood Cell Count', value: '7.5', unit: '10^3/µL', range: '4.5-11.0' },
              { test: 'Red Blood Cell Count', value: '4.8', unit: '10^6/µL', range: '4.5-5.9' },
              { test: 'Hemoglobin', value: '14.2', unit: 'g/dL', range: '13.5-17.5' },
              { test: 'Hematocrit', value: '42', unit: '%', range: '41-50' },
              { test: 'Platelet Count', value: '250', unit: '10^3/µL', range: '150-450' }
            ],
            notes: 'Results within normal range. No significant abnormalities detected.'
          };
          break;
        case 'ECG Report':
          content = {
            title: 'Electrocardiogram Report',
            date: '2023-06-15',
            findings: 'Sinus rhythm with occasional premature ventricular contractions. No acute ST-T wave changes. QT interval within normal limits.',
            interpretation: 'Mild abnormality detected. Recommend clinical correlation.',
            technician: 'Jane Smith, ECG Tech',
            reviewer: 'Dr. Robert Chen, Cardiologist'
          };
          break;
        default:
          content = {
            title: record.recordType,
            date: '2023-06-15',
            summary: 'Medical record data would be displayed here.'
          };
      }
      
      setRecordContent(content);
    } catch (error) {
      console.error('Error fetching record content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedRecord(null);
    setRecordContent(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Attached Records
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Attach Record
        </Button>
      </Box>
      
      {attachedRecords && attachedRecords.length > 0 ? (
        <Paper variant="outlined" sx={{ p: 0 }}>
          <List>
            {attachedRecords.map((record, index) => (
              <React.Fragment key={index}>
                <ListItem
                  secondaryAction={
                    <Box>
                      <IconButton 
                        edge="end" 
                        aria-label="view"
                        onClick={() => handleViewRecord(record)}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="download">
                        <DownloadIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={record.recordType}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                          ID: {record.recordId}
                        </Typography>
                        {record.accessGranted && (
                          <Chip
                            icon={<VerifiedUserIcon />}
                            label="Consent Granted"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < attachedRecords.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ) : (
        <Alert severity="info">
          No records have been attached to this referral yet.
        </Alert>
      )}
      
      {/* Attach Record Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            <AttachFileIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Attach Patient Record
          </Typography>
          <IconButton aria-label="close" onClick={handleCloseDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Record Type"
                  name="recordType"
                  fullWidth
                  value={recordData.recordType}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DescriptionIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Record ID"
                  name="recordId"
                  fullWidth
                  value={recordData.recordId}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TagIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Checkbox
                  checked={recordData.accessGranted}
                  onChange={handleInputChange}
                  name="accessGranted"
                />
              }
              label="Patient has granted consent to share this record"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={isSubmitting ? null : <AddIcon />}
            disabled={isSubmitting || !recordData.recordType || !recordData.recordId}
          >
            {isSubmitting ? <ModernLoadingIndicator variant="button" size={24} /> : 'Attach Record'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Record Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRecord?.recordType}
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
               <ModernLoadingIndicator message="Loading alerts..." />
            </Box>
          ) : recordContent ? (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6" gutterBottom>
                {recordContent.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Date: {recordContent.date}
              </Typography>
              
              {recordContent.results && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Test Results
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e0e0e0' }}>Test</th>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e0e0e0' }}>Result</th>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e0e0e0' }}>Unit</th>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e0e0e0' }}>Reference Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recordContent.results.map((result, index) => (
                          <tr key={index}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e0e0e0' }}>{result.test}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e0e0e0' }}>{result.value}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e0e0e0' }}>{result.unit}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e0e0e0' }}>{result.range}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Paper>
                </Box>
              )}
              
              {recordContent.findings && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Findings
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {recordContent.findings}
                  </Typography>
                </Box>
              )}
              
              {recordContent.interpretation && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Interpretation
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {recordContent.interpretation}
                  </Typography>
                </Box>
              )}
              
              {recordContent.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {recordContent.notes}
                  </Typography>
                </Box>
              )}
              
              {recordContent.summary && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1" paragraph>
                    {recordContent.summary}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="caption" color="text.secondary">
                  Record ID: {selectedRecord?.recordId}
                </Typography>
                {selectedRecord?.consentTransactionId && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                    Consent Transaction: {selectedRecord.consentTransactionId}
                  </Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Alert severity="error">
              Failed to load record content.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />}>
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
