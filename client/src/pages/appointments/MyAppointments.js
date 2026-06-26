import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Alert,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  IconButton,
  Tooltip,
  TablePagination,
} from '@mui/material'
import {
  EventAvailable as BookIcon,
  Cancel as CancelIcon,
  EventRepeat as RescheduleIcon,
  Visibility as ViewIcon,
  VideoCall as TelehealthIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalIcon,
} from '@mui/icons-material'
import AppointmentCard from '../../components/appointments/AppointmentCard'
import {
  getMyAppointments,
  cancelAppointment,
} from '../../services/appointmentService'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtTime(timeStr) {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:${String(m).padStart(2, '0')} ${period}`
}

function fmtDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const STATUS_COLOR = {
  scheduled: 'info',
  confirmed: 'primary',
  checked_in: 'warning',
  in_progress: 'secondary',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
  rescheduled: 'default',
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ label, count, color, icon }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
        <Box sx={{ color: color + '.main' }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={color + '.main'}>
            {count}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

// ─── DetailRow ───────────────────────────────────────────────────────────────

function DetailRow({ label, children }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ mt: 0.25 }}>{children}</Box>
    </Grid>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MyAppointments() {
  const navigate = useNavigate()

  const [tab, setTab] = useState(0)
  const [appointments, setAppointments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage] = useState(6)
  const [cancelDialog, setCancelDialog] = useState({
    open: false,
    appointmentId: null,
    reason: '',
  })
  const [viewDetail, setViewDetail] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  // ── data loading ────────────────────────────────────────────────────────────

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = { page: page + 1, limit: rowsPerPage }
      if (tab === 0) params.upcoming = true
      else params.past = true
      const res = await getMyAppointments(params)
      const payload = res?.data || res || {}
      const inner = payload.data || payload
      setAppointments(inner.appointments || inner.data || [])
      setTotal(inner.total || 0)
    } catch {
      setError('Failed to load appointments. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [tab, page, rowsPerPage])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // ── derived counts ──────────────────────────────────────────────────────────

  // ── handlers ────────────────────────────────────────────────────────────────

  function handleTabChange(_, newTab) {
    setTab(newTab)
    setPage(0)
  }

  function handleOpenCancel(appointmentId) {
    setCancelDialog({ open: true, appointmentId, reason: '' })
  }

  function handleCloseCancel() {
    if (!cancelling) setCancelDialog({ open: false, appointmentId: null, reason: '' })
  }

  async function handleConfirmCancel() {
    try {
      setCancelling(true)
      await cancelAppointment(cancelDialog.appointmentId, {
        cancellationReason: cancelDialog.reason,
      })
      setCancelDialog({ open: false, appointmentId: null, reason: '' })
      loadAppointments()
    } catch {
      setError('Failed to cancel appointment. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  function handleReschedule(appointment) {
    navigate(`/app/appointments/book?reschedule=${appointment._id}`)
  }

  function handleViewDetail(appointmentId) {
    const appt = appointments.find((a) => a._id === appointmentId)
    if (appt) setViewDetail(appt)
  }

  function handleJoinTelehealth(telehealthLink) {
    if (telehealthLink) window.open(telehealthLink, '_blank', 'noopener,noreferrer')
  }

  // ── render ──────────────────────────────────────────────────────────────────

  const showEmpty = tab === 0 && appointments.length === 0 && !loading

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h4" component="h1">
              Patient Appointments
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Manage appointments scheduled for your patients
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadAppointments} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<BookIcon />}
            onClick={() => navigate('/app/appointments/book')}
          >
            Schedule for Patient
          </Button>
        </Box>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Upcoming"
            count={tab === 0 ? total : '—'}
            color="primary"
            icon={<BookIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Past"
            count={tab === 1 ? total : '—'}
            color="success"
            icon={<CalIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Telehealth"
            count={appointments.filter((a) => a.appointmentType === 'telehealth' || a.visitType === 'telehealth').length}
            color="secondary"
            icon={<TelehealthIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Confirmed"
            count={appointments.filter((a) => a.status === 'confirmed').length}
            color="info"
            icon={<BookIcon />}
          />
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ px: 2 }}
        >
          <Tab label="Upcoming" />
          <Tab label="Past" />
        </Tabs>
        {loading && <LinearProgress />}
      </Paper>

      {/* Empty State */}
      {showEmpty && (
        <Paper sx={{ py: 8, textAlign: 'center' }}>
          <CalIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No upcoming patient appointments
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Schedule an appointment for a patient to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<BookIcon />}
            onClick={() => navigate('/app/appointments/book')}
          >
            Schedule Now
          </Button>
        </Paper>
      )}

      {/* Appointments Grid */}
      {!showEmpty && (
        <>
          <Grid container spacing={2}>
            {appointments.map((appt) => (
              <Grid item xs={12} md={6} key={appt._id}>
                <AppointmentCard
                  appointment={appt}
                  onCancel={tab === 0 ? handleOpenCancel : undefined}
                  onReschedule={tab === 0 ? handleReschedule : undefined}
                  onViewDetail={handleViewDetail}
                  onJoinTelehealth={tab === 0 ? handleJoinTelehealth : undefined}
                />
              </Grid>
            ))}
            {appointments.length === 0 && !loading && tab === 1 && (
              <Grid item xs={12}>
                <Paper sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No past appointments found.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Pagination */}
          <Paper sx={{ mt: 2 }}>
            <TablePagination
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPageOptions={[6]}
            />
          </Paper>
        </>
      )}

      {/* ── Cancel Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={cancelDialog.open} onClose={handleCloseCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CancelIcon color="error" />
            <Typography variant="h6">Cancel Appointment</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </Typography>
          <TextField
            label="Reason for cancellation (optional)"
            multiline
            rows={3}
            fullWidth
            value={cancelDialog.reason}
            onChange={(e) =>
              setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="Provide a reason for cancelling this appointment..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancel} disabled={cancelling}>
            Keep Appointment
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmCancel}
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} /> : <CancelIcon />}
          >
            {cancelling ? 'Cancelling…' : 'Cancel Appointment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View Detail Dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(viewDetail)}
        onClose={() => setViewDetail(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewIcon color="primary" />
            <Typography variant="h6">Appointment Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewDetail && (
            <Box>
              {/* Section 1: Core Info */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Appointment Info
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <DetailRow label="Provider">
                  <Typography>{viewDetail.providerName || '—'}</Typography>
                </DetailRow>
                <DetailRow label="Organization">
                  <Typography>{viewDetail.organizationName || '—'}</Typography>
                </DetailRow>
                <DetailRow label="Date">
                  <Typography>{fmt(viewDetail.scheduledDate)}</Typography>
                </DetailRow>
                <DetailRow label="Time">
                  <Typography>
                    {fmtTime(viewDetail.startTime)}
                    {viewDetail.endTime ? ` – ${fmtTime(viewDetail.endTime)}` : ''}
                  </Typography>
                </DetailRow>
                <DetailRow label="Appointment Type">
                  <Chip
                    label={viewDetail.appointmentType?.replace('_', ' ') || '—'}
                    size="small"
                    variant="outlined"
                  />
                </DetailRow>
                <DetailRow label="Status">
                  <Chip
                    label={viewDetail.status?.replace('_', ' ').toUpperCase() || '—'}
                    size="small"
                    color={STATUS_COLOR[viewDetail.status] || 'default'}
                  />
                </DetailRow>
                {viewDetail.visitType && (
                  <DetailRow label="Visit Mode">
                    <Typography sx={{ textTransform: 'capitalize' }}>
                      {viewDetail.visitType}
                    </Typography>
                  </DetailRow>
                )}
                {viewDetail.chiefComplaint && (
                  <DetailRow label="Chief Complaint">
                    <Typography>{viewDetail.chiefComplaint}</Typography>
                  </DetailRow>
                )}
                {viewDetail.notes && (
                  <DetailRow label="Notes">
                    <Typography>{viewDetail.notes}</Typography>
                  </DetailRow>
                )}
                <DetailRow label="Booked On">
                  <Typography>{fmtDateTime(viewDetail.createdAt)}</Typography>
                </DetailRow>
              </Grid>

              {/* Section 2: Telehealth */}
              {(viewDetail.appointmentType === 'telehealth' ||
                viewDetail.visitType === 'telehealth') && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TelehealthIcon fontSize="small" color="primary" />
                      Telehealth
                    </Box>
                  </Typography>
                  {viewDetail.telehealthLink ? (
                    <Button
                      variant="contained"
                      startIcon={<TelehealthIcon />}
                      onClick={() =>
                        window.open(viewDetail.telehealthLink, '_blank', 'noopener,noreferrer')
                      }
                      sx={{ mb: 1 }}
                    >
                      Join Video Call
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Telehealth link will be shared with the patient prior to their appointment.
                    </Typography>
                  )}
                </>
              )}

              {/* Section 3: Reschedule History */}
              {viewDetail.rescheduleHistory?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <RescheduleIcon fontSize="small" color="action" />
                      Reschedule History
                    </Box>
                  </Typography>
                  {viewDetail.rescheduleHistory.map((entry, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        borderRadius: 1,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2">
                        <strong>From:</strong> {fmt(entry.previousDate)}{' '}
                        {fmtTime(entry.previousTime)} &rarr; <strong>To:</strong>{' '}
                        {fmt(entry.newDate)} {fmtTime(entry.newTime)}
                      </Typography>
                      {entry.reason && (
                        <Typography variant="caption" color="text.secondary">
                          Reason: {entry.reason}
                        </Typography>
                      )}
                      {entry.rescheduledAt && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Changed on: {fmtDateTime(entry.rescheduledAt)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </>
              )}

              {/* Section 4: Reminders */}
              {viewDetail.reminders && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                    Reminder Status
                  </Typography>
                  <Grid container spacing={2}>
                    {viewDetail.reminders.email !== undefined && (
                      <DetailRow label="Email Reminder">
                        <Chip
                          label={viewDetail.reminders.email ? 'Sent' : 'Pending'}
                          size="small"
                          color={viewDetail.reminders.email ? 'success' : 'default'}
                        />
                      </DetailRow>
                    )}
                    {viewDetail.reminders.sms !== undefined && (
                      <DetailRow label="SMS Reminder">
                        <Chip
                          label={viewDetail.reminders.sms ? 'Sent' : 'Pending'}
                          size="small"
                          color={viewDetail.reminders.sms ? 'success' : 'default'}
                        />
                      </DetailRow>
                    )}
                    {viewDetail.reminders.lastSentAt && (
                      <DetailRow label="Last Sent">
                        <Typography>{fmtDateTime(viewDetail.reminders.lastSentAt)}</Typography>
                      </DetailRow>
                    )}
                  </Grid>
                </>
              )}

              {/* Section 5: Intake Responses */}
              {viewDetail.intakeResponses?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                    Intake Responses
                  </Typography>
                  {viewDetail.intakeResponses.map((item, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {item.question}
                      </Typography>
                      <Typography variant="body2">{item.answer ?? '—'}</Typography>
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          {viewDetail &&
            ['scheduled', 'confirmed'].includes(viewDetail.status) &&
            tab === 0 && (
              <>
                <Button
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => {
                    setViewDetail(null)
                    handleOpenCancel(viewDetail._id)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RescheduleIcon />}
                  onClick={() => {
                    const appt = viewDetail
                    setViewDetail(null)
                    handleReschedule(appt)
                  }}
                >
                  Reschedule
                </Button>
              </>
            )}
          <Button onClick={() => setViewDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
