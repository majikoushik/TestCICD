const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  // Primary: Bearer token in Authorization header (API / XHR calls)
  // Fallback: ?token= query param — used when the browser opens a URL directly
  //           (e.g. window.open for file previews) where headers cannot be set.
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.warn('Auth: token valid but user not found in DB', {
        decodedId: decoded.id,
        method: req.method,
        path: req.path,
      });
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (user.accountStatus === 'suspended') {
      logger.warn('Auth: suspended account attempted access', { userId: user._id, method: req.method, path: req.path });
      return res.status(403).json({ success: false, error: 'Account suspended. Contact your administrator.' });
    }

    if (user.isActive === false) {
      logger.warn('Auth: inactive account attempted access', { userId: user._id, method: req.method, path: req.path });
      return res.status(403).json({ success: false, error: 'Account is inactive. Contact your administrator.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    logger.warn('Auth: token verification failed', {
      method: req.method,
      path: req.path,
      error: error.message,
      errorType: error.name,
      stack: error.stack,
    });
    return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
