const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', async (req, res) => {
  // Basic validation
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Please provide email and password' });
  }

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
    }

    // Check if password matches
    // In a real app, you would use bcrypt.compare(password, user.password)
    // For simplicity in this example, we're just checking if the user exists
    
    // Create and return JWT token
    
    const payload = {
      id: user._id, // Use _id instead of id
      role: user.role
    };

    const jwtSecret = process.env.JWT_SECRET || 'clinictrustjwtsecret';
    
    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          success: true,
          token,
          user: {
            id: user._id, // Use _id instead of id
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/auth/verify
 * @desc    Verify admin token
 * @access  Private
 */
router.get('/verify', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token, authorization denied' });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'clinictrustjwtsecret';
    const decoded = jwt.verify(token, jwtSecret);

    // Check if user exists and is an admin
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
    }

    res.json({
      success: true,
      user: {
        id: user._id, // Use _id instead of id
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Admin token verification error:', err.message);
    res.status(401).json({ success: false, error: 'Token is not valid' });
  }
});

module.exports = router;
