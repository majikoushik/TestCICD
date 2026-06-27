const express = require('express');
const router = express.Router();
const fs = require('fs');
const User = require('../../models/User');
const ProviderProfile = require('../../models/ProviderProfile');
const { sendEmail, kycApprovedHtml, kycRejectedHtml } = require('../../services/emailService');
const logger = require('../../utils/logger');

// GET /api/admin/kyc — list all providers with KYC info
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status && status !== 'all' ? { kycStatus: status } : {};
    const total = await ProviderProfile.countDocuments(filter);
    const profiles = await ProviderProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Enrich with user data
    const userIds = profiles.map(p => p.userId);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach(u => { userMap[u._id] = u; });

    const data = profiles.map(p => ({
      ...p.toObject(),
      user: userMap[p.userId] ? {
        name: userMap[p.userId].name,
        email: userMap[p.userId].email,
        role: userMap[p.userId].role,
        organization: userMap[p.userId].organization,
      } : null,
    }));

    // Stats
    const [pendingDocs, underReview, verified, rejected] = await Promise.all([
      ProviderProfile.countDocuments({ kycStatus: 'pending_docs' }),
      ProviderProfile.countDocuments({ kycStatus: 'under_review' }),
      ProviderProfile.countDocuments({ kycStatus: 'verified' }),
      ProviderProfile.countDocuments({ kycStatus: 'rejected' }),
    ]);

    res.json({
      success: true,
      data,
      meta: { total, pendingDocs, underReview, verified, rejected },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH /api/admin/kyc/:id — approve or reject
router.patch('/:id', async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be verified or rejected' });
    }

    const profile = await ProviderProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Provider profile not found' });

    profile.kycStatus = status;
    profile.kycReviewedBy = req.user.id;
    profile.kycReviewedAt = new Date();
    if (status === 'rejected') profile.kycRejectionReason = rejectionReason || '';
    if (status === 'verified') profile.kycRejectionReason = '';
    await profile.save();

    // Update user onboarding status
    const newUserStatus = status === 'verified' ? 'verified' : 'rejected';
    const user = await User.findByIdAndUpdate(
      profile.userId,
      { onboardingStatus: newUserStatus, ...(status === 'rejected' ? { kycRejectionReason: rejectionReason || '' } : {}) },
      { new: true }
    );

    // Send notification email
    if (user) {
      try {
        if (status === 'verified') {
          await sendEmail({ to: user.email, subject: 'Your ClinicTrust AI account is verified!', html: kycApprovedHtml(user.firstName || user.name) });
        } else {
          await sendEmail({ to: user.email, subject: 'ClinicTrust AI verification update', html: kycRejectedHtml(user.firstName || user.name, rejectionReason) });
        }
      } catch (e) { logger.error('KYC email error', logger.reqCtx(req, e)); }
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/admin/kyc/:id/document — serve KYC document (admin only, private)
router.get('/:id/document', async (req, res) => {
  try {
    const profile = await ProviderProfile.findById(req.params.id);
    if (!profile || !profile.kycDocumentPath) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    if (!fs.existsSync(profile.kycDocumentPath)) {
      return res.status(404).json({ success: false, error: 'Document file not found on server' });
    }
    res.download(profile.kycDocumentPath, profile.kycDocumentOriginalName || 'document');
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
