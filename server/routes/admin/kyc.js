const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../../models/User');
const ProviderProfile = require('../../models/ProviderProfile');
const Wallet = require('../../models/Wallet');
const crypto = require('crypto');
const fileStorage = require('../../utils/fileStorage');
const {
  sendEmail,
  kycApprovedHtml, kycRejectedHtml, kycStatusUpdateHtml,
  verificationEmailHtml, verificationEmailText,
} = require('../../services/emailService');
const logger = require('../../utils/logger');

const BRAND_NAME = 'ClinicTrust AI';

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

    // Mirror to user onboarding status + accountStatus lifecycle
    const accountStatusMap = {
      verified:          { accountStatus: 'approved', isActive: true,  kycVerified: true  },
      rejected:          { accountStatus: 'rejected', isActive: false, kycVerified: false },
      pending_email:     { accountStatus: 'pending',  isActive: true,  kycVerified: false },
      profile_incomplete:{ accountStatus: 'pending',  isActive: true,  kycVerified: false },
      doc_pending:       { accountStatus: 'pending',  isActive: true,  kycVerified: false },
      under_review:      { accountStatus: 'pending',  isActive: true,  kycVerified: false },
    };
    const accountFields = accountStatusMap[status] || { accountStatus: 'pending', isActive: true };

    const user = await User.findByIdAndUpdate(
      profile.userId,
      {
        onboardingStatus: status,
        ...accountFields,
        ...(status === 'rejected' ? { kycRejectionReason: rejectionReason || '' } : {}),
      },
      { new: true }
    );

    // Award one-time KYC verification token bonus
    if (status === 'verified' && user && !user.kycTokenBonusPaid) {
      try {
        const TokenEarnPolicy = require('../../models/TokenEarnPolicy');
        const { Token } = require('../../models/Token');
        const { processTokenTransaction } = require('../../blockchain/contracts');
        const policy = await TokenEarnPolicy.getSingleton();
        const bonus = policy.kycVerified || 50;
        const blockchainTx = await processTokenTransaction(String(user._id), 'system', bonus, 'KYC verification bonus', { source: 'kyc_verified' }).catch(() => ({ transactionId: null }));
        await User.findByIdAndUpdate(user._id, { $inc: { tokenBalance: bonus }, kycTokenBonusPaid: true });
        let token = await Token.findOne();
        if (!token) token = new (require('../../models/Token').Token)({ contractAddress: `0x${require('crypto').randomBytes(20).toString('hex')}` });
        const updatedUser = await User.findById(user._id).select('tokenBalance').lean();
        token.transactions.push({ user: user._id, type: 'earn', amount: bonus, reason: 'KYC verification bonus', relatedEntity: { entityType: 'kyc', entityId: String(user._id) }, blockchainTransactionId: blockchainTx.transactionId, status: 'completed', balanceAfter: (updatedUser || {}).tokenBalance || bonus, metadata: { source: 'kyc_verified' } });
        await token.save();
        logger.info('KYC token bonus awarded', { userId: String(user._id), amount: bonus });
      } catch (e) {
        logger.error('KYC token bonus error', { error: e.message });
      }
    }

    // Create blockchain wallet when admin approves the provider
    if (status === 'verified' && user) {
      try {
        const existingWallet = await Wallet.findOne({ userId: String(profile.userId) });
        if (!existingWallet) {
          const { registerBlockchainIdentity } = require('../../blockchain/identity');
          const identity = await registerBlockchainIdentity(String(profile.userId), user.role, user.organization);
          await User.findByIdAndUpdate(profile.userId, {
            blockchainId:  identity.blockchainId,
            walletAddress: identity.walletAddress,
          });
          logger.info('Wallet created on KYC approval', { userId: profile.userId, blockchainId: identity.blockchainId });
        }
      } catch (e) {
        logger.error('Wallet creation error on KYC approval', { error: e.message });
      }
    }

    // Send notification email for every status transition
    if (user) {
      const displayName = user.firstName || user.name || 'Provider';
      try {
        if (status === 'verified') {
          await sendEmail({
            to: user.email,
            subject: `Your ${BRAND_NAME} provider account has been verified`,
            html: kycApprovedHtml(displayName),
            category: 'kyc',
          });
        } else if (status === 'rejected') {
          await sendEmail({
            to: user.email,
            subject: `An update on your ${BRAND_NAME} provider application`,
            html: kycRejectedHtml(displayName, rejectionReason),
            category: 'kyc',
          });
        } else {
          const statusHtml = kycStatusUpdateHtml(displayName, status);
          if (statusHtml) {
            const statusSubjects = {
              pending_email:     `Action required: verify your ${BRAND_NAME} account email`,
              profile_incomplete:`Action required: complete your ${BRAND_NAME} provider profile`,
              doc_pending:       `Action required: upload documents for your ${BRAND_NAME} application`,
              under_review:      `Your ${BRAND_NAME} application is now under review`,
            };
            await sendEmail({
              to: user.email,
              subject: statusSubjects[status] || `Your ${BRAND_NAME} application status has been updated`,
              html: statusHtml,
              category: 'kyc',
            });
          }
        }
      } catch (e) { logger.error('KYC status email error', { error: e.message, status, userId: String(user._id) }); }
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

// GET /api/admin/kyc/:id/wallet — get wallet info for a provider
router.get('/:id/wallet', async (req, res) => {
  try {
    const profile = await ProviderProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    const BlockchainIdentity = require('../../models/BlockchainIdentity');
    const wallet = await Wallet.findOne({ userId: String(profile.userId) });
    if (!wallet) return res.json({ success: true, data: null });

    const identity = await BlockchainIdentity.findOne({ walletAddress: wallet.walletAddress });
    res.json({
      success: true,
      data: {
        userId:        wallet.userId,
        blockchainId:  identity ? identity.blockchainId : null,
        walletAddress: wallet.walletAddress,
        role:          wallet.role,
        organization:  wallet.organization,
        registeredAt:  wallet.registeredAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/admin/kyc/:id — hard-delete all user data (makes email reusable)
router.delete('/:id', async (req, res) => {
  try {
    const profile = await ProviderProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Provider profile not found' });

    const userId = profile.userId;

    // Remove KYC document file if it exists (local disk, S3, or Azure Blob)
    if (profile.kycDocumentPath) {
      await fileStorage.deleteFile(profile.kycDocumentPath);
    }

    // Find wallet to get walletAddress for BlockchainIdentity cleanup
    const BlockchainIdentity = require('../../models/BlockchainIdentity');
    const wallet = await Wallet.findOne({ userId: String(userId) });
    if (wallet) {
      await BlockchainIdentity.deleteOne({ walletAddress: wallet.walletAddress });
      await Wallet.deleteOne({ userId: String(userId) });
    }

    // Delete all core user records
    await ProviderProfile.findByIdAndDelete(req.params.id);
    await User.findByIdAndDelete(userId);

    // Best-effort cleanup of peripheral records
    try {
      const AnalyticsSnapshot = require('../../models/AnalyticsSnapshot');
      await AnalyticsSnapshot.deleteMany({ userId: String(userId) });
    } catch (_) {}
    try {
      const ProviderSchedule = require('../../models/ProviderSchedule');
      await ProviderSchedule.deleteMany({ userId: String(userId) });
    } catch (_) {}
    try {
      const ProviderMatchProfile = require('../../models/ProviderMatchProfile');
      await ProviderMatchProfile.deleteMany({ userId: String(userId) });
    } catch (_) {}
    try {
      const Notification = require('../../models/Notification');
      await Notification.deleteMany({ userId: String(userId) });
    } catch (_) {}

    logger.info('Admin hard-deleted provider', { profileId: req.params.id, userId: String(userId) });
    res.json({ success: true, message: 'Provider and all related data deleted.' });
  } catch (err) {
    logger.error('Admin KYC delete error', { error: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/admin/kyc/:id/resend-verification — resend email verification on behalf of a provider
router.post('/:id/resend-verification', async (req, res) => {
  try {
    const profile = await ProviderProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Provider profile not found' });

    const user = await User.findById(profile.userId).select('+emailVerificationToken +emailVerificationExpiry');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.onboardingStatus !== 'pending_email') {
      return res.status(400).json({ success: false, error: 'Email already verified for this provider' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Please confirm your ClinicTrust AI account',
      html: verificationEmailHtml(user.firstName || user.name, rawToken),
      text: verificationEmailText(user.firstName || user.name, rawToken),
    });

    logger.info('Admin resent verification email', { profileId: req.params.id, userId: String(user._id), email: user.email });
    res.json({ success: true, message: `Verification email resent to ${user.email}` });
  } catch (err) {
    logger.error('Admin resend verification error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to resend verification email' });
  }
});

// GET /api/admin/kyc/:id/document — serve KYC document inline for browser preview
router.get('/:id/document', async (req, res) => {
  try {
    const profile = await ProviderProfile.findById(req.params.id);
    if (!profile || !profile.kycDocumentPath) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    if (!(await fileStorage.fileExists(profile.kycDocumentPath))) {
      return res.status(404).json({ success: false, error: 'Document file not found on server' });
    }

    const ext      = path.extname(profile.kycDocumentPath).toLowerCase();
    const mimeMap  = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
    const mimeType = mimeMap[ext] || 'application/octet-stream';
    const inline   = Boolean(mimeMap[ext]); // PDF & images open in browser; everything else downloads
    const filename = (profile.kycDocumentOriginalName || `document${ext}`).replace(/"/g, "'");

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-cache');

    const stream = await fileStorage.getReadStream(profile.kycDocumentPath);
    stream.on('error', () => { if (!res.headersSent) res.status(500).end(); });
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
