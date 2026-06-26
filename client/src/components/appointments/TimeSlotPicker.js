import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hourStr, minuteStr] = timeStr.split(':')
  let hour = parseInt(hourStr, 10)
  const minute = minuteStr || '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  if (hour === 0) {
    hour = 12
  } else if (hour > 12) {
    hour = hour - 12
  }
  return `${hour}:${minute} ${period}`
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { dayName, monthDay }
}

export default function TimeSlotPicker({
  providerId,
  selectedDate,
  onDateChange,
  selectedSlot,
  onSlotSelect,
  appointmentType,
  availableDates,
  loading,
  error
}) {
  const selectedDateEntry = availableDates
    ? availableDates.find((d) => d.date === selectedDate)
    : null

  const slots = selectedDateEntry ? selectedDateEntry.slots || [] : []

  const morningSlots = slots.filter((slot) => {
    const hour = parseInt((slot.startTime || '').split(':')[0], 10)
    return hour < 12
  })

  const afternoonSlots = slots.filter((slot) => {
    const hour = parseInt((slot.startTime || '').split(':')[0], 10)
    return hour >= 12
  })

  const isSlotSelected = (slot) => {
    if (!selectedSlot) return false
    return selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Paper sx={{ width: 200, p: 1, maxHeight: 400, overflow: 'auto' }}>
        {availableDates && availableDates.length > 0 ? (
          availableDates.map((dateEntry) => {
            const { dayName, monthDay } = formatDateLabel(dateEntry.date)
            const isSelected = selectedDate === dateEntry.date
            return (
              <Button
                key={dateEntry.date}
                variant={isSelected ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => onDateChange && onDateChange(dateEntry.date)}
                sx={{ mb: 0.5, flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', py: 0.75 }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                  {dayName}
                </Typography>
                <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
                  {monthDay}
                </Typography>
                <Typography variant="caption" sx={{ lineHeight: 1.2, opacity: 0.8 }}>
                  {dateEntry.availableCount} slot{dateEntry.availableCount !== 1 ? 's' : ''}
                </Typography>
              </Button>
            )
          })
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            No available dates
          </Typography>
        )}
      </Paper>

      <Box sx={{ flex: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!selectedDate && !error && (
          <Typography variant="body2" color="text.secondary">
            Select a date to see available slots
          </Typography>
        )}

        {selectedDate && loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {selectedDate && !loading && slots.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No slots available
          </Typography>
        )}

        {selectedDate && !loading && slots.length > 0 && (
          <Box>
            {morningSlots.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Morning
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {morningSlots.map((slot, index) => {
                    const isBooked = slot.isBooked || slot.status === 'booked'
                    const isSelected = isSlotSelected(slot)
                    return (
                      <Button
                        key={index}
                        variant={isSelected ? 'contained' : 'outlined'}
                        disabled={isBooked}
                        onClick={() => !isBooked && onSlotSelect && onSlotSelect(slot)}
                        size="small"
                        sx={isBooked ? { color: 'grey.500', borderColor: 'grey.300' } : {}}
                      >
                        {isBooked ? 'Booked' : formatTime(slot.startTime)}
                      </Button>
                    )
                  })}
                </Box>
              </Box>
            )}

            {afternoonSlots.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Afternoon
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {afternoonSlots.map((slot, index) => {
                    const isBooked = slot.isBooked || slot.status === 'booked'
                    const isSelected = isSlotSelected(slot)
                    return (
                      <Button
                        key={index}
                        variant={isSelected ? 'contained' : 'outlined'}
                        disabled={isBooked}
                        onClick={() => !isBooked && onSlotSelect && onSlotSelect(slot)}
                        size="small"
                        sx={isBooked ? { color: 'grey.500', borderColor: 'grey.300' } : {}}
                      >
                        {isBooked ? 'Booked' : formatTime(slot.startTime)}
                      </Button>
                    )
                  })}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
