const express = require('express');
const router = express.Router();
const Appointment = require('../../models/Appointment');

// GET /stats - Platform-wide stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();

    const [total, completed, cancelled, noShow, upcoming] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.countDocuments({ status: 'no_show' }),
      Appointment.countDocuments({
        status: { $in: ['scheduled', 'confirmed'] },
        scheduledDate: { $gt: now }
      })
    ]);

    const noShowRate =
      completed + noShow > 0
        ? Math.round((noShow / (completed + noShow)) * 100 * 10) / 10
        : 0;

    const avgUtilizationPct =
      total - cancelled > 0
        ? Math.round((completed / (total - cancelled)) * 100 * 10) / 10
        : 0;

    const topProviders = await Appointment.aggregate([
      { $group: { _id: '$providerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'providerInfo'
        }
      },
      {
        $project: {
          _id: 0,
          providerId: '$_id',
          name: { $arrayElemAt: ['$providerInfo.name', 0] },
          count: 1
        }
      }
    ]);

    const appointmentsByType = await Appointment.aggregate([
      { $group: { _id: '$appointmentType', count: { $sum: 1 } } },
      { $project: { _id: 0, appointmentType: '$_id', count: 1 } }
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTrend = await Appointment.aggregate([
      { $match: { scheduledDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$scheduledDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } }
    ]);

    return res.json({
      success: true,
      data: {
        total,
        completed,
        cancelled,
        noShow,
        upcoming,
        noShowRate,
        avgUtilizationPct,
        topProviders,
        appointmentsByType,
        recentTrend
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /no-show-report - No-show report grouped by provider
router.get('/no-show-report', async (req, res) => {
  try {
    const { startDate, endDate, providerId } = req.query;

    const filter = { status: 'no_show' };

    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }

    if (providerId) {
      filter.providerId = providerId;
    }

    const noShowAppointments = await Appointment.find(filter).lean();

    const providerMap = {};
    for (const appt of noShowAppointments) {
      const pid = String(appt.providerId);
      if (!providerMap[pid]) {
        providerMap[pid] = {
          providerId: appt.providerId,
          providerName: appt.providerName || null,
          noShowCount: 0,
          patientList: []
        };
      }
      providerMap[pid].noShowCount += 1;
      providerMap[pid].patientList.push({
        patientId: appt.patientId,
        patientName: appt.patientName,
        scheduledDate: appt.scheduledDate,
        appointmentId: appt._id
      });
    }

    const report = Object.values(providerMap);
    const total = noShowAppointments.length;

    return res.json({ success: true, data: { report, total } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET / - List appointments with filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      status,
      providerId,
      patientId,
      appointmentType,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 15
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (providerId) filter.providerId = providerId;
    if (patientId) filter.patientId = patientId;
    if (appointmentType) filter.appointmentType = appointmentType;

    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { patientName: regex },
        { providerName: regex },
        { appointmentId: regex }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter).sort({ scheduledDate: -1 }).skip(skip).limit(limitNum).lean(),
      Appointment.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: { appointments, total, page: pageNum, limit: limitNum }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /provider-utilization - Per-provider fill rates, no-show/cancel counts, peak hours
router.get('/provider-utilization', async (req, res) => {
  try {
    const range = req.query.range || '30d';
    const rangeDays = { '7d': 7, '30d': 30, '90d': 90, 'ytd': new Date().getMonth() * 30 + 1 }[range] || 30;

    const since = new Date();
    since.setDate(since.getDate() - rangeDays);

    // Aggregate per-provider counts in one pass
    const providerAgg = await Appointment.aggregate([
      { $match: { scheduledDate: { $gte: since } } },
      {
        $group: {
          _id: '$providerId',
          providerName: { $first: '$providerName' },
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          noShow:    { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          avgDuration: { $avg: '$duration' },
        }
      },
      { $sort: { total: -1 } }
    ]);

    const providers = providerAgg.map(p => {
      const booked   = p.total;
      const fillRate = booked > 0 ? Math.round((p.completed / booked) * 100) : 0;
      const cancelRate = booked > 0 ? Math.round((p.cancelled / booked) * 100) : 0;
      return {
        providerId:   String(p._id),
        providerName: p.providerName || String(p._id),
        totalSlots:   booked,
        bookedSlots:  booked,
        completed:    p.completed,
        noShow:       p.noShow,
        cancelled:    p.cancelled,
        avgDuration:  p.avgDuration ? Math.round(p.avgDuration) : 0,
        tokensEarned: p.completed * 15,
        fillRate,
        cancelRate,
      };
    });

    const sortedByFill  = [...providers].sort((a, b) => b.fillRate - a.fillRate);
    const avgFillRate   = providers.length ? Math.round(providers.reduce((s, p) => s + p.fillRate, 0) / providers.length) : 0;
    const topPerformer  = sortedByFill[0]?.providerName || '—';
    const belowThreshold = providers.filter(p => p.fillRate < 60).length;

    // Peak hours — count appointments by hour of scheduledDate
    const hourAgg = await Appointment.aggregate([
      { $match: { scheduledDate: { $gte: since } } },
      { $group: { _id: { $hour: '$scheduledDate' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const HOUR_LABELS = {
      8: '8:00 – 9:00 AM', 9: '9:00 – 10:00 AM', 10: '10:00 – 11:00 AM',
      11: '11:00 – 12:00 PM', 13: '1:00 – 2:00 PM', 14: '2:00 – 3:00 PM',
      15: '3:00 – 4:00 PM', 16: '4:00 – 5:00 PM',
    };
    const peakHours = hourAgg.map(h => ({
      hour:  h._id,
      label: HOUR_LABELS[h._id] || `${h._id}:00`,
      count: h.count,
    }));

    return res.json({
      success: true,
      data: {
        range,
        rangeDays,
        summary: { totalProviders: providers.length, avgFillRate, topPerformer, belowThreshold },
        providers: sortedByFill,
        peakHours,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /:id - Get single appointment
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).lean();
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    return res.json({ success: true, data: appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id - Admin override update
router.put('/:id', async (req, res) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id - Hard delete
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    return res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
