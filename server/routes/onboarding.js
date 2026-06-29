const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const { sendEmail, kycStatusUpdateHtml, colleagueInviteHtml } = require('../services/emailService');
const logger = require('../utils/logger');

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
        accountStatus: user.accountStatus,
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

// GET /api/onboarding/profile — fetch current profile data (pre-filled from NPI)
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const profile = await ProviderProfile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    // npiData is stored as the normalized profile object returned by GET /api/npi/lookup
    // (shape: { npi, firstName, lastName, gender, specialty, address: { phone, fax, line1, ... }, ... })
    // Older records may store raw NPPES format ({ results: [...] }) — handle both.
    const npiRaw = profile.npiData || {};
    let npi = {};

    if (Array.isArray(npiRaw.results) && npiRaw.results[0]) {
      // Raw NPPES format
      const r = npiRaw.results[0];
      const b = r.basic || {};
      const tax = r.taxonomies?.find(t => t.primary) || r.taxonomies?.[0] || {};
      const mailing  = r.addresses?.find(a => a.address_purpose === 'MAILING') || null;
      const location = r.addresses?.find(a => a.address_purpose === 'LOCATION') || r.addresses?.[0] || {};
      const addrSrc  = mailing || location;
      npi = {
        firstName: b.first_name || '', lastName: b.last_name || '',
        organization: b.organization_name || '',
        credential: b.credential || '',
        gender: (b.sex || b.gender || '').toUpperCase(),
        specialty: tax.desc || '', taxonomyCode: tax.code || '',
        enumerationType: r.enumeration_type || 'NPI-1',
        organizationName: b.organization_name || '',
        phone: location.telephone_number || '',
        fax: addrSrc.fax_number || '',
        address: {
          line1: addrSrc.address_1 || '', line2: addrSrc.address_2 || '',
          city: addrSrc.city || '', state: addrSrc.state || '',
          zip: (addrSrc.postal_code || '').slice(0, 5),
        },
        licenseNumber: tax.license || '', licenseState: tax.state || '',
      };
    } else if (npiRaw.npi || npiRaw.firstName) {
      // Normalized format stored by registration (from /api/npi/lookup response)
      npi = {
        firstName: npiRaw.firstName || '', lastName: npiRaw.lastName || '',
        organization: npiRaw.organizationName || '',
        credential: npiRaw.credential || '',
        gender: npiRaw.gender || '',
        specialty: npiRaw.specialty || '', taxonomyCode: npiRaw.taxonomyCode || '',
        enumerationType: npiRaw.enumerationType || 'NPI-1',
        organizationName: npiRaw.organizationName || '',
        phone: npiRaw.address?.phone || '',
        fax: npiRaw.address?.fax || '',
        address: {
          line1: npiRaw.address?.line1 || '', line2: npiRaw.address?.line2 || '',
          city: npiRaw.address?.city || '', state: npiRaw.address?.state || '',
          zip: npiRaw.address?.zip || '',
        },
        licenseNumber: npiRaw.licenseNumber || '', licenseState: npiRaw.licenseState || '',
      };
    }

    // Fallback: if gender is still empty (old registrations had a bug storing it as ''),
    // fetch directly from NPPES once. After user saves, profile.gender is set and this won't fire.
    if (!npi.gender && !profile.gender && profile.npi) {
      try {
        const npRes = await fetch(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${profile.npi}`, { timeout: 5000 });
        const npJson = await npRes.json();
        const sex = npJson?.results?.[0]?.basic?.sex;
        if (sex) npi.gender = sex.toUpperCase();
      } catch (_) { /* non-fatal — user can select manually */ }
    }

    res.json({
      success: true,
      data: {
        // Identity (from User — read-only on the form)
        firstName:    user.firstName || npi.firstName  || '',
        lastName:     user.lastName  || npi.lastName   || '',
        email:        user.email     || '',
        organization: user.organization || npi.organization || '',
        // Provider details — profile fields first, fall back to NPI
        npi:             profile.npi             || '',
        credential:      profile.credential      || npi.credential      || '',
        specialty:       profile.specialty       || npi.specialty       || '',
        taxonomyCode:    profile.taxonomyCode    || npi.taxonomyCode    || '',
        enumerationType: profile.enumerationType || npi.enumerationType || 'NPI-1',
        organizationName: profile.organizationName || npi.organizationName || '',
        gender: profile.gender || npi.gender || '',
        phone:  profile.phone  || npi.phone  || '',
        fax:    profile.fax    || npi.fax    || '',
        address: {
          line1: profile.address?.line1 || npi.address?.line1 || '',
          line2: profile.address?.line2 || npi.address?.line2 || '',
          city:  profile.address?.city  || npi.address?.city  || '',
          state: profile.address?.state || npi.address?.state || '',
          zip:   profile.address?.zip   || npi.address?.zip   || '',
        },
        licenseNumber: profile.licenseNumber || npi.licenseNumber || '',
        licenseState:  profile.licenseState  || npi.licenseState  || '',
        deaNumber:     profile.deaNumber     || '',
        // Referral & practice details
        specialties:          profile.specialties?.length
                                ? profile.specialties
                                : (npi.specialty ? [npi.specialty] : []),
        acceptingNewPatients: profile.acceptingNewPatients ?? true,
        telehealthAvailable:  profile.telehealthAvailable  ?? false,
        ageGroupsTreated:     profile.ageGroupsTreated     || [],
        languagesSpoken:      profile.languagesSpoken      || [],
        insuranceAccepted:    profile.insuranceAccepted    || [],
        boardCertifications:  profile.boardCertifications  || [],
        hospitalAffiliations: profile.hospitalAffiliations || [],
        conditionsTreated:    profile.conditionsTreated    || [],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH /api/onboarding/profile — update profile + mark profile_reviewed
router.patch('/profile', protect, async (req, res) => {
  try {
    const {
      specialty, specialties, credential, phone, fax, address,
      licenseNumber, licenseState, deaNumber, organizationName, gender,
      acceptingNewPatients, telehealthAvailable, ageGroupsTreated,
      languagesSpoken, insuranceAccepted, boardCertifications,
      hospitalAffiliations, conditionsTreated,
    } = req.body;
    const update = {};

    // Core fields
    if (credential !== undefined)       update.credential       = credential;
    if (phone !== undefined)            update.phone            = phone;
    if (fax !== undefined)              update.fax              = fax;
    if (address !== undefined)          update.address          = address;
    if (licenseNumber !== undefined)    update.licenseNumber    = licenseNumber;
    if (licenseState !== undefined)     update.licenseState     = licenseState;
    if (deaNumber !== undefined)        update.deaNumber        = deaNumber;
    if (organizationName !== undefined) update.organizationName = organizationName;
    if (gender !== undefined)           update.gender           = gender;

    // Specialties — multi-select array; keep single specialty in sync for backward compat
    if (specialties !== undefined) {
      update.specialties = specialties;
      update.specialty   = specialties[0] || specialty || '';
    } else if (specialty !== undefined) {
      update.specialty   = specialty;
      update.specialties = [specialty];
    }

    // Referral & practice details
    if (acceptingNewPatients !== undefined) update.acceptingNewPatients = acceptingNewPatients;
    if (telehealthAvailable  !== undefined) update.telehealthAvailable  = telehealthAvailable;
    if (ageGroupsTreated     !== undefined) update.ageGroupsTreated     = ageGroupsTreated;
    if (languagesSpoken      !== undefined) update.languagesSpoken      = languagesSpoken;
    if (insuranceAccepted    !== undefined) update.insuranceAccepted    = insuranceAccepted;
    if (boardCertifications  !== undefined) update.boardCertifications  = boardCertifications;
    if (hospitalAffiliations !== undefined) update.hospitalAffiliations = hospitalAffiliations;
    if (conditionsTreated    !== undefined) update.conditionsTreated    = conditionsTreated;
    update['onboardingSteps.profile_reviewed'] = true;
    update.kycStatus = 'doc_pending';

    const profile = await ProviderProfile.findOneAndUpdate(
      { userId: req.user.id },
      update,
      { new: true }
    );

    // Mirror primary specialty + status to User model
    const primarySpecialty = (specialties && specialties[0]) || specialty;
    const userUpdate = { onboardingStatus: 'doc_pending' };
    if (primarySpecialty !== undefined) userUpdate.specialty = primarySpecialty;
    await User.findByIdAndUpdate(req.user.id, userUpdate);

    // One-time profile completion token bonus (fire-and-forget)
    ;(async () => {
      try {
        const providerUser = await User.findById(req.user.id).select('tokenBalance profileTokenBonusPaid').lean();
        if (providerUser && !providerUser.profileTokenBonusPaid) {
          const TokenEarnPolicy = require('../models/TokenEarnPolicy');
          const { Token } = require('../models/Token');
          const { processTokenTransaction } = require('../blockchain/contracts');
          const policy = await TokenEarnPolicy.getSingleton();
          const bonus = policy.profileCompleted || 25;
          const blockchainTx = await processTokenTransaction(String(req.user.id), 'system', bonus, 'Profile completion bonus', { source: 'profile_completed' }).catch(() => ({ transactionId: null }));
          await User.findByIdAndUpdate(req.user.id, { $inc: { tokenBalance: bonus }, profileTokenBonusPaid: true });
          const updatedUser = await User.findById(req.user.id).select('tokenBalance').lean();
          let token = await Token.findOne();
          if (!token) token = new Token({ contractAddress: `0x${require('crypto').randomBytes(20).toString('hex')}` });
          token.transactions.push({ user: req.user.id, type: 'earn', amount: bonus, reason: 'Profile completion bonus', relatedEntity: { entityType: 'onboarding', entityId: String(req.user.id) }, blockchainTransactionId: blockchainTx.transactionId, status: 'completed', balanceAfter: (updatedUser || {}).tokenBalance || bonus, metadata: { source: 'profile_completed' } });
          await token.save();
          logger.info('Profile completion token bonus awarded', { userId: String(req.user.id), amount: bonus });
        }
      } catch (e) { logger.warn('Profile token bonus error (non-fatal)', { error: e.message }); }
    })();

    // Notify provider: next step is document upload
    try {
      const notifyUser = await User.findById(req.user.id).select('email name firstName');
      if (notifyUser) {
        const name = notifyUser.firstName || notifyUser.name || 'Provider';
        const html = kycStatusUpdateHtml(name, 'doc_pending');
        if (html) {
          await sendEmail({
            to: notifyUser.email,
            subject: 'Action required: upload your verification documents',
            html,
            category: 'kyc',
          });
        }
      }
    } catch (e) { logger.warn('Profile step email failed (non-fatal)', { error: e.message }); }

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

    // Notify provider: documents received, application under review
    try {
      const notifyUser = await User.findById(req.user.id).select('email name firstName');
      if (notifyUser) {
        const name = notifyUser.firstName || notifyUser.name || 'Provider';
        const html = kycStatusUpdateHtml(name, 'under_review');
        if (html) {
          await sendEmail({
            to: notifyUser.email,
            subject: 'Your ClinicTrust AI application is now under review',
            html,
            category: 'kyc',
          });
        }
      }
    } catch (e) { logger.warn('Document upload status email failed (non-fatal)', { error: e.message }); }

    res.json({ success: true, data: profile, message: 'Documents submitted. Our team will review within 1-2 business days.' });
  } catch (err) {
    logger.error('Document upload error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message || 'Upload failed' });
  }
});

// PATCH /api/onboarding/steps/:step — mark a step done
router.patch('/steps/:step', protect, async (req, res) => {
  try {
    const ALLOWED = ['profile_reviewed', 'docs_uploaded'];
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
      logger.error('[ONBOARDING] Invite email failed', logger.reqCtx(req, emailErr));
    }

    // Record invite + mark step regardless of email delivery
    await ProviderProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $push: { invitesSent: { email } },
        'onboardingSteps.colleague_invited': true,
      }
    );

    // Award invite colleague token bonus (fire-and-forget)
    ;(async () => {
      try {
        const TokenEarnPolicy = require('../models/TokenEarnPolicy');
        const { Token } = require('../models/Token');
        const { processTokenTransaction } = require('../blockchain/contracts');
        const policy = await TokenEarnPolicy.getSingleton();
        const bonus = policy.inviteColleague || 20;
        if (bonus > 0) {
          const blockchainTx = await processTokenTransaction(String(req.user.id), 'system', bonus, 'Colleague invite bonus', { source: 'invite_colleague', invitedEmail: email }).catch(() => ({ transactionId: null }));
          const updatedUser = await User.findByIdAndUpdate(req.user.id, { $inc: { tokenBalance: bonus } }, { new: true }).select('tokenBalance');
          let token = await Token.findOne();
          if (!token) token = new Token({ contractAddress: `0x${require('crypto').randomBytes(20).toString('hex')}` });
          token.transactions.push({ user: req.user.id, type: 'earn', amount: bonus, reason: 'Colleague invite bonus', relatedEntity: { entityType: 'onboarding', entityId: String(req.user.id) }, blockchainTransactionId: blockchainTx.transactionId, status: 'completed', balanceAfter: (updatedUser || {}).tokenBalance || bonus, metadata: { source: 'invite_colleague', invitedEmail: email } });
          await token.save();
          logger.info('Invite colleague token bonus awarded', { userId: String(req.user.id), amount: bonus, invitedEmail: email });
        }
      } catch (e) { logger.warn('Invite colleague token bonus error (non-fatal)', { error: e.message }); }
    })();

    res.json({
      success: true,
      message: emailSent
        ? `Invite sent to ${email}`
        : `Invite recorded but email delivery failed — check server logs.`,
    });
  } catch (err) {
    logger.error('[ONBOARDING] Invite error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Failed to send invite' });
  }
});

module.exports = router;
