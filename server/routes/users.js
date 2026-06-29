const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const logger = require('../utils/logger');

// ── Avatar multer setup ───────────────────────────────────────────────────────
const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    // userId-timestamp.ext — deterministic enough for one avatar per user
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'));
    }
  },
});

// ── GET /api/users/profile ─────────────────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -emailVerificationToken -emailVerificationExpiry');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    logger.error('GET /users/profile error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── PUT /api/users/profile ─────────────────────────────────────────────────────
// Editable fields only — email, role, organization are admin-managed
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'specialty', 'credential', 'phone', 'fax', 'bio', 'profileImage'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (updates.firstName || updates.lastName) {
      const u = await User.findById(req.user._id);
      updates.name = `${updates.firstName || u.firstName} ${updates.lastName || u.lastName}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: false }
    ).select('-password -emailVerificationToken -emailVerificationExpiry');

    // Mirror specialty/phone/fax/credential to ProviderProfile if it exists
    const profileUpdates = {};
    if (updates.specialty) profileUpdates.specialty = updates.specialty;
    if (updates.credential) profileUpdates.credential = updates.credential;
    if (updates.phone) profileUpdates.phone = updates.phone;
    if (updates.fax) profileUpdates.fax = updates.fax;
    if (Object.keys(profileUpdates).length) {
      await ProviderProfile.findOneAndUpdate(
        { userId: req.user._id.toString() },
        { $set: profileUpdates },
        { upsert: false }
      );
    }

    res.json({ success: true, data: user });
  } catch (err) {
    logger.error('PUT /users/profile error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── POST /api/users/profile/image ─────────────────────────────────────────────
// Multipart upload — stores file in server/uploads/avatars/, saves URL path in DB.
// Field name expected: "image"  (matches userService.updateProfileImage)
router.post('/profile/image', protect, avatarUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    // Delete the user's previous avatar from disk to avoid orphan files
    const existing = await User.findById(req.user._id).select('profileImage');
    if (existing?.profileImage && existing.profileImage.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', existing.profileImage);
      fs.unlink(oldPath, () => {}); // fire-and-forget; ignore ENOENT
    }

    // Store a server-relative URL that the static middleware will serve
    const imageUrl = `/uploads/avatars/${req.file.filename}`;

    await User.findByIdAndUpdate(req.user._id, { $set: { profileImage: imageUrl } });

    logger.info('Avatar uploaded', { userId: req.user._id, file: req.file.filename });
    res.json({ success: true, data: { profileImage: imageUrl } });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file) fs.unlink(req.file.path, () => {});
    logger.error('POST /users/profile/image error', { error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// ── GET /api/users/settings ────────────────────────────────────────────────────
router.get('/settings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('settings');
    res.json({ success: true, data: user?.settings || {} });
  } catch (err) {
    logger.error('GET /users/settings error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── PUT /api/users/settings ────────────────────────────────────────────────────
router.put('/settings', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { settings: req.body } },
      { new: true }
    ).select('settings');
    res.json({ success: true, data: user.settings });
  } catch (err) {
    logger.error('PUT /users/settings error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── POST /api/users/blockchain/verify ─────────────────────────────────────────
// Triggers blockchain identity creation for the logged-in user.
router.post('/blockchain/verify', protect, async (req, res) => {
  try {
    // Check if already linked
    const existing = await User.findById(req.user._id).select('blockchainId walletAddress');
    if (existing?.blockchainId) {
      return res.json({
        success: true,
        data: { alreadyVerified: true, blockchainId: existing.blockchainId, walletAddress: existing.walletAddress },
      });
    }

    // Generate deterministic blockchain ID from user ID (production: call Polygon/wallet service)
    const blockchainId = '0x' + crypto.createHash('sha256').update(req.user._id.toString()).digest('hex').slice(0, 40);
    const walletAddress = '0x' + crypto.createHash('sha256').update(req.user._id.toString() + 'wallet').digest('hex').slice(0, 40);

    await User.findByIdAndUpdate(req.user._id, {
      $set: { blockchainId, walletAddress },
    });

    // Also create a BlockchainIdentity document if the model exists
    try {
      const BlockchainIdentity = require('../models/BlockchainIdentity');
      await BlockchainIdentity.findOneAndUpdate(
        { userId: req.user._id.toString() },
        { $set: { blockchainId, walletAddress, verified: true, verifiedAt: new Date() } },
        { upsert: true }
      );
    } catch (_) { /* model may not exist — non-fatal */ }

    logger.info('Blockchain identity created', { userId: req.user._id, blockchainId });
    res.json({ success: true, data: { blockchainId, walletAddress, alreadyVerified: false } });
  } catch (err) {
    logger.error('POST /users/blockchain/verify error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/users — admin: list all users ────────────────────────────────────
router.get('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.accountStatus = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } },
        { specialty: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -emailVerificationToken -emailVerificationExpiry')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('GET /users error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── GET /api/users/:userId — admin: get single user ──────────────────────────
router.get('/:userId', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -emailVerificationToken -emailVerificationExpiry');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Attach provider profile if available
    let providerProfile = null;
    try {
      providerProfile = await ProviderProfile.findOne({ userId: req.params.userId });
    } catch (_) {}

    res.json({ success: true, data: { ...user.toObject(), providerProfile } });
  } catch (err) {
    logger.error('GET /users/:userId error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
