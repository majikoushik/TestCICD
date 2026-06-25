const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { registerBlockchainIdentity } = require('../blockchain/identity');

const MIN_PASSWORD_LENGTH = 8;

// @route   POST api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, organization, specialty, firstName, lastName } = req.body;

    if (!name || !email || !password || !role || !organization) {
      return res.status(400).json({ success: false, error: 'Please provide name, email, password, role, and organization' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    // Block self-registration as privileged roles
    const privilegedRoles = ['admin', 'superadmin'];
    if (privilegedRoles.includes(role)) {
      return res.status(403).json({ success: false, error: 'Cannot self-register with this role' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const user = new User({ name, firstName, lastName, email, password, role, organization, specialty });

    // Register blockchain identity before first save so all data is persisted together
    let blockchainId = null;
    let walletAddress = null;
    try {
      const identity = await registerBlockchainIdentity(
        // Use a temporary placeholder — will be updated after save gives us _id
        'temp',
        role,
        organization
      );
      blockchainId = identity.blockchainId;
      walletAddress = identity.walletAddress;
    } catch (blockchainError) {
      console.error('Blockchain registration error (non-fatal):', blockchainError.message);
    }

    user.blockchainId = blockchainId;
    user.walletAddress = walletAddress;
    user.lastLogin = new Date();

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, organization: user.organization },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    // select('+password') is required because the field has select:false in the schema
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, organization: user.organization },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, user: buildUserPayload(user) });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  // JWT is stateless; the client must discard the token.
  // A token denylist (e.g., Redis) can be added here for stricter revocation.
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @route   POST api/auth/refresh-token
// @access  Public
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, organization: user.organization },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ success: true, token, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Token refresh error:', error.message);
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// @route   POST api/auth/request-password-reset
// @access  Public
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await User.findOne({ email });

    // Always return the same response to avoid revealing whether an email is registered
    const genericResponse = {
      success: true,
      message: 'If your email is registered, you will receive a password reset link',
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_RESET_SECRET, { expiresIn: '1h' });

    // In production: send resetToken via email; never expose it in the response.
    res.status(200).json({
      ...genericResponse,
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    console.error('Password reset request error:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    user.password = password;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error.message);
    res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }
});

// @route   POST api/auth/change-password
// @access  Private
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Build a consistent, safe user payload for API responses.
// profileImage is intentionally omitted — it is not stored in the User model.
function buildUserPayload(user) {
  return {
    id: user._id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    organization: user.organization,
    specialty: user.specialty,
    blockchainId: user.blockchainId,
    walletAddress: user.walletAddress,
    tokenBalance: user.tokenBalance,
    lastLogin: user.lastLogin,
    profileImage: user.profileImage || null,
  };
}

module.exports = router;
