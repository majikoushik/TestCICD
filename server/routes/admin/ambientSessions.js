const express = require('express');
const router = express.Router();
const AmbientSession = require('../../models/AmbientSession');

// GET /stats - Overall system-wide stats
// MUST come before /:id to avoid routing conflicts
router.get('/stats', async (req, res) => {
  try {
    const total = await AmbientSession.countDocuments();

    const byStatusAgg = await AmbientSession.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byStatus = { draft: 0, reviewing: 0, approved: 0, rejected: 0, submitted: 0 };
    byStatusAgg.forEach(({ _id, count }) => {
      if (_id && byStatus.hasOwnProperty(_id)) {
        byStatus[_id] = count;
      }
    });

    const byUrgencyAgg = await AmbientSession.aggregate([
      { $group: { _id: '$urgency', count: { $sum: 1 } } }
    ]);
    const byUrgency = {};
    byUrgencyAgg.forEach(({ _id, count }) => {
      if (_id) byUrgency[_id] = count;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30Days = await AmbientSession.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topProviders = await AmbientSession.aggregate([
      { $group: { _id: '$providerName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { providerName: '$_id', count: 1, _id: 0 } }
    ]);

    const avgDurationAgg = await AmbientSession.aggregate([
      { $match: { recordingDuration: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgDuration: { $avg: '$recordingDuration' } } }
    ]);
    const avgDuration = avgDurationAgg.length > 0 ? avgDurationAgg[0].avgDuration : 0;

    return res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byUrgency,
        last30Days,
        topProviders,
        avgDuration
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET / - List all sessions with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      status,
      urgency,
      providerId,
      patientId,
      search,
      page = 1,
      limit = 15
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (urgency) filter.urgencyClassification = urgency;
    if (providerId) filter.providerId = providerId;
    if (patientId) filter.patientId = patientId;
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { chiefComplaint: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [sessions, total] = await Promise.all([
      AmbientSession.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AmbientSession.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        sessions,
        total,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /:id - Get single session by _id
router.get('/:id', async (req, res) => {
  try {
    const session = await AmbientSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id - Admin can update any session
router.put('/:id', async (req, res) => {
  try {
    const session = await AmbientSession.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id - Admin can delete any session
router.delete('/:id', async (req, res) => {
  try {
    const session = await AmbientSession.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    return res.status(200).json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
