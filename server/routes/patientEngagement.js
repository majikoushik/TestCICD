const express = require('express');
const router = express.Router();
const PatientNotification = require('../models/PatientNotification');
const NotificationTemplate = require('../models/NotificationTemplate');
const Patient = require('../models/Patient');
const patientEngagementService = require('../services/patientEngagementService');

// GET / - Get notifications sent to patients by this provider
// Supports filtering by patientId, status, type and pagination
router.get('/', async (req, res) => {
  try {
    const { patientId, status, type, page = 1, limit = 20 } = req.query;

    const filter = { sentBy: req.user._id };

    if (patientId) {
      filter.patientId = patientId;
    }

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      PatientNotification.find(filter)
        .populate('patientId', 'firstName lastName dateOfBirth')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PatientNotification.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Error fetching provider notifications:', err);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
});

// GET /templates - Get active notification templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await NotificationTemplate.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      data: templates,
    });
  } catch (err) {
    console.error('Error fetching notification templates:', err);
    res.status(500).json({ success: false, message: 'Server error fetching templates' });
  }
});

// GET /my-patients/notifications - Get all notifications for provider's patients
// Patients where primaryProvider === req.user._id
router.get('/my-patients/notifications', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    // Find all patients where this provider is the primary provider
    const patients = await Patient.find({ primaryProvider: req.user._id }).select('_id');
    const patientIds = patients.map((p) => p._id);

    const filter = { patientId: { $in: patientIds } };

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      PatientNotification.find(filter)
        .populate('patientId', 'firstName lastName dateOfBirth')
        .populate('sentBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PatientNotification.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Error fetching patients notifications:', err);
    res.status(500).json({ success: false, message: 'Server error fetching patient notifications' });
  }
});

// POST /send - Send a notification to a patient
router.post('/send', async (req, res) => {
  try {
    const { patientId, templateId, title, message, channels, priority } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one channel is required' });
    }

    // Look up patient
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Validate provider has access to patient:
    // Either primaryProvider matches or patient exists in provider's referrals
    const isPrimaryProvider =
      patient.primaryProvider && patient.primaryProvider.toString() === req.user._id.toString();

    const isReferringProvider =
      patient.referrals &&
      patient.referrals.some(
        (ref) =>
          ref.toString() === req.user._id.toString() ||
          (ref.providerId && ref.providerId.toString() === req.user._id.toString())
      );

    if (!isPrimaryProvider && !isReferringProvider) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to send notifications to this patient',
      });
    }

    // Optionally fetch template for additional metadata
    let template = null;
    if (templateId) {
      template = await NotificationTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({ success: false, message: 'Notification template not found' });
      }
    }

    // Build the notification object
    const notificationData = {
      patientId: patient._id,
      sentBy: req.user._id,
      templateId: template ? template._id : undefined,
      title,
      message,
      channels,
      priority: priority || 'normal',
      status: 'pending',
      sentAt: new Date(),
    };

    // Call the service to send the notification (handles channel dispatching)
    const sendResult = await patientEngagementService.sendPatientNotification({
      patientEmail: patient.email,
      patientPhone: patient.phone,
      deviceToken: patient.deviceToken || null,
      title: notificationData.title,
      message: notificationData.message,
      channels: notificationData.channels,
    });

    // Update status based on send result
    notificationData.status = sendResult.overall !== 'failed' ? 'sent' : 'failed';

    // Persist the notification record
    const notification = new PatientNotification(notificationData);
    await notification.save();

    await notification.populate('patientId', 'firstName lastName dateOfBirth');

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: notification,
    });
  } catch (err) {
    console.error('Error sending patient notification:', err);
    res.status(500).json({ success: false, message: 'Server error sending notification' });
  }
});

// GET /:id - Get single notification detail
router.get('/:id', async (req, res) => {
  try {
    const notification = await PatientNotification.findById(req.params.id)
      .populate('patientId', 'firstName lastName dateOfBirth contactInfo')
      .populate('sentBy', 'firstName lastName')
      .populate('templateId', 'name type');

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Ensure the requesting provider either sent this notification
    // or is the primary provider of the patient
    const isSender = notification.sentBy._id.toString() === req.user._id.toString();

    const patient = await Patient.findById(notification.patientId._id).select('primaryProvider');
    const isPrimaryProvider =
      patient && patient.primaryProvider && patient.primaryProvider.toString() === req.user._id.toString();

    if (!isSender && !isPrimaryProvider) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this notification',
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (err) {
    console.error('Error fetching notification:', err);
    res.status(500).json({ success: false, message: 'Server error fetching notification' });
  }
});

// POST /:id/resend - Resend a notification
router.post('/:id/resend', async (req, res) => {
  try {
    const originalNotification = await PatientNotification.findById(req.params.id).populate(
      'patientId'
    );

    if (!originalNotification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Validate provider access — must be the original sender or primary provider
    const isSender = originalNotification.sentBy.toString() === req.user._id.toString();

    const patient = await Patient.findById(originalNotification.patientId._id).select(
      'primaryProvider referrals'
    );

    const isPrimaryProvider =
      patient && patient.primaryProvider && patient.primaryProvider.toString() === req.user._id.toString();

    if (!isSender && !isPrimaryProvider) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to resend this notification',
      });
    }

    // Build resend notification data from original
    const resendData = {
      patientId: originalNotification.patientId._id,
      sentBy: req.user._id,
      templateId: originalNotification.templateId,
      title: originalNotification.title,
      message: originalNotification.message,
      channels: originalNotification.channels,
      priority: originalNotification.priority || 'normal',
      status: 'pending',
      sentAt: new Date(),
      originalNotificationId: originalNotification._id,
    };

    // Attempt to resend via service
    const sendResult = await patientEngagementService.sendPatientNotification({
      patientEmail: originalNotification.patientId.email || originalNotification.patientEmail,
      patientPhone: originalNotification.patientId.phone || originalNotification.patientPhone,
      deviceToken: originalNotification.patientId.deviceToken || null,
      title: resendData.title,
      message: resendData.message,
      channels: resendData.channels,
    });

    resendData.status = sendResult.overall !== 'failed' ? 'sent' : 'failed';

    // Save new notification record for the resend
    const resendNotification = new PatientNotification(resendData);
    await resendNotification.save();

    await resendNotification.populate('patientId', 'firstName lastName dateOfBirth');

    res.status(201).json({
      success: true,
      message: 'Notification resent successfully',
      data: resendNotification,
    });
  } catch (err) {
    console.error('Error resending notification:', err);
    res.status(500).json({ success: false, message: 'Server error resending notification' });
  }
});

module.exports = router;
