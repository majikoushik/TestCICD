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
      ProviderProfile.countDocuments({ kycStatus: { $in: ['profile_incomplete', 'doc_pending'] } }),
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
    const ALLOWED = ['pending_email', 'profile_incomplete', 'doc_pending', 'under_review', 'verified', 'rejected'];
    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const profile = await ProviderProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Provider profile not found' });

    profile.kycStatus = status;
    if (['verified', 'rejected'].includes(status)) {
      profile.kycReviewedBy = req.user.id;
      profile.kycReviewedAt = new Date();
    }
    if (status === 'rejected') profile.kycRejectionReason = rejectionReason || '';
    if (status !== 'rejected') profile.kycRejectionReason = '';

    // Sync onboardingSteps flags to match the status level
    profile.onboardingSteps.email_verified   = ['profile_incomplete', 'doc_pending', 'under_review', 'verified', 'rejected'].includes(status);
    profile.onboardingSteps.profile_reviewed = ['doc_pending', 'under_review', 'verified', 'rejected'].includes(status);
    profile.onboardingSteps.docs_uploaded    = ['under_review', 'verified', 'rejected'].includes(status);

    await profile.save();

    // Mirror to user onboarding status
    const user = await User.findByIdAndUpdate(
      profile.userId,
      { onboardingStatus: status, ...(status === 'rejected' ? { kycRejectionReason: rejectionReason || '' } : {}) },
      { new: true }
    );

    // Send notification email only for terminal decisions
    if (user && ['verified', 'rejected'].includes(status)) {
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

// PATCH /api/admin/kyc/:id/profile — update editable profile fields (no status side-effects)
router.patch('/:id/profile', async (req, res) => {
  try {
    const {
      credential, gender, phone, fax, address,
      licenseNumber, licenseState, deaNumber, organizationName,
      specialty, specialties,
      acceptingNewPatients, telehealthAvailable,
      ageGroupsTreated, languagesSpoken, insuranceAccepted,
      boardCertifications, hospitalAffiliations, conditionsTreated,
    } = req.body;

    const update = {};
    if (credential       !== undefined) update.credential       = credential;
    if (gender           !== undefined) update.gender           = gender;
    if (phone            !== undefined) update.phone            = phone;
    if (fax              !== undefined) update.fax              = fax;
    if (address          !== undefined) update.address          = address;
    if (licenseNumber    !== undefined) update.licenseNumber    = licenseNumber;
    if (licenseState     !== undefined) update.licenseState     = licenseState;
    if (deaNumber        !== undefined) update.deaNumber        = deaNumber;
    if (organizationName !== undefined) update.organizationName = organizationName;

    if (specialties !== undefined) {
      update.specialties = specialties;
      update.specialty   = specialties[0] || specialty || '';
    } else if (specialty !== undefined) {
      update.specialty   = specialty;
      update.specialties = [specialty];
    }

    if (acceptingNewPatients !== undefined) update.acceptingNewPatients = acceptingNewPatients;
    if (telehealthAvailable  !== undefined) update.telehealthAvailable  = telehealthAvailable;
    if (ageGroupsTreated     !== undefined) update.ageGroupsTreated     = ageGroupsTreated;
    if (languagesSpoken      !== undefined) update.languagesSpoken      = languagesSpoken;
    if (insuranceAccepted    !== undefined) update.insuranceAccepted    = insuranceAccepted;
    if (boardCertifications  !== undefined) update.boardCertifications  = boardCertifications;
    if (hospitalAffiliations !== undefined) update.hospitalAffiliations = hospitalAffiliations;
    if (conditionsTreated    !== undefined) update.conditionsTreated    = conditionsTreated;

    const profile = await ProviderProfile.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    if (update.specialty !== undefined) {
      await User.findByIdAndUpdate(profile.userId, { specialty: update.specialty });
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    logger.error('Admin KYC profile update error', logger.reqCtx(req, err));
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
