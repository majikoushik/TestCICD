const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Referral = require('../models/Referral');
const logger = require('../utils/logger');

// ── GET /api/messages/threads ─────────────────────────────────────────────────
// Returns one summary row per referral the current user is party to,
// ordered by most-recent activity.
router.get('/threads', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // All messages where this user is sender or receiver
    const threads = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$referralId',
          lastMessage:    { $first: '$$ROOT' },
          totalMessages:  { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$readAt', null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      {
        $lookup: {
          from: 'referrals',
          localField: '_id',
          foreignField: '_id',
          as: 'referral',
        },
      },
      { $unwind: { path: '$referral', preserveNullAndEmptyArrays: true } },
    ]);

    res.json({ success: true, data: threads });
  } catch (err) {
    logger.error('GET /messages/threads error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/messages/threads/:referralId ─────────────────────────────────────
// Full conversation for one referral. Also marks incoming messages as read.
router.get('/threads/:referralId', protect, async (req, res) => {
  try {
    const { referralId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(referralId)) {
      return res.status(400).json({ success: false, error: 'Invalid referral ID' });
    }

    const userId = req.user._id;

    // Verify the requesting user is a participant
    const referral = await Referral.findById(referralId).select(
      'referringProvider receivingProvider patient reason status'
    );
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }

    const isParticipant =
      referral.referringProvider.toString() === userId.toString() ||
      referral.receivingProvider.toString() === userId.toString();

    if (!isParticipant && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this thread' });
    }

    const messages = await Message.find({ referralId }).sort({ createdAt: 1 }).lean();

    // Mark unread messages sent to current user as read (bulk)
    await Message.updateMany(
      { referralId, receiverId: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ success: true, data: { referral, messages } });
  } catch (err) {
    logger.error('GET /messages/threads/:referralId error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── POST /api/messages/threads/:referralId ────────────────────────────────────
// Send a new message. Body: { content }
// The receiver is automatically the other provider on the referral.
router.post('/threads/:referralId', protect, async (req, res) => {
  try {
    const { referralId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }
    if (content.trim().length > 2000) {
      return res.status(400).json({ success: false, error: 'Message exceeds 2000 character limit' });
    }
    if (!mongoose.Types.ObjectId.isValid(referralId)) {
      return res.status(400).json({ success: false, error: 'Invalid referral ID' });
    }

    const senderId = req.user._id;

    const referral = await Referral.findById(referralId)
      .populate('referringProvider', 'name firstName lastName role')
      .populate('receivingProvider', 'name firstName lastName role');

    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }

    const isReferring  = referral.referringProvider._id.toString()  === senderId.toString();
    const isReceiving  = referral.receivingProvider._id.toString()  === senderId.toString();

    if (!isReferring && !isReceiving) {
      return res.status(403).json({ success: false, error: 'Only providers on this referral may send messages' });
    }

    const receiver = isReferring ? referral.receivingProvider : referral.referringProvider;

    const message = await Message.create({
      referralId,
      senderId,
      senderName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
      senderRole: req.user.role,
      receiverId: receiver._id,
      receiverName: receiver.name || `${receiver.firstName} ${receiver.lastName}`,
      content: content.trim(),
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    logger.error('POST /messages/threads/:referralId error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── PATCH /api/messages/read/:referralId ─────────────────────────────────────
// Mark all messages in thread as read for current user.
router.patch('/read/:referralId', protect, async (req, res) => {
  try {
    const { referralId } = req.params;
    await Message.updateMany(
      { referralId, receiverId: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('PATCH /messages/read error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/messages/admin/threads ──────────────────────────────────────────
// Admin-only: all threads across the platform for compliance monitoring.
router.get('/admin/threads', protect, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const threads = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$referralId',
          lastMessage:    { $first: '$$ROOT' },
          totalMessages:  { $sum: 1 },
          participants: { $addToSet: '$senderName' },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      {
        $lookup: {
          from: 'referrals',
          localField: '_id',
          foreignField: '_id',
          as: 'referral',
        },
      },
      { $unwind: { path: '$referral', preserveNullAndEmptyArrays: true } },
      { $limit: 100 },
    ]);

    res.json({ success: true, data: threads });
  } catch (err) {
    logger.error('GET /messages/admin/threads error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
