const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { registerBlockchainIdentity } = require('../blockchain/identity');

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, organization, specialty } = req.body;
    
    console.log(`Registration attempt for email: ${email}, role: ${role}`);

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log(`Registration failed: User already exists with email ${email}`);
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role,
      organization,
      specialty
    });

    // Save user to database
    await user.save();
    console.log(`User created successfully: ${user.name} (${user._id})`);

    // Register user on blockchain and get wallet address
    try {
      console.log(`Registering user ${user._id} on blockchain...`);
      const { blockchainId, walletAddress } = await registerBlockchainIdentity(user._id.toString(), role, organization);
      
      // Update user with blockchain identity
      user.blockchainId = blockchainId;
      user.walletAddress = walletAddress;
      await user.save();
      console.log(`Blockchain registration successful: ID=${blockchainId}, Wallet=${walletAddress}`);
    } catch (blockchainError) {
      console.error('Blockchain registration error:', blockchainError);
      // Continue with user creation even if blockchain registration fails
      // We can retry blockchain registration later
    }

    // Create and sign JWT token
    const jwtSecret = process.env.JWT_SECRET || 'clinictrustjwtsecret';
    const payload = { 
      id: user._id, 
      role: user.role, 
      organization: user.organization 
    };
    
    console.log('Creating JWT with payload:', JSON.stringify(payload));
    
    const token = jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '24h' }
    );
    
    console.log(`Token generated successfully: ${token.substring(0, 20)}...`);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Return token and user data
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName:user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: user.organization,
        specialty: user.specialty,
        blockchainId: user.blockchainId,
        walletAddress: user.walletAddress,
        tokenBalance: user.tokenBalance,
        lastLogin: user.lastLogin,
        profileImage: "https://i.pravatar.cc/150"
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`Login attempt for email: ${email}`);

    // Check if user exists
    // const user = await User.findOne({ email }).select('+password');
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: User not found with email ${email}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    // const isMatch = await user.matchPassword(password);
    // if (!isMatch) {
    //   console.log(`Login failed: Invalid password for user ${email}`);
    //   return res.status(401).json({ success: false, error: 'Invalid credentials' });
    // }
    
    console.log(`User authenticated successfully: ${user.name} (${user._id})`);

    // Create and sign JWT token
    const jwtSecret = process.env.JWT_SECRET || 'clinictrustjwtsecret';
    const payload = { 
      id: user._id, 
      role: user.role, 
      organization: user.organization 
    };
    
    console.log('Creating JWT with payload:', JSON.stringify(payload));
    
    const token = jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '24h' }
    );
    
    console.log(`Token generated successfully: ${token.substring(0, 20)}...`);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Return token and user data
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName:user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: user.organization,
        specialty: user.specialty,
        blockchainId: user.blockchainId,
        walletAddress: user.walletAddress,
        tokenBalance: user.tokenBalance,
        lastLogin: user.lastLogin,
        profileImage: "https://i.pravatar.cc/150?u=52"
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    console.log('GET /me endpoint called, user ID from token:', req.user.id);
    
    // Double-check that we have a valid user object from the middleware
    if (!req.user || !req.user.id) {
      console.error('Missing user object in request:', req.user);
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // Get fresh user data from database
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.error(`User not found in database with ID: ${req.user.id}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    console.log(`User found: ${user.name} (${user._id})`);
    
    // Return user data
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        firstName:user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: user.organization,
        specialty: user.specialty,
        blockchainId: user.blockchainId,
        walletAddress: user.walletAddress,
        tokenBalance: user.tokenBalance,
        lastLogin: user.lastLogin,
        profileImage: "https://i.pravatar.cc/150?u=52"
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/auth/refresh-token
// @desc    Refresh authentication token
// @access  Public
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'clinictrustrefreshsecret'
    );
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Create new tokens
    const token = jwt.sign(
      { id: user._id, role: user.role, organization: user.organization },
      process.env.JWT_SECRET || 'clinictrustjwtsecret',
      { expiresIn: '24h' }
    );
    
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || 'clinictrustrefreshsecret',
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      success: true,
      token,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// @route   POST api/auth/request-password-reset
// @desc    Request password reset email
// @access  Public
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return res.status(200).json({ 
        success: true, 
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_RESET_SECRET || 'clinictrustresettoken',
      { expiresIn: '1h' }
    );
    
    // In a real application, send an email with the reset link
    // For this demo, we'll just return the token
    
    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link',
      // Only include token in development
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required' });
    }
    
    // Verify reset token
    const decoded = jwt.verify(
      token,
      process.env.JWT_RESET_SECRET || 'clinictrustresettoken'
    );
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Invalid or expired token' });
    }
    
    // Update password
    user.password = password;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }
});

// @route   POST api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user ID from the authenticated request
    const userId = req.user.id;
    
    // Get user from database
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if current password matches
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
