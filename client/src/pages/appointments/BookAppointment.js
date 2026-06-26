import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material'
import { ArrowBack as BackIcon } from '@mui/icons-material'
import { ArrowForward as NextIcon } from '@mui/icons-material'
import { CheckCircle as ConfirmIcon } from '@mui/icons-material'
import { EventAvailable as BookIcon } from '@mui/icons-material'
import TimeSlotPicker from '../../components/appointments/TimeSlotPicker'
import AIProviderSuggestions from '../../components/referral/AIProviderSuggestions'
import { bookAppointment, getAvailableSlots } from '../../services/appointmentService'
import * as referralService from '../../services/referralService'

const steps = ['Patient Details', 'Choose Provider', 'Select Time', 'Confirm & Schedule']

const appointmentTypeOptions = [
  { value: 'new_patient', label: 'New Patient Consultation' },
  { value: 'follow_up', label: 'Follow-Up Visit' },
  { value: 'telehealth', label: 'Telehealth Visit' },
  { value: 'urgent', label: 'Urgent Care' },
  { value: 'procedure', label: 'Procedure/Treatment' },
]

const intakeChecklistItems = [
  { key: 'currentMedications', label: 'Current medications' },
  { key: 'knownAllergies', label: 'Known allergies' },
  { key: 'recentHospitalizations', label: 'Recent hospitalizations' },
  { key: 'chronicConditions', label: 'Chronic conditions' },
]

const priorAuthTypes = ['procedure', 'urgent']

export default function BookAppointment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [activeStep, setActiveStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [providers, setProviders] = useState([])
  const [slotsData, setSlotsData] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [appointmentId, setAppointmentId] = useState(null)

  const linkedReferralId = searchParams.get('referralId') || null

  const [formState, setFormState] = useState({
    specialty: '',
    appointmentType: 'follow_up',
    chiefComplaint: '',
    reasonForVisit: '',
    selectedProvider: null,
    selectedDate: null,
    selectedSlot: null,
    location: 'in_person',
    intakeSymptoms: {},
    notes: '',
    patientName: '',
    patientEmail: '',
    patientPhone: '',
  })

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await referralService.getProviders()
        const payload = res?.data || res || {}
        const inner = payload.data || payload
        setProviders(Array.isArray(inner) ? inner : inner.providers || [])
      } catch (err) {
        console.error('Failed to fetch providers', err)
      }
    }
    fetchProviders()
  }, [])

  useEffect(() => {
    const providerId = searchParams.get('providerId')
    if (providerId && providers.length > 0) {
      const found = providers.find((p) => p._id === providerId)
      if (found) {
        setFormState((prev) => ({ ...prev, selectedProvider: found }))
      }
    }
  }, [searchParams, providers])

  const fetchSlots = useCallback(async (providerId) => {
    setSlotsLoading(true)
    setSlotsData([])
    try {
      const today = new Date()
      const endDate = new Date()
      endDate.setDate(today.getDate() + 30)
      const res = await getAvailableSlots({
        providerId,
        startDate: today,
        endDate,
      })
      const payload = res?.data || res || {}
      const inner = payload.data || payload
      setSlotsData(inner.slots || [])
    } catch (err) {
      console.error('Failed to fetch slots', err)
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (formState.selectedProvider?._id) {
      fetchSlots(formState.selectedProvider._id)
    }
  }, [formState.selectedProvider, fetchSlots])

  const validateStep = (step) => {
    switch (step) {
      case 0:
        return !!(formState.chiefComplaint && formState.patientName)
      case 1:
        return formState.selectedProvider !== null
      case 2:
        return !!(formState.selectedDate && formState.selectedSlot)
      case 3:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const { selectedProvider, selectedDate, selectedSlot } = formState
      const res = await bookAppointment({
        providerId: selectedProvider._id,
        providerName: selectedProvider.name,
        providerSpecialty: selectedProvider.specialty,
        organizationName: selectedProvider.organization,
        appointmentType: formState.appointmentType,
        scheduledDate: new Date(selectedDate),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationMinutes: 30,
        location: formState.location,
        chiefComplaint: formState.chiefComplaint,
        reasonForVisit: formState.reasonForVisit,
        patientName: formState.patientName,
        patientEmail: formState.patientEmail,
        patientPhone: formState.patientPhone,
        intakeResponses: formState.intakeSymptoms,
        notes: formState.notes,
        ...(linkedReferralId ? { linkedReferralId } : {}),
      })
      const payload = res?.data || res || {}
      const appt = payload.data || payload
      setAppointmentId(appt._id || appt.id || null)
      setSuccess(true)
      setTimeout(() => {
        navigate('/app/appointments')
      }, 2000)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to book appointment.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleIntakeToggle = (key) => {
    setFormState((prev) => ({
      ...prev,
      intakeSymptoms: {
        ...prev.intakeSymptoms,
        [key]: !prev.intakeSymptoms[key],
      },
    }))
  }

  const getAppointmentTypeLabel = (value) => {
    const found = appointmentTypeOptions.find((o) => o.value === value)
    return found ? found.label : value
  }

  const formatDate = (date) => {
    if (!date) return ''
    try {
      return new Date(date).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return String(date)
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      const [h, m] = timeStr.split(':')
      const d = new Date()
      d.setHours(parseInt(h, 10), parseInt(m, 10))
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    } catch {
      return timeStr
    }
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 6 }}>
        <Alert
          severity="success"
          icon={<ConfirmIcon fontSize="inherit" />}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Appointment scheduled successfully!
          </Typography>
          {appointmentId && (
            <Typography variant="body2">Appointment ID: {appointmentId}</Typography>
          )}
          <Typography variant="body2">Redirecting to Patient Appointments...</Typography>
        </Alert>
        <Button
          variant="contained"
          startIcon={<BookIcon />}
          onClick={() => navigate('/app/appointments')}
        >
          Go to Patient Appointments
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Schedule Patient Appointment
      </Typography>

      {linkedReferralId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Scheduling from referral — appointment will be automatically linked and referral status updated.
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Patient Visit Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Appointment Type</InputLabel>
                  <Select
                    value={formState.appointmentType}
                    label="Appointment Type"
                    onChange={(e) => {
                      const val = e.target.value
                      setFormState((prev) => ({
                        ...prev,
                        appointmentType: val,
                        location: val === 'telehealth' ? 'telehealth' : prev.location,
                      }))
                    }}
                  >
                    {appointmentTypeOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Specialty Needed (for AI matching)"
                  value={formState.specialty}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, specialty: e.target.value }))
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Chief Complaint"
                  multiline
                  rows={2}
                  value={formState.chiefComplaint}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, chiefComplaint: e.target.value }))
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Visit"
                  multiline
                  rows={2}
                  value={formState.reasonForVisit}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, reasonForVisit: e.target.value }))
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Location</InputLabel>
                  <Select
                    value={formState.location}
                    label="Preferred Location"
                    onChange={(e) => {
                      const val = e.target.value
                      setFormState((prev) => ({
                        ...prev,
                        location: val,
                        appointmentType:
                          val === 'telehealth' ? 'telehealth' : prev.appointmentType,
                      }))
                    }}
                  >
                    <MenuItem value="in_person">In-Person</MenuItem>
                    <MenuItem value="telehealth">Telehealth</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Patient Contact Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    label="Patient Full Name"
                    value={formState.patientName}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, patientName: e.target.value }))
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formState.patientEmail}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, patientEmail: e.target.value }))
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={formState.patientPhone}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, patientPhone: e.target.value }))
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select a Provider
            </Typography>

            <AIProviderSuggestions
              specialty={formState.specialty}
              urgency={formState.appointmentType === 'urgent' ? 'urgent' : 'routine'}
              selectedProviderId={formState.selectedProvider?._id}
              onSelectProvider={(match) =>
                setFormState((prev) => ({
                  ...prev,
                  selectedProvider: {
                    _id: match._id,
                    name: match.providerName,
                    specialty: match.specialty,
                    organization: match.organizationName || '',
                  },
                }))
              }
            />

            <Divider sx={{ my: 3 }}>
              <Chip label="or search all providers" />
            </Divider>

            <Autocomplete
              options={providers}
              getOptionLabel={(opt) => `${opt.name} (${opt.specialty})`}
              value={formState.selectedProvider}
              onChange={(_, option) =>
                setFormState((prev) => ({ ...prev, selectedProvider: option }))
              }
              renderInput={(params) => (
                <TextField {...params} label="Search Providers" fullWidth />
              )}
            />

            {formState.selectedProvider && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {formState.selectedProvider.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formState.selectedProvider.specialty}
                  </Typography>
                  {formState.selectedProvider.organization && (
                    <Typography variant="body2" color="text.secondary">
                      {formState.selectedProvider.organization}
                    </Typography>
                  )}
                  {formState.selectedProvider.location && (
                    <Typography variant="body2" color="text.secondary">
                      {formState.selectedProvider.location}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose a Date & Time
            </Typography>

            {!formState.selectedProvider ? (
              <Alert severity="warning">Please select a provider first</Alert>
            ) : (
              <TimeSlotPicker
                providerId={formState.selectedProvider?._id}
                selectedDate={formState.selectedDate}
                onDateChange={(d) =>
                  setFormState((prev) => ({ ...prev, selectedDate: d, selectedSlot: null }))
                }
                selectedSlot={formState.selectedSlot}
                onSlotSelect={(slot) =>
                  setFormState((prev) => ({ ...prev, selectedSlot: slot }))
                }
                availableDates={slotsData}
                loading={slotsLoading}
              />
            )}
          </Box>
        )}

        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Confirm Appointment
            </Typography>

            {formState.selectedProvider && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Provider
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formState.selectedProvider.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Specialty
                      </Typography>
                      <Typography variant="body1">
                        {formState.selectedProvider.specialty}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Date
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(formState.selectedDate)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Time
                      </Typography>
                      <Typography variant="body1">
                        {formState.selectedSlot
                          ? `${formatTime(formState.selectedSlot.startTime)} – ${formatTime(formState.selectedSlot.endTime)}`
                          : ''}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Appointment Type
                      </Typography>
                      <Typography variant="body1">
                        {getAppointmentTypeLabel(formState.appointmentType)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Location
                      </Typography>
                      <Chip
                        label={formState.location === 'telehealth' ? 'Telehealth' : 'In-Person'}
                        color={formState.location === 'telehealth' ? 'primary' : 'default'}
                        size="small"
                      />
                    </Grid>
                    {formState.chiefComplaint && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Chief Complaint
                        </Typography>
                        <Typography variant="body1">{formState.chiefComplaint}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            )}

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Patient Intake (Quick Summary)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {intakeChecklistItems.map((item) => (
                  <Chip
                    key={item.key}
                    label={item.label}
                    onClick={() => handleIntakeToggle(item.key)}
                    color={formState.intakeSymptoms[item.key] ? 'primary' : 'default'}
                    variant={formState.intakeSymptoms[item.key] ? 'filled' : 'outlined'}
                    clickable
                  />
                ))}
              </Box>
              <TextField
                fullWidth
                label="Additional Notes"
                multiline
                rows={3}
                value={formState.notes}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </Paper>

            {priorAuthTypes.includes(formState.appointmentType) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This appointment type may require prior authorization. Please verify with the
                patient's insurance before confirming the appointment.
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <BookIcon />}
              onClick={handleSubmit}
              disabled={submitting}
              fullWidth
            >
              {submitting ? 'Scheduling...' : 'Confirm & Schedule Appointment'}
            </Button>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={handleBack}
          disabled={activeStep === 0}
          variant="outlined"
        >
          Back
        </Button>

        {activeStep < steps.length - 1 && (
          <Button
            endIcon={<NextIcon />}
            onClick={handleNext}
            disabled={!validateStep(activeStep)}
            variant="contained"
          >
            Next
          </Button>
        )}
      </Box>
    </Container>
  )
}
