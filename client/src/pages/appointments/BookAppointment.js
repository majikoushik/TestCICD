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
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  CheckCircle as ConfirmIcon,
  EventAvailable as BookIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Person as PersonIcon,
  MedicalServices as ProviderIcon,
} from '@mui/icons-material'
import TimeSlotPicker from '../../components/appointments/TimeSlotPicker'
import PatientSearchAutocomplete from '../../components/common/PatientSearchAutocomplete'
import { bookAppointment, getAvailableSlots } from '../../services/appointmentService'
import { getPatientById } from '../../services/patientService'
import { useAuth } from '../../contexts'

const steps = ['Patient Details', 'Select Time', 'Confirm & Schedule']

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
  const { currentUser } = useAuth()

  const [activeStep, setActiveStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [slotsData, setSlotsData] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [appointmentId, setAppointmentId] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)

  const linkedReferralId = searchParams.get('referralId') || null
  const preselectedPatientId = searchParams.get('patientId') || null

  const [formState, setFormState] = useState({
    appointmentType: 'follow_up',
    chiefComplaint: '',
    reasonForVisit: '',
    selectedDate: null,
    selectedSlot: null,
    location: 'in_person',
    intakeSymptoms: {},
    notes: '',
    patientName: '',
    patientEmail: '',
    patientPhone: '',
  })

  // Fetch slots for the logged-in provider as soon as we have their id
  const fetchSlots = useCallback(async (providerId) => {
    if (!providerId) return
    setSlotsLoading(true)
    setSlotsData([])
    try {
      const today = new Date()
      const endDate = new Date()
      endDate.setDate(today.getDate() + 30)
      const res = await getAvailableSlots({ providerId, startDate: today, endDate })
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
    if (currentUser?.id) {
      fetchSlots(currentUser.id)
    }
  }, [currentUser, fetchSlots])

  // Pre-populate patient when coming from Patients page (?patientId=)
  useEffect(() => {
    if (!preselectedPatientId) return
    getPatientById(preselectedPatientId)
      .then((res) => {
        const p = res?.data?.data || res?.data || res
        if (p) {
          setSelectedPatient(p)
          setFormState((prev) => ({
            ...prev,
            patientName: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            patientEmail: p.contactInfo?.email || p.email || '',
            patientPhone: p.contactInfo?.phone || p.phone || p.contactNumber || '',
          }))
        }
      })
      .catch(() => {})
  }, [preselectedPatientId])

  const handlePatientChange = useCallback((_, newValue) => {
    setSelectedPatient(newValue)
    setFormState((prev) => ({
      ...prev,
      patientName: newValue
        ? newValue.name || `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim()
        : '',
      patientEmail: newValue?.contactInfo?.email || newValue?.email || '',
      patientPhone: newValue?.contactInfo?.phone || newValue?.phone || newValue?.contactNumber || '',
    }))
  }, [])

  // step 0: patient selected + chief complaint filled
  // step 1: date and slot selected
  // step 2: confirm (always valid)
  const validateStep = (step) => {
    switch (step) {
      case 0: return !!(formState.chiefComplaint && formState.patientName)
      case 1: return !!(formState.selectedDate && formState.selectedSlot)
      case 2: return true
      default: return false
    }
  }

  const handleNext = () => {
    if (validateStep(activeStep)) setActiveStep((prev) => prev + 1)
  }

  const handleBack = () => setActiveStep((prev) => prev - 1)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const { selectedDate, selectedSlot } = formState
      const providerName = currentUser.name ||
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()

      const res = await bookAppointment({
        providerId: currentUser.id,
        providerName,
        providerSpecialty: currentUser.specialty || '',
        organizationName: currentUser.organization || '',
        patientId: selectedPatient?._id || selectedPatient?.id || '',
        patientName: formState.patientName,
        patientEmail: formState.patientEmail,
        patientPhone: formState.patientPhone,
        appointmentType: formState.appointmentType,
        scheduledDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationMinutes: 30,
        location: formState.location,
        chiefComplaint: formState.chiefComplaint,
        reasonForVisit: formState.reasonForVisit,
        intakeResponses: formState.intakeSymptoms,
        notes: formState.notes,
        ...(linkedReferralId ? { linkedReferralId } : {}),
      })
      const payload = res?.data || res || {}
      const appt = payload.data || payload
      setAppointmentId(appt._id || appt.id || null)
      setSuccess(true)
      setTimeout(() => navigate('/app/appointments'), 2500)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to book appointment.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleIntakeToggle = (key) => {
    setFormState((prev) => ({
      ...prev,
      intakeSymptoms: { ...prev.intakeSymptoms, [key]: !prev.intakeSymptoms[key] },
    }))
  }

  const getAppointmentTypeLabel = (value) =>
    appointmentTypeOptions.find((o) => o.value === value)?.label ?? value

  const formatDate = (date) => {
    if (!date) return ''
    try {
      return new Date(date).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    } catch { return String(date) }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      const [h, m] = timeStr.split(':')
      const d = new Date()
      d.setHours(parseInt(h, 10), parseInt(m, 10))
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    } catch { return timeStr }
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 6 }}>
        <Alert severity="success" icon={<ConfirmIcon fontSize="inherit" />} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Appointment scheduled successfully!
          </Typography>
          {appointmentId && (
            <Typography variant="body2">Appointment ID: {appointmentId}</Typography>
          )}
          <Typography variant="body2">Redirecting to appointments…</Typography>
        </Alert>
        <Button variant="contained" startIcon={<BookIcon />} onClick={() => navigate('/app/appointments')}>
          Go to Appointments
        </Button>
      </Container>
    )
  }

  const providerDisplayName = currentUser
    ? currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
    : '—'

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Schedule Patient Appointment
      </Typography>

      {/* Provider context banner */}
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ProviderIcon color="primary" fontSize="small" />
        <Typography variant="body2">
          Scheduling on behalf of{' '}
          <strong>{providerDisplayName}</strong>
          {currentUser?.specialty ? ` · ${currentUser.specialty}` : ''}
          {currentUser?.organization ? ` · ${currentUser.organization}` : ''}
        </Typography>
      </Paper>

      {linkedReferralId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Scheduling from referral — appointment will be automatically linked and referral status updated.
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>

        {/* ── Step 0: Patient Details ── */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Patient &amp; Visit Details</Typography>

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
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={formState.location}
                    label="Location"
                    onChange={(e) => {
                      const val = e.target.value
                      setFormState((prev) => ({
                        ...prev,
                        location: val,
                        appointmentType: val === 'telehealth' ? 'telehealth' : prev.appointmentType,
                      }))
                    }}
                  >
                    <MenuItem value="in_person">In-Person</MenuItem>
                    <MenuItem value="telehealth">Telehealth</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth required
                  label="Chief Complaint"
                  multiline rows={2}
                  value={formState.chiefComplaint}
                  onChange={(e) => setFormState((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Visit"
                  multiline rows={2}
                  value={formState.reasonForVisit}
                  onChange={(e) => setFormState((prev) => ({ ...prev, reasonForVisit: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Patient</Typography>
              <PatientSearchAutocomplete
                required
                value={selectedPatient}
                onChange={handlePatientChange}
                label="Select Patient"
              />

              {selectedPatient && (
                <Paper variant="outlined" sx={{ px: 2, py: 1.5, mt: 1.5, borderRadius: 2, borderColor: 'success.light' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <PersonIcon fontSize="small" color="success" />
                      <Typography variant="body2" fontWeight={600}>{formState.patientName}</Typography>
                      {selectedPatient.patientId && (
                        <Chip label={selectedPatient.patientId} size="small" variant="outlined" color="success"
                          sx={{ height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                    {formState.patientPhone && (
                      <>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">{formState.patientPhone}</Typography>
                        </Box>
                      </>
                    )}
                    {formState.patientEmail && (
                      <>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">{formState.patientEmail}</Typography>
                        </Box>
                      </>
                    )}
                    {selectedPatient.gender && (
                      <>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BadgeIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                            {selectedPatient.gender}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </Paper>
              )}
            </Box>
          </Box>
        )}

        {/* ── Step 1: Select Time ── */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Choose a Date &amp; Time</Typography>
            {slotsLoading && !slotsData.length ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TimeSlotPicker
                providerId={currentUser?.id}
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

        {/* ── Step 2: Confirm ── */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Review &amp; Confirm Appointment</Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Patient</Typography>
                    <Typography variant="body1" fontWeight={600}>{formState.patientName}</Typography>
                    {formState.patientPhone && (
                      <Typography variant="body2" color="text.secondary">{formState.patientPhone}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Provider</Typography>
                    <Typography variant="body1" fontWeight={600}>{providerDisplayName}</Typography>
                    {currentUser?.specialty && (
                      <Typography variant="body2" color="text.secondary">{currentUser.specialty}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Date</Typography>
                    <Typography variant="body1">{formatDate(formState.selectedDate)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Time</Typography>
                    <Typography variant="body1">
                      {formState.selectedSlot
                        ? `${formatTime(formState.selectedSlot.startTime)} – ${formatTime(formState.selectedSlot.endTime)}`
                        : ''}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Appointment Type</Typography>
                    <Typography variant="body1">{getAppointmentTypeLabel(formState.appointmentType)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Location</Typography>
                    <Chip
                      label={formState.location === 'telehealth' ? 'Telehealth' : 'In-Person'}
                      color={formState.location === 'telehealth' ? 'primary' : 'default'}
                      size="small"
                    />
                  </Grid>
                  {formState.chiefComplaint && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Chief Complaint</Typography>
                      <Typography variant="body1">{formState.chiefComplaint}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

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
                multiline rows={3}
                value={formState.notes}
                onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Paper>

            {priorAuthTypes.includes(formState.appointmentType) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This appointment type may require prior authorization. Please verify with the
                patient's insurance before confirming.
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <BookIcon />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Scheduling…' : 'Confirm & Schedule Appointment'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Back / Next nav */}
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
