const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const AdminSetting = require('../models/Admin');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

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
    console.error('Error fetching admin settings:', error);
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
    console.error(`Error fetching ${req.params.category} settings:`, error);
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
    console.error(`Error fetching setting with key ${req.params.key}:`, error);
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
    console.error('Error creating admin setting:', error);
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
    const { value, description, isActive } = req.body;
    
    // Find setting by key
    let setting = await AdminSetting.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        error: `Setting not found with key: ${req.params.key}` 
      });
    }
    
    // Update fields
    setting.value = value !== undefined ? value : setting.value;
    setting.description = description || setting.description;
    setting.isActive = isActive !== undefined ? isActive : setting.isActive;
    setting.lastModifiedBy = req.user.id;
    setting.lastModifiedAt = Date.now();
    
    await setting.save();
    
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error(`Error updating setting with key ${req.params.key}:`, error);
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
    console.error(`Error deleting setting with key ${req.params.key}:`, error);
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
    
    // Create the new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
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
    console.error('Error creating user:', error);
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
    console.error('Error fetching users:', error);
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
    console.error(`Error fetching user with ID ${req.params.id}:`, error);
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
    const { role, isActive } = req.body;
    const User = require('../models/User');
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Update fields
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error(`Error updating user ${req.params.id}:`, error);
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
    console.error('Error fetching system status:', error);
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
    console.error('Error initializing admin settings:', error);
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
    const providers = await User.find({
      role: 'provider'
    }).select('-password');
    
    res.json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
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
    const pendingProviders = await User.find({
      role: 'provider',
      accountStatus: 'pending'
    }).select('-password');
    
    res.json({ success: true, count: pendingProviders.length, data: pendingProviders });
  } catch (error) {
    console.error('Error fetching pending providers:', error);
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
    
    if (provider.role !== 'provider') {
      return res.status(400).json({ success: false, error: 'User is not a provider' });
    }
    
    provider.accountStatus = 'approved';
    provider.kycVerified = true;
    provider.kycDocuments.verifiedAt = Date.now();
    provider.kycDocuments.verifiedBy = req.user.id;
    
    await provider.save();
    
    res.json({ 
      success: true, 
      message: 'Provider approved successfully', 
      data: provider 
    });
  } catch (error) {
    console.error('Error approving provider:', error);
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
    
    if (provider.role !== 'provider') {
      return res.status(400).json({ success: false, error: 'User is not a provider' });
    }
    
    provider.accountStatus = 'rejected';
    provider.rejectionReason = reason || 'Application did not meet requirements';
    
    await provider.save();
    
    res.json({ 
      success: true, 
      message: 'Provider rejected successfully', 
      data: provider 
    });
  } catch (error) {
    console.error('Error rejecting provider:', error);
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
    console.error('Error suspending provider:', error);
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
    console.error('Error activating provider:', error);
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
    console.error('Error updating user role:', error);
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
    const user = await User.findById(req.params.id).select('+password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Generate a random password
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(tempPassword, salt);
    
    // Reset login attempts and unlock account
    user.loginAttempts = 0;
    user.lockedUntil = null;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully', 
      tempPassword: tempPassword // In production, this would be sent via email
    });
  } catch (error) {
    console.error('Error resetting password:', error);
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
    console.error('Error unlocking account:', error);
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
    // Get query parameters for filtering
    const { userId, startDate, endDate, status } = req.query;
    
    // Build query
    const query = {};
    
    if (userId) {
      query._id = userId;
    }
    
    // Find users with login history
    const users = await User.find(query).select('name email role loginHistory');
    
    // Extract and format login history
    let auditLogs = [];
    
    users.forEach(user => {
      if (user.loginHistory && user.loginHistory.length > 0) {
        const userLogs = user.loginHistory.map(log => ({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          timestamp: log.timestamp,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          successful: log.successful
        }));
        
        auditLogs = [...auditLogs, ...userLogs];
      }
    });
    
    // Apply date filtering if provided
    if (startDate || endDate) {
      auditLogs = auditLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        
        if (startDate && endDate) {
          return logDate >= new Date(startDate) && logDate <= new Date(endDate);
        } else if (startDate) {
          return logDate >= new Date(startDate);
        } else {
          return logDate <= new Date(endDate);
        }
      });
    }
    
    // Apply status filtering if provided
    if (status) {
      const isSuccessful = status === 'success';
      auditLogs = auditLogs.filter(log => log.successful === isSuccessful);
    }
    
    // Sort by timestamp (most recent first)
    auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ 
      success: true, 
      count: auditLogs.length, 
      data: auditLogs 
    });
  } catch (error) {
    console.error('Error fetching login audit logs:', error);
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
    console.error('Error deleting user:', error);
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
    console.error('Error fetching EHI audit logs:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
