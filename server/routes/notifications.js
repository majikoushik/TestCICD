const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification
} = require('../controllers/notificationController');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

// Routes that don't need specific IDs
router.route('/')
  .get(getNotifications)
  .post(authorize('admin'), createNotification);

router.route('/unread-count')
  .get(getUnreadCount);

router.route('/read-all')
  .put(markAllAsRead);

// Routes that need specific IDs
router.route('/:id/read')
  .put(markAsRead);

router.route('/:id')
  .delete(deleteNotification);

module.exports = router;
