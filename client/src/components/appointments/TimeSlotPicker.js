import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import NightsStayOutlinedIcon from '@mui/icons-material/NightsStayOutlined'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hourStr, minuteStr] = timeStr.split(':')
  let hour = parseInt(hourStr, 10)
  const minute = minuteStr || '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  if (hour === 0) hour = 12
  else if (hour > 12) hour = hour - 12
  return `${hour}:${minute} ${period}`
}

function formatDateLabel(dateStr) {
  if (!dateStr) return { dayName: '', monthAbbr: '', dayNum: '' }
  const date = new Date(dateStr + 'T00:00:00')
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
    monthAbbr: date.toLocaleDateString('en-US', { month: 'short' }),
    dayNum: date.getDate(),
  }
}

function formatSlotPanelDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function SlotItem({ slot, selected, unavailable, onSelect }) {
  return (
    <Box
      data-testid={`time-slot-${slot.startTime}`}
      data-available={!unavailable}
      onClick={() => !unavailable && onSelect && onSelect(slot)}
      sx={{
        px: 1.75,
        py: 0.875,
        borderRadius: 1.5,
        border: '1.5px solid',
        borderColor: unavailable ? 'grey.200' : selected ? 'primary.main' : 'primary.light',
        bgcolor: unavailable ? 'grey.50' : selected ? 'primary.main' : 'transparent',
        color: unavailable ? 'text.disabled' : selected ? '#fff' : 'primary.dark',
        cursor: unavailable ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        fontSize: '0.8125rem',
        fontWeight: selected ? 600 : 400,
        minWidth: 88,
        textAlign: 'center',
        position: 'relative',
        transition: 'all 0.15s ease',
        '&:hover': unavailable
          ? {}
          : {
              bgcolor: selected ? 'primary.dark' : 'action.hover',
              borderColor: 'primary.main',
              transform: 'translateY(-1px)',
              boxShadow: 2,
            },
      }}
    >
      {formatTime(slot.startTime)}
      {unavailable && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '12%',
            right: '12%',
            height: '1.5px',
            bgcolor: 'grey.400',
            transform: 'translateY(-50%)',
          }}
        />
      )}
    </Box>
  )
}

function SectionHeader({ icon, label, availableCount }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 1.5,
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {icon}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: 'text.secondary',
          fontSize: '0.7rem',
        }}
      >
        {label}
      </Typography>
      <Chip
        label={`${availableCount} open`}
        size="small"
        color={availableCount > 0 ? 'success' : 'default'}
        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
      />
    </Box>
  )
}

export default function TimeSlotPicker({
  selectedDate,
  onDateChange,
  selectedSlot,
  onSlotSelect,
  availableDates,
  loading,
  error,
}) {
  const todayStr = new Date().toISOString().slice(0, 10)

  const selectedDateEntry = availableDates
    ? availableDates.find((d) => d.date === selectedDate)
    : null

  const slots = selectedDateEntry ? selectedDateEntry.slots || [] : []

  const isUnavailable = (slot) =>
    slot.booked || slot.isBooked || slot.status === 'booked' || slot.available === false

  const morningSlots = slots.filter(
    (s) => parseInt((s.startTime || '').split(':')[0], 10) < 12
  )
  const afternoonSlots = slots.filter(
    (s) => parseInt((s.startTime || '').split(':')[0], 10) >= 12
  )

  const isSelected = (slot) =>
    !!selectedSlot &&
    selectedSlot.startTime === slot.startTime &&
    selectedSlot.endTime === slot.endTime

  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: 360 }}>
      {/* ── Date sidebar ── */}
      <Paper
        variant="outlined"
        sx={{
          width: 120,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 0.875,
            bgcolor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: 'text.secondary',
              fontSize: '0.625rem',
            }}
          >
            Date
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 0.75,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            '&::-webkit-scrollbar': { width: 3 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 2 },
          }}
        >
          {availableDates && availableDates.length > 0 ? (
            availableDates.map((dateEntry) => {
              const { dayName, monthAbbr, dayNum } = formatDateLabel(dateEntry.date)
              const isSel = selectedDate === dateEntry.date
              const isToday = dateEntry.date === todayStr
              return (
                <Box
                  key={dateEntry.date}
                  data-testid={`date-option-${dateEntry.date}`}
                  onClick={() => onDateChange && onDateChange(dateEntry.date)}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: '1.5px solid',
                    borderColor: isSel
                      ? 'primary.main'
                      : isToday
                      ? 'primary.light'
                      : 'transparent',
                    bgcolor: isSel ? 'primary.main' : 'transparent',
                    color: isSel ? '#fff' : 'text.primary',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: isSel ? 'primary.dark' : 'action.hover',
                      borderColor: isSel ? 'primary.dark' : 'primary.light',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      display: 'block',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: '0.6rem',
                      letterSpacing: 0.5,
                      opacity: isSel ? 0.8 : 0.55,
                      lineHeight: 1.2,
                    }}
                  >
                    {dayName}
                  </Typography>
                  <Typography
                    sx={{
                      display: 'block',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      lineHeight: 1.15,
                    }}
                  >
                    {dayNum}
                  </Typography>
                  <Typography
                    sx={{
                      display: 'block',
                      fontSize: '0.65rem',
                      opacity: isSel ? 0.8 : 0.6,
                      lineHeight: 1.2,
                    }}
                  >
                    {monthAbbr}
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      px: 0.5,
                      py: 0.15,
                      borderRadius: 0.75,
                      bgcolor: isSel
                        ? 'rgba(255,255,255,0.25)'
                        : dateEntry.availableCount > 5
                        ? 'success.light'
                        : dateEntry.availableCount > 0
                        ? 'warning.light'
                        : 'error.light',
                      display: 'inline-block',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        color: isSel
                          ? '#fff'
                          : dateEntry.availableCount > 5
                          ? 'success.dark'
                          : dateEntry.availableCount > 0
                          ? 'warning.dark'
                          : 'error.dark',
                      }}
                    >
                      {dateEntry.availableCount}
                    </Typography>
                  </Box>
                </Box>
              )
            })
          ) : (
            <Box
              sx={{
                py: 4,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                No dates available
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Slot panel ── */}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: selectedDate ? 'text.primary' : 'text.secondary' }}
          >
            {selectedDate
              ? formatSlotPanelDate(selectedDate)
              : 'Select a date to view available times'}
          </Typography>
          {selectedDate && slots.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {slots.filter((s) => !isUnavailable(s)).length} of {slots.length} slots available
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, p: 2.5, overflowY: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!selectedDate && !error && (
            <Box
              sx={{
                minHeight: 240,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                opacity: 0.5,
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Choose a date from the panel on the left
                <br />
                to view available appointment times
              </Typography>
            </Box>
          )}

          {selectedDate && loading && (
            <Box
              sx={{
                minHeight: 240,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <CircularProgress size={36} thickness={4} />
              <Typography variant="body2" color="text.secondary">
                Loading available times…
              </Typography>
            </Box>
          )}

          {selectedDate && !loading && slots.length === 0 && (
            <Box
              sx={{
                minHeight: 240,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                opacity: 0.55,
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary">
                No time slots available for this date
              </Typography>
            </Box>
          )}

          {selectedDate && !loading && slots.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {morningSlots.length > 0 && (
                <Box>
                  <SectionHeader
                    icon={<WbSunnyOutlinedIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                    label="Morning"
                    availableCount={morningSlots.filter((s) => !isUnavailable(s)).length}
                  />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                    {morningSlots.map((slot, i) => (
                      <SlotItem
                        key={i}
                        slot={slot}
                        selected={isSelected(slot)}
                        unavailable={isUnavailable(slot)}
                        onSelect={onSlotSelect}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {afternoonSlots.length > 0 && (
                <Box>
                  <SectionHeader
                    icon={<NightsStayOutlinedIcon sx={{ fontSize: 16, color: 'info.main' }} />}
                    label="Afternoon"
                    availableCount={afternoonSlots.filter((s) => !isUnavailable(s)).length}
                  />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                    {afternoonSlots.map((slot, i) => (
                      <SlotItem
                        key={i}
                        slot={slot}
                        selected={isSelected(slot)}
                        unavailable={isUnavailable(slot)}
                        onSelect={onSlotSelect}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
