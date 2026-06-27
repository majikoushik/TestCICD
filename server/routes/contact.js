const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// POST /api/contact — public, no auth required
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, organization, inquiryType, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, subject, and message are required.',
      });
    }

    const contact = await Contact.create({
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      phone:        phone?.trim() || '',
      organization: organization?.trim() || '',
      inquiryType:  inquiryType || 'general',
      subject:      subject.trim(),
      message:      message.trim(),
      ipAddress:    req.ip || '',
    });

    res.status(201).json({
      success: true,
      data: {
        id: contact._id,
        message: "Your message has been received. We'll be in touch within 1 business day.",
      },
    });
  } catch (err) {
    logger.error('Contact form error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Failed to submit contact form. Please try again.' });
  }
});

// GET /api/contact — admin only
router.get('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    const total = await Contact.countDocuments(filter);
    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Count by status for stats
    const [newCount, respondedCount, demoCount] = await Promise.all([
      Contact.countDocuments({ status: 'new' }),
      Contact.countDocuments({ status: 'responded' }),
      Contact.countDocuments({ inquiryType: 'demo' }),
    ]);

    res.json({
      success: true,
      data: contacts,
      meta: { total, page: Number(page), limit: Number(limit), newCount, respondedCount, demoCount },
    });
  } catch (err) {
    logger.error('Contact list error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Failed to fetch contacts.' });
  }
});

// PATCH /api/contact/:id/status — admin only
router.patch('/:id/status', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['new', 'read', 'responded', 'closed'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${valid.join(', ')}` });
    }
    const contact = await Contact.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!contact) return res.status(404).json({ success: false, error: 'Enquiry not found.' });
    res.json({ success: true, data: contact });
  } catch (err) {
    logger.error('Contact status update error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Failed to update status.' });
  }
});

// DELETE /api/contact/:id — admin only
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {} });
  } catch (err) {
    logger.error('Contact delete error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Failed to delete enquiry.' });
  }
});

module.exports = router;
