const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const { sendEmail, colleagueInviteHtml } = require('../services/emailService');

// Multer setup — store KYC docs in server/uploads/kyc/
const uploadDir = path.join(__dirname, '../uploads/kyc');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
  },
});

// GET /api/onboarding/status
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const profile = await ProviderProfile.findOne({ userId: req.user.id });
    res.json({
      success: true,
      data: {
        onboardingStatus: user.onboardingStatus,
        emailVerified: user.emailVerified,
        steps: profile?.onboardingSteps || null,
        kycStatus: profile?.kycStatus || null,
        kycRejectionReason: profile?.kycRejectionReason || '',
        npi: profile?.npi || null,
        hasDoc: !!profile?.kycDocumentPath,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH /api/onboarding/profile — update profile + mark profile_reviewed
router.patch('/profile', protect, async (req, res) => {
  try {
    const { specialty, credential, phone, address, licenseNumber, licenseState } = req.body;
    const update = {};
    if (specialty) update.specialty = specialty;
    if (credential) update.credential = credential;
    if (phone) update.phone = phone;
    if (address) update.address = address;
    if (licenseNumber) update.licenseNumber = licenseNumber;
    if (licenseState) update.licenseState = licenseState;
    update['onboardingSteps.profile_reviewed'] = true;

    const profile = await ProviderProfile.findOneAndUpdate(
      { userId: req.user.id },
      update,
      { new: true }
    );

    // Mirror specialty to User model
    if (specialty) await User.findByIdAndUpdate(req.user.id, { specialty });

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/onboarding/documents — upload KYC doc
router.post('/documents', protect, upload.single('document'), async (req, res) => {
  try {
    const { licenseNumber, licenseState, deaNumber } = req.body;
    if (!licenseNumber) {
      return res.status(400).json({ success: false, error: 'License number is required' });
    }

    const updateData = {
      licenseNumber,
      licenseState: licenseState || '',
      deaNumber: deaNumber || '',
      'onboardingSteps.docs_uploaded': true,
      kycStatus: 'under_review',
    };

    if (req.file) {
      updateData.kycDocumentPath = req.file.path;
      updateData.kycDocumentOriginalName = req.file.originalname;
    }

    const profile = await ProviderProfile.findOneAndUpdate(
      { userId: req.user.id },
      updateData,
      { new: true }
    );

    // Update user's onboarding status
    await User.findByIdAndUpdate(req.user.id, { onboardingStatus: 'under_review' });

    res.json({ success: true, data: profile, message: 'Documents submitted. Our team will review within 1-2 business days.' });
  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Upload failed' });
  }
});

// PATCH /api/onboarding/steps/:step — mark a step done
router.patch('/steps/:step', protect, async (req, res) => {
  try {
    const ALLOWED = ['profile_reviewed', 'first_patient', 'first_referral'];
    const { step } = req.params;
    if (!ALLOWED.includes(step)) {
      return res.status(400).json({ success: false, error: 'Invalid step' });
    }
    const profile = await ProviderProfile.findOneAndUpdate(
      { userId: req.user.id },
      { [`onboardingSteps.${step}`]: true },
      { new: true }
    );
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/onboarding/invite — send colleague invite
router.post('/invite', protect, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await User.findById(req.user.id);

    let emailSent = true;
    try {
      await sendEmail({
        to: email,
        subject: `${user.name} invited you to join ClinicTrust AI`,
        html: colleagueInviteHtml(user.name, user.email),
      });
    } catch (emailErr) {
      emailSent = false;
      console.error('[ONBOARDING] Invite email failed:', emailErr.message);
    }

    // Record invite + mark step regardless of email delivery
    await ProviderProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $push: { invitesSent: { email } },
        'onboardingSteps.colleague_invited': true,
      }
    );

    res.json({
      success: true,
      message: emailSent
        ? `Invite sent to ${email}`
        : `Invite recorded but email delivery failed — check server logs.`,
    });
  } catch (err) {
    console.error('[ONBOARDING] Invite error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send invite' });
  }
});

module.exports = router;
