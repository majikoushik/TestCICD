'use strict';

const ProviderSchedule = require('../models/ProviderSchedule');
const ScheduleException = require('../models/ScheduleException');
const Appointment = require('../models/Appointment');

function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function dateToString(d) {
  return d.toISOString().split('T')[0];
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

async function generateDaySlots(providerId, date) {
  const d = new Date(date);
  const dateStr = dateToString(d);
  const dayOfWeek = d.getDay();

  const schedule = await ProviderSchedule.findOne({ providerId, dayOfWeek, isActive: true }).lean();
  if (!schedule) return [];

  const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
  const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
  const exception = await ScheduleException.findOne({
    providerId,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).lean();

  let workStart = parseTime(schedule.startTime);
  let workEnd = parseTime(schedule.endTime);

  if (exception) {
    if (exception.type === 'unavailable') return [];
    if ((exception.type === 'extra_hours' || exception.type === 'modified_hours') && exception.startTime && exception.endTime) {
      workStart = parseTime(exception.startTime);
      workEnd = parseTime(exception.endTime);
    }
  }

  const slotDuration = schedule.slotDurationMinutes || 30;
  const buffer = schedule.bufferMinutes || 5;
  const totalSlot = slotDuration + buffer;

  const theoreticalSlots = [];
  let current = workStart;
  while (current + slotDuration <= workEnd) {
    theoreticalSlots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + slotDuration),
    });
    current += totalSlot;
  }

  const existingAppts = await Appointment.find({
    providerId,
    scheduledDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'no_show'] }
  }).select('startTime endTime').lean();

  return theoreticalSlots.map(slot => {
    const slotStart = parseTime(slot.startTime);
    const slotEnd = parseTime(slot.endTime);
    const isBooked = existingAppts.some(appt => {
      const apptStart = parseTime(appt.startTime);
      const apptEnd = parseTime(appt.endTime);
      return slotStart < apptEnd && slotEnd > apptStart;
    });
    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      available: !isBooked,
      booked: isBooked,
    };
  });
}

async function getAvailableSlots(providerId, startDate, endDate) {
  const results = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  const maxDays = 60;
  let dayCount = 0;

  while (current <= end && dayCount < maxDays) {
    const slots = await generateDaySlots(providerId, current);
    const available = slots.filter(s => s.available);
    if (available.length > 0) {
      results.push({
        date: dateToString(current),
        slots,
        availableCount: available.length,
      });
    }
    current = addDays(current, 1);
    dayCount++;
  }

  return results;
}

async function isSlotAvailable(providerId, date, startTime, endTime) {
  const dateStr = typeof date === 'string' ? date : dateToString(date);
  const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
  const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

  const conflict = await Appointment.findOne({
    providerId,
    scheduledDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'no_show'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  }).lean();

  return !conflict;
}

async function getNextAvailableDate(providerId) {
  const today = new Date();
  const results = await getAvailableSlots(providerId, today, addDays(today, 30));
  if (results.length === 0) return null;
  const first = results[0];
  const firstSlot = first.slots.find(s => s.available);
  if (!firstSlot) return null;
  return { date: first.date, startTime: firstSlot.startTime };
}

module.exports = { generateDaySlots, getAvailableSlots, isSlotAvailable, getNextAvailableDate };
