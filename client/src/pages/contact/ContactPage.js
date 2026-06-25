import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  TextField,
  Typography,
  Paper,
  MenuItem,
  Snackbar,
  Alert,
  useTheme
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

/**
 * Contact Page Component
 * 
 * A professional contact form for users to reach out with questions or feedback
 */
export default function ContactPage() {
  const theme = useTheme();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  
  // Form validation state
  const [errors, setErrors] = useState({});
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: null
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // In a real application, you would send this data to your backend API
      // For now, we'll simulate a successful submission with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        organization: '',
        subject: '',
        message: '',
        inquiryType: 'general'
      });
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSubmitSuccess(false);
    setSubmitError(false);
  };
  
  return (
    <Box
      sx={{
        py: { xs: 6, md: 10 },
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50]
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={10} lg={8}>
            <Box sx={{ mb: 5, textAlign: 'center' }}>
              <Typography 
                variant="h2" 
                component="h1" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 2,
                  fontSize: { xs: '2rem', md: '2.75rem' }
                }}
              >
                Contact Us
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'text.secondary',
                  maxWidth: 700,
                  mx: 'auto'
                }}
              >
                Have questions about ClinicTrust AI? Our team is here to help.
              </Typography>
            </Box>
            
            <Paper 
              elevation={3} 
              sx={{ 
                p: { xs: 3, md: 5 },
                borderRadius: 2
              }}
            >
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      error={!!errors.name}
                      helperText={errors.name}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      error={!!errors.email}
                      helperText={errors.email}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number (Optional)"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Organization (Optional)"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Inquiry Type"
                      name="inquiryType"
                      value={formData.inquiryType}
                      onChange={handleChange}
                      variant="outlined"
                    >
                      <MenuItem value="general">General Inquiry</MenuItem>
                      <MenuItem value="sales">Sales Information</MenuItem>
                      <MenuItem value="support">Technical Support</MenuItem>
                      <MenuItem value="partnership">Partnership Opportunity</MenuItem>
                      <MenuItem value="demo">Request a Demo</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      error={!!errors.subject}
                      helperText={errors.subject}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      error={!!errors.message}
                      helperText={errors.message}
                      required
                      multiline
                      rows={6}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      disabled={isSubmitting}
                      endIcon={<SendIcon />}
                      sx={{ 
                        py: 1.5, 
                        px: 4,
                        fontWeight: 600
                      }}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
            
            <Box sx={{ mt: 5, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Other Ways to Reach Us
              </Typography>
              <Grid container spacing={3} justifyContent="center">
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Email
                    </Typography>
                    <Typography variant="body1" color="primary">
                      support@clinictrust.ai
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      +1 (800) 555-1234
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Office
                    </Typography>
                    <Typography variant="body1">
                      123 Innovation Way<br />
                      San Francisco, CA 94103
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>
      
      {/* Success/Error notifications */}
      <Snackbar 
        open={submitSuccess} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          Your message has been sent successfully! We'll get back to you soon.
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={submitError} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
          There was an error sending your message. Please try again later.
        </Alert>
      </Snackbar>
    </Box>
  );
}
