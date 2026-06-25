const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/async');

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  const query = { userId: req.user.id };
  
  // Apply filters if provided
  if (req.query.read === 'true' || req.query.read === 'false') {
    query.read = req.query.read === 'true';
  }
  
  if (req.query.type) {
    query.type = req.query.type;
  }

  const total = await Notification.countDocuments(query);
  
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: notifications
  });
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user.id,
    read: false
  });
  
  res.status(200).json({
    success: true,
    count
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
  let notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found'
    });
  }
  
  // Make sure user owns notification
  if (notification.userId.toString() !== req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this notification'
    });
  }
  
  notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, read: false },
    { read: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private (Admin only)
exports.createNotification = asyncHandler(async (req, res) => {
  // Add user ID to request body
  req.body.userId = req.params.userId || req.user.id;
  
  const notification = await Notification.create(req.body);
  
  res.status(201).json({
    success: true,
    data: notification
  });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found'
    });
  }
  
  // Make sure user owns notification or is admin
  if (notification.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to delete this notification'
    });
  }
  
  await notification.remove();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});
