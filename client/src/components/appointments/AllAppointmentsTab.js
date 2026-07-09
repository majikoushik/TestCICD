import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
  Add as AddIcon,
} from '@mui/icons-material'
import AppointmentCard from './AppointmentCard'
import { getMyAppointments, cancelAppointment } from '../../services/appointmentService'
import { formatDate, formatDateTime } from '../../utils/dateFormatter'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtTime(timeStr) {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:${String(m).padStart(2, '0')} ${period}`
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

function StatCard({ label, count, color, icon }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={`${color}.main`}>{count}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, children }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
      <Box sx={{ mt: 0.25 }}>{children}</Box>
    </Grid>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AllAppointmentsTab({ onBookNew }) {
  const navigate = useNavigate()

  const [apptTab, setApptTab] = useState(0)
  const [appointments, setAppointments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const ROWS_PER_PAGE = 6
  const [cancelDialog, setCancelDialog] = useState({ open: false, appointmentId: null, reason: '' })
  const [viewDetail, setViewDetail] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = { page: page + 1, limit: ROWS_PER_PAGE }
      if (apptTab === 0) params.upcoming = true
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
  }, [apptTab, page])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  function handleTabChange(_, newTab) {
    setApptTab(newTab)
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
      await cancelAppointment(cancelDialog.appointmentId, { cancellationReason: cancelDialog.reason })
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

  function handleJoinTelehealth(link) {
    if (link) window.open(link, '_blank', 'noopener,noreferrer')
  }

  const isUpcoming = apptTab === 0
  const showEmpty = isUpcoming && appointments.length === 0 && !loading

  const telehealth = appointments.filter(
    (a) => a.appointmentType === 'telehealth' || a.visitType === 'telehealth'
  ).length
  const confirmed = appointments.filter((a) => a.status === 'confirmed').length

  return (
    <Box>
      {/* ── Toolbar ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
          All patient appointments — manage, cancel, or reschedule
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadAppointments} disabled={loading} size="small">
              {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => onBookNew ? onBookNew() : navigate('/app/appointments/book')}
          >
            Schedule Appointment
          </Button>
        </Box>
      </Box>

      {/* ── Stats ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Upcoming" count={isUpcoming ? total : '—'} color="primary" icon={<BookIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Past" count={!isUpcoming ? total : '—'} color="success" icon={<CalIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Telehealth" count={telehealth} color="secondary" icon={<TelehealthIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Confirmed" count={confirmed} color="info" icon={<BookIcon />} />
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Tabs ── */}
      <Paper variant="outlined" sx={{ mb: 2, borderRadius: '8px 8px 0 0' }}>
        <Tabs
          value={apptTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ px: 1 }}
        >
          <Tab label="Upcoming" />
          <Tab label="Past" />
        </Tabs>
        {loading && <LinearProgress />}
      </Paper>

      {/* ── Empty state ── */}
      {showEmpty && (
        <Paper variant="outlined" sx={{ py: 8, textAlign: 'center', borderRadius: '0 0 8px 8px' }}>
          <CalIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No upcoming appointments
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Schedule an appointment for a patient to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<BookIcon />}
            onClick={() => onBookNew ? onBookNew() : navigate('/app/appointments/book')}
          >
            Schedule Now
          </Button>
        </Paper>
      )}

      {/* ── Appointment grid ── */}
      {!showEmpty && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '0 0 8px 8px' }}>
          <Grid container spacing={2}>
            {appointments.map((appt) => (
              <Grid item xs={12} md={6} key={appt._id}>
                <AppointmentCard
                  appointment={appt}
                  onCancel={isUpcoming ? handleOpenCancel : undefined}
                  onReschedule={isUpcoming ? handleReschedule : undefined}
                  onViewDetail={handleViewDetail}
                  onJoinTelehealth={isUpcoming ? handleJoinTelehealth : undefined}
                />
              </Grid>
            ))}
            {appointments.length === 0 && !loading && !isUpcoming && (
              <Grid item xs={12}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No past appointments found.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>

          <TablePagination
            component="div"
            count={total}
            rowsPerPage={ROWS_PER_PAGE}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPageOptions={[ROWS_PER_PAGE]}
          />
        </Paper>
      )}

      {/* ── Cancel dialog ── */}
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
            multiline rows={3} fullWidth
            value={cancelDialog.reason}
            onChange={(e) => setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Provide a reason for cancelling..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancel} disabled={cancelling}>Keep Appointment</Button>
          <Button
            variant="contained" color="error"
            onClick={handleConfirmCancel} disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} /> : <CancelIcon />}
          >
            {cancelling ? 'Cancelling…' : 'Cancel Appointment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View detail dialog ── */}
      <Dialog open={Boolean(viewDetail)} onClose={() => setViewDetail(null)} fullWidth maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewIcon color="primary" />
            <Typography variant="h6">Appointment Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewDetail && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Appointment Info
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <DetailRow label="Provider">
                  <Typography>{viewDetail.providerName || '—'}</Typography>
                </DetailRow>
                <DetailRow label="Patient">
                  <Typography>{viewDetail.patientName || '—'}</Typography>
                </DetailRow>
                <DetailRow label="Date">
                  <Typography>{formatDate(viewDetail.scheduledDate)}</Typography>
                </DetailRow>
                <DetailRow label="Time">
                  <Typography>
                    {fmtTime(viewDetail.startTime)}
                    {viewDetail.endTime ? ` – ${fmtTime(viewDetail.endTime)}` : ''}
                  </Typography>
                </DetailRow>
                <DetailRow label="Appointment Type">
                  <Chip label={viewDetail.appointmentType?.replace('_', ' ') || '—'} size="small" variant="outlined" />
                </DetailRow>
                <DetailRow label="Status">
                  <Chip
                    label={viewDetail.status?.replace('_', ' ').toUpperCase() || '—'}
                    size="small"
                    color={STATUS_COLOR[viewDetail.status] || 'default'}
                  />
                </DetailRow>
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
                  <Typography>{formatDateTime(viewDetail.createdAt)}</Typography>
                </DetailRow>
              </Grid>

              {(viewDetail.appointmentType === 'telehealth' || viewDetail.visitType === 'telehealth') && (
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
                      variant="contained" startIcon={<TelehealthIcon />}
                      onClick={() => window.open(viewDetail.telehealthLink, '_blank', 'noopener,noreferrer')}
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
                    <Box key={i} sx={{ p: 1.5, mb: 1, borderRadius: 1, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2">
                        <strong>From:</strong> {formatDate(entry.previousDate)} {fmtTime(entry.previousTime)}
                        {' → '}
                        <strong>To:</strong> {formatDate(entry.newDate)} {fmtTime(entry.newTime)}
                      </Typography>
                      {entry.reason && (
                        <Typography variant="caption" color="text.secondary">Reason: {entry.reason}</Typography>
                      )}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1 }}>
          {viewDetail && ['scheduled', 'confirmed'].includes(viewDetail.status) && isUpcoming && (
            <>
              <Button
                color="error" startIcon={<CancelIcon />}
                onClick={() => { setViewDetail(null); handleOpenCancel(viewDetail._id) }}
              >
                Cancel
              </Button>
              <Button
                variant="outlined" startIcon={<RescheduleIcon />}
                onClick={() => { const appt = viewDetail; setViewDetail(null); handleReschedule(appt) }}
              >
                Reschedule
              </Button>
            </>
          )}
          <Button onClick={() => setViewDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
