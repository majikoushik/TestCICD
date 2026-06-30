import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Avatar
} from '@mui/material';
import {
  Person as PersonIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';

export default function ReferralPatientInfo({ patient }) {
  const navigate = useNavigate();

  if (!patient) return null;

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Patient Information
        </Typography>
        <Button
          variant="outlined"
          size="small"
          endIcon={<LaunchIcon />}
          onClick={() => navigate(`/patients/${patient.id}`)}
        >
          View Full Profile
        </Button>
      </Box>
      
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', mr: 2 }}>
            <PersonIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h6">
              {patient.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {patient.patientId}{patient.dateOfBirth ? ` | ${calculateAge(patient.dateOfBirth)} years` : ''}{patient.gender ? ` | ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}` : ''}
            </Typography>
          </Box>
        </Box>
        
        <Grid container spacing={2}>
          {patient.dateOfBirth && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
              <Typography variant="body1">{formatDate(patient.dateOfBirth)}</Typography>
            </Grid>
          )}
          {patient.gender && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Gender</Typography>
              <Typography variant="body1">{patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</Typography>
            </Grid>
          )}
          
          {patient.contactInfo && (
            <>
              {patient.contactInfo.email && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {patient.contactInfo.email}
                  </Typography>
                </Grid>
              )}
              
              {patient.contactInfo.phone && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">
                    {patient.contactInfo.phone}
                  </Typography>
                </Grid>
              )}
              
              {patient.contactInfo.address && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {patient.contactInfo.address}
                  </Typography>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </Paper>
      
      {patient.medicalHistory && patient.medicalHistory.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Relevant Medical History
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {patient.medicalHistory.map((condition, index) => (
              <Box key={index} sx={{ mb: index < patient.medicalHistory.length - 1 ? 2 : 0 }}>
                <Typography variant="subtitle1">
                  {condition.condition}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Diagnosed: {formatDate(condition.diagnosedDate)}
                </Typography>
                {condition.notes && (
                  <Typography variant="body2">
                    {condition.notes}
                  </Typography>
                )}
              </Box>
            ))}
          </Paper>
        </Box>
      )}
      
      {patient.medications && patient.medications.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Current Medications
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {patient.medications.map((medication, index) => (
              <Box key={index} sx={{ mb: index < patient.medications.length - 1 ? 2 : 0 }}>
                <Typography variant="subtitle1">
                  {medication.name} {medication.dosage}
                </Typography>
                <Typography variant="body2">
                  {medication.frequency}
                </Typography>
                {medication.startDate && (
                  <Typography variant="body2" color="text.secondary">
                    Started: {formatDate(medication.startDate)}
                  </Typography>
                )}
              </Box>
            ))}
          </Paper>
        </Box>
      )}
      
      {patient.allergies && patient.allergies.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Allergies
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {patient.allergies.map((allergy, index) => (
              <Box key={index} sx={{ mb: index < patient.allergies.length - 1 ? 2 : 0 }}>
                <Typography variant="subtitle1">
                  {allergy.allergen}
                </Typography>
                <Typography variant="body2">
                  {allergy.reaction} ({allergy.severity})
                </Typography>
              </Box>
            ))}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
