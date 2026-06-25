import React, { useState, useEffect } from 'react';
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
  Grid,
  Typography,
  Box,
  Chip,
  FormHelperText,
  Divider,
  LinearProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const AIModelTrainingFeedback = ({ open, onClose, modelId, modelName, onSubmitFeedback }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [feedbackData, setFeedbackData] = useState({
    feedbackType: '',
    accuracyRating: 3,
    specificIssues: [],
    suggestedImprovements: '',
    additionalComments: '',
    sampleCases: []
  });
  
  const [currentSampleCase, setCurrentSampleCase] = useState({
    caseId: '',
    expectedOutput: '',
    actualOutput: '',
    notes: ''
  });
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFeedbackData({
        feedbackType: '',
        accuracyRating: 3,
        specificIssues: [],
        suggestedImprovements: '',
        additionalComments: '',
        sampleCases: []
      });
      setCurrentSampleCase({
        caseId: '',
        expectedOutput: '',
        actualOutput: '',
        notes: ''
      });
      setSuccess(false);
      setError('');
    }
  }, [open]);
  
  const handleInputChange = (field, value) => {
    setFeedbackData({
      ...feedbackData,
      [field]: value
    });
  };
  
  const handleSampleCaseChange = (field, value) => {
    setCurrentSampleCase({
      ...currentSampleCase,
      [field]: value
    });
  };
  
  const addSampleCase = () => {
    if (!currentSampleCase.caseId || !currentSampleCase.expectedOutput || !currentSampleCase.actualOutput) {
      setError('Please fill in all required fields for the sample case');
      return;
    }
    
    setFeedbackData({
      ...feedbackData,
      sampleCases: [...feedbackData.sampleCases, { ...currentSampleCase, id: Date.now() }]
    });
    
    setCurrentSampleCase({
      caseId: '',
      expectedOutput: '',
      actualOutput: '',
      notes: ''
    });
    
    setError('');
  };
  
  const removeSampleCase = (id) => {
    setFeedbackData({
      ...feedbackData,
      sampleCases: feedbackData.sampleCases.filter(c => c.id !== id)
    });
  };
  
  const handleAddIssue = (event) => {
    if (event.key === 'Enter' && event.target.value) {
      const newIssue = event.target.value.trim();
      if (newIssue && !feedbackData.specificIssues.includes(newIssue)) {
        setFeedbackData({
          ...feedbackData,
          specificIssues: [...feedbackData.specificIssues, newIssue]
        });
        event.target.value = '';
      }
      event.preventDefault();
    }
  };
  
  const handleRemoveIssue = (issue) => {
    setFeedbackData({
      ...feedbackData,
      specificIssues: feedbackData.specificIssues.filter(i => i !== issue)
    });
  };
  
  const handleSubmit = async () => {
    // Validate form
    if (!feedbackData.feedbackType) {
      setError('Please select a feedback type');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // In a real implementation, this would call an API
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSubmitFeedback) {
        onSubmitFeedback({
          modelId,
          ...feedbackData,
          submittedAt: new Date().toISOString()
        });
      }
      
      setSuccess(true);
      setLoading(false);
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <PsychologyIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            AI Model Training Feedback
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <LinearProgress sx={{ my: 2 }} />
        )}
        
        {success ? (
          <Alert severity="success" sx={{ my: 2 }}>
            Feedback submitted successfully! This will help improve the AI model.
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ my: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Model: {modelName || modelId || 'Unknown Model'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your feedback helps us improve our AI models. Please provide detailed information about any issues or suggestions.
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={error && !feedbackData.feedbackType}>
                  <InputLabel id="feedback-type-label">Feedback Type</InputLabel>
                  <Select
                    labelId="feedback-type-label"
                    id="feedback-type"
                    value={feedbackData.feedbackType}
                    label="Feedback Type"
                    onChange={(e) => handleInputChange('feedbackType', e.target.value)}
                  >
                    <MenuItem value="accuracy_issue">Accuracy Issue</MenuItem>
                    <MenuItem value="false_positive">False Positive</MenuItem>
                    <MenuItem value="false_negative">False Negative</MenuItem>
                    <MenuItem value="performance_issue">Performance Issue</MenuItem>
                    <MenuItem value="feature_request">Feature Request</MenuItem>
                    <MenuItem value="general_feedback">General Feedback</MenuItem>
                  </Select>
                  {error && !feedbackData.feedbackType && (
                    <FormHelperText>Please select a feedback type</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="accuracy-rating-label">Accuracy Rating (1-5)</InputLabel>
                  <Select
                    labelId="accuracy-rating-label"
                    id="accuracy-rating"
                    value={feedbackData.accuracyRating}
                    label="Accuracy Rating (1-5)"
                    onChange={(e) => handleInputChange('accuracyRating', e.target.value)}
                  >
                    <MenuItem value={1}>1 - Very Poor</MenuItem>
                    <MenuItem value={2}>2 - Poor</MenuItem>
                    <MenuItem value={3}>3 - Acceptable</MenuItem>
                    <MenuItem value={4}>4 - Good</MenuItem>
                    <MenuItem value={5}>5 - Excellent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Specific Issues
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Type an issue and press Enter to add"
                  helperText="Press Enter to add each issue"
                  onKeyPress={handleAddIssue}
                />
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {feedbackData.specificIssues.map((issue, index) => (
                    <Chip
                      key={index}
                      label={issue}
                      onDelete={() => handleRemoveIssue(issue)}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Suggested Improvements"
                  multiline
                  rows={3}
                  value={feedbackData.suggestedImprovements}
                  onChange={(e) => handleInputChange('suggestedImprovements', e.target.value)}
                  placeholder="Please suggest how the model could be improved"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Sample Cases
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Add specific examples where the model performed incorrectly or could be improved.
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Case ID/Reference"
                        value={currentSampleCase.caseId}
                        onChange={(e) => handleSampleCaseChange('caseId', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Expected Output"
                        value={currentSampleCase.expectedOutput}
                        onChange={(e) => handleSampleCaseChange('expectedOutput', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Actual Output"
                        value={currentSampleCase.actualOutput}
                        onChange={(e) => handleSampleCaseChange('actualOutput', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Notes"
                        value={currentSampleCase.notes}
                        onChange={(e) => handleSampleCaseChange('notes', e.target.value)}
                        placeholder="Additional context or notes about this case"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        onClick={addSampleCase}
                        startIcon={<SaveIcon />}
                      >
                        Add Sample Case
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
                
                {feedbackData.sampleCases.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Added Sample Cases ({feedbackData.sampleCases.length})
                    </Typography>
                    {feedbackData.sampleCases.map((sampleCase) => (
                      <Paper key={sampleCase.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2">
                            {sampleCase.caseId}
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => removeSampleCase(sampleCase.id)}
                          >
                            Remove
                          </Button>
                        </Box>
                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Expected: {sampleCase.expectedOutput}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Actual: {sampleCase.actualOutput}
                            </Typography>
                          </Grid>
                          {sampleCase.notes && (
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary">
                                Notes: {sampleCase.notes}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <TextField
                  fullWidth
                  label="Additional Comments"
                  multiline
                  rows={4}
                  value={feedbackData.additionalComments}
                  onChange={(e) => handleInputChange('additionalComments', e.target.value)}
                  placeholder="Any other feedback or comments about this AI model"
                />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose}
          startIcon={<CancelIcon />}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
          disabled={loading || success}
          startIcon={<SaveIcon />}
        >
          Submit Feedback
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIModelTrainingFeedback;
