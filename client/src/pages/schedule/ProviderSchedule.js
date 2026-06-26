import React, { useState, useEffect, useCallback } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Grid,
  LinearProgress,
} from '@mui/material'
import {
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Event as EventIcon,
  Refresh as RefreshIcon,
  EventBusy as BlockIcon,
} from '@mui/icons-material'
import { getAvailability, saveAvailability, getExceptions, addException, deleteException } from '../../services/scheduleService'
import { getMySchedule, updateAppointmentStatus, sendReminder } from '../../services/appointmentService'
import AppointmentCard from '../../components/appointments/AppointmentCard'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_EDITABLE_SCHEDULE = DAYS_OF_WEEK.map((day, index) => ({
  dayOfWeek: index + 1,
  dayName: day,
  isActive: index < 5,
  startTime: '09:00',
  endTime: '17:00',
  slotDuration: 30,
}))

function getProviderId() {
  try {
    const raw = localStorage.getItem('auth:token') || localStorage.getItem('token')
    if (!raw) return null
    const parts = raw.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      return payload._id || payload.id || payload.userId || null
    }
  } catch {
    // ignore
  }
  const user = localStorage.getItem('user')
  if (user) {
    try {
      const parsed = JSON.parse(user)
      return parsed._id || parsed.id || null
    } catch {
      // ignore
    }
  }
  return null
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const EXCEPTION_TYPE_COLORS = {
  unavailable: 'error',
  extra_hours: 'success',
  modified_hours: 'warning',
}

const EXCEPTION_TYPE_LABELS = {
  unavailable: 'Unavailable All Day',
  extra_hours: 'Extra Hours',
  modified_hours: 'Modified Hours',
}

export default function ProviderSchedule() {
  const providerId = getProviderId()

  const [tab, setTab] = useState(0)

  // Tab 0 — My Schedule
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [scheduleData, setScheduleData] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState(null)

  // Tab 1 — Manage Availability
  const [editableSchedule, setEditableSchedule] = useState(DEFAULT_EDITABLE_SCHEDULE)
  const [availLoading, setAvailLoading] = useState(false)
  const [availSaving, setAvailSaving] = useState(false)
  const [availError, setAvailError] = useState(null)
  const [availSuccess, setAvailSuccess] = useState(null)

  // Tab 2 — Exceptions
  const [exceptions, setExceptions] = useState([])
  const [exceptLoading, setExceptLoading] = useState(false)
  const [exceptError, setExceptError] = useState(null)
  const [exceptSuccess, setExceptSuccess] = useState(null)
  const [addExceptionDialog, setAddExceptionDialog] = useState({
    open: false,
    date: '',
    type: 'unavailable',
    startTime: '',
    endTime: '',
    reason: 'vacation',
    notes: '',
  })
  const [savingException, setSavingException] = useState(false)

  // Outcome capture dialog
  const [outcomeDialog, setOutcomeDialog] = useState({ open: false, appointment: null })
  const [outcomeForm, setOutcomeForm] = useState({ outcomeNotes: '', diagnosis: '', followUpNeeded: false, followUpTimeframe: '' })
  const [outcomeSaving, setOutcomeSaving] = useState(false)

  // Waitlist tab
  const [waitlist, setWaitlist] = useState([])
  const [waitlistLoading, setWaitlistLoading] = useState(false)

  // Shared error/success
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // ---- Tab 0: Load weekly appointments ----
  const loadWeekSchedule = useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError(null)
    try {
      const endDate = addDays(weekStart, 6)
      const res = await getMySchedule({
        startDate: formatDateKey(weekStart),
        endDate: formatDateKey(endDate),
      })
      const data = res.data || res || []
      setScheduleData(Array.isArray(data) ? data : data.appointments || [])
    } catch {
      setScheduleError('Failed to load schedule. Please try again.')
    } finally {
      setScheduleLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    if (tab === 0) {
      loadWeekSchedule()
    }
  }, [tab, loadWeekSchedule])

  const handlePrevWeek = () => setWeekStart(prev => addDays(prev, -7))
  const handleNextWeek = () => setWeekStart(prev => addDays(prev, 7))
  const handleToday = () => setWeekStart(startOfWeek(new Date()))

  const handleCheckIn = async (appointment) => {
    try {
      await updateAppointmentStatus(appointment._id, { status: 'checked_in' })
      await loadWeekSchedule()
    } catch {
      setScheduleError('Failed to check in patient.')
    }
  }

  const handleOpenOutcomeDialog = (appointment) => {
    setOutcomeForm({ outcomeNotes: '', diagnosis: '', followUpNeeded: false, followUpTimeframe: '' })
    setOutcomeDialog({ open: true, appointment })
  }

  const handleCompleteWithOutcome = async () => {
    if (!outcomeDialog.appointment) return
    setOutcomeSaving(true)
    try {
      await updateAppointmentStatus(outcomeDialog.appointment._id, {
        status: 'completed',
        ...outcomeForm,
      })
      setOutcomeDialog({ open: false, appointment: null })
      setSuccess('Visit completed. Provider tokens awarded.')
      await loadWeekSchedule()
    } catch {
      setError('Failed to complete appointment.')
    } finally {
      setOutcomeSaving(false)
    }
  }

  const handleSendReminder = async (appointment) => {
    try {
      await sendReminder(appointment._id)
      setSuccess(`Reminder sent for ${appointment.patientName}`)
    } catch {
      setError('Failed to send reminder.')
    }
  }

  const loadWaitlist = useCallback(async () => {
    if (!providerId) return
    setWaitlistLoading(true)
    try {
      const res = await getAvailability(providerId)
      // Waitlist comes from schedules/:providerId/waitlist — reuse availability base path
      const data = res?.data || res || {}
      setWaitlist(data.waitlist || [])
    } catch {
      setWaitlist([])
    } finally {
      setWaitlistLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    if (tab === 3) loadWaitlist()
  }, [tab, loadWaitlist])

  // Group appointments by date
  const appointmentsByDate = {}
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i)
    appointmentsByDate[formatDateKey(d)] = []
  }
  scheduleData.forEach(appt => {
    const key = appt.date || (appt.scheduledAt && appt.scheduledAt.slice(0, 10)) || (appt.startTime && appt.startTime.slice(0, 10))
    if (key && appointmentsByDate[key] !== undefined) {
      appointmentsByDate[key].push(appt)
    }
  })

  // ---- Tab 1: Load availability ----
  const loadAvailability = useCallback(async () => {
    if (!providerId) return
    setAvailLoading(true)
    setAvailError(null)
    try {
      const res = await getAvailability(providerId)
      const data = res.data || res || []
      const records = Array.isArray(data) ? data : data.availability || []

      if (records.length > 0) {
        const merged = DEFAULT_EDITABLE_SCHEDULE.map(defaultDay => {
          const found = records.find(r => r.dayOfWeek === defaultDay.dayOfWeek)
          if (found) {
            return {
              ...defaultDay,
              isActive: found.isActive !== undefined ? found.isActive : true,
              startTime: found.startTime || defaultDay.startTime,
              endTime: found.endTime || defaultDay.endTime,
              slotDuration: found.slotDuration || defaultDay.slotDuration,
            }
          }
          return { ...defaultDay, isActive: false }
        })
        setEditableSchedule(merged)
      }
    } catch {
      setAvailError('Failed to load availability.')
    } finally {
      setAvailLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    if (tab === 1) {
      loadAvailability()
    }
  }, [tab, loadAvailability])

  const handleDayToggle = (index) => {
    setEditableSchedule(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], isActive: !updated[index].isActive }
      return updated
    })
  }

  const handleDayField = (index, field, value) => {
    setEditableSchedule(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSaveAvailability = async () => {
    if (!providerId) {
      setAvailError('Provider ID not found. Please log in again.')
      return
    }
    setAvailSaving(true)
    setAvailError(null)
    setAvailSuccess(null)
    try {
      const payload = editableSchedule.filter(d => d.isActive).map(d => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        slotDuration: d.slotDuration,
        isActive: true,
      }))
      await saveAvailability(providerId, payload)
      setAvailSuccess('Availability saved successfully.')
    } catch {
      setAvailError('Failed to save availability.')
    } finally {
      setAvailSaving(false)
    }
  }

  // ---- Tab 2: Load exceptions ----
  const loadExceptions = useCallback(async () => {
    if (!providerId) return
    setExceptLoading(true)
    setExceptError(null)
    try {
      const res = await getExceptions(providerId)
      const data = res.data || res || []
      setExceptions(Array.isArray(data) ? data : data.exceptions || [])
    } catch {
      setExceptError('Failed to load exceptions.')
    } finally {
      setExceptLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    if (tab === 2) {
      loadExceptions()
    }
  }, [tab, loadExceptions])

  const handleOpenAddException = () => {
    setAddExceptionDialog({
      open: true,
      date: '',
      type: 'unavailable',
      startTime: '',
      endTime: '',
      reason: 'vacation',
      notes: '',
    })
    setExceptError(null)
    setExceptSuccess(null)
  }

  const handleCloseAddException = () => {
    setAddExceptionDialog(prev => ({ ...prev, open: false }))
  }

  const handleExceptionDialogChange = (field, value) => {
    setAddExceptionDialog(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveException = async () => {
    if (!providerId) {
      setExceptError('Provider ID not found.')
      return
    }
    setSavingException(true)
    setExceptError(null)
    try {
      const payload = {
        date: addExceptionDialog.date,
        type: addExceptionDialog.type,
        reason: addExceptionDialog.reason,
        notes: addExceptionDialog.notes,
      }
      if (addExceptionDialog.type !== 'unavailable') {
        payload.startTime = addExceptionDialog.startTime
        payload.endTime = addExceptionDialog.endTime
      }
      await addException(providerId, payload)
      setExceptSuccess('Exception added successfully.')
      handleCloseAddException()
      await loadExceptions()
    } catch {
      setExceptError('Failed to add exception.')
    } finally {
      setSavingException(false)
    }
  }

  const handleDeleteException = async (exceptionId) => {
    if (!providerId) return
    setExceptError(null)
    try {
      await deleteException(providerId, exceptionId)
      setExceptSuccess('Exception deleted.')
      setExceptions(prev => prev.filter(e => e._id !== exceptionId))
    } catch {
      setExceptError('Failed to delete exception.')
    }
  }

  // ---- Render Tab 0 ----
  const renderMySchedule = () => (
    <Box>
      {/* Week navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" onClick={handlePrevWeek}>
          &laquo; Previous
        </Button>
        <Button variant="outlined" size="small" onClick={handleToday}>
          Today
        </Button>
        <Button variant="outlined" size="small" onClick={handleNextWeek}>
          Next &raquo;
        </Button>
        <Typography variant="subtitle1" sx={{ ml: 1 }}>
          {formatShortDate(weekStart)} &mdash; {formatShortDate(addDays(weekStart, 6))}
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadWeekSchedule} disabled={scheduleLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {scheduleError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setScheduleError(null)}>
          {scheduleError}
        </Alert>
      )}

      {scheduleLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {Object.entries(appointmentsByDate).map(([dateKey, appts]) => (
            <Box key={dateKey} sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  mb: 1,
                  pb: 0.5,
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  color: formatDateKey(new Date()) === dateKey ? 'primary.main' : 'text.primary',
                  fontWeight: formatDateKey(new Date()) === dateKey ? 700 : 600,
                }}
              >
                {formatDateDisplay(dateKey)}
                {formatDateKey(new Date()) === dateKey && (
                  <Chip label="Today" size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Typography>

              {appts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1, fontStyle: 'italic' }}>
                  No appointments
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {appts.map(appt => (
                    <Grid item xs={12} sm={6} md={4} key={appt._id}>
                      <AppointmentCard
                        appointment={appt}
                        showProviderActions={true}
                        compact={true}
                        onCheckIn={() => handleCheckIn(appt)}
                        onComplete={() => handleOpenOutcomeDialog(appt)}
                        onSendReminder={() => handleSendReminder(appt)}
                        onStatusUpdate={(id, data) => updateAppointmentStatus(id, data).then(loadWeekSchedule)}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )

  // ---- Render Tab 1 ----
  const renderManageAvailability = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Weekly Working Hours</Typography>
        <Button
          variant="contained"
          startIcon={availSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSaveAvailability}
          disabled={availSaving || availLoading}
        >
          {availSaving ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      {availError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAvailError(null)}>
          {availError}
        </Alert>
      )}
      {availSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAvailSuccess(null)}>
          {availSuccess}
        </Alert>
      )}

      {availLoading ? (
        <LinearProgress sx={{ mb: 2 }} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Start Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>End Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Slot Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {editableSchedule.map((day, index) => (
                <TableRow
                  key={day.dayOfWeek}
                  sx={{ opacity: day.isActive ? 1 : 0.5, bgcolor: day.isActive ? 'inherit' : 'action.hover' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {day.dayName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={day.isActive}
                          onChange={() => handleDayToggle(index)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={day.isActive ? 'On' : 'Off'}
                      sx={{ m: 0 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="time"
                      size="small"
                      value={day.startTime}
                      onChange={e => handleDayField(index, 'startTime', e.target.value)}
                      disabled={!day.isActive}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 130 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="time"
                      size="small"
                      value={day.endTime}
                      onChange={e => handleDayField(index, 'endTime', e.target.value)}
                      disabled={!day.isActive}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 130 }}
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" disabled={!day.isActive} sx={{ minWidth: 130 }}>
                      <Select
                        value={day.slotDuration}
                        onChange={e => handleDayField(index, 'slotDuration', e.target.value)}
                      >
                        <MenuItem value={15}>15 min</MenuItem>
                        <MenuItem value={20}>20 min</MenuItem>
                        <MenuItem value={30}>30 min</MenuItem>
                        <MenuItem value={45}>45 min</MenuItem>
                        <MenuItem value={60}>60 min</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Alert severity="info" icon={<ScheduleIcon />} sx={{ mt: 2 }}>
        Your availability determines which time slots are bookable when scheduling patient appointments. Changes take effect immediately.
      </Alert>
    </Box>
  )

  // ---- Render Tab 2 ----
  const renderExceptions = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">Schedule Exceptions</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage vacations, holidays, and extra hours
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadExceptions} disabled={exceptLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddException}
          >
            Add Exception
          </Button>
        </Box>
      </Box>

      {exceptError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExceptError(null)}>
          {exceptError}
        </Alert>
      )}
      {exceptSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setExceptSuccess(null)}>
          {exceptSuccess}
        </Alert>
      )}

      {exceptLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Hours</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exceptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No exceptions found
                  </TableCell>
                </TableRow>
              ) : (
                exceptions.map(exc => (
                  <TableRow key={exc._id} hover>
                    <TableCell>
                      <Typography variant="body2">{formatDateDisplay(exc.date)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={EXCEPTION_TYPE_LABELS[exc.type] || exc.type}
                        size="small"
                        color={EXCEPTION_TYPE_COLORS[exc.type] || 'default'}
                        icon={exc.type === 'unavailable' ? <BlockIcon /> : <EventIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      {exc.type === 'unavailable' ? (
                        <Typography variant="body2" color="text.secondary">All day</Typography>
                      ) : (
                        <Typography variant="body2">
                          {exc.startTime || '—'} &ndash; {exc.endTime || '—'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {exc.reason || '—'}
                      </Typography>
                      {exc.notes && (
                        <Typography variant="caption" color="text.secondary">
                          {exc.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteException(exc._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Exception Dialog */}
      <Dialog open={addExceptionDialog.open} onClose={handleCloseAddException} fullWidth maxWidth="sm">
        <DialogTitle>Add Schedule Exception</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={addExceptionDialog.date}
                onChange={e => handleExceptionDialogChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={addExceptionDialog.type}
                  label="Type"
                  onChange={e => handleExceptionDialogChange('type', e.target.value)}
                >
                  <MenuItem value="unavailable">Unavailable All Day</MenuItem>
                  <MenuItem value="extra_hours">Extra Hours</MenuItem>
                  <MenuItem value="modified_hours">Modified Hours</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {addExceptionDialog.type !== 'unavailable' && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    value={addExceptionDialog.startTime}
                    onChange={e => handleExceptionDialogChange('startTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    value={addExceptionDialog.endTime}
                    onChange={e => handleExceptionDialogChange('endTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Reason</InputLabel>
                <Select
                  value={addExceptionDialog.reason}
                  label="Reason"
                  onChange={e => handleExceptionDialogChange('reason', e.target.value)}
                >
                  <MenuItem value="vacation">Vacation</MenuItem>
                  <MenuItem value="holiday">Holiday</MenuItem>
                  <MenuItem value="conference">Conference</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                  <MenuItem value="training">Training</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={addExceptionDialog.notes}
                onChange={e => handleExceptionDialogChange('notes', e.target.value)}
                placeholder="Optional notes..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddException} disabled={savingException}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={savingException ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveException}
            disabled={savingException || !addExceptionDialog.date}
          >
            {savingException ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )

  // ---- Render Tab 3: Waitlist ----
  const renderWaitlist = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">Waitlist Entries</Typography>
          <Typography variant="body2" color="text.secondary">Patients waiting for an available slot</Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={loadWaitlist} disabled={waitlistLoading}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>
      {waitlistLoading ? (
        <LinearProgress sx={{ mb: 2 }} />
      ) : waitlist.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">No waitlist entries found.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            When a patient is added to the waitlist, they will appear here.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Offered Slot</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Response Deadline</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Added</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {waitlist.map((entry, idx) => (
                <TableRow key={entry._id || idx} hover>
                  <TableCell><Typography variant="body2">{entry.patientName || entry.patientId || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={entry.appointmentType?.replace('_', ' ') || '—'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={entry.status}
                      size="small"
                      color={entry.status === 'offered' ? 'warning' : entry.status === 'booked' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {entry.offeredSlot ? (
                      <Typography variant="caption">
                        {new Date(entry.offeredSlot.scheduledDate).toLocaleDateString()} {entry.offeredSlot.startTime}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {entry.responseDeadline ? (
                      <Typography variant="caption" color={new Date(entry.responseDeadline) < new Date() ? 'error' : 'text.secondary'}>
                        {new Date(entry.responseDeadline).toLocaleString()}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <ScheduleIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          Provider Schedule
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, newTab) => setTab(newTab)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<EventIcon />} iconPosition="start" label="My Schedule" />
          <Tab icon={<ScheduleIcon />} iconPosition="start" label="Manage Availability" />
          <Tab icon={<BlockIcon />} iconPosition="start" label="Exceptions" />
          <Tab icon={<AddIcon />} iconPosition="start" label="Waitlist" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Paper sx={{ p: 3 }}>
        {tab === 0 && renderMySchedule()}
        {tab === 1 && renderManageAvailability()}
        {tab === 2 && renderExceptions()}
        {tab === 3 && renderWaitlist()}
      </Paper>

      {/* Outcome Capture Dialog */}
      <Dialog open={outcomeDialog.open} onClose={() => setOutcomeDialog({ open: false, appointment: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Visit — Capture Outcome</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Diagnosis / Findings"
                value={outcomeForm.diagnosis}
                onChange={e => setOutcomeForm(p => ({ ...p, diagnosis: e.target.value }))}
                placeholder="e.g. Hypertension Stage 1, managed"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Outcome Notes"
                value={outcomeForm.outcomeNotes}
                onChange={e => setOutcomeForm(p => ({ ...p, outcomeNotes: e.target.value }))}
                placeholder="Summary of visit, treatment administered, patient response..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={outcomeForm.followUpNeeded}
                    onChange={e => setOutcomeForm(p => ({ ...p, followUpNeeded: e.target.checked, followUpTimeframe: e.target.checked ? p.followUpTimeframe : '' }))}
                    color="primary"
                  />
                }
                label="Follow-up Required"
              />
            </Grid>
            {outcomeForm.followUpNeeded && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Follow-up Timeframe</InputLabel>
                  <Select
                    value={outcomeForm.followUpTimeframe}
                    label="Follow-up Timeframe"
                    onChange={e => setOutcomeForm(p => ({ ...p, followUpTimeframe: e.target.value }))}
                  >
                    <MenuItem value="1_week">1 Week</MenuItem>
                    <MenuItem value="2_weeks">2 Weeks</MenuItem>
                    <MenuItem value="1_month">1 Month</MenuItem>
                    <MenuItem value="3_months">3 Months</MenuItem>
                    <MenuItem value="6_months">6 Months</MenuItem>
                    <MenuItem value="as_needed">As Needed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <Alert severity="info" icon={false} sx={{ fontSize: '0.8rem' }}>
                Completing this visit will award <strong>+15 tokens</strong> to your account and close any linked referral automatically.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutcomeDialog({ open: false, appointment: null })} disabled={outcomeSaving}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCompleteWithOutcome}
            disabled={outcomeSaving}
            startIcon={outcomeSaving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {outcomeSaving ? 'Saving...' : 'Complete Visit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
