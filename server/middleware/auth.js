const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }

  const token = req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, invalid token format' });
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
