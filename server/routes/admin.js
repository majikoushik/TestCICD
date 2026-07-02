const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const AdminSetting = require('../models/Admin');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const AuditLog = require('../models/AuditLog');
const LoginHistory = require('../models/LoginHistory');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * @route   GET /api/admin/settings
 * @desc    Get all admin settings
 * @access  Admin only
 */
router.get('/settings', protect, authorize('admin'), async (req, res) => {
  try {
    const settings = await AdminSetting.find().sort({ category: 1, key: 1 });
    res.json({ success: true, count: settings.length, data: settings });
  } catch (error) {
    logger.error('Error fetching admin settings', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/settings-map
 * @desc    Return all settings as a { [key]: value } map for the settings UI
 * @access  Admin only
 */
router.get('/settings-map', protect, authorize('admin'), async (req, res) => {
  try {
    const settings = await AdminSetting.find().lean();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json({ success: true, data: map });
  } catch (error) {
    logger.error('Error fetching settings map', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/settings/:category
 * @desc    Get admin settings by category
 * @access  Admin only
 */
router.get('/settings/:category', protect, authorize('admin'), async (req, res) => {
  try {
    const settings = await AdminSetting.find({ 
      category: req.params.category 
    }).sort({ key: 1 });
    
    if (settings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `No settings found for category: ${req.params.category}` 
      });
    }
    
    res.json({ success: true, count: settings.length, data: settings });
  } catch (error) {
    logger.error(`Error fetching ${req.params.category} settings`, logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/settings/key/:key
 * @desc    Get admin setting by key
 * @access  Admin only
 */
router.get('/settings/key/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const setting = await AdminSetting.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        error: `Setting not found with key: ${req.params.key}` 
      });
    }
    
    res.json({ success: true, data: setting });
  } catch (error) {
    logger.error(`Error fetching setting with key ${req.params.key}`, logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/settings
 * @desc    Create a new admin setting
 * @access  Admin only
 */
router.post('/settings', protect, authorize('admin'), async (req, res) => {
  try {
    const { key, value, category, description } = req.body;
    
    // Check if setting already exists
    const existingSetting = await AdminSetting.findOne({ key });
    if (existingSetting) {
      return res.status(400).json({ 
        success: false, 
        error: `Setting with key '${key}' already exists` 
      });
    }
    
    // Create new setting
    const setting = new AdminSetting({
      key,
      value,
      category,
      description,
      lastModifiedBy: req.user.id
    });
    
    await setting.save();
    
    res.status(201).json({ success: true, data: setting });
  } catch (error) {
    logger.error('Error creating admin setting', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    Update an admin setting
 * @access  Admin only
 */
router.put('/settings/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const { value, description, isActive, category } = req.body;
    const setFields = { lastModifiedBy: req.user.id, lastModifiedAt: Date.now() };
    if (value !== undefined) setFields.value = value;
    if (isActive !== undefined) setFields.isActive = isActive;

    const setting = await AdminSetting.findOneAndUpdate(
      { key: req.params.key },
      {
        $set: setFields,
        $setOnInsert: {
          category: category || req.params.key.split('.')[0] || 'general',
          description: description || `Setting: ${req.params.key}`,
        },
      },
      { new: true, upsert: true, runValidators: false }
    );
    res.json({ success: true, data: setting });
  } catch (error) {
    logger.error(`Error upserting setting ${req.params.key}`, logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/settings/:key
 * @desc    Delete an admin setting
 * @access  Admin only
 */
router.delete('/settings/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const setting = await AdminSetting.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        error: `Setting not found with key: ${req.params.key}` 
      });
    }
    
    await setting.remove();
    
    res.json({ success: true, data: {} });
  } catch (error) {
    logger.error(`Error deleting setting with key ${req.params.key}`, logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  Admin only
 */
router.post('/users', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { name, email, role, isActive, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide name, email, and role' 
      });
    }
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }
    
    // Generate a random password if not provided
    const userPassword = password || Math.random().toString(36).slice(-8);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userPassword, salt);

    // Create the new user — _id, firstName, lastName, and organization are all
    // required by the User schema but aren't collected by the Add New User
    // dialog, so derive/default them the same way self-registration does
    // (see POST /api/auth/register).
    const nameParts = name.trim().split(/\s+/);
    const newUser = new User({
      _id: `user-${crypto.randomBytes(12).toString('hex')}`,
      name,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || nameParts[0],
      organization: 'Not specified',
      email,
      password: hashedPassword,
      role,
      isActive: isActive !== undefined ? isActive : true,
      requirePasswordChange: true
    });
    
    await newUser.save();
    
    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({ 
      success: true, 
      data: userResponse,
      tempPassword: userPassword,
      message: 'User created successfully'
    });
  } catch (error) {
    logger.error('Error creating user', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin only
 */
router.get('/users', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { role, isActive, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    logger.error('Error fetching users', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get a single user by ID
 * @access  Admin only
 */
router.get('/users/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error(`Error fetching user with ID ${req.params.id}`, logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user role or status
 * @access  Admin only
 */
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, isActive, email } = req.body;
    const User = require('../models/User');

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing && String(existing._id) !== String(user._id)) {
        return res.status(400).json({ success: false, error: 'A user with this email already exists' });
      }
      user.email = normalizedEmail;
    }

    // Update fields
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}`, logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/system-status
 * @desc    Get system status information
 * @access  Admin only
 */
router.get('/system-status', protect, authorize('admin'), async (req, res) => {
  try {
    // This would typically connect to various services to get their status
    // For now, we'll return mock data
    const systemStatus = {
      database: {
        status: 'healthy',
        connections: 12,
        latency: '5ms'
      },
      ai: {
        status: 'healthy',
        models: ['risk-assessment', 'diagnosis-helper', 'treatment-recommender'],
        lastUpdated: new Date()
      },
      blockchain: {
        status: 'healthy',
        lastBlock: 12345678,
        syncStatus: '100%'
      },
      storage: {
        status: 'healthy',
        usedSpace: '45GB',
        totalSpace: '500GB'
      }
    };
    
    res.json({ success: true, data: systemStatus });
  } catch (error) {
    logger.error('Error fetching system status', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/initialize
 * @desc    Initialize default admin settings
 * @access  Admin only
 */
router.post('/initialize', protect, authorize('admin'), async (req, res) => {
  try {
    // Default settings for the platform
    const defaultSettings = [
      // Security settings
      {
        key: 'security.passwordPolicy.minLength',
        value: 8,
        category: 'security',
        description: 'Minimum password length'
      },
      {
        key: 'security.passwordPolicy.requireSpecialChars',
        value: true,
        category: 'security',
        description: 'Require special characters in passwords'
      },
      {
        key: 'security.sessionTimeout',
        value: 30,
        category: 'security',
        description: 'Session timeout in minutes'
      },
      
      // AI settings
      {
        key: 'ai.riskAssessment.threshold',
        value: 0.75,
        category: 'ai',
        description: 'Risk assessment threshold for alerts'
      },
      {
        key: 'ai.diagnosisHelper.enabled',
        value: true,
        category: 'ai',
        description: 'Enable AI diagnosis helper'
      },
      {
        key: 'ai.treatmentRecommender.enabled',
        value: true,
        category: 'ai',
        description: 'Enable AI treatment recommender'
      },
      
      // Blockchain settings
      {
        key: 'blockchain.verificationRequired',
        value: true,
        category: 'blockchain',
        description: 'Require blockchain verification for critical operations'
      },
      {
        key: 'blockchain.autoSync',
        value: true,
        category: 'blockchain',
        description: 'Automatically sync blockchain data'
      },
      
      // Notification settings
      {
        key: 'notifications.email.enabled',
        value: true,
        category: 'notifications',
        description: 'Enable email notifications'
      },
      {
        key: 'notifications.sms.enabled',
        value: false,
        category: 'notifications',
        description: 'Enable SMS notifications'
      },
      
      // General settings
      {
        key: 'general.clinicName',
        value: 'ClinicTrust AI',
        category: 'general',
        description: 'Clinic name displayed in the platform'
      },
      {
        key: 'general.supportEmail',
        value: 'support@clinictrustai.com',
        category: 'general',
        description: 'Support email address'
      }
    ];
    
    // Clear existing settings if requested
    if (req.body.reset) {
      await AdminSetting.deleteMany({});
    }
    
    // Insert default settings, skipping duplicates
    for (const setting of defaultSettings) {
      const exists = await AdminSetting.findOne({ key: setting.key });
      if (!exists) {
        const newSetting = new AdminSetting({
          ...setting,
          lastModifiedBy: req.user.id
        });
        await newSetting.save();
      }
    }
    
    const settings = await AdminSetting.find().sort({ category: 1, key: 1 });
    
    res.status(201).json({ 
      success: true, 
      message: 'Default settings initialized', 
      count: settings.length,
      data: settings 
    });
  } catch (error) {
    logger.error('Error initializing admin settings', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/providers
 * @desc    Get all providers
 * @access  Admin only
 */
router.get('/providers', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital', 'lab', 'provider', 'nurse'];
    const providers = await User.find({
      role: { $in: PROVIDER_ROLES },
      onboardingStatus: 'verified',
    }).select('-password').sort({ createdAt: -1 });

    // Gender is captured on ProviderProfile during onboarding, not on User —
    // look it up in one query and merge it in for the grid/detail view.
    const profiles = await ProviderProfile.find(
      { userId: { $in: providers.map(p => String(p._id)) } },
      'userId gender'
    ).lean();
    const genderByUserId = new Map(profiles.map(p => [p.userId, p.gender]));

    // Normalize fields that may be absent on seeded/legacy documents
    const data = providers.map(p => {
      const obj = p.toObject();
      if (!obj.accountStatus) obj.accountStatus = 'pending';
      if (!obj.onboardingStatus) obj.onboardingStatus = 'pending_email';
      obj.gender = genderByUserId.get(String(p._id)) || '';
      return obj;
    });

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error('Error fetching providers', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/providers/pending
 * @desc    Get all pending provider registrations
 * @access  Admin only
 */
router.get('/providers/pending', protect, authorize('admin', 'superadmin', 'reviewer'), async (req, res) => {
  try {
    const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital', 'lab', 'provider', 'nurse'];
    const pendingProviders = await User.find({
      role: { $in: PROVIDER_ROLES },
      accountStatus: 'pending'
    }).select('-password').sort({ createdAt: -1 });
    
    res.json({ success: true, count: pendingProviders.length, data: pendingProviders });
  } catch (error) {
    logger.error('Error fetching pending providers', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/providers/:id/approve
 * @desc    Approve a provider registration
 * @access  Admin only
 */
router.put('/providers/:id/approve', protect, authorize('admin', 'superadmin', 'reviewer'), async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    
    const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital', 'lab', 'provider', 'nurse'];
    if (!PROVIDER_ROLES.includes(provider.role)) {
      return res.status(400).json({ success: false, error: 'User is not a provider' });
    }

    provider.accountStatus = 'approved';
    provider.kycVerified = true;
    provider.onboardingStatus = 'verified';
    provider.isActive = true;
    if (!provider.kycDocuments) provider.kycDocuments = {};
    provider.kycDocuments.verifiedAt = Date.now();
    provider.kycDocuments.verifiedBy = req.user.id;
    
    await provider.save();
    
    res.json({ 
      success: true, 
      message: 'Provider approved successfully', 
      data: provider 
    });
  } catch (error) {
    logger.error('Error approving provider', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/providers/:id/reject
 * @desc    Reject a provider registration
 * @access  Admin only
 */
router.put('/providers/:id/reject', protect, authorize('admin', 'superadmin', 'reviewer'), async (req, res) => {
  try {
    const { reason } = req.body;
    const provider = await User.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    
    const PROVIDER_ROLES_R = ['doctor', 'clinic', 'hospital', 'lab', 'provider', 'nurse'];
    if (!PROVIDER_ROLES_R.includes(provider.role)) {
      return res.status(400).json({ success: false, error: 'User is not a provider' });
    }

    provider.accountStatus = 'rejected';
    provider.isActive = false;
    provider.onboardingStatus = 'rejected';
    provider.kycRejectionReason = reason || 'Application did not meet requirements';
    
    await provider.save();
    
    res.json({ 
      success: true, 
      message: 'Provider rejected successfully', 
      data: provider 
    });
  } catch (error) {
    logger.error('Error rejecting provider', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/providers/:id/suspend
 * @desc    Suspend a provider account
 * @access  Admin only
 */
router.put('/providers/:id/suspend', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const provider = await User.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    
    provider.accountStatus = 'suspended';
    provider.isActive = false;
    provider.suspensionReason = reason || 'Account suspended by administrator';
    
    await provider.save();
    
    res.json({ 
      success: true, 
      message: 'Provider suspended successfully', 
      data: provider 
    });
  } catch (error) {
    logger.error('Error suspending provider', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/providers/:id/activate
 * @desc    Activate a suspended provider account
 * @access  Admin only
 */
router.put('/providers/:id/activate', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    
    if (provider.accountStatus === 'suspended') {
      provider.accountStatus = 'approved';
    }
    
    provider.isActive = true;
    
    await provider.save();
    
    res.json({ 
      success: true, 
      message: 'Provider activated successfully', 
      data: provider 
    });
  } catch (error) {
    logger.error('Error activating provider', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/providers/:id
 * @desc    Update provider fields (admin full edit)
 * @access  Admin only
 */
router.put('/providers/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    const editable = [
      'firstName', 'lastName', 'email', 'role', 'organization', 'specialty',
      'isActive', 'accountStatus', 'kycVerified',
      'onboardingStatus', 'profileImage', 'tokenBalance',
    ];

    for (const field of editable) {
      if (req.body[field] !== undefined) {
        provider[field] = field === 'tokenBalance' ? Number(req.body[field]) : req.body[field];
      }
    }

    // Keep name in sync with firstName / lastName
    if (req.body.firstName !== undefined || req.body.lastName !== undefined) {
      provider.name = `${provider.firstName || ''} ${provider.lastName || ''}`.trim();
    }

    await provider.save();
    const updated = provider.toObject();
    delete updated.password;
    res.json({ success: true, message: 'Provider updated successfully', data: updated });
  } catch (error) {
    logger.error('Error updating provider', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.put('/users/:id/role', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required' });
    }
    
    // Validate role
    const validRoles = ['provider', 'reviewer', 'admin', 'superadmin', 'doctor', 'lab', 'clinic', 'hospital'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Only superadmin can assign superadmin role
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only superadmins can assign superadmin role' 
      });
    }
    
    user.role = role;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'User role updated successfully', 
      data: user 
    });
  } catch (error) {
    logger.error('Error updating user role', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Admin only
 */
router.put('/users/:id/reset-password', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Reset login attempts and unlock account — an admin-initiated reset
    // shouldn't leave the account locked while the user waits on the email.
    user.loginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    // Send the same reset-link email as the self-service "Forgot Password"
    // flow, rather than generating a password here — the user sets their own
    // new password by following the link, then signs in normally.
    const jwt = require('jsonwebtoken');
    const { sendEmail, passwordResetEmailHtml, passwordResetEmailText } = require('../services/emailService');
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_RESET_SECRET, { expiresIn: '1h' });
    const name = user.firstName || user.name || 'there';
    let emailSent = true;
    try {
      await sendEmail({
        to: user.email,
        subject: `Reset your ${process.env.BRAND_NAME || 'ClinicTrust AI'} password`,
        html: passwordResetEmailHtml(name, resetToken),
        text: passwordResetEmailText(name, resetToken),
        category: 'password-reset',
      });
    } catch (emailErr) {
      emailSent = false;
      logger.error('Admin-initiated password reset email failed', logger.reqCtx(req, emailErr));
    }

    res.json({
      success: true,
      message: emailSent
        ? `Password reset email sent to ${user.email}`
        : `Account unlocked, but the reset email could not be delivered to ${user.email} — check server logs.`,
    });
  } catch (error) {
    logger.error('Error resetting password', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/unlock
 * @desc    Unlock a locked user account
 * @access  Admin only
 */
router.put('/users/:id/unlock', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    user.loginAttempts = 0;
    user.lockedUntil = null;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Account unlocked successfully', 
      data: user 
    });
  } catch (error) {
    logger.error('Error unlocking account', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/audit/login
 * @desc    Get login audit logs
 * @access  Admin only
 */
router.get('/audit/login', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { userId, startDate, endDate, status } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (status) filter.successful = status === 'success';

    const auditLogs = await LoginHistory.find(filter)
      .sort({ timestamp: -1 })
      .lean();

    res.json({
      success: true,
      count: auditLogs.length,
      data: auditLogs,
    });
  } catch (error) {
    logger.error('Error fetching login audit logs', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 * @access  Admin only
 */
router.delete('/users/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Prevent deletion of superadmin by non-superadmin
    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only superadmins can delete superadmin accounts' 
      });
    }
    
    // Prevent deletion of admin by non-superadmin
    if (user.role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only superadmins can delete admin accounts' 
      });
    }
    
    // Use deleteOne instead of remove (which is deprecated)
    await User.deleteOne({ _id: req.params.id });
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting user', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/audit/ehi
 * @desc    Query the EHI access audit log
 * @access  Admin / Superadmin only
 *
 * Supports filtering by: userId, patientId, resourceType, action,
 * startDate, endDate, responseStatus.  Results are paginated (page/limit).
 *
 * 21st Century Cures Act compliance: this endpoint is the primary tool for
 * demonstrating that EHI access is appropriately logged and auditable.
 */
router.get('/audit/ehi', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const {
      userId,
      patientId,
      resourceType,
      action,
      startDate,
      endDate,
      responseStatus,
      page = 0,
      limit = 50,
    } = req.query;

    const query = {};
    if (userId)         query.userId       = userId;
    if (patientId)      query.patientId    = patientId;
    if (resourceType)   query.resourceType = resourceType;
    if (action)         query.action       = action;
    if (responseStatus) query.responseStatus = parseInt(responseStatus);

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate)   query.timestamp.$lte = new Date(endDate);
    }

    const pageNum  = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(pageNum * limitNum)
        .limit(limitNum),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        page:  pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      oncCompliance: {
        standard:    '21st Century Cures Act — Information Blocking Rule',
        regulation:  '45 CFR Part 171',
        retentionPolicy: '7 years (HIPAA minimum: 6 years)',
      },
      data: logs,
    });
  } catch (error) {
    logger.error('Error fetching EHI audit logs', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
