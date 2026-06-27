const express = require('express');
const router = express.Router();
const PatientNotification = require('../../models/PatientNotification');
const NotificationTemplate = require('../../models/NotificationTemplate');
const NotificationCampaign = require('../../models/NotificationCampaign');
const Patient = require('../../models/Patient');
const patientEngagementService = require('../../services/patientEngagementService');

// ============================================================
// TEMPLATES (must come before /:id to avoid routing conflicts)
// ============================================================

// GET /templates - List templates
router.get('/templates', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const templates = await NotificationTemplate.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /templates/:id - Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /templates - Create new template
router.post('/templates', async (req, res) => {
  try {
    const { name, description, type, subject, body, smsBody, pushTitle, defaultChannels, variables } = req.body;
    const template = new NotificationTemplate({
      name,
      description,
      type,
      subject,
      body,
      smsBody,
      pushTitle,
      defaultChannels,
      variables,
      createdBy: req.user ? req.user._id : undefined,
      isActive: true,
    });
    await template.save();
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /templates/:id - Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /templates/:id - Soft delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deactivated', data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /templates/:id/preview - Preview template with sample variables
router.post('/templates/:id/preview', async (req, res) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const sampleVars = req.body.variables || {};

    const replacePlaceholders = (text) => {
      if (!text) return text;
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return sampleVars[key] !== undefined ? sampleVars[key] : match;
      });
    };

    res.json({
      success: true,
      data: {
        body: replacePlaceholders(template.body),
        smsBody: replacePlaceholders(template.smsBody),
        subject: replacePlaceholders(template.subject),
        pushTitle: replacePlaceholders(template.pushTitle),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// CAMPAIGNS (must come before /:id to avoid routing conflicts)
// ============================================================

// GET /campaigns - List campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      NotificationCampaign.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      NotificationCampaign.countDocuments(filter),
    ]);

    res.json({ success: true, data: { campaigns, total, page, limit } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /campaigns/:id - Get campaign with notifications populated
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await NotificationCampaign.findById(req.params.id)
      .populate('notifications');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /campaigns - Create campaign draft
router.post('/campaigns', async (req, res) => {
  try {
    const { name, description, templateId, customMessage, targetCriteria, channels, scheduledAt } = req.body;
    const campaign = new NotificationCampaign({
      name,
      description,
      templateId,
      customMessage,
      targetCriteria,
      channels,
      scheduledAt,
      status: 'draft',
      createdBy: req.user ? req.user._id : undefined,
    });
    await campaign.save();
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /campaigns/:id - Update campaign (only if draft)
router.put('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await NotificationCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (campaign.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft campaigns can be updated' });
    }
    Object.assign(campaign, req.body, { updatedAt: new Date() });
    await campaign.save();
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /campaigns/:id/launch - Launch campaign
router.post('/campaigns/:id/launch', async (req, res) => {
  try {
    const campaign = await NotificationCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (campaign.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft campaigns can be launched' });
    }

    campaign.status = 'running';
    await campaign.save();

    // Build patient query from targetCriteria
    const patientFilter = {};
    if (campaign.targetCriteria) {
      if (campaign.targetCriteria.ageMin || campaign.targetCriteria.ageMax) {
        patientFilter.age = {};
        if (campaign.targetCriteria.ageMin) patientFilter.age.$gte = campaign.targetCriteria.ageMin;
        if (campaign.targetCriteria.ageMax) patientFilter.age.$lte = campaign.targetCriteria.ageMax;
      }
      if (campaign.targetCriteria.gender) patientFilter.gender = campaign.targetCriteria.gender;
      if (campaign.targetCriteria.condition) patientFilter.conditions = { $in: [campaign.targetCriteria.condition] };
      if (campaign.targetCriteria.tags && campaign.targetCriteria.tags.length) {
        patientFilter.tags = { $in: campaign.targetCriteria.tags };
      }
    }

    const patients = await Patient.find(patientFilter);

    let sent = 0;
    let failed = 0;
    const notificationIds = [];

    for (const patient of patients) {
      try {
        const notification = new PatientNotification({
          patientId: patient._id,
          patientName: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
          patientEmail: patient.email,
          patientPhone: patient.phone,
          title: campaign.name,
          message: campaign.customMessage || '',
          type: 'campaign',
          priority: 'normal',
          channels: campaign.channels || ['email'],
          campaignId: campaign._id,
          status: 'pending',
        });

        await patientEngagementService.sendPatientNotification({
          patientId: patient._id,
          patientName: notification.patientName,
          patientEmail: notification.patientEmail,
          patientPhone: notification.patientPhone,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          channels: notification.channels,
        });

        notification.status = 'sent';
        notification.sentAt = new Date();
        await notification.save();
        notificationIds.push(notification._id);
        sent++;
      } catch (sendErr) {
        failed++;
      }
    }

    campaign.status = 'completed';
    campaign.stats = {
      totalTargeted: patients.length,
      sent,
      failed,
      completedAt: new Date(),
    };
    if (campaign.notifications) {
      campaign.notifications = notificationIds;
    }
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign launched and completed',
      data: campaign,
      stats: { totalTargeted: patients.length, sent, failed },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /campaigns/:id/cancel - Cancel campaign
router.post('/campaigns/:id/cancel', async (req, res) => {
  try {
    const campaign = await NotificationCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    campaign.status = 'cancelled';
    campaign.updatedAt = new Date();
    await campaign.save();
    res.json({ success: true, message: 'Campaign cancelled', data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /campaigns/:id - Delete campaign (only if draft or cancelled)
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await NotificationCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (!['draft', 'cancelled'].includes(campaign.status)) {
      return res.status(400).json({ success: false, message: 'Only draft or cancelled campaigns can be deleted' });
    }
    await NotificationCampaign.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================

// GET /stats - Engagement statistics (must come before /:id)
router.get('/stats', async (req, res) => {
  try {
    const [total, sent, _pending, _failed, read] = await Promise.all([
      PatientNotification.countDocuments(),
      PatientNotification.countDocuments({ status: 'sent' }),
      PatientNotification.countDocuments({ status: 'pending' }),
      PatientNotification.countDocuments({ status: 'failed' }),
      PatientNotification.countDocuments({ status: 'read' }),
    ]);

    const smsDelivered = await PatientNotification.countDocuments({ channels: 'sms', status: { $in: ['sent', 'read'] } });
    const emailDelivered = await PatientNotification.countDocuments({ channels: 'email', status: { $in: ['sent', 'read'] } });
    const pushDelivered = await PatientNotification.countDocuments({ channels: 'push', status: { $in: ['sent', 'read'] } });

    const deliveryRate = total > 0 ? Math.round(((sent + read) / total) * 100) : 0;

    const notificationsByType = await PatientNotification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
    ]);

    const notificationsByStatus = await PatientNotification.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30Days = await PatientNotification.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]);

    res.json({
      success: true,
      data: {
        totalSent: sent + read,
        deliveryRate,
        smsDelivered,
        emailDelivered,
        pushDelivered,
        notificationsByType,
        notificationsByStatus,
        last30Days,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET / - List notifications with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.patientId) filter.patientId = req.query.patientId;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { message: { $regex: req.query.search, $options: 'i' } },
        { patientName: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [notifications, total, statCounts] = await Promise.all([
      PatientNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PatientNotification.countDocuments(filter),
      PatientNotification.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statsMap = { total: 0, sent: 0, pending: 0, failed: 0, read: 0 };
    let grandTotal = 0;
    for (const s of statCounts) {
      grandTotal += s.count;
      if (statsMap.hasOwnProperty(s._id)) statsMap[s._id] = s.count;
    }
    statsMap.total = grandTotal;

    res.json({
      success: true,
      data: {
        notifications,
        total,
        stats: statsMap,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /:id - Get single notification
router.get('/:id', async (req, res) => {
  try {
    const notification = await PatientNotification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST / - Send new patient notification
router.post('/', async (req, res) => {
  try {
    const { patientId, title, message, type, priority, channels, scheduledAt } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const patientName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    const patientEmail = patient.email;
    const patientPhone = patient.phone;

    await patientEngagementService.sendPatientNotification({
      patientId,
      patientName,
      patientEmail,
      patientPhone,
      title,
      message,
      type,
      priority,
      channels,
      scheduledAt,
    });

    const notification = new PatientNotification({
      patientId,
      patientName,
      patientEmail,
      patientPhone,
      title,
      message,
      type,
      priority,
      channels,
      scheduledAt,
      status: scheduledAt ? 'pending' : 'sent',
      sentAt: scheduledAt ? undefined : new Date(),
    });

    await notification.save();
    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:id/resend - Resend a notification
router.post('/:id/resend', async (req, res) => {
  try {
    const notification = await PatientNotification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

    await patientEngagementService.sendPatientNotification({
      patientId: notification.patientId,
      patientName: notification.patientName,
      patientEmail: notification.patientEmail,
      patientPhone: notification.patientPhone,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      channels: notification.channels,
    });

    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();

    res.json({ success: true, message: 'Notification resent', data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id - Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await PatientNotification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
