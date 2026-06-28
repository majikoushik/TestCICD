const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const ProviderProfile = require('../models/ProviderProfile');
const { sendEmail, verificationEmailHtml, verificationEmailText, kycStatusUpdateHtml } = require('../services/emailService');
const logger = require('../utils/logger');

const MIN_PASSWORD_LENGTH = 8;

const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital', 'lab', 'provider'];

// @route   POST api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, organization, specialty, firstName, lastName,
            npi, npiData, credential, phone, address } = req.body;

    if (!name || !email || !password || !role || !organization) {
      logger.debug('[REGISTER] 400: missing fields', { name: !!name, email: !!email, password: !!password, role, organization: !!organization });
      return res.status(400).json({ success: false, error: 'Please provide name, email, password, role, and organization' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      logger.debug('[REGISTER] 400: password too short');
      return res.status(400).json({ success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    const privilegedRoles = ['admin', 'superadmin'];
    if (privilegedRoles.includes(role)) {
      return res.status(403).json({ success: false, error: 'Cannot self-register with this role' });
    }

    // NPI dedup check for provider roles
    if (PROVIDER_ROLES.includes(role) && npi) {
      const existingProfile = await ProviderProfile.findOne({ npi });
      if (existingProfile) {
        logger.debug('[REGISTER] 400: NPI already registered', { npi });
        const statusMsg = {
          verified: 'This NPI is already registered and verified. Please sign in.',
          under_review: 'This NPI is already registered and under review.',
          profile_incomplete: 'This NPI is already registered. Please sign in to complete onboarding.',
          doc_pending: 'This NPI is already registered. Please sign in to complete onboarding.',
          pending_email: 'This NPI is already registered. Please check your email to verify.',
          rejected: 'This NPI registration was rejected. Please contact support.',
        };
        return res.status(400).json({
          success: false,
          error: statusMsg[existingProfile.kycStatus] || 'This NPI is already registered.',
          npiStatus: existingProfile.kycStatus,
        });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      logger.debug('[REGISTER] 400: email already registered', { email });
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // Email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = new User({
      _id: `user-${crypto.randomBytes(12).toString('hex')}`,
      name, firstName: firstName || name.split(' ')[0],
      lastName: lastName || name.split(' ').slice(1).join(' ') || name,
      email, password, role, organization, specialty: specialty || '',

      emailVerificationToken: hashedToken,
      emailVerificationExpiry: expiry,
      onboardingStatus: 'pending_email',
    });

    // Wallet is created when admin approves KYC (not at registration)
    user.lastLogin = new Date();
    await user.save();

    // Create ProviderProfile for provider-type roles
    if (PROVIDER_ROLES.includes(role)) {
      try {
        const profile = new ProviderProfile({
          userId: user._id,
          npi: npi || null,
          npiData: npiData || {},
          credential: credential || '',
          specialty: specialty || (npiData?.specialty) || '',
          phone: phone || (npiData?.address?.phone) || '',
          address: address || npiData?.address || {},
          onboardingSteps: { profile_created: true },
          kycStatus: 'pending_email',
        });
        await profile.save();
      } catch (profileErr) {
        logger.warn('ProviderProfile creation error (non-fatal)', { error: profileErr.message, stack: profileErr.stack });
      }
    }

    // Send verification email
    let emailSent = true;
    try {
      await sendEmail({
        to: email,
        subject: 'Please confirm your ClinicTrust AI account',
        html: verificationEmailHtml(user.firstName || user.name, rawToken),
        text: verificationEmailText(user.firstName || user.name, rawToken),
      });
    } catch (emailErr) {
      emailSent = false;
      logger.warn('Verification email failed (non-fatal)', { error: emailErr.message, stack: emailErr.stack });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, organization: user.organization },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: buildUserPayload(user),
      message: emailSent
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful. Verification email could not be sent — check server logs or use Resend Verification.',
    });
  } catch (error) {
    logger.error('Registration error', logger.reqCtx(req, error));
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

    // Capture request metadata for audit
    const ipAddress = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.socket?.remoteAddress
      || req.ip
      || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const timestamp = new Date();

    // select('+password') is required because the field has select:false in the schema
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // Unknown email — nothing to attach audit to, just reject
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    // Always record the attempt (success or failure) on the user document
    user.loginHistory.push({ timestamp, ipAddress, userAgent, successful: isMatch });
    // Keep only the 500 most recent entries to prevent unbounded growth
    if (user.loginHistory.length > 500) {
      user.loginHistory = user.loginHistory.slice(-500);
    }

    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      await user.save();
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Block accounts that must not log in
    if (user.accountStatus === 'suspended') {
      logger.warn('Login blocked: suspended account', { userId: user._id, email, ipAddress });
      await user.save();
      return res.status(403).json({ success: false, error: 'Your account has been suspended. Please contact support.' });
    }

    if (user.accountStatus === 'rejected' || user.onboardingStatus === 'rejected') {
      logger.warn('Login blocked: rejected account', { userId: user._id, email, ipAddress });
      await user.save();
      return res.status(403).json({
        success: false,
        error: 'Your account application was not approved.' + (user.kycRejectionReason ? ` Reason: ${user.kycRejectionReason}` : ' Please contact support for details.'),
      });
    }

    if (user.isActive === false) {
      logger.warn('Login blocked: inactive account', { userId: user._id, email, ipAddress });
      await user.save();
      return res.status(403).json({ success: false, error: 'Your account is inactive. Please contact your administrator.' });
    }

    // Successful login — update metadata and reset failure counter
    user.lastLogin = timestamp;
    user.loginAttempts = 0;
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
    logger.error('Login error', logger.reqCtx(req, error));
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
    logger.error('Get user error', logger.reqCtx(req, error));
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
    logger.error('Token refresh error', logger.reqCtx(req, error));
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
    logger.error('Password reset request error', logger.reqCtx(req, error));
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
    logger.error('Password reset error', logger.reqCtx(req, error));
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
    logger.error('Password change error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/auth/verify-email?token=xxx
// @access  Public
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpiry');

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification link. Please request a new one.' });
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    user.onboardingStatus = 'profile_incomplete';
    await user.save();

    // Update provider profile
    await ProviderProfile.findOneAndUpdate(
      { userId: user._id },
      { 'onboardingSteps.email_verified': true, kycStatus: 'profile_incomplete' }
    );

    // Notify provider: email confirmed, next step is profile completion
    try {
      const name = user.firstName || user.name || 'Provider';
      const html = kycStatusUpdateHtml(name, 'profile_incomplete');
      if (html) {
        await sendEmail({
          to: user.email,
          subject: 'Email verified — complete your provider profile to continue',
          html,
          category: 'kyc',
        });
      }
    } catch (e) { /* non-fatal — user already sees success in the browser */ }

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    logger.error('Email verification error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/auth/resend-verification
// @access  Private
router.post('/resend-verification', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+emailVerificationToken +emailVerificationExpiry');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.onboardingStatus !== 'pending_email') return res.status(400).json({ success: false, error: 'Email already verified' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: 'Please confirm your ClinicTrust AI account',
        html: verificationEmailHtml(user.firstName || user.name, rawToken),
        text: verificationEmailText(user.firstName || user.name, rawToken),
      });
      res.json({ success: true, message: 'Verification email sent.' });
    } catch (emailErr) {
      logger.warn('Resend verification email failed (non-fatal)', { error: emailErr.message, stack: emailErr.stack });
      res.json({ success: true, message: 'Email delivery failed — check server logs for the verification link.' });
    }
  } catch (err) {
    logger.error('Resend verification error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Build a consistent, safe user payload for API responses.
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
    onboardingStatus: user.onboardingStatus,
    accountStatus: user.accountStatus,
    isActive: user.isActive,
  };
}

module.exports = router;
