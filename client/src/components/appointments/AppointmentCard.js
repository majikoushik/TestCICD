import React from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import VideocamIcon from '@mui/icons-material/Videocam'
import CancelIcon from '@mui/icons-material/Cancel'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import VideoCallIcon from '@mui/icons-material/VideoCall'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import { formatDate } from '../../utils/dateFormatter'

const STATUS_COLORS = {
  scheduled: 'info',
  confirmed: 'primary',
  checked_in: 'warning',
  in_progress: 'secondary',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
  rescheduled: 'default',
}

const TYPE_COLORS = {
  new_patient: '#2196F3',
  follow_up: '#4CAF50',
  telehealth: '#9C27B0',
  urgent: '#F44336',
  procedure: '#FF9800',
}

const TYPE_LABELS = {
  new_patient: 'New Patient',
  follow_up: 'Follow-Up',
  telehealth: 'Telehealth',
  urgent: 'Urgent',
  procedure: 'Procedure',
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  const displayMinute = String(minutes).padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}

function isUpcoming(scheduledDate, startTime) {
  if (!scheduledDate) return false
  const datePart = scheduledDate.split('T')[0]
  const timeStr = startTime || '00:00'
  const apptDateTime = new Date(`${datePart}T${timeStr}`)
  return apptDateTime > new Date()
}

function isWithin30Min(scheduledDate, startTime) {
  if (!scheduledDate || !startTime) return false
  const datePart = scheduledDate.split('T')[0]
  const apptDateTime = new Date(`${datePart}T${startTime}`)
  const now = new Date()
  const diffMs = apptDateTime - now
  return diffMs <= 30 * 60 * 1000 && diffMs > -60 * 60 * 1000
}

function AppointmentCard({
  appointment = {},
  onCancel,
  onReschedule,
  onCheckIn,
  onComplete,
  onSendReminder,
  onJoinTelehealth,
  onViewDetail,
  showProviderActions = false,
  compact = false,
}) {
  const {
    _id,
    patientName,
    providerName,
    organizationName,
    appointmentType,
    visitType,
    scheduledDate,
    startTime,
    endTime,
    status,
    chiefComplaint,
    telehealthLink,
  } = appointment

  const typeColor = TYPE_COLORS[appointmentType] || '#9E9E9E'
  const typeLabel = TYPE_LABELS[appointmentType] || appointmentType || 'Appointment'
  const statusColor = STATUS_COLORS[status] || 'default'
  const upcoming = isUpcoming(scheduledDate, startTime)
  const isTelehealth = appointmentType === 'telehealth' || visitType === 'telehealth'
  const canJoin =
    isTelehealth &&
    upcoming &&
    status === 'confirmed' &&
    isWithin30Min(scheduledDate, startTime)
  const canCancel =
    onCancel && ['scheduled', 'confirmed'].includes(status) && upcoming
  const canReschedule =
    onReschedule && ['scheduled', 'confirmed'].includes(status) && upcoming
  const canCheckIn =
    showProviderActions &&
    onCheckIn &&
    ['scheduled', 'confirmed'].includes(status)
  const canComplete =
    showProviderActions &&
    onComplete &&
    ['checked_in', 'in_progress'].includes(status)
  const canSendReminder =
    showProviderActions &&
    onSendReminder &&
    ['scheduled', 'confirmed'].includes(status) &&
    upcoming

  const primaryName = showProviderActions ? patientName : providerName
  const secondaryName = showProviderActions ? providerName : patientName

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: `4px solid ${typeColor}`,
        mb: compact ? 1 : 2,
      }}
    >
      <CardContent sx={{ pb: compact ? 1 : 2 }}>
        {/* Row 1: Name + Status Chip */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Typography variant={compact ? 'body1' : 'h6'} fontWeight="bold" noWrap sx={{ mr: 1 }}>
            {primaryName || 'Unknown'}
          </Typography>
          <Chip
            label={status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
            color={statusColor}
            size="small"
          />
        </Box>

        {/* Row 2: Type Chip + Visit Mode */}
        <Box display="flex" alignItems="center" gap={1} mb={compact ? 0.5 : 1}>
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              backgroundColor: typeColor,
              color: '#fff',
              fontWeight: 500,
            }}
          />
          {isTelehealth ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              <VideoCallIcon sx={{ fontSize: 16, color: '#9C27B0' }} />
              <Typography variant="caption" color="text.secondary">
                Telehealth
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              In-Person
            </Typography>
          )}
        </Box>

        {/* Row 3: Date + Time */}
        <Box display="flex" alignItems="center" gap={2} mb={compact ? 0.5 : 1} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={0.5}>
            <CalendarMonthIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatDate(scheduledDate)}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatTime(startTime)}
              {endTime ? ` – ${formatTime(endTime)}` : ''}
            </Typography>
          </Box>
        </Box>

        {/* Row 4: Provider or Patient name (secondary) */}
        {secondaryName && (
          <Box display="flex" alignItems="center" gap={0.5} mb={compact ? 0.5 : 1}>
            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {secondaryName}
            </Typography>
          </Box>
        )}

        {/* Row 5: Organization */}
        {organizationName && (
          <Box display="flex" alignItems="center" gap={0.5} mb={compact ? 0.5 : 1}>
            <LocalHospitalIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {organizationName}
            </Typography>
          </Box>
        )}

        {/* Row 6: Chief Complaint */}
        {chiefComplaint && !compact && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {chiefComplaint}
          </Typography>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ flexWrap: 'wrap', gap: 0.5, px: 1, py: 0.5 }}>
        {/* Join Telehealth */}
        {canJoin && onJoinTelehealth && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<VideocamIcon />}
            onClick={() => onJoinTelehealth(telehealthLink)}
          >
            Join
          </Button>
        )}

        {/* View Detail */}
        {onViewDetail && (
          <Button size="small" onClick={() => onViewDetail(_id)}>
            View
          </Button>
        )}

        {/* Cancel */}
        {canCancel && (
          <Button
            size="small"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => onCancel(_id)}
          >
            Cancel
          </Button>
        )}

        {/* Reschedule */}
        {canReschedule && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<EventRepeatIcon />}
            onClick={() => onReschedule(appointment)}
          >
            Reschedule
          </Button>
        )}

        {/* Check In (provider action) */}
        {canCheckIn && (
          <Button
            size="small"
            color="success"
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => onCheckIn(_id)}
          >
            Check In
          </Button>
        )}

        {/* Complete with Outcome (provider action) */}
        {canComplete && (
          <Button
            size="small"
            color="success"
            variant="contained"
            startIcon={<DoneAllIcon />}
            onClick={() => onComplete(appointment)}
          >
            Complete
          </Button>
        )}

        {/* Send Reminder (provider action) */}
        {canSendReminder && (
          <Button
            size="small"
            color="warning"
            variant="outlined"
            startIcon={<NotificationsActiveIcon />}
            onClick={() => onSendReminder(appointment)}
          >
            Remind
          </Button>
        )}
      </CardActions>
    </Card>
  )
}

export default AppointmentCard
