const express = require('express');
const router = express.Router();
const ProviderSchedule = require('../models/ProviderSchedule');
const ScheduleException = require('../models/ScheduleException');
const appointmentSlotService = require('../services/appointmentSlotService');

// GET /:providerId/availability
router.get('/:providerId/availability', async (req, res) => {
  try {
    const { providerId } = req.params;
    const schedules = await ProviderSchedule.find({ providerId, isActive: true });
    return res.json({ success: true, data: { schedules } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:providerId/availability
router.post('/:providerId/availability', async (req, res) => {
  try {
    const { providerId } = req.params;
    const isOwner = req.user && req.user._id && req.user._id.toString() === providerId;
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: you can only manage your own schedule' });
    }

    const scheduleInput = Array.isArray(req.body) ? req.body : [req.body];
    const savedSchedules = [];

    for (const scheduleData of scheduleInput) {
      const { dayOfWeek, ...rest } = scheduleData;
      const updated = await ProviderSchedule.findOneAndUpdate(
        { providerId, dayOfWeek },
        { ...rest, providerId, dayOfWeek },
        { upsert: true, new: true }
      );
      savedSchedules.push(updated);
    }

    return res.json({ success: true, data: { schedules: savedSchedules } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:providerId/availability/:dayOfWeek
router.delete('/:providerId/availability/:dayOfWeek', async (req, res) => {
  try {
    const { providerId, dayOfWeek } = req.params;
    await ProviderSchedule.findOneAndUpdate(
      { providerId, dayOfWeek },
      { isActive: false },
      { new: true }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /:providerId/exceptions
router.get('/:providerId/exceptions', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { startDate, endDate } = req.query;

    const filter = { providerId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const exceptions = await ScheduleException.find(filter).sort({ date: 1 });
    return res.json({ success: true, data: { exceptions } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:providerId/exceptions
router.post('/:providerId/exceptions', async (req, res) => {
  try {
    const { providerId } = req.params;
    const isOwner = req.user && req.user._id && req.user._id.toString() === providerId;
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: you can only manage your own schedule' });
    }

    const { date, type, startTime, endTime, reason, notes } = req.body;
    const exception = await ScheduleException.create({
      providerId,
      date,
      type,
      startTime,
      endTime,
      reason,
      notes,
    });

    return res.status(201).json({ success: true, data: exception });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:providerId/exceptions/:exceptionId
router.delete('/:providerId/exceptions/:exceptionId', async (req, res) => {
  try {
    const { providerId, exceptionId } = req.params;
    const exception = await ScheduleException.findById(exceptionId);

    if (!exception) {
      return res.status(404).json({ success: false, message: 'Exception not found' });
    }

    const isOwner = req.user && req.user._id && req.user._id.toString() === providerId;
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: you can only manage your own schedule' });
    }

    await ScheduleException.findByIdAndDelete(exceptionId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /:providerId/slots
router.get('/:providerId/slots', async (req, res) => {
  try {
    const { providerId } = req.params;
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const startDate = req.query.startDate ? new Date(req.query.startDate) : today;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : thirtyDaysLater;

    const slots = await appointmentSlotService.getAvailableSlots(providerId, startDate, endDate);
    return res.json({ success: true, data: { slots, providerId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
