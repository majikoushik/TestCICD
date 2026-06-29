const express = require('express');
const router = express.Router();
const BroadcastMessage = require('../../models/BroadcastMessage');
const TargetedAlert = require('../../models/TargetedAlert');
const User = require('../../models/User');

// ─── Broadcast Messages ──────────────────────────────────────────────────────

router.get('/broadcast', async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const messages = await BroadcastMessage.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/broadcast/:id', async (req, res) => {
  try {
    const message = await BroadcastMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, error: 'Broadcast message not found' });
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/broadcast', async (req, res) => {
  try {
    const { title, content, sender, status, priority, category, targetAudience, scheduledAt } = req.body;
    const message = new BroadcastMessage({
      title,
      content,
      sender: sender || req.user?.name || 'Admin',
      status: status || 'draft',
      priority: priority || 'medium',
      category: category || 'general',
      targetAudience: targetAudience || 'all',
      scheduledAt: scheduledAt || null,
      createdBy: req.user?.id,
    });

    if (message.status === 'sent') {
      message.sentAt = new Date();
      const recipientCount = await User.countDocuments({ role: { $in: ['provider', 'admin', 'superadmin'] }, isActive: true });
      message.recipientCount = recipientCount;
    }

    await message.save();
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/broadcast/:id', async (req, res) => {
  try {
    const message = await BroadcastMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, error: 'Broadcast message not found' });

    const wasDraft = message.status === 'draft';
    Object.assign(message, req.body);

    if (wasDraft && message.status === 'sent' && !message.sentAt) {
      message.sentAt = new Date();
      const recipientCount = await User.countDocuments({ role: { $in: ['provider', 'admin', 'superadmin'] }, isActive: true });
      message.recipientCount = recipientCount;
    }

    await message.save();
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/broadcast/:id', async (req, res) => {
  try {
    const message = await BroadcastMessage.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ success: false, error: 'Broadcast message not found' });
    res.json({ success: true, data: { success: true, message: 'Broadcast message deleted successfully' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/broadcast/:id/send', async (req, res) => {
  try {
    const message = await BroadcastMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, error: 'Broadcast message not found' });
    if (message.status === 'sent') return res.status(400).json({ success: false, error: 'Message already sent' });

    message.status = 'sent';
    message.sentAt = new Date();
    const recipientCount = await User.countDocuments({ role: { $in: ['provider', 'admin', 'superadmin'] }, isActive: true });
    message.recipientCount = recipientCount;

    await message.save();
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Targeted Alerts ─────────────────────────────────────────────────────────

router.get('/alerts', async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const alerts = await TargetedAlert.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/alerts/:id', async (req, res) => {
  try {
    const alert = await TargetedAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, error: 'Targeted alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/alerts', async (req, res) => {
  try {
    const { title, content, sender, status, priority, category, recipients, relatedEntityId, relatedEntityType } = req.body;
    const alert = new TargetedAlert({
      title,
      content,
      sender: sender || req.user?.name || 'Admin',
      status: status || 'draft',
      priority: priority || 'medium',
      category: category || 'general',
      recipients: recipients || [],
      relatedEntityId: relatedEntityId || null,
      relatedEntityType: relatedEntityType || null,
      createdBy: req.user?.id,
    });

    if (alert.status === 'sent') {
      alert.sentAt = new Date();
    }

    await alert.save();
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/alerts/:id', async (req, res) => {
  try {
    const alert = await TargetedAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, error: 'Targeted alert not found' });

    const wasDraft = alert.status === 'draft';
    Object.assign(alert, req.body);

    if (wasDraft && alert.status === 'sent' && !alert.sentAt) {
      alert.sentAt = new Date();
    }

    await alert.save();
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/alerts/:id', async (req, res) => {
  try {
    const alert = await TargetedAlert.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ success: false, error: 'Targeted alert not found' });
    res.json({ success: true, data: { success: true, message: 'Targeted alert deleted successfully' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/alerts/:id/send', async (req, res) => {
  try {
    const alert = await TargetedAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, error: 'Targeted alert not found' });
    if (alert.status === 'sent') return res.status(400).json({ success: false, error: 'Alert already sent' });

    alert.status = 'sent';
    alert.sentAt = new Date();

    await alert.save();
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
