const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Log token for debugging (first few characters only)
      console.log('Token received:', token ? `${token.substring(0, 10)}...` : 'undefined');
      
      if (!token) {
        console.error('Auth middleware error: Empty token after Bearer prefix');
        return res.status(401).json({ success: false, error: 'Not authorized, invalid token format' });
      }

      // Verify token
      const jwtSecret = process.env.JWT_SECRET || 'clinictrustjwtsecret';
      console.log('Using JWT secret:', jwtSecret.substring(0, 5) + '...');
      
      const decoded = jwt.verify(token, jwtSecret);
      console.log('Token decoded successfully, user ID:', decoded.id);

      // Add user from payload to request object
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.error(`Auth middleware error: User not found with ID ${decoded.id}`);
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      
      console.log(`User authenticated: ${user.name} (${user.role})`);
      req.user = user;
      return next();
    } catch (error) {
      console.error('Authentication error:', error.name, error.message);
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized, token failed', 
        details: error.name === 'JsonWebTokenError' ? error.message : undefined
      });
    }
  } else {
    console.error('Auth middleware error: No authorization header or incorrect format');
    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }
};

// Middleware to check user role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `User role ${req.user.role} is not authorized to access this resource` });
    }
    
    next();
  };
};

module.exports = { protect, authorize };
