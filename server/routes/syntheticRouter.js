/**
 * Synthetic data router — serves all /api/* routes from in-memory data when
 * MongoDB is unavailable.  JWT auth is fully functional (same secrets).
 * All demo accounts share the password:  Demo1234!
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { store } = require('../data/syntheticData');
const logger = require('../utils/logger');
const {
  toFHIRPatient,
  toFHIRPractitioner,
  toFHIRCondition,
  toFHIRMedicationRequest,
  toFHIRAllergyIntolerance,
  toFHIRCoverage,
  toFHIRServiceRequest,
  toFHIRBundle,
  capabilityStatement,
} = require('../utils/fhirTransformer');

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function buildToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, organization: user.organization },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function buildRefreshToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function userPayload(user) {
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
    onboardingStatus: user.onboardingStatus || 'verified',
    accountStatus: user.accountStatus || 'approved',
    isActive: user.isActive !== false,
  };
}

// Middleware: authenticate via JWT, attach req.user from synthetic store
function protect(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const rawUser = store.users.findById(decoded.id);
    if (!rawUser) return res.status(401).json({ success: false, error: 'User not found' });
    // Strip password from req.user
    const { password: _pw, ...safeUser } = rawUser;
    req.user = safeUser;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized for this resource' });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Auth routes  /api/auth/*
// ---------------------------------------------------------------------------

router.post('/auth/register', async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, role, organization, specialty } = req.body;
    if (!name || !email || !password || !role || !organization) {
      return res.status(400).json({ success: false, error: 'Please provide name, email, password, role, and organization' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    if (['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Cannot self-register with this role' });
    }
    if (store.users.findOne({ email })) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    const newUser = {
      _id: `user-${Date.now()}`, id: `user-${Date.now()}`,
      name, firstName: firstName || name.split(' ')[0], lastName: lastName || name.split(' ').slice(1).join(' '),
      email, password: bcrypt.hashSync(password, 10),
      role, organization, specialty: specialty || '',
      walletAddress: `0x${crypto.randomBytes(20).toString('hex')}`,
      blockchainId: `synth-${crypto.randomBytes(10).toString('hex')}`,
      isActive: true, accountStatus: 'approved', kycVerified: false,
      tokenBalance: 0, loginAttempts: 0,
      createdAt: new Date(), lastLogin: new Date(), profileImage: null,
    };
    store.users.save(newUser);
    const token = buildToken(newUser);
    res.status(201).json({ success: true, token, user: userPayload(newUser) });
  } catch (err) {
    logger.error('Synthetic register error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }
    const user = store.users.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    user.lastLogin = new Date();
    store.users.save(user);
    const token = buildToken(user);
    res.status(200).json({ success: true, token, user: userPayload(user) });
  } catch (err) {
    logger.error('Synthetic login error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/auth/me', protect, (req, res) => {
  res.status(200).json({ success: true, user: userPayload(req.user) });
});

router.post('/auth/logout', protect, (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

router.post('/auth/refresh-token', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token is required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = store.users.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.status(200).json({ success: true, token: buildToken(user), refreshToken: buildRefreshToken(user) });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

router.post('/auth/request-password-reset', (req, res) => {
  const { email } = req.body;
  const user = store.users.findOne({ email: email || '' });
  const generic = { success: true, message: 'If your email is registered, you will receive a password reset link' };
  if (!user) return res.status(200).json(generic);
  const resetToken = jwt.sign({ id: user._id }, process.env.JWT_RESET_SECRET, { expiresIn: '1h' });
  res.status(200).json({ ...generic, ...(process.env.NODE_ENV === 'development' && { resetToken }) });
});

router.post('/auth/reset-password', (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    const user = store.users.findById(decoded.id);
    if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    user.password = bcrypt.hashSync(password, 10);
    store.users.save(user);
    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch {
    res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }
});

router.post('/auth/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }
    const user = store.users.findById(req.user._id || req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    user.password = bcrypt.hashSync(newPassword, 10);
    store.users.save(user);
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    logger.error('Synthetic change-password error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Admin auth routes  /api/admin/auth/*
// ---------------------------------------------------------------------------

router.post('/admin/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }
    const user = store.users.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const token = buildToken(user);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    logger.error('Synthetic admin login error', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/admin/auth/verify', (req, res) => {
  try {
    const token = (req.header('Authorization') || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = store.users.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(401).json({ success: false, error: 'Token is not valid' });
  }
});

// ---------------------------------------------------------------------------
// Patient routes  /api/patients/*
// ---------------------------------------------------------------------------

router.get('/patients', protect, authorize('doctor', 'clinic', 'hospital', 'lab', 'admin', 'superadmin'), (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = (req.query.search || '').toLowerCase();

  let patients = store.patients.findAll();

  // Providers see their own patients; admins see all
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    patients = patients.filter((p) => p.primaryProvider === req.user.id);
  }

  if (search) {
    patients = patients.filter(
      (p) =>
        p.name?.toLowerCase().includes(search) ||
        p.patientId?.toLowerCase().includes(search) ||
        p.email?.toLowerCase().includes(search)
    );
  }

  const riskLevel = req.query.riskLevel;
  if (riskLevel && riskLevel !== 'all') {
    patients = patients.filter((p) => p.riskLevel === riskLevel);
  }

  const total = patients.length;
  const paginatedPatients = patients.slice(page * limit, page * limit + limit);

  res.status(200).json({
    success: true,
    patients: paginatedPatients,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

router.post('/patients', protect, authorize('doctor', 'clinic', 'hospital'), (req, res) => {
  const { patientId, name, dateOfBirth, gender, contactInfo, insuranceInfo, medicalHistory, medications, allergies } = req.body;
  if (store.patients.findOne({ patientId })) {
    return res.status(400).json({ success: false, error: 'Patient already exists' });
  }
  const newPatient = {
    _id: `patient-${Date.now()}`, id: `patient-${Date.now()}`,
    patientId: patientId || `PT-${Date.now()}`,
    name, firstName: name?.split(' ')[0] || '', lastName: name?.split(' ').slice(1).join(' ') || '',
    dateOfBirth, gender, contactInfo, insuranceInfo,
    primaryProvider: req.user.id,
    riskScore: 0, riskLevel: 'low',
    medicalHistory: medicalHistory || [],
    medications: medications || [],
    allergies: allergies || [],
    consentRecords: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
  store.patients.save(newPatient);
  res.status(201).json({ success: true, data: newPatient });
});

router.get('/patients/:id', protect, (req, res) => {
  const patient = store.patients.findById(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

  const isPrimary = patient.primaryProvider === req.user.id;
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  if (!isPrimary && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Access denied to this patient record' });
  }
  res.status(200).json({ success: true, data: patient, consentLevel: isPrimary ? 'primary' : 'full' });
});

router.put('/patients/:id', protect, (req, res) => {
  const patient = store.patients.findById(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const updated = { ...patient, ...req.body, _id: patient._id, updatedAt: new Date() };
  store.patients.save(updated);
  res.status(200).json({ success: true, data: updated });
});

router.post('/patients/:id/consent', protect, (req, res) => {
  const patient = store.patients.findById(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const { providerId, accessLevel, dataElements, expiryDate } = req.body;
  const consent = {
    _id: `consent-${Date.now()}`, providerId, accessLevel,
    dataElements: dataElements || [],
    consentDate: new Date(),
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    blockchainTransactionId: `tx_synth_${crypto.randomBytes(8).toString('hex')}`,
  };
  patient.consentRecords = patient.consentRecords || [];
  patient.consentRecords.push(consent);
  store.patients.save(patient);
  res.status(201).json({ success: true, data: consent });
});

router.get('/patients/:id/medical-records', protect, (req, res) => {
  const patient = store.patients.findById(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const allRecords = [
    ...(patient.medicalHistory || []).map((r) => ({ ...r, type: 'condition', patientId: patient._id })),
    ...(patient.medications || []).map((r) => ({ ...r, type: 'medication', patientId: patient._id })),
  ];
  const paged = allRecords.slice(page * limit, page * limit + limit);
  res.status(200).json({
    success: true,
    count: allRecords.length,
    data: { records: paged, pagination: { total: allRecords.length, page, limit, pages: Math.ceil(allRecords.length / limit) } },
  });
});

// EHI audit logging helper for synthetic mode (mirrors ehiAudit middleware)
function logSyntheticEhi(req, resourceType, action, responseStatus) {
  const entry = {
    _id:            `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp:      new Date(),
    userId:         req.user?._id || req.user?.id || null,
    userEmail:      req.user?.email   || null,
    userRole:       req.user?.role    || null,
    action,
    resourceType,
    resourceId:     req.params?.id || req.params?.patientId || null,
    patientId:      req.params?.patientId || req.params?.id || null,
    endpoint:       req.originalUrl,
    method:         req.method,
    ipAddress:      req.ip,
    userAgent:      req.get ? req.get('User-Agent') : null,
    responseStatus,
  };
  store.auditLogs.save(entry);
}

router.get('/patients/:id/consent-records', protect, (req, res) => {
  const patient = store.patients.findById(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const records = (patient.consentRecords || []).map((r) => ({
    ...r, patientId: patient._id,
    status: r.expiryDate && new Date(r.expiryDate) < new Date() ? 'expired' : 'active',
  }));
  res.status(200).json({ success: true, count: records.length, data: { records, pagination: { total: records.length, page: 0, limit: records.length, pages: 1 } } });
});

// EHI export — full patient record + referrals (ONC Information Blocking compliance)
router.get('/patients/:id/export', protect, (req, res) => {
  const patient = store.patients.findById(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

  const isPrimary = patient.primaryProvider === req.user.id;
  const isAdmin   = ['admin', 'superadmin'].includes(req.user.role);
  if (!isPrimary && !isAdmin) {
    logSyntheticEhi(req, 'Patient', 'EXPORT', 403);
    res.setHeader('X-ONC-Exception',            'privacy');
    res.setHeader('X-ONC-Exception-Name',       'Privacy Exception');
    res.setHeader('X-ONC-Exception-Regulation', '45 CFR § 171.202');
    res.setHeader('X-ONC-Exception-Rationale',  'Full EHI export restricted to primary treating provider and administrators to prevent mass data exposure.');
    return res.status(403).json({
      success: false,
      error: 'EHI export is restricted to the primary treating provider or an administrator.',
    });
  }

  const referrals = store.referrals.find({ patient: req.params.id });

  const exportBundle = {
    exportMetadata: {
      exportedAt:     new Date().toISOString(),
      exportedBy:     req.user.email,
      exportedByRole: req.user.role,
      platform:       'ClinicTrustAI (Synthetic Data Mode)',
      version:        '1.0',
      oncCompliance: {
        standard:     '21st Century Cures Act — Information Blocking Rule',
        regulation:   '45 CFR Part 171',
        exportFormat: 'JSON (FHIR R4 compatible structure)',
        auditLogged:  true,
        note:         'Running in synthetic data mode — data is demonstration only.',
      },
    },
    patient: {
      id:             patient._id,
      patientId:      patient.patientId,
      name:           patient.name,
      dateOfBirth:    patient.dateOfBirth,
      gender:         patient.gender,
      contactInfo:    patient.contactInfo,
      insuranceInfo:  patient.insuranceInfo,
      medicalHistory: patient.medicalHistory,
      medications:    patient.medications,
      allergies:      patient.allergies,
      riskScore:      patient.riskScore,
      consentRecords: patient.consentRecords,
      createdAt:      patient.createdAt,
      updatedAt:      patient.updatedAt,
    },
    referrals: referrals.map((r) => ({
      id:                      r._id,
      reason:                  r.reason,
      urgency:                 r.urgency,
      status:                  r.status,
      notes:                   r.notes,
      appointmentDate:         r.appointmentDate,
      completionDate:          r.completionDate,
      referringProvider:       r.referringProvider,
      receivingProvider:       r.receivingProvider,
      createdAt:               r.createdAt,
      updatedAt:               r.updatedAt,
    })),
  };

  logSyntheticEhi(req, 'Patient', 'EXPORT', 200);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ehi-export-${patient.patientId}-${Date.now()}.json"`);
  res.setHeader('X-ONC-Compliant', 'true');
  res.setHeader('X-ONC-Standard', '21st-century-cures-act-information-blocking-rule');

  res.status(200).json({ success: true, data: exportBundle });
});

// ---------------------------------------------------------------------------
// Referral routes  /api/referrals/*
// ---------------------------------------------------------------------------

router.get('/referrals', protect, (req, res) => {
  let referrals = store.referrals.findAll();

  if (!['admin', 'superadmin'].includes(req.user.role)) {
    const type = req.query.type;
    if (type === 'sent') {
      referrals = referrals.filter((r) => r.referringProvider === req.user.id);
    } else if (type === 'received') {
      referrals = referrals.filter((r) => r.receivingProvider === req.user.id);
    } else {
      referrals = referrals.filter(
        (r) => r.referringProvider === req.user.id || r.receivingProvider === req.user.id
      );
    }
  }

  if (req.query.status) {
    referrals = referrals.filter((r) => r.status === req.query.status);
  }

  // Enrich with patient/provider names from synthetic store
  const enriched = referrals.map((r) => {
    const patient = store.patients.findById(r.patient || r.patientId);
    const referring = store.users.findById(r.referringProvider);
    const receiving = store.users.findById(r.receivingProvider);
    return {
      ...r,
      patient: patient ? { _id: patient._id, name: patient.name, patientId: patient.patientId } : r.patient,
      referringProvider: referring ? { _id: referring._id, name: referring.name, organization: referring.organization } : r.referringProvider,
      receivingProvider: receiving ? { _id: receiving._id, name: receiving.name, organization: receiving.organization, specialty: receiving.specialty } : r.receivingProvider,
    };
  });

  res.status(200).json({ success: true, count: enriched.length, data: enriched });
});

router.post('/referrals', protect, authorize('doctor', 'clinic', 'hospital', 'provider'), (req, res) => {
  const { patientId, receivingProviderId, reason, urgency, notes, appointmentDate } = req.body;
  const patient = store.patients.findById(patientId);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const receivingProvider = store.users.findById(receivingProviderId);
  if (!receivingProvider) return res.status(404).json({ success: false, error: 'Receiving provider not found' });

  const newReferral = {
    _id: `referral-${Date.now()}`, id: `referral-${Date.now()}`,
    patient: patientId, patientId,
    referringProvider: req.user.id, receivingProvider: receivingProviderId,
    reason, urgency: urgency || 'routine', notes,
    status: 'pending',
    appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
    blockchainId: `tx_synth_${crypto.randomBytes(8).toString('hex')}`,
    billing: { amount: 0, currency: 'USD', status: 'pending', smartContractId: `sc-synth-${Date.now()}`, transactionId: `tx-${Date.now()}` },
    createdAt: new Date(), updatedAt: new Date(),
  };
  store.referrals.save(newReferral);
  res.status(201).json({ success: true, data: newReferral });
});

router.get('/referrals/:id', protect, (req, res) => {
  const referral = store.referrals.findById(req.params.id);
  if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
  res.status(200).json({ success: true, data: referral });
});

router.put('/referrals/:id/status', protect, (req, res) => {
  const referral = store.referrals.findById(req.params.id);
  if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
  const { status } = req.body;
  referral.status = status;
  referral.updatedAt = new Date();
  if (status === 'completed') {
    referral.completionDate = new Date();
    // Award tokens in synthetic store
    const referring = store.users.findById(referral.referringProvider);
    const receiving = store.users.findById(referral.receivingProvider);
    if (referring) { referring.tokenBalance += 5; store.users.save(referring); }
    if (receiving) { receiving.tokenBalance += 10; store.users.save(receiving); }
  }
  store.referrals.save(referral);
  res.status(200).json({ success: true, data: referral });
});

router.put('/referrals/:id/billing', protect, (req, res) => {
  const referral = store.referrals.findById(req.params.id);
  if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
  referral.billing = { ...referral.billing, ...req.body, updatedAt: new Date() };
  referral.updatedAt = new Date();
  store.referrals.save(referral);
  res.status(200).json({ success: true, data: referral });
});

// ---------------------------------------------------------------------------
// Dashboard routes  /api/dashboard/*
// ---------------------------------------------------------------------------

router.get('/dashboard', protect, (req, res) => {
  const allPatients = store.patients.findAll();
  const allReferrals = store.referrals.findAll();
  const recentAnalytics = store.analytics.findAll().slice(0, 3);
  const recentActivity = store.activities.findAll()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  res.status(200).json({
    patients: { total: allPatients.length, highRisk: allPatients.filter((p) => p.riskLevel === 'high').length },
    referrals: {
      pending: allReferrals.filter((r) => r.status === 'pending').length,
      completed: allReferrals.filter((r) => r.status === 'completed').length,
    },
    analytics: { recent: recentAnalytics },
    recentActivity,
  });
});

router.get('/dashboard/patient-statistics', protect, (req, res) => {
  const patients = store.patients.findAll();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const byRisk = { high: 0, medium: 0, low: 0 };
  patients.forEach((p) => { if (byRisk[p.riskLevel] !== undefined) byRisk[p.riskLevel]++; });

  res.status(200).json({
    success: true,
    data: {
      total: patients.length,
      newThisMonth: patients.filter((p) => new Date(p.createdAt) >= startOfMonth).length,
      highRisk: byRisk.high,
      byRiskLevel: byRisk,
      byAgeGroup: { '0-18': 0, '19-40': 1, '41-60': 2, '61+': 2 },
    },
  });
});

router.get('/dashboard/referral-statistics', protect, (req, res) => {
  const referrals = store.referrals.findAll();
  const bySpecialty = {};
  referrals.forEach((r) => {
    bySpecialty[r.specialty] = (bySpecialty[r.specialty] || 0) + 1;
  });

  res.status(200).json({
    success: true,
    data: {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      completed: referrals.filter((r) => r.status === 'completed').length,
      rejected: referrals.filter((r) => r.status === 'rejected').length,
      averageCompletionTime: 5.2,
      bySpecialty,
    },
  });
});

router.get('/dashboard/activities', protect, (req, res) => {
  const activities = store.activities.findAll()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
  res.status(200).json({ success: true, count: activities.length, data: activities });
});

router.get('/dashboard/analytics', protect, (req, res) => {
  const analytics = store.analytics.findAll().slice(0, 5);
  res.status(200).json({ success: true, count: analytics.length, data: analytics });
});

// ---------------------------------------------------------------------------
// Token routes  /api/tokens/*
// ---------------------------------------------------------------------------

router.get('/tokens/balance', protect, (req, res) => {
  const user = store.users.findById(req.user.id || req.user._id);
  res.status(200).json({
    success: true,
    data: { tokenBalance: user ? user.tokenBalance : 0, walletAddress: user ? user.walletAddress : null },
  });
});

router.get('/tokens/transactions', protect, (req, res) => {
  const txs = store.tokenTransactions
    .find({ userId: req.user.id || req.user._id })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.status(200).json({ success: true, count: txs.length, data: txs });
});

router.get('/tokens/services', protect, (req, res) => {
  const services = [
    { id: 'ai-analysis-basic',    name: 'Basic AI Analysis',              description: 'Run basic AI analysis on patient data',                     tokenCost: 10, category: 'analytics'  },
    { id: 'ai-analysis-advanced', name: 'Advanced AI Analysis',           description: 'Run advanced AI analysis with predictive modeling',          tokenCost: 25, category: 'analytics'  },
    { id: 'priority-referral',    name: 'Priority Referral Processing',   description: 'Get priority handling for referrals',                       tokenCost: 5,  category: 'operations' },
    { id: 'pa-fast-track',        name: 'PA Fast-Track',                  description: 'Skip the queue and get priority PA review',                 tokenCost: 10, category: 'priority'   },
    { id: 'extended-data-access', name: 'Extended Network Data Access',   description: 'Access anonymized network data for research',               tokenCost: 50, category: 'research'   },
    { id: 'premium-support',      name: 'Premium Support',                description: 'Get priority technical support',                            tokenCost: 15, category: 'support'    },
  ];
  res.status(200).json({ success: true, count: services.length, data: services });
});

router.post('/tokens/transfer', protect, (req, res) => {
  const { recipientId, amount, reason } = req.body;
  if (!recipientId || !amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Please provide a valid recipient and amount' });
  }
  const sender = store.users.findById(req.user.id || req.user._id);
  if (!sender || sender.tokenBalance < amount) {
    return res.status(400).json({ success: false, error: 'Insufficient token balance' });
  }
  const recipient = store.users.findById(recipientId);
  if (!recipient) return res.status(404).json({ success: false, error: 'Recipient not found' });

  sender.tokenBalance -= amount;
  recipient.tokenBalance += amount;
  store.users.save(sender);
  store.users.save(recipient);

  const txId = `tx_synth_${crypto.randomBytes(8).toString('hex')}`;
  store.tokenTransactions.save({ _id: `tx-${Date.now()}`, userId: sender._id, user: sender._id, type: 'transfer', amount: -amount, reason: reason || 'Token transfer', status: 'completed', balanceAfter: sender.tokenBalance, blockchainTransactionId: txId, createdAt: new Date() });
  store.tokenTransactions.save({ _id: `tx-${Date.now() + 1}`, userId: recipient._id, user: recipient._id, type: 'earn', amount, reason: reason || 'Token transfer', status: 'completed', balanceAfter: recipient.tokenBalance, blockchainTransactionId: txId, createdAt: new Date() });

  res.status(200).json({ success: true, data: { amount, recipient: { id: recipient._id, name: recipient.name, organization: recipient.organization }, newBalance: sender.tokenBalance } });
});

router.get('/tokens/earn-sources', protect, (req, res) => {
  const p = syntheticEarnPolicy;
  const sources = [
    { id: 'complete-referral',  name: 'Complete a Referral',           description: 'Earn tokens when a referral you sent is accepted and completed', tokenReward: p.referralSent       || 10, category: 'referrals',  frequency: 'per_action' },
    { id: 'accept-referral',    name: 'Accept a Referral',             description: 'Earn tokens each time you accept an incoming referral',           tokenReward: p.referralAccepted   || 5,  category: 'referrals',  frequency: 'per_action' },
    { id: 'complete-profile',   name: 'Complete Your Profile',         description: 'One-time bonus for completing all profile fields',                tokenReward: p.profileCompleted   || 25, category: 'onboarding', frequency: 'one_time'   },
    { id: 'kyc-verified',       name: 'KYC Verification',              description: 'One-time bonus when your identity is verified by our team',       tokenReward: p.kycVerified        || 50, category: 'onboarding', frequency: 'one_time'   },
    { id: 'invite-colleague',   name: 'Invite a Colleague',            description: 'Earn tokens for each colleague who joins and completes onboarding', tokenReward: p.inviteColleague   || 20, category: 'network',    frequency: 'per_action' },
    { id: 'data-contribution',  name: 'Contribute Anonymized Data',    description: 'Earn tokens monthly for contributing anonymized outcome data',     tokenReward: p.dataContribution   || 15, category: 'research',   frequency: 'monthly'    },
    { id: 'analytics-complete', name: 'Complete Analytics Report',     description: 'Earn tokens each time you complete and submit an analytics report', tokenReward: p.analyticsCompleted || 15, category: 'research',  frequency: 'per_action' },
  ].filter(s => s.tokenReward > 0);
  res.status(200).json({ success: true, count: sources.length, data: sources });
});

router.post('/tokens/redeem', protect, (req, res) => {
  const SERVICES = { 'ai-analysis-basic': { name: 'Basic AI Analysis', tokenCost: 10 }, 'ai-analysis-advanced': { name: 'Advanced AI Analysis', tokenCost: 25 }, 'priority-referral': { name: 'Priority Referral Processing', tokenCost: 5 }, 'pa-fast-track': { name: 'PA Fast-Track', tokenCost: 10 }, 'extended-data-access': { name: 'Extended Network Data Access', tokenCost: 50 }, 'premium-support': { name: 'Premium Support', tokenCost: 15 } };
  const { serviceId } = req.body;
  const service = SERVICES[serviceId];
  if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
  const user = store.users.findById(req.user.id || req.user._id);
  if (!user || user.tokenBalance < service.tokenCost) {
    return res.status(400).json({ success: false, error: 'Insufficient token balance' });
  }
  user.tokenBalance -= service.tokenCost;
  store.users.save(user);
  const txId = `tx_synth_${crypto.randomBytes(8).toString('hex')}`;
  store.tokenTransactions.save({ _id: `tx-${Date.now()}`, userId: user._id, user: user._id, type: 'spend', amount: -service.tokenCost, reason: `Service redemption: ${service.name}`, status: 'completed', balanceAfter: user.tokenBalance, blockchainTransactionId: txId, createdAt: new Date() });
  res.status(200).json({ success: true, data: { service: { id: serviceId, name: service.name, tokenCost: service.tokenCost }, newBalance: user.tokenBalance } });
});

// ---------------------------------------------------------------------------
// Analytics routes  /api/analytics/*
// ---------------------------------------------------------------------------

router.get('/analytics', protect, (req, res) => {
  const analytics = store.analytics.findAll();
  res.status(200).json({ success: true, count: analytics.length, data: analytics });
});

router.post('/analytics', protect, (req, res) => {
  const { name, type, parameters } = req.body;
  const newReport = {
    _id: `ar-${Date.now()}`, id: `ar-${Date.now()}`,
    name: name || 'New Analytics Report', type: type || 'patientRisk',
    status: 'processing', creator: req.user.id,
    parameters, results: { summary: 'Analysis in progress' },
    confidenceScore: 0, sharedWith: [], tokenReward: 0,
    createdAt: new Date(), updatedAt: new Date(),
  };
  store.analytics.save(newReport);
  res.status(201).json({ success: true, data: newReport });
});

router.get('/analytics/:id', protect, (req, res) => {
  const report = store.analytics.findById(req.params.id);
  if (!report) return res.status(404).json({ success: false, error: 'Analytics report not found' });
  res.status(200).json({ success: true, data: report });
});

// ---------------------------------------------------------------------------
// Notification routes  /api/notifications/*
// ---------------------------------------------------------------------------

router.get('/notifications', protect, (req, res) => {
  const notifs = store.notifications.find({ user: req.user.id || req.user._id });
  res.status(200).json({ success: true, count: notifs.length, data: notifs });
});

router.get('/notifications/unread-count', protect, (req, res) => {
  const count = store.notifications.find({ user: req.user.id || req.user._id }).filter((n) => !n.isRead).length;
  res.status(200).json({ success: true, count });
});

router.put('/notifications/read-all', protect, (req, res) => {
  store.notifications.find({ user: req.user.id || req.user._id }).forEach((n) => {
    n.isRead = true;
    store.notifications.save(n);
  });
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

router.put('/notifications/:id/read', protect, (req, res) => {
  const notif = store.notifications.findById(req.params.id);
  if (notif) { notif.isRead = true; store.notifications.save(notif); }
  res.status(200).json({ success: true });
});

router.delete('/notifications/:id', protect, (req, res) => {
  store.notifications.remove(req.params.id);
  res.status(200).json({ success: true });
});

// ---------------------------------------------------------------------------
// Admin token routes  /api/admin/tokens/*
// ---------------------------------------------------------------------------

const syntheticTokenProviders = [
  { id: 'prov-1',  name: 'Dr. Sarah Johnson',   role: 'doctor',   organization: 'Metro Health',      specialty: 'Cardiology',     tokenBalance: 420, lastTransaction: new Date(Date.now() -  2 * 86400000).toISOString(), status: 'active', tokenActivity: 'high',   email: 'sarah.johnson@metrohealth.com',      phoneNumber: '(555) 201-3344' },
  { id: 'prov-2',  name: 'Dr. Michael Chen',    role: 'doctor',   organization: 'City Medical',       specialty: 'Neurology',      tokenBalance: 185, lastTransaction: new Date(Date.now() -  5 * 86400000).toISOString(), status: 'active', tokenActivity: 'medium', email: 'michael.chen@citymedical.com',       phoneNumber: '(555) 402-7788' },
  { id: 'prov-3',  name: 'Dr. Emily Davis',     role: 'doctor',   organization: 'Regional Care',      specialty: 'Orthopedics',    tokenBalance:  72, lastTransaction: new Date(Date.now() - 10 * 86400000).toISOString(), status: 'active', tokenActivity: 'low',    email: 'emily.davis@regionalcare.com',       phoneNumber: '(555) 603-9900' },
  { id: 'prov-4',  name: 'Dr. James Wilson',    role: 'doctor',   organization: 'Riverside Clinic',   specialty: 'Oncology',       tokenBalance: 310, lastTransaction: new Date(Date.now() -  1 * 86400000).toISOString(), status: 'active', tokenActivity: 'high',   email: 'james.wilson@riversideclinic.com',   phoneNumber: '(555) 804-1122' },
  { id: 'prov-5',  name: 'Dr. Linda Martinez',  role: 'doctor',   organization: 'Summit Medical',     specialty: 'Dermatology',    tokenBalance:  95, lastTransaction: new Date(Date.now() -  7 * 86400000).toISOString(), status: 'active', tokenActivity: 'low',    email: 'linda.martinez@summitmedical.com',   phoneNumber: '(555) 305-6677' },
  { id: 'prov-6',  name: 'Dr. Robert Kim',      role: 'doctor',   organization: 'Lakeside Health',    specialty: 'Gastroenterology', tokenBalance: 240, lastTransaction: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'active', tokenActivity: 'medium', email: 'robert.kim@lakesidehealth.com',      phoneNumber: '(555) 506-2233' },
  { id: 'prov-7',  name: 'Dr. Priya Patel',     role: 'doctor',   organization: 'Westside Wellness',  specialty: 'Endocrinology',  tokenBalance: 155, lastTransaction: new Date(Date.now() -  4 * 86400000).toISOString(), status: 'active', tokenActivity: 'medium', email: 'priya.patel@westsidewellness.com',   phoneNumber: '(555) 707-4455' },
  { id: 'prov-8',  name: 'Northgate Lab',       role: 'lab',      organization: 'Northgate Lab',      specialty: 'Diagnostics',    tokenBalance:  60, lastTransaction: new Date(Date.now() - 12 * 86400000).toISOString(), status: 'active', tokenActivity: 'low',    email: 'admin@northgatelab.com',             phoneNumber: '(555) 808-5566' },
  { id: 'prov-9',  name: 'Central City Clinic', role: 'clinic',   organization: 'Central City Clinic', specialty: 'Family Medicine', tokenBalance: 390, lastTransaction: new Date(Date.now() - 1 * 86400000).toISOString(), status: 'active', tokenActivity: 'high',   email: 'info@centralcityclinic.com',         phoneNumber: '(555) 909-6677' },
  { id: 'prov-10', name: 'Dr. Angela Foster',   role: 'nurse',    organization: 'Metro Health',       specialty: 'Pediatrics',     tokenBalance:  45, lastTransaction: new Date(Date.now() - 20 * 86400000).toISOString(), status: 'active', tokenActivity: 'low',    email: 'angela.foster@metrohealth.com',      phoneNumber: '(555) 110-7788' },
];

const syntheticTokenCatalog = [
  { _id: 'catalog-1', id: 'catalog-1', serviceId: 'ai-analysis-basic',    name: 'Basic AI Analysis',            description: 'Run basic AI analysis on patient data to identify patterns and risks.',   category: 'analytics',  tokenCost: 10, tier: 'basic',    features: ['Patient risk scoring', 'Trend detection', 'PDF export'],                                    iconName: 'Analytics',   isActive: true, sortOrder: 1 },
  { _id: 'catalog-2', id: 'catalog-2', serviceId: 'ai-analysis-advanced', name: 'Advanced AI Analysis',          description: 'Advanced AI analysis with predictive modeling and deep insights.',        category: 'analytics',  tokenCost: 25, tier: 'premium',  features: ['Predictive modeling', 'Comorbidity mapping', 'Benchmark comparisons', 'Raw data export'], iconName: 'AutoAwesome', isActive: true, sortOrder: 2 },
  { _id: 'catalog-3', id: 'catalog-3', serviceId: 'priority-referral',    name: 'Priority Referral Processing',  description: 'Fast-track referral processing with priority handling.',                  category: 'operations', tokenCost: 5,  tier: 'basic',    features: ['Same-day processing', 'Dedicated queue', 'Status notifications'],                           iconName: 'FastForward', isActive: true, sortOrder: 3 },
  { _id: 'catalog-4', id: 'catalog-4', serviceId: 'pa-fast-track',        name: 'PA Fast-Track',                 description: 'Skip the queue and get priority PA review.',                              category: 'priority',   tokenCost: 10, tier: 'standard', features: ['Priority review', 'Expedited decision', 'Dedicated reviewer'],                               iconName: 'Speed',       isActive: true, sortOrder: 4 },
  { _id: 'catalog-5', id: 'catalog-5', serviceId: 'extended-data-access', name: 'Extended Data Access',          description: 'Access to extended historical data and analytics.',                        category: 'research',   tokenCost: 50, tier: 'premium',  features: ['Full network data', 'Anonymized records', 'Research exports', 'API access'],                iconName: 'Storage',     isActive: true, sortOrder: 5 },
  { _id: 'catalog-6', id: 'catalog-6', serviceId: 'premium-support',      name: 'Premium Support',               description: 'Get priority technical support with a dedicated support agent.',           category: 'support',    tokenCost: 15, tier: 'standard', features: ['Priority queue', '4-hour SLA', 'Dedicated agent', 'Phone support'],                          iconName: 'Support',     isActive: true, sortOrder: 6 },
];

const syntheticTokenConversionRules = [
  { _id: 'rule-1', id: 'rule-1', service: 'Basic AI Analysis',          serviceId: 'ai-analysis-basic',    tokenAmount: 10, description: '10 tokens for basic AI analysis of patient data',         category: 'analytics',  isActive: true },
  { _id: 'rule-2', id: 'rule-2', service: 'Advanced AI Analysis',       serviceId: 'ai-analysis-advanced', tokenAmount: 25, description: '25 tokens for advanced AI analysis with recommendations',  category: 'analytics',  isActive: true },
  { _id: 'rule-3', id: 'rule-3', service: 'Priority Referral',          serviceId: 'priority-referral',    tokenAmount: 5,  description: '5 tokens for priority referral processing',                category: 'operations', isActive: true },
  { _id: 'rule-4', id: 'rule-4', service: 'PA Fast-Track',              serviceId: 'pa-fast-track',        tokenAmount: 10, description: '10 tokens for priority PA review (skip queue)',            category: 'priority',   isActive: true },
  { _id: 'rule-5', id: 'rule-5', service: 'Extended Data Access',       serviceId: 'extended-data-access', tokenAmount: 50, description: '50 tokens for extended network data access',               category: 'research',   isActive: true },
];

const syntheticProviderTokenHistory = {
  'prov-1': [
    { id: 'tx-p1-1', type: 'mint', amount: 200, reason: 'Initial allocation', timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), status: 'completed' },
    { id: 'tx-p1-2', type: 'earn', amount: 50, reason: 'Referral bonus', timestamp: new Date(Date.now() - 15 * 86400000).toISOString(), status: 'completed' },
    { id: 'tx-p1-3', type: 'spend', amount: -25, reason: 'Premium AI Report', timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'completed' },
    { id: 'tx-p1-4', type: 'bonus', amount: 195, reason: 'Q2 Performance bonus', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'completed' },
  ],
};

const SYNTHETIC_PROVIDER_ROLES = ['doctor', 'lab', 'clinic', 'hospital', 'provider', 'nurse'];

// Helper: get a provider user from store.users, falling back to syntheticTokenProviders for legacy fake IDs
function findProviderUser(id) {
  return store.users.findById(id) || syntheticTokenProviders.find(p => p.id === id) || null;
}

router.get('/admin/tokens/providers', protect, authorize('admin', 'superadmin'), (req, res) => {
  // Read from the same store that the provider dashboard uses — no more separate fake list
  const providerUsers = store.users.findAll().filter(u =>
    SYNTHETIC_PROVIDER_ROLES.includes(u.role) && u.isActive !== false
  );
  const data = providerUsers.map(p => ({
    id: p._id || p.id,
    name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
    email: p.email || '',
    organization: p.organization || '',
    specialty: p.specialty || '',
    role: p.role || '',
    tokenBalance: p.tokenBalance || 0,
    walletAddress: p.walletAddress || null,
    lastTransaction: p.tokenLastActivity || p.lastLogin || null,
    joinedAt: p.createdAt,
    status: p.isActive !== false ? 'active' : 'inactive',
  }));
  res.json({ success: true, data });
});

router.get('/admin/tokens/providers/:providerId/history', protect, authorize('admin', 'superadmin'), (req, res) => {
  const history = syntheticProviderTokenHistory[req.params.providerId] || [
    { id: `tx-${Date.now()}`, type: 'mint', amount: 100, reason: 'Initial allocation', timestamp: new Date(Date.now() - 20 * 86400000).toISOString(), status: 'completed' },
  ];
  res.json({ success: true, data: history });
});

router.post('/admin/tokens/mint', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { providerId, amount, reason } = req.body;
  const provider = store.users.findById(providerId);
  if (provider) {
    provider.tokenBalance = (provider.tokenBalance || 0) + (parseInt(amount) || 0);
    provider.tokenLastActivity = new Date().toISOString();
    store.users.save(provider);
  }
  res.json({ success: true, message: `Minted ${amount} tokens`, data: { providerId, amount, reason, timestamp: new Date().toISOString() } });
});

router.post('/admin/tokens/burn', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { providerId, amount, reason } = req.body;
  const provider = store.users.findById(providerId);
  if (provider) {
    provider.tokenBalance = Math.max(0, (provider.tokenBalance || 0) - (parseInt(amount) || 0));
    provider.tokenLastActivity = new Date().toISOString();
    store.users.save(provider);
  }
  res.json({ success: true, message: `Burned ${amount} tokens`, data: { providerId, amount, reason, timestamp: new Date().toISOString() } });
});

router.post('/admin/tokens/bonus', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { providerId, amount, reason } = req.body;
  const provider = store.users.findById(providerId);
  if (provider) {
    provider.tokenBalance = (provider.tokenBalance || 0) + (parseInt(amount) || 0);
    provider.tokenLastActivity = new Date().toISOString();
    store.users.save(provider);
  }
  res.json({ success: true, message: `Bonus of ${amount} tokens approved`, data: { providerId, amount, reason, timestamp: new Date().toISOString() } });
});

router.get('/admin/tokens/catalog', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: syntheticTokenCatalog });
});

router.post('/admin/tokens/catalog', protect, authorize('admin', 'superadmin'), (req, res) => {
  const item = { id: `catalog-${Date.now()}`, ...req.body };
  syntheticTokenCatalog.push(item);
  res.status(201).json({ success: true, data: item });
});

router.delete('/admin/tokens/catalog/:itemId', protect, authorize('admin', 'superadmin'), (req, res) => {
  const idx = syntheticTokenCatalog.findIndex(i => i.id === req.params.itemId);
  if (idx !== -1) syntheticTokenCatalog.splice(idx, 1);
  res.json({ success: true, message: 'Catalog item removed' });
});

router.get('/admin/tokens/conversion-rules', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: syntheticTokenConversionRules });
});

router.post('/admin/tokens/conversion-rules', protect, authorize('admin', 'superadmin'), (req, res) => {
  const rule = { id: `rule-${Date.now()}`, ...req.body };
  syntheticTokenConversionRules.push(rule);
  res.status(201).json({ success: true, data: rule });
});

router.delete('/admin/tokens/conversion-rules/:ruleId', protect, authorize('admin', 'superadmin'), (req, res) => {
  const idx = syntheticTokenConversionRules.findIndex(r => r.id === req.params.ruleId);
  if (idx !== -1) syntheticTokenConversionRules.splice(idx, 1);
  res.json({ success: true, message: 'Conversion rule removed' });
});

// Earn policy (singleton; in-memory for synthetic mode)
const syntheticEarnPolicy = {
  _singleton: 'global', referralSent: 10, referralAccepted: 5,
  kycVerified: 50, profileCompleted: 25, inviteColleague: 20,
  dataContribution: 15, analyticsCompleted: 15, dtxCompleted: 0, appointmentCompleted: 15,
};
router.get('/admin/tokens/earn-policy', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: syntheticEarnPolicy });
});
router.put('/admin/tokens/earn-policy', protect, authorize('admin', 'superadmin'), (req, res) => {
  const FIELDS = ['referralSent','referralAccepted','kycVerified','profileCompleted','inviteColleague','dataContribution','analyticsCompleted','dtxCompleted','appointmentCompleted'];
  FIELDS.forEach(f => { if (req.body[f] !== undefined) syntheticEarnPolicy[f] = Number(req.body[f]); });
  res.json({ success: true, data: syntheticEarnPolicy });
});

// Token analytics (synthetic aggregation)
router.get('/admin/tokens/analytics', protect, authorize('admin', 'superadmin'), (req, res) => {
  const providerUsers = store.users.findAll().filter(u => SYNTHETIC_PROVIDER_ROLES.includes(u.role));
  const total = providerUsers.reduce((s, p) => s + (p.tokenBalance || 0), 0);
  const topEarners = [...providerUsers].sort((a, b) => (b.tokenBalance || 0) - (a.tokenBalance || 0)).slice(0, 5);
  res.json({
    success: true,
    data: {
      totalCirculating: total,
      earned30Days: 430,
      spent30Days: 125,
      netVelocity30Days: 305,
      totalTransactions: 48,
      topEarners: topEarners.map(p => ({ name: p.name, email: p.email, tokenBalance: p.tokenBalance || 0 })),
      topServices: [
        { serviceId: 'ai-analysis-basic', count: 12 },
        { serviceId: 'priority-referral', count: 8 },
        { serviceId: 'pa-fast-track', count: 4 },
        { serviceId: 'premium-support', count: 3 },
        { serviceId: 'extended-data-access', count: 2 },
      ],
      staleBalanceProviders: 2,
    },
  });
});

// Admin routes  /api/admin/*
// ---------------------------------------------------------------------------

router.get('/admin/users', protect, authorize('admin', 'superadmin'), (req, res) => {
  const users = store.users.findAll().map(({ password: _p, ...u }) => u);
  res.status(200).json({ success: true, count: users.length, data: users });
});

router.get('/admin/users/emails', protect, authorize('admin', 'superadmin'), (req, res) => {
  const emails = store.users.findAll().map(u => ({ _id: u._id, name: u.name, email: u.email, role: u.role }));
  res.json({ success: true, data: emails });
});

const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital', 'lab', 'provider'];

// GET /api/providers — provider list for referral creation dropdown
router.get('/providers', protect, (req, res) => {
  const { specialty, search } = req.query;
  let providers = store.users.findAll()
    .filter((u) => PROVIDER_ROLES.includes(u.role))
    .map(({ password: _pw, ...u }) => u);

  if (specialty) {
    providers = providers.filter((u) => (u.specialty || '').toLowerCase().includes(specialty.toLowerCase()));
  }
  if (search) {
    const s = search.toLowerCase();
    providers = providers.filter((u) =>
      (u.name || '').toLowerCase().includes(s) ||
      (u.specialty || '').toLowerCase().includes(s) ||
      (u.organization || '').toLowerCase().includes(s)
    );
  }

  res.status(200).json({ success: true, data: providers });
});

router.get('/admin/providers', protect, authorize('admin', 'superadmin'), (req, res) => {
  const providers = store.users.findAll()
    .filter((u) => !['admin', 'superadmin'].includes(u.role))
    .map(({ password: _p, ...u }) => u);
  res.status(200).json({ success: true, count: providers.length, data: providers });
});

router.get('/admin/providers/pending', protect, authorize('admin', 'superadmin'), (req, res) => {
  const pending = store.users.findAll()
    .filter((u) => u.accountStatus === 'pending')
    .map(({ password: _p, ...u }) => u);
  res.status(200).json({ success: true, count: pending.length, data: pending });
});

router.put('/admin/providers/:id/approve', protect, authorize('admin', 'superadmin'), (req, res) => {
  const user = store.users.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  user.accountStatus = 'approved'; user.kycVerified = true;
  store.users.save(user);
  const { password: _p, ...safeUser } = user;
  res.status(200).json({ success: true, data: safeUser });
});

router.put('/admin/providers/:id/reject', protect, authorize('admin', 'superadmin'), (req, res) => {
  const user = store.users.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  user.accountStatus = 'rejected'; store.users.save(user);
  const { password: _p, ...safeUser } = user;
  res.status(200).json({ success: true, data: safeUser });
});

router.put('/admin/providers/:id/suspend', protect, authorize('admin', 'superadmin'), (req, res) => {
  const user = store.users.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  user.accountStatus = 'suspended'; user.isActive = false; store.users.save(user);
  const { password: _p, ...safeUser } = user;
  res.status(200).json({ success: true, data: safeUser });
});

router.get('/admin/settings-map', protect, authorize('admin', 'superadmin'), (req, res) => {
  const allSettings = store.adminSettings.findAll();
  const map = {};
  allSettings.forEach(s => { map[s.key || s.category] = s.value || s.settings || {}; });
  res.status(200).json({ success: true, data: map });
});

router.get('/admin/settings', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(200).json({ success: true, count: store.adminSettings.findAll().length, data: store.adminSettings.findAll() });
});

router.get('/admin/settings/:category', protect, authorize('admin', 'superadmin'), (req, res) => {
  const settings = store.adminSettings.find({ category: req.params.category });
  if (!settings.length) return res.status(404).json({ success: false, error: `No settings found for category: ${req.params.category}` });
  res.status(200).json({ success: true, count: settings.length, data: settings });
});

router.put('/admin/settings/:category', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { value, description, category: bodyCat, ...rest } = req.body;
  const settingsValue = value !== undefined ? value : rest;
  const key = req.params.category;
  const existing = store.adminSettings.findOne({ key }) || store.adminSettings.findOne({ category: key });
  if (existing) {
    existing.value = settingsValue;
    existing.settings = settingsValue;
    store.adminSettings.save(existing);
    return res.status(200).json({ success: true, data: existing });
  }
  const newSetting = { _id: `settings-${key}`, key, category: key, value: settingsValue, settings: settingsValue };
  store.adminSettings.save(newSetting);
  res.status(201).json({ success: true, data: newSetting });
});

router.get('/admin/system-status', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      mode: 'synthetic',
      database: { status: 'synthetic', message: 'Running on in-memory synthetic data' },
      ai: { status: 'healthy', models: ['risk-assessment', 'diagnosis-helper'] },
      blockchain: { status: 'simulated', lastBlock: 12345678, syncStatus: '100%' },
      storage: { status: 'healthy', usedSpace: '0GB', totalSpace: '∞' },
      updatedAt: new Date(),
    },
  });
});

router.get('/admin/audit/login', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(200).json({ success: true, count: 0, data: [] });
});

router.get('/admin/audit/ehi', protect, authorize('admin', 'superadmin'), (req, res) => {
  let logs = store.auditLogs.findAll();

  // Apply optional query filters
  const { userId, patientId, resourceType, action, startDate, endDate } = req.query;
  if (userId)       logs = logs.filter((l) => l.userId       === userId);
  if (patientId)    logs = logs.filter((l) => l.patientId    === patientId);
  if (resourceType) logs = logs.filter((l) => l.resourceType === resourceType);
  if (action)       logs = logs.filter((l) => l.action       === action);
  if (startDate)    logs = logs.filter((l) => new Date(l.timestamp) >= new Date(startDate));
  if (endDate)      logs = logs.filter((l) => new Date(l.timestamp) <= new Date(endDate));

  logs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const pageNum  = parseInt(req.query.page  || 0);
  const limitNum = Math.min(parseInt(req.query.limit || 50), 200);
  const paged    = logs.slice(pageNum * limitNum, pageNum * limitNum + limitNum);

  res.status(200).json({
    success: true,
    count: paged.length,
    total: logs.length,
    pagination: { page: pageNum, limit: limitNum, pages: Math.ceil(logs.length / limitNum) },
    oncCompliance: {
      standard:        '21st Century Cures Act — Information Blocking Rule',
      regulation:      '45 CFR Part 171',
      retentionPolicy: '7 years (HIPAA minimum: 6 years)',
      note:            'Running in synthetic data mode — logs are in-memory only.',
    },
    data: paged,
  });
});

// Admin referrals
router.get('/admin/referrals', protect, authorize('admin', 'superadmin'), (req, res) => {
  const referrals = store.referrals.findAll();
  res.status(200).json({ success: true, count: referrals.length, data: referrals });
});

router.get('/admin/referrals/stats/overview', protect, authorize('admin', 'superadmin'), (req, res) => {
  const referrals = store.referrals.findAll();
  const total     = referrals.length;
  const pending   = referrals.filter(r => r.status === 'pending').length;
  const accepted  = referrals.filter(r => r.status === 'accepted').length;
  const completed = referrals.filter(r => r.status === 'completed').length;
  const cancelled = referrals.filter(r => r.status === 'cancelled').length;
  const rejected  = referrals.filter(r => r.status === 'rejected').length;

  const PROVIDER_NAMES = {
    'user-2': 'Dr. John Smith',
    'user-3': 'Nurse Sarah Johnson',
    'user-4': 'Dr. Michael Chen',
    'user-5': 'Dr. Robert Williams',
  };

  // Tally referrers and receivers
  const referrerCounts = {};
  const receiverCounts = {};
  referrals.forEach(r => {
    if (r.referringProvider) referrerCounts[r.referringProvider] = (referrerCounts[r.referringProvider] || 0) + 1;
    if (r.receivingProvider) receiverCounts[r.receivingProvider] = (receiverCounts[r.receivingProvider] || 0) + 1;
  });
  const toRanked = (countsMap) =>
    Object.entries(countsMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, count]) => ({ providerId: id, providerName: PROVIDER_NAMES[id] || id, count }));

  // Monthly trends from createdAt dates
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthCounts = {};
  referrals.forEach(r => {
    const d = r.createdAt ? new Date(r.createdAt) : null;
    if (d && !isNaN(d)) { const m = MONTHS[d.getMonth()]; monthCounts[m] = (monthCounts[m] || 0) + 1; }
  });
  const monthlyTrends = Object.keys(monthCounts).length > 0
    ? Object.entries(monthCounts).map(([month, count]) => ({ month, count }))
    : [
        { month: 'Jan', count: 8 }, { month: 'Feb', count: 11 }, { month: 'Mar', count: 9 },
        { month: 'Apr', count: 14 }, { month: 'May', count: 12 }, { month: 'Jun', count: 17 },
      ];

  const topReferrers = toRanked(referrerCounts).length > 0 ? toRanked(referrerCounts) : [
    { providerId: 'user-2', providerName: 'Dr. John Smith',      count: 25 },
    { providerId: 'user-5', providerName: 'Dr. Robert Williams', count: 12 },
    { providerId: 'user-4', providerName: 'Dr. Michael Chen',    count: 9  },
    { providerId: 'user-3', providerName: 'Nurse Sarah Johnson', count: 7  },
  ];
  const topReceivers = toRanked(receiverCounts).length > 0 ? toRanked(receiverCounts) : [
    { providerId: 'user-4', providerName: 'Dr. Michael Chen',    count: 22 },
    { providerId: 'user-2', providerName: 'Dr. John Smith',      count: 18 },
    { providerId: 'user-5', providerName: 'Dr. Robert Williams', count: 16 },
    { providerId: 'user-3', providerName: 'Nurse Sarah Johnson', count: 15 },
  ];

  res.status(200).json({
    success: true,
    data: {
      totalReferrals:     total    || 71,
      pendingReferrals:   pending  || 12,
      acceptedReferrals:  accepted || 18,
      approvedReferrals:  accepted || 18,
      completedReferrals: completed || 34,
      cancelledReferrals: cancelled || 4,
      rejectedReferrals:  rejected  || 3,
      activeDisputes: 2,
      averageCompletionTime: 9.4,
      topReferrers,
      topReceivers,
      monthlyTrends,
    },
  });
});

router.get('/admin/referrals/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const referral = store.referrals.findById(req.params.id);
  if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
  res.status(200).json({ success: true, data: referral });
});

// ── Admin AI Management (synthetic stubs) ────────────────────────────────────

const SYNTHETIC_AI_REPORTS = [
  { _id: 'air-1', title: 'Q2 Referral Matching Accuracy Report', modelType: 'referral_matching', status: 'published', accuracy: 0.934, precision: 0.921, recall: 0.947, f1Score: 0.934, totalPredictions: 1240, correctPredictions: 1158, createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), reviewedAt: new Date(Date.now() - 10 * 86400000).toISOString(), reviewedBy: { name: 'Admin User' } },
  { _id: 'air-2', title: 'Prior Auth AI Decision Audit', modelType: 'prior_auth', status: 'under_review', accuracy: 0.891, precision: 0.905, recall: 0.877, f1Score: 0.891, totalPredictions: 430, correctPredictions: 383, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), reviewedAt: null, reviewedBy: null },
  { _id: 'air-3', title: 'Risk Stratification Model Performance', modelType: 'risk_score', status: 'draft', accuracy: 0.876, precision: 0.862, recall: 0.891, f1Score: 0.876, totalPredictions: 890, correctPredictions: 780, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), reviewedAt: null, reviewedBy: null },
];

const SYNTHETIC_AI_MODELS = [
  { _id: 'aim-1', name: 'Referral Matching v2.1', type: 'referral_matching', version: '2.1.0', status: 'active', accuracy: 0.934, lastTrained: new Date(Date.now() - 30 * 86400000).toISOString(), totalInferences: 15420, description: 'Matches referral requests to optimal specialist providers based on specialty, location, and availability.', thresholds: { minConfidence: 0.75, maxCandidates: 10 }, settings: { enabled: true, fallbackToManual: true } },
  { _id: 'aim-2', name: 'Prior Auth Analyzer v1.4', type: 'prior_auth', version: '1.4.0', status: 'active', accuracy: 0.891, lastTrained: new Date(Date.now() - 45 * 86400000).toISOString(), totalInferences: 5830, description: 'Analyzes prior authorization requests and generates approve/deny recommendations with clinical reasoning.', thresholds: { minConfidence: 0.80, autoApproveThreshold: 0.95 }, settings: { enabled: true, requireReview: true } },
  { _id: 'aim-3', name: 'Risk Stratification v3.0', type: 'risk_score', version: '3.0.0', status: 'active', accuracy: 0.876, lastTrained: new Date(Date.now() - 20 * 86400000).toISOString(), totalInferences: 9210, description: 'Assigns AI risk scores to patients based on clinical, behavioral, and demographic factors.', thresholds: { highRiskThreshold: 0.75, criticalRiskThreshold: 0.90 }, settings: { enabled: true, updateFrequency: 'daily' } },
  { _id: 'aim-4', name: 'Escalation Detector v1.0', type: 'escalation', version: '1.0.0', status: 'beta', accuracy: 0.842, lastTrained: new Date(Date.now() - 10 * 86400000).toISOString(), totalInferences: 1200, description: 'Detects cases requiring clinical escalation from lab results, vitals, and patient history.', thresholds: { flagThreshold: 0.70 }, settings: { enabled: true, notifyProviders: true } },
];

const SYNTHETIC_AI_THRESHOLDS = {
  referralMatching: { minConfidence: 0.75, maxCandidates: 10 },
  priorAuth: { minConfidence: 0.80, autoApproveThreshold: 0.95 },
  riskScore: { highRiskThreshold: 0.75, criticalRiskThreshold: 0.90 },
  escalation: { flagThreshold: 0.70 },
};

// Reports
router.get('/admin/ai-management/reports', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, count: SYNTHETIC_AI_REPORTS.length, data: SYNTHETIC_AI_REPORTS });
});

router.get('/admin/ai-management/reports/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const report = SYNTHETIC_AI_REPORTS.find(r => r._id === req.params.id);
  if (!report) return res.status(404).json({ success: false, error: 'AI report not found' });
  res.json({ success: true, data: report });
});

router.post('/admin/ai-management/reports', protect, authorize('admin', 'superadmin'), (req, res) => {
  const report = { _id: `air-${Date.now()}`, ...req.body, status: 'draft', createdAt: new Date().toISOString() };
  res.status(201).json({ success: true, data: report });
});

router.put('/admin/ai-management/reports/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const report = SYNTHETIC_AI_REPORTS.find(r => r._id === req.params.id);
  if (!report) return res.status(404).json({ success: false, error: 'AI report not found' });
  res.json({ success: true, data: { ...report, ...req.body } });
});

router.delete('/admin/ai-management/reports/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { message: 'Report deleted (synthetic)' } });
});

router.put('/admin/ai-management/reports/:id/review', protect, authorize('admin', 'superadmin'), (req, res) => {
  const report = SYNTHETIC_AI_REPORTS.find(r => r._id === req.params.id);
  if (!report) return res.status(404).json({ success: false, error: 'AI report not found' });
  res.json({ success: true, data: { ...report, status: req.body.status || 'published', reviewedAt: new Date().toISOString(), reviewedBy: { name: req.user?.name || 'Admin' } } });
});

router.post('/admin/ai-management/reports/:id/feedback', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { message: 'Feedback recorded (synthetic)', reportId: req.params.id } });
});

router.post('/admin/ai-management/reports/:id/schedule', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { message: 'Report scheduled (synthetic)', reportId: req.params.id, schedule: req.body } });
});

// Models
router.get('/admin/ai-management/models', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, count: SYNTHETIC_AI_MODELS.length, data: SYNTHETIC_AI_MODELS });
});

router.get('/admin/ai-management/models/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const model = SYNTHETIC_AI_MODELS.find(m => m._id === req.params.id);
  if (!model) return res.status(404).json({ success: false, error: 'AI model not found' });
  res.json({ success: true, data: model });
});

router.get('/admin/ai-management/models/:id/metrics', protect, authorize('admin', 'superadmin'), (req, res) => {
  const model = SYNTHETIC_AI_MODELS.find(m => m._id === req.params.id);
  if (!model) return res.status(404).json({ success: false, error: 'AI model not found' });
  res.json({ success: true, data: { modelId: req.params.id, accuracy: model.accuracy, precision: model.accuracy - 0.013, recall: model.accuracy + 0.013, f1Score: model.accuracy, totalInferences: model.totalInferences, weeklyTrend: [0.88, 0.90, 0.91, 0.92, 0.93, model.accuracy, model.accuracy] } });
});

router.post('/admin/ai-management/models/:id/feedback', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { message: 'Model feedback recorded (synthetic)', modelId: req.params.id } });
});

router.put('/admin/ai-management/models/:id/thresholds', protect, authorize('admin', 'superadmin'), (req, res) => {
  const model = SYNTHETIC_AI_MODELS.find(m => m._id === req.params.id);
  if (!model) return res.status(404).json({ success: false, error: 'AI model not found' });
  res.json({ success: true, data: { ...model, thresholds: req.body } });
});

router.put('/admin/ai-management/models/:id/settings', protect, authorize('admin', 'superadmin'), (req, res) => {
  const model = SYNTHETIC_AI_MODELS.find(m => m._id === req.params.id);
  if (!model) return res.status(404).json({ success: false, error: 'AI model not found' });
  res.json({ success: true, data: { ...model, settings: req.body } });
});

router.get('/admin/ai-management/models/:id/training-history', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: [
    { version: '2.0.0', trainedAt: new Date(Date.now() - 90 * 86400000).toISOString(), accuracy: 0.901, datasetSize: 8000, notes: 'Initial production release' },
    { version: '2.1.0', trainedAt: new Date(Date.now() - 30 * 86400000).toISOString(), accuracy: 0.934, datasetSize: 12000, notes: 'Added specialty synonym matching' },
  ] });
});

router.get('/admin/ai-management/models/:id/feedback-history', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: [] });
});

// Thresholds, statistics, scheduled reports, aggregate
router.get('/admin/ai-management/thresholds', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: SYNTHETIC_AI_THRESHOLDS });
});

router.put('/admin/ai-management/thresholds', protect, authorize('admin', 'superadmin'), (req, res) => {
  Object.assign(SYNTHETIC_AI_THRESHOLDS, req.body);
  res.json({ success: true, data: SYNTHETIC_AI_THRESHOLDS });
});

router.get('/admin/ai-management/statistics', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    data: {
      totalReports: 1245,
      averageConfidence: 0.887,
      approvalRate: 0.92,
      totalFeedback: 328,
      reportTypeDistribution: [
        { name: 'Readmission', value: 423 },
        { name: 'Diagnosis', value: 356 },
        { name: 'Treatment', value: 287 },
        { name: 'Summary', value: 124 },
        { name: 'Custom', value: 55 },
      ],
      statusDistribution: [
        { name: 'Approved', value: 876 },
        { name: 'Pending Review', value: 214 },
        { name: 'Rejected', value: 98 },
        { name: 'Draft', value: 57 },
      ],
      confidenceTrends: [
        { month: 'Jan', readmission: 0.82, diagnosis: 0.88, treatment: 0.79 },
        { month: 'Feb', readmission: 0.84, diagnosis: 0.87, treatment: 0.81 },
        { month: 'Mar', readmission: 0.85, diagnosis: 0.89, treatment: 0.83 },
        { month: 'Apr', readmission: 0.87, diagnosis: 0.91, treatment: 0.85 },
        { month: 'May', readmission: 0.89, diagnosis: 0.92, treatment: 0.86 },
        { month: 'Jun', readmission: 0.91, diagnosis: 0.93, treatment: 0.88 },
      ],
      feedbackDistribution: [
        { name: 'Accurate', value: 187 },
        { name: 'False Positive', value: 76 },
        { name: 'False Negative', value: 42 },
        { name: 'Other', value: 23 },
      ],
      topInsights: [
        { title: 'Medication Adherence Impact', description: 'Patients with medication adherence issues show 3.2x higher readmission rates within 30 days.', confidence: 0.94, impact: 'High' },
        { title: 'Early Intervention Effectiveness', description: 'Early follow-up within 72 hours reduces readmission risk by 42% for high-risk cardiac patients.', confidence: 0.91, impact: 'High' },
        { title: 'Diagnostic Pattern Recognition', description: 'AI model identifies subtle patterns in lab results that predict sepsis onset 6 hours earlier than traditional methods.', confidence: 0.87, impact: 'Critical' },
        { title: 'Treatment Protocol Optimization', description: 'Modified antibiotic protocol based on AI recommendations reduced average treatment time by 1.8 days.', confidence: 0.89, impact: 'Medium' },
        { title: 'Social Determinants Correlation', description: 'Transportation barriers strongly correlate with missed appointments and poorer outcomes for chronic disease patients.', confidence: 0.85, impact: 'Medium' },
      ],
    },
  });
});

router.get('/admin/ai-management/scheduled-reports', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/admin/ai-management/aggregate', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { totalReports: SYNTHETIC_AI_REPORTS.length, publishedReports: SYNTHETIC_AI_REPORTS.filter(r => r.status === 'published').length, avgAccuracy: 0.900 } });
});

// ---------------------------------------------------------------------------
// Prior Authorization routes (synthetic) — provider-facing
// ---------------------------------------------------------------------------

const syntheticPAs = [
  {
    _id: 'pa-001', patientId: 'PT-100001', patientName: 'Alice Johnson',
    requestingProviderId: 'user-1', requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'Metro Imaging Center', serviceType: 'MRI Scan', serviceCode: '70553',
    diagnosisCodes: [{ code: 'G35', description: 'Multiple sclerosis' }, { code: 'R51', description: 'Headache' }],
    clinicalNotes: 'Patient presents with recurring headaches and vision changes. Neurological symptoms suggest possible demyelinating disease. MRI of brain with contrast required for diagnosis and treatment planning.',
    urgency: 'Urgent', insurancePlan: 'Blue Cross Blue Shield', memberId: 'BCBS-100001',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 88,
    aiReasoning: 'Clinical presentation is consistent with neurological disorder requiring imaging. Documentation supports medical necessity.',
    aiAnalyzedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved based on clinical necessity and AI recommendation.',
    approvedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-002', patientId: 'PT-100002', patientName: 'Bob Martinez',
    requestingProviderId: 'user-1', requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'City Orthopedic Specialists', serviceType: 'Physical Therapy', serviceCode: '97110',
    diagnosisCodes: [{ code: 'M54.5', description: 'Low back pain' }, { code: 'M47.816', description: 'Spondylosis with radiculopathy, lumbar region' }],
    clinicalNotes: 'Patient has chronic low back pain with lumbar radiculopathy confirmed by EMG. Conservative treatment with PT recommended before surgical intervention. 12-week program requested.',
    urgency: 'Routine', insurancePlan: 'Aetna', memberId: 'AET-200002',
    status: 'Under Review', aiRecommendation: 'Approve', aiConfidenceScore: 82,
    aiReasoning: 'Physical therapy for lumbar radiculopathy is well-supported by evidence.',
    aiAnalyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: '',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-003', patientId: 'PT-100003', patientName: 'Carol White',
    requestingProviderId: 'user-2', requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Regional Cancer Center', serviceType: 'PET Scan', serviceCode: '78816',
    diagnosisCodes: [{ code: 'C34.10', description: 'Malignant neoplasm of upper lobe, unspecified bronchus or lung' }],
    clinicalNotes: 'Patient with confirmed Stage II lung cancer. PET scan required for accurate staging and treatment planning.',
    urgency: 'Urgent', insurancePlan: 'UnitedHealth', memberId: 'UHC-300003',
    status: 'Pending', aiRecommendation: null, aiConfidenceScore: null, aiReasoning: '', aiAnalyzedAt: null,
    reviewerNotes: '', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-004', patientId: 'PT-100004', patientName: 'David Kim',
    requestingProviderId: 'user-2', requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: '', serviceType: 'Cardiac Catheterization', serviceCode: '93460',
    diagnosisCodes: [{ code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' }, { code: 'I20.9', description: 'Angina pectoris, unspecified' }],
    clinicalNotes: 'Patient with unstable angina and positive stress test. Cardiac catheterization needed to evaluate coronary anatomy and guide revascularization.',
    urgency: 'Emergent', insurancePlan: 'Medicare', memberId: 'MCR-400004',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 95,
    aiReasoning: 'Emergent cardiac catheterization for unstable angina with positive stress test meets criteria for urgent authorization.',
    aiAnalyzedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Emergent case approved immediately.',
    approvedDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-005', patientId: 'PT-100005', patientName: 'Emma Davis',
    requestingProviderId: 'user-3', requestingProviderName: 'Dr. Mike Johnson',
    targetProviderName: 'Behavioral Health Associates', serviceType: 'Mental Health Services', serviceCode: '90837',
    diagnosisCodes: [{ code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate' }, { code: 'F41.1', description: 'Generalized anxiety disorder' }],
    clinicalNotes: 'Patient with treatment-resistant depression and comorbid anxiety. Requires intensive outpatient mental health services. Previous treatments with SSRIs insufficient.',
    urgency: 'Routine', insurancePlan: 'Cigna', memberId: 'CGN-500005',
    status: 'Denied', aiRecommendation: 'Review', aiConfidenceScore: 58,
    aiReasoning: 'Documentation does not adequately demonstrate that standard outpatient therapy has been exhausted.',
    aiAnalyzedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Denied pending additional documentation of prior treatment failure.',
    deniedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-006', patientId: 'PT-100006', patientName: 'Frank Wilson',
    requestingProviderId: 'user-1', requestingProviderName: 'Dr. John Smith',
    targetProviderName: '', serviceType: 'Surgical Procedure', serviceCode: '27447',
    diagnosisCodes: [{ code: 'M17.11', description: 'Primary osteoarthritis, right knee' }],
    clinicalNotes: 'Patient with severe bilateral knee osteoarthritis, failed conservative management including PT and injections. Total knee replacement recommended.',
    urgency: 'Routine', insurancePlan: 'Humana', memberId: 'HUM-600006',
    status: 'Appealing', aiRecommendation: 'Review', aiConfidenceScore: 67,
    aiReasoning: 'Surgical procedure requires additional documentation of failed conservative treatments.',
    aiAnalyzedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Denied initially due to insufficient documentation of conservative treatment failure.',
    deniedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    appealNotes: 'Attaching 18 months of PT records, 3 corticosteroid injections, and 2 orthopaedic consultations.',
    appealSubmittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-007', patientId: 'PT-100007', patientName: 'Grace Lee',
    requestingProviderId: 'user-2', requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Advanced Oncology Partners', serviceType: 'Infusion Therapy', serviceCode: '96413',
    diagnosisCodes: [{ code: 'C50.911', description: 'Malignant neoplasm of unspecified site of right female breast' }],
    clinicalNotes: 'Patient is a 52-year-old female with Stage III breast cancer on active chemotherapy. Requesting prior auth for 4 cycles of IV infusion therapy. Tumor markers show treatment response.',
    urgency: 'Urgent', insurancePlan: 'Kaiser Permanente', memberId: 'KP-700007',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 93,
    aiReasoning: 'Chemotherapy infusion for active Stage III breast cancer meets all criteria for prior authorization.',
    aiAnalyzedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved. Treatment response documented. Authorize 4 cycles.',
    approvedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 87 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-008', patientId: 'PT-100008', patientName: 'Henry Thompson',
    requestingProviderId: 'user-3', requestingProviderName: 'Dr. Mike Johnson',
    targetProviderName: 'Westside Sleep Disorders Clinic', serviceType: 'Sleep Study', serviceCode: '95810',
    diagnosisCodes: [{ code: 'G47.33', description: 'Obstructive sleep apnea (adult)' }],
    clinicalNotes: 'Patient reports excessive daytime sleepiness, loud snoring, and witnessed apneas. ESS score 16/24. BMI 34.2. Overnight polysomnography requested.',
    urgency: 'Routine', insurancePlan: 'Anthem', memberId: 'ANT-800008',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 85,
    aiReasoning: 'Clinical presentation with high Epworth score, BMI, and witnessed apneas strongly supports medical necessity.',
    aiAnalyzedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved. ESS score and clinical findings meet criteria.',
    approvedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-009', patientId: 'PT-100009', patientName: 'Isabella Garcia',
    requestingProviderId: 'user-1', requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'Metro Spine Institute', serviceType: 'Epidural Steroid Injection', serviceCode: '62323',
    diagnosisCodes: [{ code: 'M51.16', description: 'Intervertebral disc degeneration, lumbar region' }, { code: 'M54.4', description: 'Lumbago with sciatica, right side' }],
    clinicalNotes: 'Patient has refractory lumbar radiculopathy unresponsive to 8 weeks of PT and NSAIDs. MRI confirms L4-L5 disc herniation with nerve root compression.',
    urgency: 'Routine', insurancePlan: 'Aetna', memberId: 'AET-900009',
    status: 'Pending', aiRecommendation: null, aiConfidenceScore: null, aiReasoning: '', aiAnalyzedAt: null,
    reviewerNotes: '', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-010', patientId: 'PT-100010', patientName: 'James Brown',
    requestingProviderId: 'user-2', requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Pediatric Neurology Associates', serviceType: 'Specialist Consultation', serviceCode: '99244',
    diagnosisCodes: [{ code: 'G40.909', description: 'Epilepsy, unspecified, not intractable' }],
    clinicalNotes: '9-year-old male with new-onset seizure activity. Two tonic-clonic episodes in the past month. EEG shows abnormal epileptiform discharges. Referral to pediatric neurologist required.',
    urgency: 'Urgent', insurancePlan: 'Blue Cross Blue Shield', memberId: 'BCBS-101010',
    status: 'Under Review', aiRecommendation: 'Approve', aiConfidenceScore: 91,
    aiReasoning: 'New-onset pediatric epilepsy with confirmed EEG abnormalities requires urgent specialist evaluation.',
    aiAnalyzedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: '', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-011', patientId: 'PT-100011', patientName: 'Karen Martinez',
    requestingProviderId: 'user-3', requestingProviderName: 'Dr. Mike Johnson',
    targetProviderName: 'Regional Bariatric Center', serviceType: 'Surgical Procedure', serviceCode: '43644',
    diagnosisCodes: [{ code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories' }, { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' }],
    clinicalNotes: '41-year-old female with morbid obesity (BMI 43.8), type 2 diabetes, and hypertension. 6-month supervised weight loss program completed. Laparoscopic gastric bypass requested.',
    urgency: 'Routine', insurancePlan: 'UnitedHealth', memberId: 'UHC-111011',
    status: 'Denied', aiRecommendation: 'Review', aiConfidenceScore: 62,
    aiReasoning: 'While BMI and comorbidities meet surgical criteria, the 6-month supervised program documentation requires verification.',
    aiAnalyzedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Denied — supervised diet program documentation is incomplete.',
    deniedDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-012', patientId: 'PT-100012', patientName: 'Liam Anderson',
    requestingProviderId: 'user-1', requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'City Radiology Center', serviceType: 'CT Scan', serviceCode: '71250',
    diagnosisCodes: [{ code: 'R04.2', description: 'Haemoptysis' }, { code: 'Z87.891', description: 'Personal history of nicotine dependence' }],
    clinicalNotes: '58-year-old male with 30 pack-year smoking history, persistent cough and hemoptysis. Chest X-ray shows right upper lobe opacity. Low-dose CT chest required for lung cancer screening.',
    urgency: 'Urgent', insurancePlan: 'Medicare', memberId: 'MCR-121212',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 96,
    aiReasoning: 'Hemoptysis with chest X-ray opacity in a heavy smoker constitutes high clinical suspicion for lung malignancy. CT chest is medically necessary.',
    aiAnalyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved immediately. High-priority case.',
    approvedDate: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-013', patientId: 'PT-100013', patientName: 'Mia Robinson',
    requestingProviderId: 'user-2', requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Reproductive Endocrinology Associates', serviceType: 'Lab Testing', serviceCode: '89264',
    diagnosisCodes: [{ code: 'N97.9', description: 'Female infertility, unspecified' }, { code: 'E28.2', description: 'Polycystic ovarian syndrome' }],
    clinicalNotes: '33-year-old female with PCOS and 18 months of primary infertility. Comprehensive fertility panel requested.',
    urgency: 'Routine', insurancePlan: 'Cigna', memberId: 'CGN-131313',
    status: 'Pending', aiRecommendation: null, aiConfidenceScore: null, aiReasoning: '', aiAnalyzedAt: null,
    reviewerNotes: '', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-014', patientId: 'PT-100014', patientName: 'Noah Clark',
    requestingProviderId: 'user-3', requestingProviderName: 'Dr. Mike Johnson',
    targetProviderName: 'Comprehensive Rehab Center', serviceType: 'Occupational Therapy', serviceCode: '97530',
    diagnosisCodes: [{ code: 'I63.9', description: 'Cerebral infarction, unspecified' }, { code: 'G81.90', description: 'Hemiplegia, unspecified' }],
    clinicalNotes: '67-year-old male recovering from ischemic stroke 3 weeks ago with residual left-sided hemiplegia. FIM score 62. Requesting 30 occupational therapy sessions over 10 weeks.',
    urgency: 'Urgent', insurancePlan: 'Medicare', memberId: 'MCR-141414',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 94,
    aiReasoning: 'Post-stroke occupational therapy with documented FIM score and functional deficits clearly meets medical necessity criteria.',
    aiAnalyzedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved. Post-stroke rehab is medically necessary. Authorize 30 sessions.',
    approvedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 88 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-015', patientId: 'PT-100015', patientName: 'Olivia Harris',
    requestingProviderId: 'user-1', requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'Endocrine Specialty Clinic', serviceType: 'Durable Medical Equipment', serviceCode: 'E0784',
    diagnosisCodes: [{ code: 'E10.649', description: 'Type 1 diabetes mellitus with hypoglycemia without coma' }],
    clinicalNotes: '28-year-old female with Type 1 diabetes on insulin pump with frequent hypoglycemic episodes (>3/week). Requesting CGM authorization. HbA1c 8.9%.',
    urgency: 'Routine', insurancePlan: 'Blue Cross Blue Shield', memberId: 'BCBS-151515',
    status: 'Under Review', aiRecommendation: 'Approve', aiConfidenceScore: 87,
    aiReasoning: 'CGM for Type 1 diabetes with documented hypoglycemic episodes and elevated HbA1c meets standard criteria.',
    aiAnalyzedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: '', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-016', patientId: 'PT-100016', patientName: 'Peter Williams',
    requestingProviderId: 'user-2', requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Gastroenterology Specialists', serviceType: 'Colonoscopy', serviceCode: '45378',
    diagnosisCodes: [{ code: 'K92.1', description: 'Melaena' }, { code: 'Z80.0', description: 'Family history of malignant neoplasm of digestive organs' }],
    clinicalNotes: '52-year-old male with 2-week history of melena. Family history of colon cancer. Hemoglobin 10.2 g/dL (down from 13.8). Colonoscopy urgently needed to evaluate GI bleeding.',
    urgency: 'Urgent', insurancePlan: 'Anthem', memberId: 'ANT-161616',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 98,
    aiReasoning: 'Active GI bleeding with anemia and family history of colorectal cancer represents an urgent indication for colonoscopy.',
    aiAnalyzedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved urgently. Active bleeding requiring immediate evaluation.',
    approvedDate: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-017', patientId: 'PT-100001', patientName: 'Alice Johnson',
    requestingProviderId: 'user-1', requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'NeuroRehab Specialists', serviceType: 'Speech Therapy', serviceCode: '92507',
    diagnosisCodes: [{ code: 'G35', description: 'Multiple sclerosis' }, { code: 'R47.1', description: 'Dysarthria and anarthria' }],
    clinicalNotes: 'Patient with confirmed MS presenting with progressive dysarthria. Speech-language pathology evaluation and treatment requested. Weekly sessions for 12 weeks.',
    urgency: 'Routine', insurancePlan: 'Blue Cross Blue Shield', memberId: 'BCBS-100001',
    status: 'Expired', aiRecommendation: 'Approve', aiConfidenceScore: 83,
    aiReasoning: 'Speech therapy for MS-related dysarthria is clinically indicated. Functional communication impact documented.',
    aiAnalyzedAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved. 12 sessions authorized.',
    approvedDate: new Date(Date.now() - 94 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 97 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Provider prior-auth routes
router.get('/prior-auth', protect, (req, res) => {
  const { status, page = 0, limit = 20 } = req.query;
  let results = [...syntheticPAs];
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    results = results.filter(p => p.requestingProviderId === (req.user.id || req.user._id) || p.requestingProviderId === 'user-1');
  }
  if (status && status !== 'all') results = results.filter(p => p.status === status);
  const total = results.length;
  const paginated = results.slice(parseInt(page) * parseInt(limit), (parseInt(page) + 1) * parseInt(limit));
  res.json({ success: true, data: { priorAuths: paginated, total } });
});

router.get('/prior-auth/:id', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: pa });
});

router.post('/prior-auth', protect, (req, res) => {
  const { analyzePriorAuthorization } = require('../services/azureAIService');
  const newPA = {
    _id: 'pa-' + Date.now(), ...req.body,
    requestingProviderId: req.user.id || req.user._id,
    requestingProviderName: req.user.name || req.user.email,
    status: 'Pending', aiRecommendation: null, aiConfidenceScore: null,
    aiReasoning: '', aiAnalyzedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  syntheticPAs.push(newPA);
  analyzePriorAuthorization(newPA).then(aiResult => {
    newPA.aiRecommendation = aiResult.recommendation;
    newPA.aiConfidenceScore = aiResult.confidenceScore;
    newPA.aiReasoning = aiResult.reasoning;
    newPA.aiAnalyzedAt = new Date().toISOString();
    newPA.status = 'Under Review';
  }).catch(() => {});
  res.status(201).json({ success: true, data: newPA });
});

router.post('/prior-auth/:id/appeal', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  pa.status = 'Appealing';
  pa.appealNotes = req.body.appealNotes || '';
  pa.appealSubmittedAt = new Date().toISOString();
  pa.updatedAt = new Date().toISOString();
  res.json({ success: true, data: pa });
});

router.post('/prior-auth/:id/analyze', protect, (req, res) => {
  const { analyzePriorAuthorization } = require('../services/azureAIService');
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  analyzePriorAuthorization(pa).then(aiResult => {
    pa.aiRecommendation = aiResult.recommendation;
    pa.aiConfidenceScore = aiResult.confidenceScore;
    pa.aiReasoning = aiResult.reasoning;
    pa.aiAnalyzedAt = new Date().toISOString();
    pa.updatedAt = new Date().toISOString();
    res.json({ success: true, data: { ...aiResult, pa } });
  }).catch(err => res.status(500).json({ success: false, error: err.message }));
});

router.post('/prior-auth/:id/appeal-draft', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  const draft = `Dear Insurance Review Board,\n\nI am writing to formally appeal the denial of prior authorization for ${pa.serviceType} for patient ${pa.patientName}.\n\nClinical Justification:\n${pa.clinicalNotes}\n\nDiagnosis Codes: ${(pa.diagnosisCodes || []).map(d => d.code).join(', ')}\n\nThe requested service is medically necessary based on the patient's documented condition and clinical presentation. I respectfully request that this decision be reconsidered.\n\nSincerely,\n${pa.requestingProviderName}`;
  res.json({ success: true, data: { appealDraft: draft } });
});

router.get('/prior-auth/:id/history', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  const history = [
    { action: 'PA_SUBMITTED', timestamp: pa.createdAt, userEmail: pa.requestingProviderName, userRole: 'provider', resourceId: pa._id },
    pa.aiAnalyzedAt ? { action: 'PA_AI_ANALYZED', timestamp: pa.aiAnalyzedAt, userEmail: 'AI System', userRole: 'system', resourceId: pa._id } : null,
    pa.approvedDate ? { action: 'PA_APPROVED', timestamp: pa.approvedDate, userEmail: 'Admin User', userRole: 'admin', resourceId: pa._id } : null,
    pa.deniedDate ? { action: 'PA_DENIED', timestamp: pa.deniedDate, userEmail: 'Admin User', userRole: 'admin', resourceId: pa._id } : null,
    pa.appealSubmittedAt ? { action: 'PA_APPEALED', timestamp: pa.appealSubmittedAt, userEmail: pa.requestingProviderName, userRole: 'provider', resourceId: pa._id } : null,
    pa.status === 'Expired' ? { action: 'PA_EXPIRED', timestamp: pa.expiryDate || pa.updatedAt, userEmail: 'System', userRole: 'system', resourceId: pa._id } : null,
    pa.escalationSentAt ? { action: 'PA_ESCALATED', timestamp: pa.escalationSentAt, userEmail: 'System', userRole: 'system', resourceId: pa._id } : null,
  ].filter(Boolean);
  res.json({ success: true, data: history });
});

router.post('/prior-auth/:id/renew', protect, (req, res) => {
  const uid = req.user.id || req.user._id;
  const original = syntheticPAs.find(p => p._id === req.params.id && p.requestingProviderId === uid);
  if (!original) return res.status(404).json({ success: false, error: 'Not found' });
  if (original.status !== 'Expired') return res.status(400).json({ success: false, error: 'Only Expired PAs can be renewed' });
  const { analyzePriorAuthorization } = require('../services/azureAIService');
  const renewal = {
    _id: 'pa-renew-' + Date.now(),
    patientId: original.patientId, patientName: original.patientName,
    requestingProviderId: original.requestingProviderId, requestingProviderName: original.requestingProviderName,
    targetProviderName: original.targetProviderName,
    serviceType: original.serviceType, serviceCode: original.serviceCode,
    urgency: original.urgency, insurancePlan: original.insurancePlan, memberId: original.memberId,
    diagnosisCodes: original.diagnosisCodes || [],
    clinicalNotes: req.body.clinicalNotes || original.clinicalNotes,
    renewedFromId: original._id,
    status: 'Pending', aiRecommendation: null, aiConfidenceScore: null,
    aiReasoning: '', aiAnalyzedAt: null, notes: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  syntheticPAs.push(renewal);
  analyzePriorAuthorization(renewal).then(aiResult => {
    renewal.aiRecommendation = aiResult.recommendation;
    renewal.aiConfidenceScore = aiResult.confidenceScore;
    renewal.aiReasoning = aiResult.reasoning;
    renewal.aiAnalyzedAt = new Date().toISOString();
    renewal.status = 'Under Review';
    renewal.updatedAt = new Date().toISOString();
  }).catch(() => {});
  res.status(201).json({ success: true, data: renewal });
});

router.post('/prior-auth/:id/notes', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  if (!req.body.message?.trim()) return res.status(400).json({ success: false, error: 'Message required' });
  if (!pa.notes) pa.notes = [];
  pa.notes.push({ authorId: req.user.id || req.user._id, authorEmail: req.user.email, authorRole: req.user.role, message: req.body.message.trim(), createdAt: new Date().toISOString() });
  pa.updatedAt = new Date().toISOString();
  res.json({ success: true, data: pa.notes });
});

// Admin prior-auth routes
router.get('/admin/prior-auth', protect, (req, res) => {
  const { status, search = '', page = 0, limit = 100 } = req.query;
  let results = [...syntheticPAs];
  if (status && status !== 'all') results = results.filter(p => p.status === status);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(p =>
      p.patientName?.toLowerCase().includes(q) ||
      p.serviceType?.toLowerCase().includes(q) ||
      p.requestingProviderName?.toLowerCase().includes(q)
    );
  }
  const total = results.length;
  const nowMs = Date.now();
  const scoredResults = results.map(p => {
    let score = p.urgency === 'Emergent' ? 100 : p.urgency === 'Urgent' ? 80 : 50;
    score += Math.min((nowMs - new Date(p.createdAt).getTime()) / 3600000 * 2, 40);
    if (p.aiConfidenceScore != null && p.aiConfidenceScore >= 60 && p.aiConfidenceScore <= 80) score += 20;
    return { ...p, priorityScore: Math.round(score) };
  });
  const ACTION_STATUSES = ['Pending', 'Under Review', 'Appealing'];
  if (!status || status === 'all' || ACTION_STATUSES.includes(status)) {
    scoredResults.sort((a, b) => b.priorityScore - a.priorityScore);
  }
  const paginated = scoredResults.slice(parseInt(page) * parseInt(limit), (parseInt(page) + 1) * parseInt(limit));
  const statMap = { Pending: 0, 'Under Review': 0, Approved: 0, Denied: 0, Appealing: 0, Expired: 0, overdueAppeals: 0 };
  syntheticPAs.forEach(p => { if (statMap[p.status] !== undefined) statMap[p.status]++; });
  res.json({ success: true, data: { priorAuths: paginated, total, stats: statMap, prioritySorted: true } });
});

router.get('/admin/prior-auth/analytics', protect, authorize('admin', 'superadmin'), (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 86400000);
  const recent = syntheticPAs.filter(p => new Date(p.createdAt) >= thirtyDaysAgo);
  const denied = syntheticPAs.filter(p => p.status === 'Denied');
  const approved = syntheticPAs.filter(p => p.status === 'Approved');
  const appealed = syntheticPAs.filter(p => p.appealSubmittedAt);
  const appealApproved = syntheticPAs.filter(p => p.appealOutcome === 'Approved');

  const tatByServiceType = Object.values(
    approved.reduce((acc, p) => {
      const svc = p.serviceType || 'Other';
      if (!acc[svc]) acc[svc] = { _id: svc, avgTatHours: 0, count: 0, _total: 0 };
      const tat = p.reviewedAt ? (new Date(p.reviewedAt) - new Date(p.createdAt)) / 3600000 : 24;
      acc[svc]._total += tat;
      acc[svc].count++;
      acc[svc].avgTatHours = Math.round(acc[svc]._total / acc[svc].count * 10) / 10;
      return acc;
    }, {})
  ).map(({ _total, ...rest }) => rest);

  const denialRateByService = Object.values(
    syntheticPAs.reduce((acc, p) => {
      const svc = p.serviceType || 'Other';
      if (!acc[svc]) acc[svc] = { _id: svc, total: 0, denied: 0 };
      acc[svc].total++;
      if (p.status === 'Denied') acc[svc].denied++;
      return acc;
    }, {})
  ).map(r => ({ ...r, denialRate: Math.round((r.denied / r.total) * 100) }));

  const totalAI = syntheticPAs.filter(p => p.aiRecommendation).length;
  const correctAI = syntheticPAs.filter(p => p.aiRecommendation && p.status === p.aiRecommendation).length;
  const autoApproved = syntheticPAs.filter(p => p.autoApproved).length;

  const volumeTrend = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    return { _id: dateStr, count: syntheticPAs.filter(p => p.createdAt?.slice(0, 10) === dateStr).length };
  }).filter(d => d.count > 0);

  res.json({
    success: true,
    data: {
      tatByServiceType,
      denialRateByService,
      aiAccuracy: { total: totalAI, correct: correctAI, autoApproved, accuracyPct: totalAI > 0 ? Math.round(correctAI / totalAI * 100) : 0 },
      appealOutcomes: { Approved: appealApproved.length, Denied: appealed.length - appealApproved.length },
      volumeTrend,
    },
  });
});

router.post('/admin/prior-auth/bulk-review', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { ids, decision, reviewerNotes, denialReasonCode, approvalDurationDays } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, error: 'ids must be a non-empty array' });
  if (!['Approved', 'Denied'].includes(decision)) return res.status(400).json({ success: false, error: 'Decision must be Approved or Denied' });
  const CARC_MAP = { '4': 'Not covered', '50': 'Not medically necessary', '96': 'Non-covered charge', '167': 'Diagnosis not covered', '197': 'Authorization absent', '252': 'Documentation required' };
  const now = new Date().toISOString();
  let processed = 0;
  ids.forEach(id => {
    const pa = syntheticPAs.find(p => p._id === id && ['Pending', 'Under Review'].includes(p.status));
    if (!pa) return;
    pa.status = decision;
    pa.reviewerNotes = reviewerNotes || '';
    pa.reviewedAt = now;
    if (decision === 'Approved') {
      pa.approvedDate = now;
      const exp = new Date(); exp.setDate(exp.getDate() + (parseInt(approvalDurationDays) || 90));
      pa.expiryDate = exp.toISOString();
    } else {
      pa.deniedDate = now;
      if (denialReasonCode) { pa.denialReasonCode = denialReasonCode; pa.denialReasonDescription = CARC_MAP[denialReasonCode] || denialReasonCode; }
    }
    pa.updatedAt = now;
    processed++;
  });
  res.json({ success: true, data: { processed, skipped: ids.length - processed, decision } });
});

router.get('/admin/prior-auth/:id', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: pa });
});

router.put('/admin/prior-auth/:id/review', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  const { decision, reviewerNotes } = req.body;
  pa.status = decision;
  pa.reviewerNotes = reviewerNotes || '';
  pa.reviewedAt = new Date().toISOString();
  if (decision === 'Approved') {
    pa.approvedDate = new Date().toISOString();
    const exp = new Date(); exp.setDate(exp.getDate() + 90);
    pa.expiryDate = exp.toISOString();
  } else {
    pa.deniedDate = new Date().toISOString();
  }
  pa.updatedAt = new Date().toISOString();
  // Record notification log entry
  const _reviewNow = new Date().toISOString();
  syntheticPatientNotifications.push({
    _id: `pn-${Date.now()}`, patientId: pa.patientId, patientName: pa.patientName,
    title: decision === 'Approved' ? 'Prior Authorization Approved' : 'Prior Authorization Update',
    message: `Your prior authorization for ${pa.serviceType} has been ${decision.toLowerCase()}.`,
    type: 'prior_auth_update', priority: 'normal', channels: ['email', 'sms', 'in_app'],
    channelStatus: { email: { sent: true, sentAt: _reviewNow }, sms: { sent: true, sentAt: _reviewNow }, in_app: { sent: true } },
    status: 'sent', relatedId: pa._id, relatedType: 'prior_auth', sentAt: _reviewNow, createdAt: _reviewNow,
  });
  res.json({ success: true, data: pa });
});

router.put('/admin/prior-auth/:id/appeal-review', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  const { outcome, reviewerNotes } = req.body;
  pa.status = outcome;
  pa.appealOutcome = outcome;
  pa.appealReviewedAt = new Date().toISOString();
  pa.reviewerNotes = reviewerNotes || pa.reviewerNotes;
  pa.updatedAt = new Date().toISOString();
  // Record notification log entry
  const _appealNow = new Date().toISOString();
  syntheticPatientNotifications.push({
    _id: `pn-${Date.now()}`, patientId: pa.patientId, patientName: pa.patientName,
    title: outcome === 'Approved' ? 'Appeal Approved — Prior Authorization Reinstated' : 'Appeal Denied',
    message: `Your appeal for ${pa.serviceType} has been ${outcome.toLowerCase()}.`,
    type: 'prior_auth_update', priority: 'normal', channels: ['email', 'sms', 'in_app'],
    channelStatus: { email: { sent: true, sentAt: _appealNow }, sms: { sent: true, sentAt: _appealNow }, in_app: { sent: true } },
    status: 'sent', relatedId: pa._id, relatedType: 'prior_auth', sentAt: _appealNow, createdAt: _appealNow,
  });
  res.json({ success: true, data: pa });
});

router.post('/admin/prior-auth/:id/analyze', protect, (req, res) => {
  const { analyzePriorAuthorization } = require('../services/azureAIService');
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  analyzePriorAuthorization(pa).then(aiResult => {
    pa.aiRecommendation = aiResult.recommendation;
    pa.aiConfidenceScore = aiResult.confidenceScore;
    pa.aiReasoning = aiResult.reasoning;
    pa.aiAnalyzedAt = new Date().toISOString();
    pa.updatedAt = new Date().toISOString();
    res.json({ success: true, data: { ...aiResult, pa } });
  }).catch(err => res.status(500).json({ success: false, error: err.message }));
});

router.get('/admin/prior-auth/:id/history', protect, authorize('admin', 'superadmin'), (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  const history = [
    { action: 'PA_SUBMITTED', timestamp: pa.createdAt, userEmail: pa.requestingProviderName, userRole: 'provider', resourceId: pa._id },
    pa.aiAnalyzedAt ? { action: 'PA_AI_ANALYZED', timestamp: pa.aiAnalyzedAt, userEmail: 'AI System', userRole: 'system', resourceId: pa._id } : null,
    pa.approvedDate ? { action: 'PA_APPROVED', timestamp: pa.approvedDate, userEmail: 'Admin User', userRole: 'admin', resourceId: pa._id } : null,
    pa.deniedDate ? { action: 'PA_DENIED', timestamp: pa.deniedDate, userEmail: 'Admin User', userRole: 'admin', resourceId: pa._id } : null,
    pa.appealSubmittedAt ? { action: 'PA_APPEALED', timestamp: pa.appealSubmittedAt, userEmail: pa.requestingProviderName, userRole: 'provider', resourceId: pa._id } : null,
    pa.appealReviewedAt ? { action: pa.appealOutcome === 'Approved' ? 'PA_APPEAL_APPROVED' : 'PA_APPEAL_DENIED', timestamp: pa.appealReviewedAt, userEmail: 'Admin User', userRole: 'admin', resourceId: pa._id } : null,
    pa.status === 'Expired' ? { action: 'PA_EXPIRED', timestamp: pa.expiryDate || pa.updatedAt, userEmail: 'System', userRole: 'system', resourceId: pa._id } : null,
    pa.escalationSentAt ? { action: 'PA_ESCALATED', timestamp: pa.escalationSentAt, userEmail: 'System', userRole: 'system', resourceId: pa._id } : null,
  ].filter(Boolean);
  res.json({ success: true, data: history });
});

router.post('/admin/prior-auth/:id/notes', protect, authorize('admin', 'superadmin'), (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  if (!req.body.message?.trim()) return res.status(400).json({ success: false, error: 'Message required' });
  if (!pa.notes) pa.notes = [];
  pa.notes.push({ authorId: req.user.id || req.user._id, authorEmail: req.user.email, authorRole: req.user.role, message: req.body.message.trim(), createdAt: new Date().toISOString() });
  pa.updatedAt = new Date().toISOString();
  res.json({ success: true, data: pa.notes });
});

// ---------------------------------------------------------------------------
// Patient Engagement routes (synthetic mode)
// ---------------------------------------------------------------------------

const syntheticTemplates = [
  { _id: 'tmpl-001', name: 'Appointment Reminder', type: 'appointment_reminder', subject: 'Upcoming Appointment Reminder', body: 'Dear {{patientName}}, you have an appointment scheduled on {{appointmentDate}} at {{appointmentTime}} with {{providerName}}. Please arrive 15 minutes early.', smsBody: 'Reminder: Appt on {{appointmentDate}} at {{appointmentTime}} with {{providerName}}.', defaultChannels: ['email', 'sms', 'in_app'], variables: ['patientName', 'appointmentDate', 'appointmentTime', 'providerName'], isActive: true, usageCount: 45, createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'tmpl-002', name: 'Referral Status Update', type: 'referral_update', subject: 'Your Referral Has Been Updated', body: 'Dear {{patientName}}, your referral for {{serviceType}} to {{providerName}} has been {{status}}.', smsBody: 'Your referral for {{serviceType}} has been {{status}}. Log in for details.', defaultChannels: ['email', 'in_app'], variables: ['patientName', 'serviceType', 'providerName', 'status'], isActive: true, usageCount: 28, createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'tmpl-003', name: 'Prior Authorization Update', type: 'prior_auth_update', subject: 'Prior Authorization Decision', body: 'Dear {{patientName}}, your prior authorization request for {{serviceType}} has been {{decision}}.', smsBody: 'PA for {{serviceType}}: {{decision}}. Check portal for details.', defaultChannels: ['email', 'sms', 'in_app'], variables: ['patientName', 'serviceType', 'decision', 'reason'], isActive: true, usageCount: 19, createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'tmpl-004', name: 'Preventive Care Reminder', type: 'care_gap', subject: 'Time for Your Preventive Care Checkup', body: 'Dear {{patientName}}, our records show you are due for {{careType}}. Please schedule an appointment with {{providerName}} at your earliest convenience.', smsBody: 'Hi {{patientName}}, you are due for {{careType}}. Please schedule with {{providerName}}.', defaultChannels: ['email', 'sms'], variables: ['patientName', 'careType', 'providerName'], isActive: true, usageCount: 67, createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'tmpl-005', name: 'Lab Results Ready', type: 'lab_result', subject: 'Your Lab Results Are Ready', body: 'Dear {{patientName}}, your lab results from {{testDate}} are now available in the patient portal.', smsBody: 'Lab results from {{testDate}} ready. Log in to portal or call {{providerName}}.', defaultChannels: ['email', 'in_app'], variables: ['patientName', 'testDate', 'providerName'], isActive: true, usageCount: 33, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'tmpl-006', name: 'Prescription Ready for Pickup', type: 'prescription', subject: 'Your Prescription is Ready', body: 'Dear {{patientName}}, your prescription for {{medicationName}} is ready for pickup at {{pharmacyName}}.', smsBody: 'Rx for {{medicationName}} ready at {{pharmacyName}}. Bring ID.', defaultChannels: ['sms', 'in_app'], variables: ['patientName', 'medicationName', 'pharmacyName', 'pharmacyHours'], isActive: true, usageCount: 22, createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
];

const syntheticPatientNotifications = [
  { _id: 'pn-001', patientId: 'PT-100001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', patientPhone: '+15551234567', title: 'Appointment Reminder', message: 'Dear James Wilson, you have an appointment scheduled on Jun 20, 2025 at 10:00 AM with Dr. John Smith. Please arrive 15 minutes early.', type: 'appointment_reminder', priority: 'normal', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000).toISOString(), messageId: 'msg-001' }, sms: { sent: true, sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), sid: 'SM001' }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() } }, status: 'read', templateId: 'tmpl-001', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-002', patientId: 'PT-100002', patientName: 'Emily Rodriguez', patientEmail: 'emily.rodriguez@email.com', patientPhone: '+15552345678', title: 'Referral Status Update', message: 'Dear Emily Rodriguez, your referral for Pulmonology to Metro Medical Center has been accepted.', type: 'referral_update', priority: 'normal', channels: ['email', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 120000).toISOString(), messageId: 'msg-002' }, in_app: { sent: true, read: false } }, status: 'delivered', templateId: 'tmpl-002', sentByName: 'System', sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-003', patientId: 'PT-100003', patientName: 'Thomas Brown', patientEmail: 'thomas.brown@email.com', patientPhone: '+15553456789', title: 'Prior Authorization Approved', message: 'Dear Thomas Brown, your prior authorization request for MRI Scan has been approved. Valid for 90 days.', type: 'prior_auth_update', priority: 'high', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60000).toISOString() }, sms: { sent: true, sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), sid: 'SM003' }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() } }, status: 'read', sentByName: 'Admin User', sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-004', patientId: 'PT-100001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', patientPhone: '+15551234567', title: 'Annual Wellness Check Due', message: 'Dear James Wilson, you are due for your Annual Wellness Check. Please schedule with Dr. John Smith.', type: 'care_gap', priority: 'normal', channels: ['email', 'sms'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 90000).toISOString() }, sms: { sent: true, sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), sid: 'SM004' } }, status: 'delivered', campaignId: 'camp-002', sentByName: 'Admin User', sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-005', patientId: 'PT-100004', patientName: 'Maria Garcia', patientEmail: 'maria.garcia@email.com', patientPhone: '+15554567890', title: 'Lab Results Ready', message: 'Dear Maria Garcia, your lab results from Jun 1, 2025 are now available. Please log into the patient portal.', type: 'lab_result', priority: 'normal', channels: ['email', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), deliveredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 60000).toISOString() }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() } }, status: 'read', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-006', patientId: 'PT-100005', patientName: 'David Lee', patientEmail: 'david.lee@email.com', patientPhone: '+15555678901', title: 'Prescription Ready for Pickup', message: 'Dear David Lee, your prescription for Metformin is ready for pickup at City Pharmacy.', type: 'prescription', priority: 'normal', channels: ['sms', 'in_app'], channelStatus: { sms: { sent: false, error: 'Invalid phone number format' }, in_app: { sent: true, read: false } }, status: 'failed', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-007', patientId: 'PT-100002', patientName: 'Emily Rodriguez', patientEmail: 'emily.rodriguez@email.com', patientPhone: '+15552345678', title: 'Flu Season Vaccination Reminder', message: 'Dear Emily Rodriguez, flu season is here. We recommend scheduling your annual flu vaccination.', type: 'campaign', priority: 'low', channels: ['email', 'sms'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), deliveredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 60000).toISOString() }, sms: { sent: true, sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), sid: 'SM007' } }, status: 'delivered', campaignId: 'camp-001', sentByName: 'Admin User', sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-008', patientId: 'PT-100003', patientName: 'Thomas Brown', patientEmail: 'thomas.brown@email.com', patientPhone: '+15553456789', title: 'Upcoming Cardiology Appointment', message: 'Dear Thomas Brown, your appointment with Dr. Michael Chen is on Jun 25, 2025 at 2:00 PM.', type: 'appointment_reminder', priority: 'high', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }, sms: { sent: true, sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), sid: 'SM008' }, in_app: { sent: true, read: false } }, status: 'sent', sentByName: 'Dr. Michael Chen', sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-009', patientId: 'PT-100001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', patientPhone: '+15551234567', title: 'Prior Authorization Denied', message: 'Dear James Wilson, your prior authorization for Cardiac Catheterization has been denied. Please contact your provider.', type: 'prior_auth_update', priority: 'urgent', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), deliveredAt: new Date(Date.now() - 8 * 60 * 60 * 1000 + 60000).toISOString() }, sms: { sent: true, sentAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), sid: 'SM009' }, in_app: { sent: true, read: false } }, status: 'delivered', sentByName: 'Admin User', sentAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-010', patientId: 'PT-100005', patientName: 'David Lee', patientEmail: 'david.lee@email.com', patientPhone: '+15555678901', title: 'Cholesterol Screening Reminder', message: 'Dear David Lee, based on your medical history, we recommend scheduling a cholesterol screening.', type: 'care_gap', priority: 'normal', channels: ['email', 'in_app'], channelStatus: { email: { sent: false, error: 'Delivery timeout' }, in_app: { sent: true, read: false } }, status: 'failed', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'pn-011', patientId: 'PT-100003', patientName: 'Thomas Brown', patientEmail: 'thomas.brown@email.com', patientPhone: '+15553456789', title: 'Pending Prior Authorization', message: 'Dear Thomas Brown, your prior authorization for Physical Therapy is currently under review.', type: 'prior_auth_update', priority: 'normal', channels: ['in_app'], channelStatus: { in_app: { sent: true, read: false } }, status: 'pending', sentByName: 'System', createdAt: new Date().toISOString() },
  { _id: 'pn-012', patientId: 'PT-100004', patientName: 'Maria Garcia', patientEmail: 'maria.garcia@email.com', patientPhone: '+15554567890', title: 'General Health Update', message: 'Dear Maria Garcia, please remember to take your medications as prescribed and maintain a healthy lifestyle.', type: 'general', priority: 'low', channels: ['in_app'], channelStatus: { in_app: { sent: true, read: true, readAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() } }, status: 'read', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
];

const syntheticCampaigns = [
  { _id: 'camp-001', name: 'Flu Season Vaccination Reminder', description: 'Annual flu vaccination reminder sent to all active patients', templateId: 'tmpl-004', templateName: 'Preventive Care Reminder', channels: ['email', 'sms'], targetCriteria: { all: true }, status: 'completed', startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 3600000).toISOString(), stats: { totalTargeted: 5, totalSent: 5, totalDelivered: 4, totalFailed: 1, totalRead: 2, openRate: 40 }, createdByName: 'Admin User', createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'camp-002', name: 'Annual Wellness Check', description: 'Targeted reminder for high-risk patients to schedule annual wellness exams', templateId: 'tmpl-004', templateName: 'Preventive Care Reminder', channels: ['email', 'sms'], targetCriteria: { riskScoreMin: 60, all: false }, status: 'completed', startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1800000).toISOString(), stats: { totalTargeted: 3, totalSent: 3, totalDelivered: 3, totalFailed: 0, totalRead: 1, openRate: 33 }, createdByName: 'Admin User', createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'camp-003', name: 'Diabetes Management Program', description: 'Outreach for diabetes education and management program enrollment', templateId: 'tmpl-001', templateName: 'Appointment Reminder', channels: ['email', 'in_app'], targetCriteria: { conditions: ['Type 2 Diabetes', 'Diabetes'], all: false }, status: 'draft', stats: { totalTargeted: 0, totalSent: 0, totalDelivered: 0, totalFailed: 0, totalRead: 0, openRate: 0 }, createdByName: 'Admin User', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

// ── Patient Engagement: Notifications ────────────────────────────────────────

router.get('/admin/patient-engagement/stats', protect, authorize('admin', 'superadmin'), (req, res) => {
  const total = syntheticPatientNotifications.length;
  const sent = syntheticPatientNotifications.filter(n => ['sent','delivered','read'].includes(n.status)).length;
  const delivered = syntheticPatientNotifications.filter(n => ['delivered','read'].includes(n.status)).length;
  const failed = syntheticPatientNotifications.filter(n => n.status === 'failed').length;
  const pending = syntheticPatientNotifications.filter(n => n.status === 'pending').length;
  const read = syntheticPatientNotifications.filter(n => n.status === 'read').length;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const byType = {};
  syntheticPatientNotifications.forEach(n => { byType[n.type] = (byType[n.type] || 0) + 1; });
  const byChannel = {};
  syntheticPatientNotifications.forEach(n => (n.channels || []).forEach(ch => { byChannel[ch] = (byChannel[ch] || 0) + 1; }));

  res.json({ success: true, data: { total, sent, delivered, failed, pending, read, deliveryRate, byType, byChannel } });
});

router.get('/admin/patient-engagement/templates', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { type, isActive } = req.query;
  let results = [...syntheticTemplates];
  if (type) results = results.filter(t => t.type === type);
  if (isActive !== undefined) results = results.filter(t => t.isActive === (isActive === 'true'));
  res.json({ success: true, data: results });
});

router.post('/admin/patient-engagement/templates', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { name, description, type, subject, body, smsBody, pushTitle, defaultChannels, variables } = req.body;
  if (!name || !type || !body) return res.status(400).json({ success: false, error: 'name, type, and body are required' });
  const newTemplate = {
    _id: `tmpl-${Date.now()}`, name, description, type, subject, body, smsBody, pushTitle,
    defaultChannels: defaultChannels || ['in_app'],
    variables: Array.isArray(variables) ? variables : (variables || '').split(',').map(v => v.trim()).filter(Boolean),
    isActive: true, usageCount: 0, createdAt: new Date().toISOString()
  };
  syntheticTemplates.push(newTemplate);
  res.status(201).json({ success: true, data: newTemplate });
});

router.put('/admin/patient-engagement/templates/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const tpl = syntheticTemplates.find(t => t._id === req.params.id);
  if (!tpl) return res.status(404).json({ success: false, error: 'Not found' });
  Object.assign(tpl, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: tpl });
});

router.delete('/admin/patient-engagement/templates/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const tpl = syntheticTemplates.find(t => t._id === req.params.id);
  if (!tpl) return res.status(404).json({ success: false, error: 'Not found' });
  tpl.isActive = false;
  res.json({ success: true, message: 'Template deactivated' });
});

router.get('/admin/patient-engagement/campaigns', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { status } = req.query;
  let results = [...syntheticCampaigns];
  if (status && status !== 'all') results = results.filter(c => c.status === status);
  res.json({ success: true, data: { campaigns: results, total: results.length } });
});

router.post('/admin/patient-engagement/campaigns', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { name, description, templateId, channels, customMessage, targetCriteria, scheduledAt } = req.body;
  if (!name || !channels?.length) return res.status(400).json({ success: false, error: 'name and channels are required' });
  const tpl = syntheticTemplates.find(t => t._id === templateId);
  const newCampaign = {
    _id: `camp-${Date.now()}`, name, description,
    templateId, templateName: tpl?.name,
    channels, customMessage,
    targetCriteria: targetCriteria || { all: true },
    status: 'draft',
    scheduledAt,
    stats: { totalTargeted: 0, totalSent: 0, totalDelivered: 0, totalFailed: 0, totalRead: 0, openRate: 0 },
    createdByName: req.user?.name || 'Admin',
    createdAt: new Date().toISOString()
  };
  syntheticCampaigns.push(newCampaign);
  res.status(201).json({ success: true, data: newCampaign });
});

router.put('/admin/patient-engagement/campaigns/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const campaign = syntheticCampaigns.find(c => c._id === req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Not found' });
  if (!['draft', 'scheduled'].includes(campaign.status)) return res.status(400).json({ success: false, error: 'Can only edit draft or scheduled campaigns' });
  Object.assign(campaign, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: campaign });
});

router.post('/admin/patient-engagement/campaigns/:id/launch', protect, authorize('admin', 'superadmin'), (req, res) => {
  const campaign = syntheticCampaigns.find(c => c._id === req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Not found' });
  if (!['draft', 'scheduled'].includes(campaign.status)) return res.status(400).json({ success: false, error: 'Cannot launch campaign in current state' });
  const { store: synStore } = require('../data/syntheticData');
  const patients = synStore.patients.findAll();
  const now = new Date().toISOString();
  patients.forEach(patient => {
    syntheticPatientNotifications.push({
      _id: `pn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      patientId: patient.patientId, patientName: patient.name,
      patientEmail: patient.contactInfo?.email, patientPhone: patient.contactInfo?.phone,
      title: campaign.name,
      message: campaign.customMessage || `Dear ${patient.name}, ${campaign.description || 'you have a new notification from your healthcare provider.'}`,
      type: 'campaign', priority: 'normal', channels: campaign.channels,
      channelStatus: Object.fromEntries(campaign.channels.map(ch => [ch, { sent: true, sentAt: now }])),
      status: 'sent', campaignId: campaign._id, sentByName: req.user?.name || 'Admin',
      sentAt: now, createdAt: now
    });
  });
  campaign.status = 'completed';
  campaign.startedAt = now; campaign.completedAt = now;
  campaign.stats = { totalTargeted: patients.length, totalSent: patients.length, totalDelivered: patients.length, totalFailed: 0, totalRead: 0, openRate: 0 };
  res.json({ success: true, data: campaign });
});

router.post('/admin/patient-engagement/campaigns/:id/cancel', protect, authorize('admin', 'superadmin'), (req, res) => {
  const campaign = syntheticCampaigns.find(c => c._id === req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Not found' });
  campaign.status = 'cancelled';
  res.json({ success: true, data: campaign });
});

router.delete('/admin/patient-engagement/campaigns/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const idx = syntheticCampaigns.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
  if (!['draft', 'cancelled'].includes(syntheticCampaigns[idx].status)) return res.status(400).json({ success: false, error: 'Only draft or cancelled campaigns can be deleted' });
  syntheticCampaigns.splice(idx, 1);
  res.json({ success: true, message: 'Campaign deleted' });
});

function syntheticBuildChannelDelivery(channels, channelStatus) {
  return (channels || []).map(ch => {
    const cs = (channelStatus || {})[ch] || {};
    const isInApp = ch === 'in_app';
    const deliveredAt = cs.deliveredAt || (isInApp && cs.sent ? cs.sentAt : null) || null;
    return {
      channel: ch,
      sent: Boolean(cs.sent),
      sentAt: cs.sentAt || null,
      delivered: Boolean(cs.deliveredAt || (isInApp && cs.sent)),
      deliveredAt: deliveredAt || null,
      error: cs.error || null,
    };
  });
}

router.get('/admin/patient-engagement', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { status, type, patientId, relatedId, search, page = 0, limit = 15 } = req.query;
  let results = [...syntheticPatientNotifications];
  if (status && status !== 'all') results = results.filter(n => n.status === status);
  if (type && type !== 'all') results = results.filter(n => n.type === type);
  if (patientId) results = results.filter(n => n.patientId === patientId);
  if (relatedId) results = results.filter(n => n.relatedId === relatedId);
  if (search) { const q = search.toLowerCase(); results = results.filter(n => n.patientName?.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q)); }
  const total = results.length;
  results = results.slice(parseInt(page) * parseInt(limit), (parseInt(page) + 1) * parseInt(limit));
  results = results.map(n => ({ ...n, channelDelivery: syntheticBuildChannelDelivery(n.channels, n.channelStatus) }));
  const totalSent = syntheticPatientNotifications.filter(n => ['sent','delivered','read'].includes(n.status)).length;
  const totalDelivered = syntheticPatientNotifications.filter(n => ['delivered','read'].includes(n.status)).length;
  const totalPending = syntheticPatientNotifications.filter(n => n.status === 'pending').length;
  const totalFailed = syntheticPatientNotifications.filter(n => n.status === 'failed').length;
  res.json({ success: true, data: { notifications: results, total, stats: { totalSent, totalDelivered, totalPending, totalFailed } } });
});

router.get('/admin/patient-engagement/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const n = syntheticPatientNotifications.find(x => x._id === req.params.id);
  if (!n) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: { ...n, channelDelivery: syntheticBuildChannelDelivery(n.channels, n.channelStatus) } });
});

router.post('/admin/patient-engagement', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { patientId, title, message, type, priority, channels } = req.body;
  if (!patientId || !title || !message || !channels?.length) return res.status(400).json({ success: false, error: 'patientId, title, message, and channels are required' });
  const { store: synStore } = require('../data/syntheticData');
  const patient = synStore.patients.findOne({ patientId });
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const now = new Date().toISOString();
  const newNotif = {
    _id: `pn-${Date.now()}`,
    patientId, patientName: patient.name,
    patientEmail: patient.contactInfo?.email, patientPhone: patient.contactInfo?.phone,
    title, message, type: type || 'general', priority: priority || 'normal', channels,
    channelStatus: Object.fromEntries(channels.map(ch => [ch, { sent: true, sentAt: now }])),
    status: 'sent', sentByName: req.user?.name || 'Admin',
    sentAt: now, createdAt: now
  };
  syntheticPatientNotifications.push(newNotif);
  res.status(201).json({ success: true, data: newNotif });
});

router.post('/admin/patient-engagement/:id/resend', protect, authorize('admin', 'superadmin'), (req, res) => {
  const n = syntheticPatientNotifications.find(x => x._id === req.params.id);
  if (!n) return res.status(404).json({ success: false, error: 'Not found' });
  const now = new Date().toISOString();
  n.status = 'sent'; n.sentAt = now;
  (n.channels || []).forEach(ch => { if (n.channelStatus) n.channelStatus[ch] = { sent: true, sentAt: now }; });
  res.json({ success: true, data: n });
});

router.delete('/admin/patient-engagement/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const idx = syntheticPatientNotifications.findIndex(x => x._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
  syntheticPatientNotifications.splice(idx, 1);
  res.json({ success: true, message: 'Notification deleted' });
});

// Provider-facing patient engagement
router.get('/patient-engagement', protect, (req, res) => {
  const { status, type, patientId, page = 0, limit = 15 } = req.query;
  let results = [...syntheticPatientNotifications];
  if (status) results = results.filter(n => n.status === status);
  if (type) results = results.filter(n => n.type === type);
  if (patientId) results = results.filter(n => n.patientId === patientId);
  const total = results.length;
  results = results.slice(parseInt(page) * parseInt(limit), (parseInt(page) + 1) * parseInt(limit));
  res.json({ success: true, data: { notifications: results, total } });
});

router.get('/patient-engagement/templates', protect, (req, res) => {
  res.json({ success: true, data: syntheticTemplates.filter(t => t.isActive) });
});

router.post('/patient-engagement/send', protect, (req, res) => {
  const { patientId, title, message, channels, type, priority } = req.body;
  if (!patientId || !title || !message) return res.status(400).json({ success: false, error: 'patientId, title, and message are required' });
  const { store: synStore } = require('../data/syntheticData');
  const patient = synStore.patients.findOne({ patientId });
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const now = new Date().toISOString();
  const notif = {
    _id: `pn-${Date.now()}`,
    patientId, patientName: patient.name,
    patientEmail: patient.contactInfo?.email, patientPhone: patient.contactInfo?.phone,
    title, message, type: type || 'general', priority: priority || 'normal',
    channels: channels || ['in_app'],
    channelStatus: Object.fromEntries((channels || ['in_app']).map(ch => [ch, { sent: true, sentAt: now }])),
    status: 'sent', sentByName: req.user?.name || req.user?.email,
    sentAt: now, createdAt: now
  };
  syntheticPatientNotifications.push(notif);
  res.status(201).json({ success: true, data: notif });
});

// ---------------------------------------------------------------------------
// Ambient Clinical Intelligence routes (synthetic mode)
// ---------------------------------------------------------------------------

const syntheticAmbientSessions = [
  { _id: 'aci-001', sessionId: 'ACI-001', providerId: 'prov-001', providerName: 'Dr. John Smith', patientId: 'PT-100001', patientName: 'James Wilson', patientDOB: '1965-03-15', patientInsurance: 'Blue Cross Blue Shield', chiefComplaint: 'Chest pain and shortness of breath on exertion for 2 weeks', recordingDuration: 342, audioTranscript: 'Patient James Wilson is a 59-year-old male presenting with chest pain and shortness of breath on exertion for the past two weeks. Pain is described as pressure-like, 6 out of 10 in intensity, radiating to the left arm. Associated with mild diaphoresis. Denies rest pain, syncope, or palpitations. Past medical history significant for hypertension and hyperlipidemia. Current medications: lisinopril 10mg, atorvastatin 40mg. Family history positive for coronary artery disease. Patient is a former smoker, quit 10 years ago. Vitals: BP 148/92, HR 82, SpO2 97% on room air. EKG obtained showing no acute ST changes.', clinicalSummary: 'SUBJECTIVE: 59-year-old male with 2-week history of exertional chest pain and dyspnea. Pain is pressure-like (6/10), radiating to left arm, with mild diaphoresis. Denies rest symptoms. PMH: hypertension, hyperlipidemia. Meds: lisinopril 10mg, atorvastatin 40mg. FH: CAD. Former smoker.\n\nOBJECTIVE: BP 148/92, HR 82, SpO2 97% RA. EKG: no acute ST changes.\n\nASSESSMENT: Chest pain with features concerning for stable angina vs. ACS in high-risk patient. Differential includes unstable angina, GERD, musculoskeletal pain.\n\nPLAN: Urgent cardiology referral. Stress test ordered. Continue current medications. Patient counseled on warning signs requiring ED visit.', referralNoteDraft: 'Dear Cardiologist,\n\nI am urgently referring James Wilson (DOB: 03/15/1965, Insurance: Blue Cross Blue Shield) for evaluation of exertional chest pain and dyspnea.\n\nClinical Presentation: 59-year-old male with 2-week history of pressure-like chest pain (6/10) radiating to the left arm, with mild diaphoresis on exertion. No rest pain. EKG obtained showing no acute ST changes.\n\nRisk Factors: Hypertension, hyperlipidemia, former smoker, positive family history of CAD.\n\nCurrent Medications: Lisinopril 10mg daily, Atorvastatin 40mg daily.\n\nPlease evaluate for possible unstable angina or ACS. A stress test has been ordered.\n\nRespectfully,\nDr. John Smith\nCentral Health Clinic', urgencyClassification: 'urgent', urgencyReason: 'Exertional chest pain with multiple cardiac risk factors in 59-year-old male. EKG negative but clinical presentation warrants expedited cardiology evaluation within 1-2 weeks.', icdCodes: ['R07.9', 'I10', 'E78.5'], recommendedSpecialty: 'Cardiology', status: 'approved', approvedNote: 'Dear Cardiologist,\n\nI am urgently referring James Wilson (DOB: 03/15/1965, Insurance: Blue Cross Blue Shield) for evaluation of exertional chest pain and dyspnea.\n\nClinical Presentation: 59-year-old male with 2-week history of pressure-like chest pain (6/10) radiating to the left arm, with mild diaphoresis on exertion. No rest pain. EKG obtained showing no acute ST changes.\n\nRisk Factors: Hypertension, hyperlipidemia, former smoker, positive family history of CAD.\n\nCurrent Medications: Lisinopril 10mg daily, Atorvastatin 40mg daily.\n\nPlease evaluate for possible unstable angina or ACS. A stress test has been ordered.\n\nRespectfully,\nDr. John Smith\nCentral Health Clinic', reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-002', sessionId: 'ACI-002', providerId: 'prov-001', providerName: 'Dr. John Smith', patientId: 'PT-100002', patientName: 'Emily Rodriguez', patientDOB: '1978-07-22', patientInsurance: 'Aetna', chiefComplaint: 'Progressive joint pain and morning stiffness in hands and wrists for 3 months', recordingDuration: 278, audioTranscript: 'Emily Rodriguez is a 47-year-old female with 3-month history of progressive joint pain and morning stiffness lasting more than one hour, primarily affecting bilateral hands, wrists, and MCP joints. Reports fatigue and mild weight loss of 5 pounds. Denies skin rash, photosensitivity, or dry eyes. No trauma. Family history of rheumatoid arthritis in mother. ESR elevated at 48. RF pending.', clinicalSummary: 'SUBJECTIVE: 47-year-old female with 3-month history of bilateral hand, wrist, and MCP joint pain with morning stiffness >1 hour. Reports fatigue and 5-lb weight loss. FH: rheumatoid arthritis in mother.\n\nOBJECTIVE: ESR 48 (elevated). RF pending. Symmetric small joint involvement.\n\nASSESSMENT: Clinical picture consistent with early inflammatory arthritis, likely rheumatoid arthritis. Rule out psoriatic arthritis, lupus.\n\nPLAN: Urgent rheumatology referral. Order anti-CCP antibody, ANA, CMP. Initiate NSAIDs for symptom control pending specialist evaluation.', referralNoteDraft: 'Dear Rheumatologist,\n\nI am referring Emily Rodriguez (DOB: 07/22/1978, Insurance: Aetna) for evaluation of suspected inflammatory arthritis.\n\nClinical Presentation: 3-month history of bilateral hand, wrist, and MCP joint pain with morning stiffness exceeding 1 hour. Associated fatigue and 5-lb weight loss. Family history of RA in mother.\n\nLab Work: ESR 48, RF and anti-CCP pending.\n\nPlease evaluate for rheumatoid arthritis and initiate appropriate DMARD therapy if confirmed.\n\nRespectfully,\nDr. John Smith', urgencyClassification: 'urgent', urgencyReason: 'Progressive inflammatory arthritis with systemic symptoms. Early DMARD initiation within 3-6 months of symptom onset is critical to prevent joint destruction.', icdCodes: ['M06.9', 'M25.561', 'R53.83'], recommendedSpecialty: 'Rheumatology', status: 'submitted', approvedNote: 'Dear Rheumatologist,\n\nI am referring Emily Rodriguez (DOB: 07/22/1978, Insurance: Aetna) for evaluation of suspected inflammatory arthritis.\n\nClinical Presentation: 3-month history of bilateral hand, wrist, and MCP joint pain with morning stiffness exceeding 1 hour. Associated fatigue and 5-lb weight loss. Family history of RA in mother.\n\nLab Work: ESR 48, RF and anti-CCP pending.\n\nPlease evaluate for rheumatoid arthritis and initiate appropriate DMARD therapy if confirmed.\n\nRespectfully,\nDr. John Smith', linkedReferralId: 'REF-2026-0234', reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-003', sessionId: 'ACI-003', providerId: 'prov-002', providerName: 'Dr. Sarah Chen', patientId: 'PT-100003', patientName: 'Thomas Brown', patientDOB: '1958-11-04', patientInsurance: 'UnitedHealth', chiefComplaint: 'Sudden onset severe headache, worst of life, with neck stiffness', recordingDuration: 198, audioTranscript: 'Thomas Brown, 67-year-old male presenting with sudden onset severe headache he describes as the worst headache of his life. Onset approximately 2 hours ago. Associated neck stiffness and mild photophobia. Denies focal neurological symptoms or fever. No prior similar episodes. BP 172/104 on presentation. Alert and oriented but in significant distress.', clinicalSummary: 'SUBJECTIVE: 67-year-old male with sudden onset thunderclap headache, worst of life, 2 hours ago. Neck stiffness, mild photophobia. No focal neuro deficits. No fever. No prior episodes.\n\nOBJECTIVE: BP 172/104. Alert, oriented, significant distress. Neck stiffness present.\n\nASSESSMENT: EMERGENT — thunderclap headache with meningismus. Primary concern subarachnoid hemorrhage. Must rule out meningitis.\n\nPLAN: IMMEDIATE ED referral/transfer. CT head stat, LP if CT negative. Do not delay evaluation.', referralNoteDraft: 'EMERGENT REFERRAL\n\nPatient: Thomas Brown (DOB: 11/04/1958)\nInsurance: UnitedHealth\n\nREASON FOR EMERGENT REFERRAL: Thunderclap headache — worst headache of life with meningismus.\n\nClinical Details: 67-year-old male with sudden onset severe headache (worst of life) 2 hours ago, with neck stiffness and photophobia. BP 172/104. Alert and oriented but in significant distress. No focal neurological deficits noted.\n\nDIFFERENTIAL: Subarachnoid hemorrhage (primary concern), bacterial meningitis, hypertensive crisis.\n\nACTION REQUIRED: STAT CT head. LP if CT negative. Neurosurgery on standby.\n\nDr. Sarah Chen — EMERGENT', urgencyClassification: 'emergent', urgencyReason: 'Thunderclap headache with meningismus in 67-year-old is subarachnoid hemorrhage until proven otherwise. This is a neurological emergency requiring immediate CT imaging and neurosurgical evaluation.', icdCodes: ['R51.9', 'I60.9', 'G03.9'], recommendedSpecialty: 'Neurosurgery', status: 'approved', approvedNote: 'EMERGENT REFERRAL\n\nPatient: Thomas Brown (DOB: 11/04/1958)\nInsurance: UnitedHealth\n\nREASON FOR EMERGENT REFERRAL: Thunderclap headache with meningismus.\n\nClinical Details: 67-year-old male with sudden onset severe headache (worst of life) 2 hours ago, neck stiffness, photophobia. BP 172/104. No focal neuro deficits.\n\nDIFFERENTIAL: Subarachnoid hemorrhage (primary concern), bacterial meningitis, hypertensive crisis.\n\nACTION REQUIRED: STAT CT head, LP if CT negative. Neurosurgery on standby.\n\nDr. Sarah Chen — EMERGENT', reviewedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-004', sessionId: 'ACI-004', providerId: 'prov-001', providerName: 'Dr. John Smith', patientId: 'PT-100004', patientName: 'Maria Garcia', patientDOB: '1972-05-18', patientInsurance: 'Cigna', chiefComplaint: 'Type 2 diabetes management — worsening glycemic control', recordingDuration: 415, audioTranscript: 'Maria Garcia, 54-year-old female, established patient for type 2 diabetes follow-up. HbA1c today is 9.2%, up from 7.8% six months ago. Patient reports poor dietary compliance, increased stress at work, and inconsistent medication adherence. Currently on metformin 1000mg BID and glipizide 10mg BID. BMI 32. Reports no hypoglycemic episodes. Mild peripheral neuropathy noted. Microalbuminuria present on last UA. BP 138/86.', clinicalSummary: 'SUBJECTIVE: 54-year-old female with T2DM, worsening glycemic control. HbA1c 9.2% (up from 7.8%). Reports dietary non-compliance, work stress, inconsistent medication adherence. On metformin 1000mg BID + glipizide 10mg BID.\n\nOBJECTIVE: BMI 32, BP 138/86. HbA1c 9.2%. Microalbuminuria present. Mild peripheral neuropathy.\n\nASSESSMENT: Poorly controlled T2DM with early nephropathy and peripheral neuropathy. Medication regimen optimization needed.\n\nPLAN: Refer to endocrinology for regimen intensification. Consider SGLT-2 inhibitor or GLP-1 agonist. Diabetes education referral. Increase ACE inhibitor dose.', referralNoteDraft: 'Dear Endocrinologist,\n\nI am referring Maria Garcia (DOB: 05/18/1972, Insurance: Cigna) for management of poorly controlled Type 2 Diabetes Mellitus.\n\nCurrent Status: HbA1c 9.2% (increased from 7.8% six months ago). BMI 32. BP 138/86.\n\nComplications: Early diabetic nephropathy (microalbuminuria), mild peripheral neuropathy.\n\nCurrent Regimen: Metformin 1000mg BID, Glipizide 10mg BID.\n\nGoals: Achieve HbA1c < 7%. Consider advanced therapy (SGLT-2 inhibitor, GLP-1 agonist). Prevent further microvascular complications.\n\nRespectfully,\nDr. John Smith', urgencyClassification: 'routine', urgencyReason: 'Stable but poorly controlled diabetes with early complications. Endocrinology evaluation within 4-6 weeks recommended.', icdCodes: ['E11.65', 'E11.40', 'N18.2'], recommendedSpecialty: 'Endocrinology', status: 'approved', approvedNote: 'Dear Endocrinologist,\n\nI am referring Maria Garcia (DOB: 05/18/1972, Insurance: Cigna) for management of poorly controlled Type 2 Diabetes Mellitus.\n\nCurrent Status: HbA1c 9.2% (increased from 7.8% six months ago). BMI 32. BP 138/86.\n\nComplications: Early diabetic nephropathy (microalbuminuria), mild peripheral neuropathy.\n\nCurrent Regimen: Metformin 1000mg BID, Glipizide 10mg BID.\n\nGoals: Achieve HbA1c < 7%. Consider advanced therapy (SGLT-2 inhibitor, GLP-1 agonist).\n\nRespectfully,\nDr. John Smith', reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-005', sessionId: 'ACI-005', providerId: 'prov-001', providerName: 'Dr. John Smith', patientId: 'PT-100005', patientName: 'David Lee', patientDOB: '1980-09-30', patientInsurance: 'Medicare', chiefComplaint: 'Blurred vision and eye pain in right eye for 5 days', recordingDuration: 223, audioTranscript: 'David Lee, 45-year-old male presenting with 5 days of blurred vision and aching eye pain in the right eye. Reports seeing halos around lights. No trauma. No prior eye problems. No headache. Fundoscopic exam limited in office — IOP not measured here. Denies diabetes or hypertension.', clinicalSummary: 'SUBJECTIVE: 45-year-old male with 5-day history of blurred vision, right eye pain, and halos. No trauma. No significant PMH.\n\nOBJECTIVE: Fundoscopic exam limited. IOP not measured.\n\nASSESSMENT: Right eye pain with halos concerning for acute angle-closure glaucoma. Ophthalmology evaluation urgently needed.\n\nPLAN: Urgent ophthalmology referral today. Patient instructed to go to ED if vision worsens acutely.', referralNoteDraft: 'Dear Ophthalmologist,\n\nI am urgently referring David Lee (DOB: 09/30/1980, Insurance: Medicare) for evaluation of right eye pain and blurred vision.\n\nClinical Presentation: 45-year-old male with 5-day history of unilateral right eye pain, blurred vision, and halos around lights. No trauma. No prior ocular history.\n\nConcern: Clinical presentation consistent with possible acute angle-closure glaucoma. IOP could not be measured in primary care setting.\n\nPlease evaluate urgently. Patient counseled to present to ED if symptoms acutely worsen.\n\nRespectfully,\nDr. John Smith', urgencyClassification: 'urgent', urgencyReason: 'Halos with unilateral eye pain in the absence of trauma raises concern for acute angle-closure glaucoma, which can cause permanent vision loss within hours without treatment.', icdCodes: ['H40.20', 'H57.10'], recommendedSpecialty: 'Ophthalmology', status: 'reviewing', reviewedAt: null, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-006', sessionId: 'ACI-006', providerId: 'prov-002', providerName: 'Dr. Sarah Chen', patientId: 'PT-100001', patientName: 'James Wilson', patientDOB: '1965-03-15', patientInsurance: 'Blue Cross Blue Shield', chiefComplaint: 'Right knee pain and swelling after fall 3 days ago', recordingDuration: 189, audioTranscript: 'James Wilson returning for right knee injury sustained in a fall 3 days ago. Significant swelling noted, difficulty weight bearing. X-ray obtained showing no fracture but significant effusion. ROM limited to 90 degrees flexion due to pain and swelling. Ligament stability testing difficult due to guarding.', clinicalSummary: 'SUBJECTIVE: 59-year-old male with right knee pain and swelling following fall 3 days ago. Difficulty weight bearing.\n\nOBJECTIVE: Significant effusion. ROM 0-90 degrees. X-ray: no fracture, moderate effusion. Ligament testing limited.\n\nASSESSMENT: Right knee injury with effusion — likely meniscal tear or ligament injury. Fracture excluded by X-ray.\n\nPLAN: Orthopedic referral for further evaluation and possible MRI. Knee immobilizer, crutches, ice, elevation.', referralNoteDraft: 'Dear Orthopedic Surgeon,\n\nI am referring James Wilson (DOB: 03/15/1965) for evaluation of right knee injury with significant effusion.\n\nMechanism: Fall 3 days ago. X-ray negative for fracture. Moderate effusion. ROM limited to 90 degrees. Ligament stability not assessable due to guarding and effusion.\n\nPlease evaluate for possible meniscal tear or ligamentous injury. MRI may be indicated.\n\nRespectfully,\nDr. Sarah Chen', urgencyClassification: 'routine', urgencyReason: 'Knee effusion with functional limitation but no fracture. Orthopedic evaluation within 1-2 weeks recommended.', icdCodes: ['S83.90', 'M25.361'], recommendedSpecialty: 'Orthopedic Surgery', status: 'approved', approvedNote: 'Dear Orthopedic Surgeon,\n\nI am referring James Wilson (DOB: 03/15/1965) for evaluation of right knee injury with significant effusion.\n\nMechanism: Fall 3 days ago. X-ray negative for fracture. Moderate effusion. ROM limited to 90 degrees. Ligament stability not assessable.\n\nPlease evaluate for possible meniscal tear or ligamentous injury. MRI may be indicated.\n\nRespectfully,\nDr. Sarah Chen', reviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-007', sessionId: 'ACI-007', providerId: 'prov-001', providerName: 'Dr. John Smith', patientId: 'PT-100002', patientName: 'Emily Rodriguez', patientDOB: '1978-07-22', patientInsurance: 'Aetna', chiefComplaint: 'Persistent abdominal pain and bloating, worse after eating', recordingDuration: 305, audioTranscript: 'Emily Rodriguez presenting with 6-week history of epigastric pain and bloating, worse after eating, associated with early satiety and occasional nausea. No vomiting, diarrhea, or bloody stools. Weight stable. No NSAIDs. H. pylori breath test pending. Patient is anxious about the symptoms.', clinicalSummary: 'SUBJECTIVE: 47-year-old female with 6-week history of epigastric pain, bloating, early satiety, nausea. No alarm features. H. pylori breath test pending.\n\nOBJECTIVE: Epigastric tenderness on palpation. No guarding, rigidity, or organomegaly.\n\nASSESSMENT: Dyspepsia — functional vs. organic. Rule out H. pylori, peptic ulcer, GERD. No alarm features currently.\n\nPLAN: Await H. pylori results. Gastroenterology referral for EGD if symptoms persist or H. pylori positive.', referralNoteDraft: 'Dear Gastroenterologist,\n\nI am referring Emily Rodriguez (DOB: 07/22/1978, Insurance: Aetna) for evaluation of persistent dyspepsia.\n\nClinical Presentation: 6-week history of epigastric pain, bloating, early satiety, and nausea. No alarm features (no weight loss, dysphagia, GI bleeding, vomiting). H. pylori breath test pending.\n\nPlease consider endoscopic evaluation if symptoms persist or H. pylori testing is positive.\n\nRespectfully,\nDr. John Smith', urgencyClassification: 'routine', urgencyReason: 'Dyspepsia without alarm features. Gastroenterology evaluation within 4-6 weeks. Expedite if H. pylori positive.', icdCodes: ['K30', 'K21.0'], recommendedSpecialty: 'Gastroenterology', status: 'draft', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-008', sessionId: 'ACI-008', providerId: 'prov-001', providerName: 'Dr. John Smith', patientId: 'PT-100003', patientName: 'Thomas Brown', patientDOB: '1958-11-04', patientInsurance: 'UnitedHealth', chiefComplaint: 'Follow-up for hypertension — blood pressure poorly controlled', recordingDuration: 267, audioTranscript: 'Thomas Brown, 67-year-old male, hypertension follow-up. BP today 164/98 despite being on amlodipine 10mg and metoprolol 50mg BID. Patient reports intermittent medication compliance. No chest pain, headache, vision changes. No signs of end-organ damage today. Creatinine 1.4 and GFR 52 on last labs from 3 months ago.', clinicalSummary: 'SUBJECTIVE: 67-year-old male with poorly controlled hypertension on amlodipine 10mg + metoprolol 50mg BID. Intermittent medication compliance. No symptoms of end-organ damage.\n\nOBJECTIVE: BP 164/98. Creatinine 1.4, GFR 52 (CKD Stage 3).\n\nASSESSMENT: Resistant hypertension with CKD Stage 3. Compliance issues. May need regimen optimization.\n\nPLAN: Cardiology/nephrology referral for resistant HTN management. Add ACE inhibitor for renoprotection. Reinforce medication adherence.', referralNoteDraft: 'Dear Nephrologist/Cardiologist,\n\nI am referring Thomas Brown (DOB: 11/04/1958, Insurance: UnitedHealth) for evaluation of resistant hypertension with CKD.\n\nCurrent Status: BP 164/98 despite amlodipine 10mg + metoprolol 50mg BID. Creatinine 1.4, GFR 52 (CKD Stage 3). Intermittent compliance reported.\n\nPlease evaluate for secondary causes of hypertension and optimize antihypertensive regimen with renoprotection in mind.\n\nRespectfully,\nDr. John Smith', urgencyClassification: 'routine', urgencyReason: 'Poorly controlled hypertension with CKD. Stable, no acute end-organ damage. Referral within 3-4 weeks.', icdCodes: ['I10', 'N18.3', 'Z87.39'], recommendedSpecialty: 'Nephrology', status: 'approved', approvedNote: 'Dear Nephrologist,\n\nI am referring Thomas Brown (DOB: 11/04/1958, Insurance: UnitedHealth) for evaluation of resistant hypertension with CKD Stage 3.\n\nCurrent Status: BP 164/98 on dual antihypertensive therapy. GFR 52, Creatinine 1.4. Intermittent compliance.\n\nPlease evaluate for secondary causes and optimize regimen with renoprotection.\n\nRespectfully,\nDr. John Smith', reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-009', sessionId: 'ACI-009', providerId: 'prov-002', providerName: 'Dr. Sarah Chen', patientId: 'PT-100004', patientName: 'Maria Garcia', patientDOB: '1972-05-18', patientInsurance: 'Cigna', chiefComplaint: 'Skin rash on torso, pruritic, present for 2 weeks', recordingDuration: 142, audioTranscript: 'Maria Garcia presenting with a 2-week history of pruritic erythematous rash on the torso. No fever. Not taking new medications. No contact with new soaps or detergents. Rash appears urticarial. No angioedema. No dyspnea.', clinicalSummary: 'SUBJECTIVE: 54-year-old female with 2-week pruritic urticarial rash on torso. No new medications, no contactants, afebrile. No angioedema or systemic involvement.\n\nOBJECTIVE: Erythematous urticarial plaques on torso. No angioedema.\n\nASSESSMENT: Chronic urticaria — likely idiopathic. Rule out allergic cause.\n\nPLAN: Allergy/immunology referral if no response to antihistamines. Start cetirizine 10mg daily.', referralNoteDraft: 'Dear Allergist/Dermatologist,\n\nI am referring Maria Garcia (DOB: 05/18/1972, Insurance: Cigna) for evaluation of chronic urticaria.\n\nClinical Presentation: 2-week history of pruritic urticarial rash on torso without identifiable trigger. No angioedema or systemic involvement. No new medications.\n\nStarted on cetirizine 10mg daily. Please evaluate for underlying allergic or autoimmune cause if not responding.\n\nRespectfully,\nDr. Sarah Chen', urgencyClassification: 'routine', urgencyReason: 'Chronic urticaria without systemic involvement or angioedema. Routine allergy/dermatology evaluation.', icdCodes: ['L50.9', 'L29.9'], recommendedSpecialty: 'Allergy & Immunology', status: 'rejected', reviewedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
  { _id: 'aci-010', sessionId: 'ACI-010', providerId: 'prov-001', providerName: 'Dr. John Smith', patientId: 'PT-100005', patientName: 'David Lee', patientDOB: '1980-09-30', patientInsurance: 'Medicare', chiefComplaint: 'Chronic low back pain, worsening over 6 months, radiating to left leg', recordingDuration: 389, audioTranscript: 'David Lee, 45-year-old male, presenting with 6-month history of worsening low back pain with radiation to the left leg along the L4-L5 distribution. Pain is 7 out of 10 at worst. Describes as sharp and burning. Positive straight leg raise at 45 degrees on left. MRI lumbar spine from 2 months ago showing L4-L5 disc herniation with moderate left foraminal stenosis. Tried NSAIDs and physical therapy with minimal relief.', clinicalSummary: 'SUBJECTIVE: 45-year-old male with 6-month worsening LBP radiating to left leg (L4-L5 distribution), 7/10 pain, sharp and burning. Failed NSAIDs and PT.\n\nOBJECTIVE: Positive SLR 45 degrees left. MRI: L4-L5 disc herniation, moderate left foraminal stenosis.\n\nASSESSMENT: L4-L5 radiculopathy with disc herniation and foraminal stenosis, refractory to conservative management.\n\nPLAN: Neurosurgery referral for surgical evaluation. Consider epidural steroid injection as bridge.', referralNoteDraft: 'Dear Neurosurgeon,\n\nI am referring David Lee (DOB: 09/30/1980, Insurance: Medicare) for evaluation of L4-L5 radiculopathy refractory to conservative treatment.\n\nClinical Presentation: 6-month history of LBP with left leg radiculopathy (L4-L5 distribution). MRI demonstrates L4-L5 disc herniation with moderate left foraminal stenosis. Positive SLR at 45 degrees left. Failed 6 weeks of PT and NSAIDs.\n\nPlease evaluate for surgical candidacy. Patient is functionally impaired.\n\nRespectfully,\nDr. John Smith', urgencyClassification: 'routine', urgencyReason: 'Radiculopathy with anatomic correlation on MRI, refractory to conservative care. Surgical evaluation within 3-4 weeks.', icdCodes: ['M51.16', 'M54.42', 'M47.816'], recommendedSpecialty: 'Neurosurgery', status: 'submitted', approvedNote: 'Dear Neurosurgeon,\n\nI am referring David Lee (DOB: 09/30/1980, Insurance: Medicare) for evaluation of L4-L5 radiculopathy refractory to conservative treatment.\n\nMRI demonstrates L4-L5 disc herniation with moderate left foraminal stenosis. Positive SLR at 45 degrees left. Failed PT and NSAIDs x 6 weeks.\n\nPlease evaluate for surgical candidacy.\n\nRespectfully,\nDr. John Smith', linkedReferralId: 'REF-2026-0290', reviewedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
];

// ── Admin: Ambient Sessions ───────────────────────────────────────────────────

router.get('/admin/ambient-sessions/stats', protect, authorize('admin', 'superadmin'), (req, res) => {
  const total = syntheticAmbientSessions.length;
  const byStatus = {};
  const byUrgency = {};
  let totalDuration = 0;
  syntheticAmbientSessions.forEach(s => {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byUrgency[s.urgencyClassification] = (byUrgency[s.urgencyClassification] || 0) + 1;
    totalDuration += s.recordingDuration || 0;
  });
  const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
  const topProviders = Object.entries(
    syntheticAmbientSessions.reduce((acc, s) => { acc[s.providerName] = (acc[s.providerName] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  res.json({ success: true, data: { total, byStatus, byUrgency, avgDuration, topProviders } });
});

router.get('/admin/ambient-sessions', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { status, urgency, search, page = 1, limit = 15 } = req.query;
  let results = [...syntheticAmbientSessions];
  if (status && status !== 'all') results = results.filter(s => s.status === status);
  if (urgency && urgency !== 'all') results = results.filter(s => s.urgencyClassification === urgency);
  if (search) { const q = search.toLowerCase(); results = results.filter(s => s.patientName?.toLowerCase().includes(q) || s.chiefComplaint?.toLowerCase().includes(q) || s.providerName?.toLowerCase().includes(q)); }
  const total = results.length;
  const p = parseInt(page); const l = parseInt(limit);
  results = results.slice((p - 1) * l, p * l);
  res.json({ success: true, data: { sessions: results, total, page: p, limit: l } });
});

router.get('/admin/ambient-sessions/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const session = syntheticAmbientSessions.find(s => s._id === req.params.id || s.sessionId === req.params.id);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, data: session });
});

router.put('/admin/ambient-sessions/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const session = syntheticAmbientSessions.find(s => s._id === req.params.id);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  Object.assign(session, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: session });
});

router.delete('/admin/ambient-sessions/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const idx = syntheticAmbientSessions.findIndex(s => s._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Session not found' });
  syntheticAmbientSessions.splice(idx, 1);
  res.json({ success: true, message: 'Session deleted' });
});

// ── Provider: Ambient Sessions ────────────────────────────────────────────────

router.get('/ambient-sessions/stats', protect, (req, res) => {
  const provSessions = syntheticAmbientSessions.filter(s => s.providerId === req.user?.providerId || true); // in synthetic mode show all
  const byStatus = {};
  const byUrgency = {};
  let totalDuration = 0;
  provSessions.forEach(s => {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byUrgency[s.urgencyClassification] = (byUrgency[s.urgencyClassification] || 0) + 1;
    totalDuration += s.recordingDuration || 0;
  });
  res.json({ success: true, data: { total: provSessions.length, byStatus, byUrgency, avgDuration: provSessions.length > 0 ? Math.round(totalDuration / provSessions.length) : 0 } });
});

router.get('/ambient-sessions', protect, (req, res) => {
  const { status, urgency, page = 1, limit = 15 } = req.query;
  let results = [...syntheticAmbientSessions];
  if (status && status !== 'all') results = results.filter(s => s.status === status);
  if (urgency && urgency !== 'all') results = results.filter(s => s.urgencyClassification === urgency);
  const total = results.length;
  const p = parseInt(page); const l = parseInt(limit);
  results = results.slice((p - 1) * l, p * l);
  res.json({ success: true, data: { sessions: results, total, page: p, limit: l } });
});

router.get('/ambient-sessions/:id', protect, (req, res) => {
  const session = syntheticAmbientSessions.find(s => s._id === req.params.id || s.sessionId === req.params.id);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, data: session });
});

router.post('/ambient-sessions', protect, (req, res) => {
  const { patientId, patientName, patientDOB, patientInsurance, chiefComplaint, audioTranscript, recordingDuration } = req.body;
  if (!patientId || !patientName || !chiefComplaint) return res.status(400).json({ success: false, error: 'patientId, patientName, and chiefComplaint are required' });
  const now = new Date().toISOString();
  const newSession = {
    _id: `aci-${Date.now()}`,
    sessionId: `ACI-${Date.now()}`,
    providerId: req.user?._id || 'prov-001',
    providerName: req.user?.name || req.user?.email || 'Dr. Provider',
    patientId, patientName, patientDOB, patientInsurance, chiefComplaint,
    recordingDuration: recordingDuration || 0,
    audioTranscript: audioTranscript || '',
    clinicalSummary: `SUBJECTIVE: Patient presents with chief complaint of ${chiefComplaint}. History as described in transcript.\n\nOBJECTIVE: Examination findings documented during encounter.\n\nASSESSMENT: Based on history and examination, clinical impression pending specialist evaluation.\n\nPLAN: Specialist referral initiated. Patient counseled on warning signs.`,
    referralNoteDraft: `Dear Specialist,\n\nI am referring ${patientName} for evaluation of ${chiefComplaint}.\n\nClinical Presentation: Patient presents with ${chiefComplaint}. Full clinical details as documented in chart.\n\nPlease evaluate and advise on further management.\n\nRespectfully,\n${req.user?.name || 'Provider'}`,
    urgencyClassification: 'routine',
    urgencyReason: 'Stable presentation. Specialist evaluation recommended.',
    icdCodes: ['Z00.00'],
    recommendedSpecialty: 'Internal Medicine',
    status: 'reviewing',
    createdAt: now, updatedAt: now
  };
  syntheticAmbientSessions.push(newSession);
  res.status(201).json({ success: true, data: newSession });
});

router.put('/ambient-sessions/:id/review', protect, (req, res) => {
  const session = syntheticAmbientSessions.find(s => s._id === req.params.id || s.sessionId === req.params.id);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  const { action, approvedNote, urgencyClassification } = req.body;
  const now = new Date().toISOString();
  if (action === 'approve') {
    session.status = 'approved';
    session.approvedNote = approvedNote || session.referralNoteDraft;
    if (urgencyClassification) session.urgencyClassification = urgencyClassification;
    session.reviewedAt = now;
  } else if (action === 'reject') {
    session.status = 'rejected';
    session.reviewedAt = now;
  }
  session.updatedAt = now;
  res.json({ success: true, data: session });
});

router.put('/ambient-sessions/:id', protect, (req, res) => {
  const session = syntheticAmbientSessions.find(s => s._id === req.params.id);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  Object.assign(session, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: session });
});

router.post('/ambient-sessions/:id/reprocess', protect, (req, res) => {
  const session = syntheticAmbientSessions.find(s => s._id === req.params.id);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  session.status = 'reviewing';
  session.updatedAt = new Date().toISOString();
  res.json({ success: true, data: session });
});

router.delete('/ambient-sessions/:id', protect, (req, res) => {
  const idx = syntheticAmbientSessions.findIndex(s => s._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Session not found' });
  if (!['draft', 'rejected'].includes(syntheticAmbientSessions[idx].status)) {
    return res.status(400).json({ success: false, error: 'Can only delete draft or rejected sessions' });
  }
  syntheticAmbientSessions.splice(idx, 1);
  res.json({ success: true, message: 'Session deleted' });
});

// ---------------------------------------------------------------------------
// AI Referral Matching routes (synthetic mode)
// ---------------------------------------------------------------------------

const syntheticProviderProfiles = [
  { _id: 'mp001', providerName: 'Dr. Sarah Chen', email: 'sarah.chen@atlantahealth.com', specialty: 'Cardiology', subSpecialties: ['Interventional Cardiology', 'Heart Failure'], acceptedInsurance: ['Blue Cross Blue Shield', 'Aetna', 'United Healthcare', 'Medicare'], city: 'Atlanta', state: 'GA', zipCode: '30301', organizationName: 'Atlanta Heart Center', acceptanceRate: 0.92, avgResponseTimeDays: 1, totalReferralsReceived: 320, completedReferrals: 295, activeReferrals: 12, tokenBalance: 1850, tokenEarned: 4200, availabilityScore: 88, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English', 'Mandarin'], yearsInPractice: 14, boardCertified: true, telehealth: true },
  { _id: 'mp002', providerName: 'Dr. James Okonkwo', email: 'james.okonkwo@bostonneuro.com', specialty: 'Neurology', subSpecialties: ['Epilepsy', 'Movement Disorders'], acceptedInsurance: ['Cigna', 'Humana', 'Medicare', 'Medicaid', 'Anthem'], city: 'Boston', state: 'MA', zipCode: '02101', organizationName: 'Boston Neuroscience Institute', acceptanceRate: 0.87, avgResponseTimeDays: 2, totalReferralsReceived: 215, completedReferrals: 187, activeReferrals: 8, tokenBalance: 1200, tokenEarned: 2800, availabilityScore: 75, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English', 'Igbo'], yearsInPractice: 11, boardCertified: true, telehealth: false },
  { _id: 'mp003', providerName: 'Dr. Maria Gonzalez', email: 'maria.gonzalez@chicagoortho.com', specialty: 'Orthopedics', subSpecialties: ['Sports Medicine', 'Joint Replacement'], acceptedInsurance: ['Blue Cross Blue Shield', 'United Healthcare', 'Cigna', 'Kaiser Permanente'], city: 'Chicago', state: 'IL', zipCode: '60601', organizationName: 'Chicago Orthopedic Group', acceptanceRate: 0.95, avgResponseTimeDays: 1, totalReferralsReceived: 410, completedReferrals: 389, activeReferrals: 15, tokenBalance: 2200, tokenEarned: 5000, availabilityScore: 92, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English', 'Spanish'], yearsInPractice: 18, boardCertified: true, telehealth: true },
  { _id: 'mp004', providerName: 'Dr. Robert Kim', email: 'robert.kim@dallasgi.com', specialty: 'Gastroenterology', subSpecialties: ['Endoscopy', 'Hepatology'], acceptedInsurance: ['Aetna', 'Humana', 'Medicare', 'WellCare'], city: 'Dallas', state: 'TX', zipCode: '75201', organizationName: 'Dallas GI Associates', acceptanceRate: 0.89, avgResponseTimeDays: 3, totalReferralsReceived: 175, completedReferrals: 156, activeReferrals: 6, tokenBalance: 780, tokenEarned: 1900, availabilityScore: 82, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English', 'Korean'], yearsInPractice: 9, boardCertified: true, telehealth: false },
  { _id: 'mp005', providerName: 'Dr. Angela White', email: 'angela.white@phoenixendo.com', specialty: 'Endocrinology', subSpecialties: ['Diabetes Management', 'Thyroid'], acceptedInsurance: ['Blue Cross Blue Shield', 'United Healthcare', 'Anthem', 'Kaiser Permanente'], city: 'Phoenix', state: 'AZ', zipCode: '85001', organizationName: 'Phoenix Endocrine Center', acceptanceRate: 0.93, avgResponseTimeDays: 2, totalReferralsReceived: 290, completedReferrals: 270, activeReferrals: 10, tokenBalance: 1650, tokenEarned: 3600, availabilityScore: 85, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English'], yearsInPractice: 13, boardCertified: true, telehealth: true },
  { _id: 'mp006', providerName: 'Dr. David Park', email: 'david.park@nyoncology.com', specialty: 'Oncology', subSpecialties: ['Medical Oncology', 'Hematology'], acceptedInsurance: ['Aetna', 'United Healthcare', 'Medicare', 'Cigna', 'Anthem'], city: 'New York', state: 'NY', zipCode: '10001', organizationName: 'NY Cancer Institute', acceptanceRate: 0.78, avgResponseTimeDays: 4, totalReferralsReceived: 380, completedReferrals: 296, activeReferrals: 22, tokenBalance: 950, tokenEarned: 2200, availabilityScore: 60, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English', 'Korean'], yearsInPractice: 16, boardCertified: true, telehealth: false },
  { _id: 'mp007', providerName: 'Dr. Linda Torres', email: 'linda.torres@lapulm.com', specialty: 'Pulmonology', subSpecialties: ['Critical Care', 'Sleep Medicine'], acceptedInsurance: ['Blue Cross Blue Shield', 'Humana', 'Medicaid', 'WellCare'], city: 'Los Angeles', state: 'CA', zipCode: '90001', organizationName: 'LA Pulmonary Specialists', acceptanceRate: 0.84, avgResponseTimeDays: 2, totalReferralsReceived: 142, completedReferrals: 119, activeReferrals: 5, tokenBalance: 620, tokenEarned: 1400, availabilityScore: 79, networkParticipation: false, isAcceptingReferrals: true, languagesSpoken: ['English', 'Spanish'], yearsInPractice: 8, boardCertified: true, telehealth: true },
  { _id: 'mp008', providerName: 'Dr. Michael Johnson', email: 'michael.johnson@houstonrheum.com', specialty: 'Rheumatology', subSpecialties: ['Autoimmune', 'Immunology'], acceptedInsurance: ['Cigna', 'United Healthcare', 'Medicare', 'Anthem'], city: 'Houston', state: 'TX', zipCode: '77001', organizationName: 'Houston Rheumatology Center', acceptanceRate: 0.91, avgResponseTimeDays: 3, totalReferralsReceived: 198, completedReferrals: 180, activeReferrals: 9, tokenBalance: 1100, tokenEarned: 2500, availabilityScore: 83, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English'], yearsInPractice: 12, boardCertified: true, telehealth: false },
  { _id: 'mp009', providerName: 'Dr. Rachel Brown', email: 'rachel.brown@miamiderm.com', specialty: 'Dermatology', subSpecialties: ['Mohs Surgery'], acceptedInsurance: ['Aetna', 'Blue Cross Blue Shield', 'United Healthcare', 'Cigna', 'Humana'], city: 'Miami', state: 'FL', zipCode: '33101', organizationName: 'Miami Dermatology Associates', acceptanceRate: 0.97, avgResponseTimeDays: 1, totalReferralsReceived: 445, completedReferrals: 432, activeReferrals: 8, tokenBalance: 2450, tokenEarned: 5000, availabilityScore: 95, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English', 'Spanish'], yearsInPractice: 20, boardCertified: true, telehealth: true },
  { _id: 'mp010', providerName: 'Dr. Steven Lee', email: 'steven.lee@seattlenephro.com', specialty: 'Nephrology', subSpecialties: ['Dialysis', 'Renal'], acceptedInsurance: ['Medicare', 'Medicaid', 'Humana', 'WellCare'], city: 'Seattle', state: 'WA', zipCode: '98101', organizationName: 'Seattle Kidney Center', acceptanceRate: 0.86, avgResponseTimeDays: 2, totalReferralsReceived: 167, completedReferrals: 144, activeReferrals: 7, tokenBalance: 840, tokenEarned: 1950, availabilityScore: 77, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English', 'Korean'], yearsInPractice: 10, boardCertified: true, telehealth: false },
  { _id: 'mp011', providerName: 'Dr. Patricia Davis', email: 'patricia.davis@atlantacardio2.com', specialty: 'Cardiology', subSpecialties: ['Electrophysiology', 'Cardiac Surgery'], acceptedInsurance: ['Blue Cross Blue Shield', 'Cigna', 'Anthem', 'Medicare'], city: 'Atlanta', state: 'GA', zipCode: '30302', organizationName: 'Emory Heart & Vascular', acceptanceRate: 0.88, avgResponseTimeDays: 2, totalReferralsReceived: 255, completedReferrals: 224, activeReferrals: 14, tokenBalance: 1350, tokenEarned: 3100, availabilityScore: 80, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English'], yearsInPractice: 15, boardCertified: true, telehealth: false },
  { _id: 'mp012', providerName: 'Dr. Thomas Wilson', email: 'thomas.wilson@chicagourology.com', specialty: 'Urology', subSpecialties: ['Urological Surgery'], acceptedInsurance: ['Aetna', 'United Healthcare', 'Blue Cross Blue Shield', 'Humana'], city: 'Chicago', state: 'IL', zipCode: '60602', organizationName: 'Chicago Urology Partners', acceptanceRate: 0.90, avgResponseTimeDays: 2, totalReferralsReceived: 189, completedReferrals: 170, activeReferrals: 7, tokenBalance: 980, tokenEarned: 2300, availabilityScore: 84, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English'], yearsInPractice: 11, boardCertified: true, telehealth: true },
  { _id: 'mp013', providerName: 'Dr. Jennifer Martinez', email: 'jennifer.martinez@nyptych.com', specialty: 'Psychiatry', subSpecialties: ['Mental Health', 'Psychology'], acceptedInsurance: ['Cigna', 'Aetna', 'Medicaid', 'WellCare', 'Anthem'], city: 'New York', state: 'NY', zipCode: '10002', organizationName: 'NY Behavioral Health Institute', acceptanceRate: 0.82, avgResponseTimeDays: 3, totalReferralsReceived: 312, completedReferrals: 256, activeReferrals: 18, tokenBalance: 730, tokenEarned: 1700, availabilityScore: 71, networkParticipation: false, isAcceptingReferrals: true, languagesSpoken: ['English', 'Spanish'], yearsInPractice: 9, boardCertified: true, telehealth: true },
  { _id: 'mp014', providerName: 'Dr. Christopher Anderson', email: 'christopher.anderson@dallasallergy.com', specialty: 'Allergy', subSpecialties: ['Allergy & Immunology'], acceptedInsurance: ['Blue Cross Blue Shield', 'United Healthcare', 'Aetna', 'Kaiser Permanente'], city: 'Dallas', state: 'TX', zipCode: '75202', organizationName: 'Dallas Allergy & Asthma Center', acceptanceRate: 0.94, avgResponseTimeDays: 1, totalReferralsReceived: 228, completedReferrals: 214, activeReferrals: 6, tokenBalance: 1420, tokenEarned: 3300, availabilityScore: 90, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English'], yearsInPractice: 16, boardCertified: true, telehealth: false },
  { _id: 'mp015', providerName: 'Dr. Amanda Thompson', email: 'amanda.thompson@laent.com', specialty: 'ENT', subSpecialties: ['Otolaryngology', 'Head and Neck Surgery'], acceptedInsurance: ['Humana', 'United Healthcare', 'Cigna', 'Medicaid'], city: 'Los Angeles', state: 'CA', zipCode: '90002', organizationName: 'LA ENT Specialists', acceptanceRate: 0.88, avgResponseTimeDays: 2, totalReferralsReceived: 193, completedReferrals: 170, activeReferrals: 9, tokenBalance: 890, tokenEarned: 2050, availabilityScore: 81, networkParticipation: true, isAcceptingReferrals: true, languagesSpoken: ['English', 'Spanish'], yearsInPractice: 13, boardCertified: true, telehealth: false },
];

const syntheticMatchSessions = [
  { _id: 'ms001', requestedByName: 'Dr. John Smith', specialty: 'Cardiology', patientInsurance: 'Blue Cross Blue Shield', patientCity: 'Atlanta', patientState: 'GA', urgency: 'routine', resultsCount: 5, topMatchScore: 94, selectedProviderId: 'mp001', selectedProviderName: 'Dr. Sarah Chen', selectedMatchScore: 94, createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
  { _id: 'ms002', requestedByName: 'Dr. Emily Davis', specialty: 'Neurology', patientInsurance: 'Cigna', patientCity: 'Boston', patientState: 'MA', urgency: 'urgent', resultsCount: 3, topMatchScore: 87, selectedProviderId: null, selectedProviderName: null, selectedMatchScore: null, createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
  { _id: 'ms003', requestedByName: 'Dr. John Smith', specialty: 'Orthopedics', patientInsurance: 'Aetna', patientCity: 'Chicago', patientState: 'IL', urgency: 'routine', resultsCount: 4, topMatchScore: 91, selectedProviderId: 'mp003', selectedProviderName: 'Dr. Maria Gonzalez', selectedMatchScore: 91, createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
  { _id: 'ms004', requestedByName: 'Dr. Sarah Lee', specialty: 'Endocrinology', patientInsurance: 'United Healthcare', patientCity: 'Phoenix', patientState: 'AZ', urgency: 'routine', resultsCount: 2, topMatchScore: 88, selectedProviderId: 'mp005', selectedProviderName: 'Dr. Angela White', selectedMatchScore: 88, createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
  { _id: 'ms005', requestedByName: 'Dr. Emily Davis', specialty: 'Dermatology', patientInsurance: 'Humana', patientCity: 'Miami', patientState: 'FL', urgency: 'routine', resultsCount: 5, topMatchScore: 96, selectedProviderId: 'mp009', selectedProviderName: 'Dr. Rachel Brown', selectedMatchScore: 96, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
];

const SPECIALTY_SYNONYMS = {
  'Cardiology': ['cardiology','cardiovascular','cardiac surgery','interventional cardiology','electrophysiology'],
  'Orthopedics': ['orthopedics','orthopedic surgery','sports medicine','joint replacement','spine surgery'],
  'Neurology': ['neurology','neurosurgery','neurological surgery','epilepsy','movement disorders'],
  'Gastroenterology': ['gastroenterology','gi','hepatology','endoscopy','colorectal surgery'],
  'Oncology': ['oncology','hematology','medical oncology','radiation oncology','surgical oncology'],
  'Pulmonology': ['pulmonology','pulmonary medicine','critical care','sleep medicine','thoracic surgery'],
  'Rheumatology': ['rheumatology','immunology','autoimmune'],
  'Endocrinology': ['endocrinology','diabetes management','metabolism','thyroid'],
  'Ophthalmology': ['ophthalmology','eye care','retina','glaucoma','cornea'],
  'Dermatology': ['dermatology','skin','mohs surgery'],
  'Nephrology': ['nephrology','renal','kidney','dialysis'],
  'Urology': ['urology','urological surgery'],
  'Psychiatry': ['psychiatry','mental health','psychology'],
  'ENT': ['ent','otolaryngology','head and neck surgery'],
  'Allergy': ['allergy','allergy & immunology'],
};

function syntheticScoreProvider(profile, criteria) {
  const { specialty, patientInsurance, urgency } = criteria;
  let specialtyScore = 0;
  if (specialty) {
    const reqLower = specialty.toLowerCase();
    const profLower = profile.specialty.toLowerCase();
    if (profLower === reqLower) {
      specialtyScore = 30;
    } else {
      const synonymGroup = Object.values(SPECIALTY_SYNONYMS).find(g => g.includes(reqLower) || g.includes(profLower));
      if (synonymGroup && synonymGroup.includes(reqLower) && synonymGroup.includes(profLower)) {
        specialtyScore = 22;
      } else if ((profile.subSpecialties || []).some(s => s.toLowerCase() === reqLower)) {
        specialtyScore = 18;
      }
    }
  }
  let insuranceScore = 12;
  if (patientInsurance && profile.acceptedInsurance && profile.acceptedInsurance.length > 0) {
    const ins = patientInsurance.toLowerCase();
    if (profile.acceptedInsurance.some(a => a.toLowerCase() === ins)) insuranceScore = 25;
    else if (profile.acceptedInsurance.some(a => a.toLowerCase().includes(ins) || ins.includes(a.toLowerCase().split(' ')[0]))) insuranceScore = 18;
    else insuranceScore = 2;
  }
  const acceptanceScore = Math.round(profile.acceptanceRate * 20);
  const availScore = profile.isAcceptingReferrals ? Math.round((profile.availabilityScore / 100) * 15) : 0;
  let tokenScore = 1;
  if (profile.tokenEarned >= 1000) tokenScore = 10;
  else if (profile.tokenEarned >= 500) tokenScore = 8;
  else if (profile.tokenEarned >= 200) tokenScore = 6;
  else if (profile.tokenEarned >= 50) tokenScore = 4;
  else if (profile.tokenEarned > 0) tokenScore = 2;
  let bonus = 0;
  if (profile.networkParticipation) bonus += 3;
  if (profile.boardCertified) bonus += 2;
  if (profile.telehealth && (urgency === 'urgent' || urgency === 'emergency')) bonus += 2;
  if (profile.avgResponseTimeDays <= 1) bonus += 3;
  else if (profile.avgResponseTimeDays <= 2) bonus += 2;
  else if (profile.avgResponseTimeDays <= 3) bonus += 1;
  const matchScore = Math.min(100, specialtyScore + insuranceScore + acceptanceScore + availScore + tokenScore + bonus);
  return { ...profile, matchScore, scoreBreakdown: { specialty: specialtyScore, insurance: insuranceScore, acceptanceRate: acceptanceScore, availability: availScore, tokenStanding: tokenScore, bonuses: bonus } };
}

router.post('/referral-matching/match', protect, (req, res) => {
  const { specialty, patientInsurance, patientCity, patientState, urgency, limit = 10 } = req.body;
  if (!specialty) return res.status(400).json({ success: false, error: 'specialty is required' });
  const criteria = { specialty, patientInsurance, patientCity, patientState, urgency };
  const scored = syntheticProviderProfiles
    .filter(p => p.isAcceptingReferrals)
    .map(p => syntheticScoreProvider(p, criteria))
    .filter(p => p.matchScore > 5)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
  const session = { _id: 'ms' + Date.now(), requestedByName: req.user ? req.user.name : 'Unknown', specialty, patientInsurance, patientCity, patientState, urgency, resultsCount: scored.length, topMatchScore: scored[0] ? scored[0].matchScore : 0, selectedProviderId: null, createdAt: new Date().toISOString() };
  syntheticMatchSessions.unshift(session);
  res.json({ success: true, data: { matches: scored, criteria, total: scored.length, sessionId: session._id } });
});

router.get('/referral-matching/stats', protect, (req, res) => {
  const total = syntheticMatchSessions.length;
  const withSelection = syntheticMatchSessions.filter(s => s.selectedProviderId).length;
  const selectionRate = total > 0 ? Math.round((withSelection / total) * 100) : 0;
  const avgTopScore = total > 0 ? Math.round(syntheticMatchSessions.reduce((sum, s) => sum + (s.topMatchScore || 0), 0) / total) : 0;
  const activeProviders = syntheticProviderProfiles.filter(p => p.isAcceptingReferrals).length;
  const specialtyCounts = {};
  syntheticMatchSessions.forEach(s => { if (s.specialty) specialtyCounts[s.specialty] = (specialtyCounts[s.specialty] || 0) + 1; });
  const topSpecialties = Object.entries(specialtyCounts).map(([specialty, count]) => ({ specialty, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  res.json({ success: true, data: { total, selectionRate, avgTopMatchScore: avgTopScore, activeProviders, totalSessions: total, topSpecialties } });
});

router.get('/referral-matching/sessions', protect, (req, res) => {
  const { page = 1, limit = 15 } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 15;
  const skip = (pageNum - 1) * limitNum;
  const paged = syntheticMatchSessions.slice(skip, skip + limitNum);
  res.json({ success: true, data: { sessions: paged, total: syntheticMatchSessions.length } });
});

router.post('/referral-matching/sessions/:sessionId/select', protect, (req, res) => {
  const { sessionId } = req.params;
  const { selectedProviderId, selectedProviderName, selectedMatchScore, linkedReferralId } = req.body;
  const session = syntheticMatchSessions.find(s => s._id === sessionId);
  if (session) {
    session.selectedProviderId = selectedProviderId;
    session.selectedProviderName = selectedProviderName;
    session.selectedMatchScore = selectedMatchScore;
    session.linkedReferralId = linkedReferralId;
  }
  res.json({ success: true });
});

router.get('/referral-matching/providers', protect, (req, res) => {
  const { specialty, state, search, page = 1, limit = 20 } = req.query;
  let results = [...syntheticProviderProfiles];
  if (specialty) results = results.filter(p => p.specialty.toLowerCase().includes(specialty.toLowerCase()));
  if (state) results = results.filter(p => p.state === state.toUpperCase());
  if (search) results = results.filter(p => p.providerName.toLowerCase().includes(search.toLowerCase()) || p.organizationName.toLowerCase().includes(search.toLowerCase()));
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;
  const paged = results.slice(skip, skip + limitNum);
  res.json({ success: true, data: { providers: paged, total: results.length, page: pageNum, limit: limitNum } });
});

router.get('/referral-matching/providers/:id', protect, (req, res) => {
  const profile = syntheticProviderProfiles.find(p => p._id === req.params.id);
  if (!profile) return res.status(404).json({ success: false, error: 'Provider not found' });
  res.json({ success: true, data: profile });
});

router.put('/referral-matching/providers/:id', protect, (req, res) => {
  const idx = syntheticProviderProfiles.findIndex(p => p._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Provider not found' });
  Object.assign(syntheticProviderProfiles[idx], req.body, { _id: syntheticProviderProfiles[idx]._id });
  res.json({ success: true, data: syntheticProviderProfiles[idx] });
});

// ---------------------------------------------------------------------------
// Patient Self-Scheduling routes (synthetic mode)
// ---------------------------------------------------------------------------

const _APPT_TYPES = [
  { code: 'new_patient', name: 'New Patient Consultation', defaultDurationMinutes: 60, color: '#2196F3', requiresPriorAuth: false, requiresReferral: false, telehealthEligible: true },
  { code: 'follow_up', name: 'Follow-Up Visit', defaultDurationMinutes: 30, color: '#4CAF50', requiresPriorAuth: false, requiresReferral: false, telehealthEligible: true },
  { code: 'telehealth', name: 'Telehealth Visit', defaultDurationMinutes: 30, color: '#9C27B0', requiresPriorAuth: false, requiresReferral: false, telehealthEligible: true },
  { code: 'urgent', name: 'Urgent Care Visit', defaultDurationMinutes: 45, color: '#F44336', requiresPriorAuth: false, requiresReferral: false, telehealthEligible: false },
  { code: 'procedure', name: 'Procedure / Treatment', defaultDurationMinutes: 60, color: '#FF9800', requiresPriorAuth: true, requiresReferral: true, telehealthEligible: false },
];

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const syntheticAppointments = [
  { _id: 'apt001', appointmentId: 'APT-2026-00001', patientId: 'p001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', providerId: 'u002', providerName: 'Dr. John Smith', providerSpecialty: 'Cardiology', organizationName: 'Metro Heart Institute', appointmentType: 'follow_up', status: 'completed', scheduledDate: new Date(now - 10 * day), startTime: '09:00', endTime: '09:30', durationMinutes: 30, location: 'in_person', chiefComplaint: 'Hypertension management follow-up', reasonForVisit: 'Routine follow-up for blood pressure control', tokenRewardIssued: true, createdBy: 'patient', createdAt: new Date(now - 15 * day) },
  { _id: 'apt002', appointmentId: 'APT-2026-00002', patientId: 'p002', patientName: 'Emily Rodriguez', patientEmail: 'emily.rodriguez@email.com', providerId: 'u003', providerName: 'Dr. Michael Chen', providerSpecialty: 'Neurology', organizationName: 'Neuroscience Medical Center', appointmentType: 'new_patient', status: 'completed', scheduledDate: new Date(now - 7 * day), startTime: '10:00', endTime: '11:00', durationMinutes: 60, location: 'in_person', chiefComplaint: 'Persistent migraines and dizziness', reasonForVisit: 'Initial neurological consultation for chronic migraines', tokenRewardIssued: true, createdBy: 'patient', createdAt: new Date(now - 14 * day) },
  { _id: 'apt003', appointmentId: 'APT-2026-00003', patientId: 'p003', patientName: 'Thomas Brown', patientEmail: 'thomas.brown@email.com', providerId: 'u002', providerName: 'Dr. John Smith', providerSpecialty: 'Cardiology', organizationName: 'Metro Heart Institute', appointmentType: 'urgent', status: 'completed', scheduledDate: new Date(now - 5 * day), startTime: '14:00', endTime: '14:45', durationMinutes: 45, location: 'in_person', chiefComplaint: 'Chest pain and palpitations', reasonForVisit: 'Urgent evaluation for new-onset chest pain', tokenRewardIssued: true, createdBy: 'patient', createdAt: new Date(now - 5 * day) },
  { _id: 'apt004', appointmentId: 'APT-2026-00004', patientId: 'p001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', providerId: 'u003', providerName: 'Dr. Michael Chen', providerSpecialty: 'Neurology', organizationName: 'Neuroscience Medical Center', appointmentType: 'telehealth', status: 'no_show', scheduledDate: new Date(now - 8 * day), startTime: '11:00', endTime: '11:30', durationMinutes: 30, location: 'telehealth', telehealthLink: 'https://telehealth.clinictrustai.com/room/abc123demo', chiefComplaint: 'Headache follow-up', reasonForVisit: 'Telehealth follow-up for headache management', tokenRewardIssued: false, createdBy: 'patient', createdAt: new Date(now - 12 * day) },
  { _id: 'apt005', appointmentId: 'APT-2026-00005', patientId: 'p002', patientName: 'Emily Rodriguez', patientEmail: 'emily.rodriguez@email.com', providerId: 'u002', providerName: 'Dr. John Smith', providerSpecialty: 'Cardiology', organizationName: 'Metro Heart Institute', appointmentType: 'follow_up', status: 'cancelled', scheduledDate: new Date(now - 3 * day), startTime: '15:00', endTime: '15:30', durationMinutes: 30, location: 'in_person', chiefComplaint: 'Post-procedure check', cancellationReason: 'Patient unavailable', cancelledAt: new Date(now - 4 * day), cancelledBy: 'patient', tokenRewardIssued: false, createdBy: 'patient', createdAt: new Date(now - 10 * day) },
  { _id: 'apt006', appointmentId: 'APT-2026-00006', patientId: 'p001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', providerId: 'u002', providerName: 'Dr. John Smith', providerSpecialty: 'Cardiology', organizationName: 'Metro Heart Institute', appointmentType: 'follow_up', status: 'scheduled', scheduledDate: new Date(now + 3 * day), startTime: '09:30', endTime: '10:00', durationMinutes: 30, location: 'in_person', chiefComplaint: 'Medication review', reasonForVisit: 'Review current cardiac medications', tokenRewardIssued: false, createdBy: 'patient', createdAt: new Date(now - 2 * day) },
  { _id: 'apt007', appointmentId: 'APT-2026-00007', patientId: 'p002', patientName: 'Emily Rodriguez', patientEmail: 'emily.rodriguez@email.com', providerId: 'u003', providerName: 'Dr. Michael Chen', providerSpecialty: 'Neurology', organizationName: 'Neuroscience Medical Center', appointmentType: 'follow_up', status: 'confirmed', scheduledDate: new Date(now + 5 * day), startTime: '10:30', endTime: '11:00', durationMinutes: 30, location: 'in_person', chiefComplaint: 'MRI review and treatment plan', reasonForVisit: 'Review MRI results and adjust treatment', tokenRewardIssued: false, createdBy: 'patient', createdAt: new Date(now - 3 * day) },
  { _id: 'apt008', appointmentId: 'APT-2026-00008', patientId: 'p003', patientName: 'Thomas Brown', patientEmail: 'thomas.brown@email.com', providerId: 'u002', providerName: 'Dr. John Smith', providerSpecialty: 'Cardiology', organizationName: 'Metro Heart Institute', appointmentType: 'telehealth', status: 'confirmed', scheduledDate: new Date(now + 2 * day), startTime: '14:00', endTime: '14:30', durationMinutes: 30, location: 'telehealth', telehealthLink: 'https://telehealth.clinictrustai.com/room/xyz789demo', chiefComplaint: 'Telehealth cardiology check', reasonForVisit: 'Virtual follow-up for arrhythmia monitoring', tokenRewardIssued: false, createdBy: 'patient', createdAt: new Date(now - 1 * day) },
  { _id: 'apt009', appointmentId: 'APT-2026-00009', patientId: 'p001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', providerId: 'u003', providerName: 'Dr. Michael Chen', providerSpecialty: 'Neurology', organizationName: 'Neuroscience Medical Center', appointmentType: 'new_patient', status: 'scheduled', scheduledDate: new Date(now + 7 * day), startTime: '09:00', endTime: '10:00', durationMinutes: 60, location: 'in_person', chiefComplaint: 'Memory concerns and cognitive changes', reasonForVisit: 'Initial evaluation for memory issues', tokenRewardIssued: false, createdBy: 'patient', createdAt: new Date(now) },
  { _id: 'apt010', appointmentId: 'APT-2026-00010', patientId: 'p002', patientName: 'Emily Rodriguez', patientEmail: 'emily.rodriguez@email.com', providerId: 'u002', providerName: 'Dr. John Smith', providerSpecialty: 'Cardiology', organizationName: 'Metro Heart Institute', appointmentType: 'procedure', status: 'scheduled', scheduledDate: new Date(now + 10 * day), startTime: '08:00', endTime: '09:00', durationMinutes: 60, location: 'in_person', chiefComplaint: 'Echocardiogram procedure', reasonForVisit: 'Scheduled echocardiogram for structural heart evaluation', tokenRewardIssued: false, createdBy: 'provider', createdAt: new Date(now - 5 * day) },
];

const syntheticSchedules = [
  { _id: 'sch001', providerId: 'u002', providerName: 'Dr. John Smith', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 16, isActive: true },
  { _id: 'sch002', providerId: 'u002', providerName: 'Dr. John Smith', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 16, isActive: true },
  { _id: 'sch003', providerId: 'u002', providerName: 'Dr. John Smith', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 16, isActive: true },
  { _id: 'sch004', providerId: 'u002', providerName: 'Dr. John Smith', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 16, isActive: true },
  { _id: 'sch005', providerId: 'u002', providerName: 'Dr. John Smith', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 16, isActive: true },
  { _id: 'sch006', providerId: 'u003', providerName: 'Dr. Michael Chen', dayOfWeek: 1, startTime: '08:00', endTime: '16:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 14, isActive: true },
  { _id: 'sch007', providerId: 'u003', providerName: 'Dr. Michael Chen', dayOfWeek: 2, startTime: '08:00', endTime: '16:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 14, isActive: true },
  { _id: 'sch008', providerId: 'u003', providerName: 'Dr. Michael Chen', dayOfWeek: 3, startTime: '08:00', endTime: '16:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 14, isActive: true },
  { _id: 'sch009', providerId: 'u003', providerName: 'Dr. Michael Chen', dayOfWeek: 4, startTime: '08:00', endTime: '16:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 14, isActive: true },
  { _id: 'sch010', providerId: 'u003', providerName: 'Dr. Michael Chen', dayOfWeek: 5, startTime: '08:00', endTime: '16:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 14, isActive: true },
];

// Helper: generate available slots from schedule
function generateSyntheticSlots(providerId, dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  const sched = syntheticSchedules.find(s => s.providerId === providerId && s.dayOfWeek === dow && s.isActive);
  if (!sched) return [];
  const parseT = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toT = m => String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
  const booked = syntheticAppointments.filter(a =>
    a.providerId === providerId &&
    new Date(a.scheduledDate).toISOString().startsWith(dateStr) &&
    !['cancelled','no_show'].includes(a.status)
  );
  const slots = [];
  let cur = parseT(sched.startTime);
  const end = parseT(sched.endTime);
  while (cur + sched.slotDurationMinutes <= end) {
    const st = toT(cur), et = toT(cur + sched.slotDurationMinutes);
    const busy = booked.some(b => parseT(b.startTime) < parseT(et) && parseT(b.endTime) > parseT(st));
    slots.push({ startTime: st, endTime: et, available: !busy, booked: busy });
    cur += sched.slotDurationMinutes + sched.bufferMinutes;
  }
  return slots;
}

// GET available slots
router.get('/appointments/available-slots', protect, (req, res) => {
  const { providerId, startDate, endDate } = req.query;
  if (!providerId) return res.status(400).json({ success: false, message: 'providerId required' });
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * day);
  const results = [];
  const cur = new Date(start);
  while (cur <= end && results.length < 60) {
    const dateStr = cur.toISOString().split('T')[0];
    const slots = generateSyntheticSlots(providerId, dateStr);
    if (slots.some(s => s.available)) {
      results.push({ date: dateStr, slots, availableCount: slots.filter(s => s.available).length });
    }
    cur.setDate(cur.getDate() + 1);
  }
  res.json({ success: true, data: { slots: results, providerId } });
});

// GET patient's own appointments
router.get('/appointments/stats', protect, (req, res) => {
  const uid = req.user ? req.user._id : null;
  const mine = syntheticAppointments.filter(a => a.patientId === uid || a.providerId === uid);
  const now2 = new Date();
  const completed = mine.filter(a => a.status === 'completed').length;
  const noShow = mine.filter(a => a.status === 'no_show').length;
  const cancelled = mine.filter(a => a.status === 'cancelled').length;
  const upcoming = mine.filter(a => new Date(a.scheduledDate) >= now2 && !['cancelled','no_show'].includes(a.status)).length;
  res.json({ success: true, data: { total: mine.length, completed, noShow, cancelled, upcoming, noShowRate: completed + noShow > 0 ? Math.round((noShow / (completed + noShow)) * 100 * 10) / 10 : 0 } });
});

router.get('/appointments/my-schedule', protect, (req, res) => {
  const uid = req.user ? req.user._id : null;
  const { startDate, endDate } = req.query;
  const s = startDate ? new Date(startDate) : new Date();
  const e = endDate ? new Date(endDate) : new Date(Date.now() + 7 * day);
  const appts = syntheticAppointments.filter(a =>
    a.providerId === uid &&
    new Date(a.scheduledDate) >= s &&
    new Date(a.scheduledDate) <= e &&
    !['cancelled','no_show'].includes(a.status)
  ).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  res.json({ success: true, data: { appointments: appts } });
});

router.get('/appointments', protect, (req, res) => {
  const { upcoming, past, status, page = 1, limit = 10 } = req.query;
  const now2 = new Date();
  let results = [...syntheticAppointments];
  if (upcoming === 'true') results = results.filter(a => new Date(a.scheduledDate) >= now2 && !['cancelled','no_show'].includes(a.status));
  if (past === 'true') results = results.filter(a => new Date(a.scheduledDate) < now2 || ['completed','no_show','cancelled'].includes(a.status));
  if (status) results = results.filter(a => a.status === status);
  if (upcoming === 'true') results.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  else results.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const paged = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ success: true, data: { appointments: paged, total: results.length, page: pageNum, limit: limitNum } });
});

router.post('/appointments', protect, (req, res) => {
  const { providerId, startTime, scheduledDate } = req.body;
  const dateStr = new Date(scheduledDate).toISOString().split('T')[0];
  const slots = generateSyntheticSlots(providerId, dateStr);
  const slot = slots.find(s => s.startTime === startTime);
  if (slot && slot.booked) {
    return res.status(409).json({ success: false, message: 'This time slot is no longer available. Please select another slot.' });
  }
  const newAppt = {
    _id: 'apt' + Date.now(),
    appointmentId: 'APT-2026-' + String(syntheticAppointments.length + 1).padStart(5, '0'),
    ...req.body,
    status: 'scheduled',
    tokenRewardIssued: false,
    createdBy: 'patient',
    createdAt: new Date(),
    scheduledDate: new Date(scheduledDate),
    remindersSent: [],
    rescheduleHistory: [],
    intakeResponses: req.body.intakeResponses || {},
  };
  if (req.body.appointmentType === 'telehealth') {
    newAppt.telehealthLink = 'https://telehealth.clinictrustai.com/room/' + Math.random().toString(36).slice(2, 10);
  }
  syntheticAppointments.push(newAppt);
  res.status(201).json({ success: true, data: newAppt });
});

router.get('/appointments/:id', protect, (req, res) => {
  const appt = syntheticAppointments.find(a => a._id === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
  res.json({ success: true, data: appt });
});

router.put('/appointments/:id/cancel', protect, (req, res) => {
  const appt = syntheticAppointments.find(a => a._id === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
  appt.status = 'cancelled';
  appt.cancellationReason = req.body.cancellationReason || '';
  appt.cancelledAt = new Date();
  appt.cancelledBy = 'patient';
  res.json({ success: true, data: appt });
});

router.put('/appointments/:id/reschedule', protect, (req, res) => {
  const appt = syntheticAppointments.find(a => a._id === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
  if (!appt.rescheduleHistory) appt.rescheduleHistory = [];
  appt.rescheduleHistory.push({ fromDate: appt.scheduledDate, fromStartTime: appt.startTime, toDate: req.body.newDate, toStartTime: req.body.newStartTime, reason: req.body.reason, changedBy: 'patient', changedAt: new Date() });
  appt.scheduledDate = new Date(req.body.newDate);
  appt.startTime = req.body.newStartTime;
  appt.endTime = req.body.newEndTime;
  appt.status = 'scheduled';
  res.json({ success: true, data: appt });
});

router.put('/appointments/:id/status', protect, (req, res) => {
  const appt = syntheticAppointments.find(a => a._id === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
  appt.status = req.body.status;
  if (req.body.notes) appt.notes = req.body.notes;
  if (req.body.status === 'completed' && !appt.tokenRewardIssued) appt.tokenRewardIssued = true;
  res.json({ success: true, data: appt });
});

router.post('/appointments/:id/check-in', protect, (req, res) => {
  const appt = syntheticAppointments.find(a => a._id === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
  appt.status = 'checked_in';
  res.json({ success: true, data: appt });
});

router.post('/appointments/:id/reminder', protect, (req, res) => {
  const appt = syntheticAppointments.find(a => a._id === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
  appt.reminderSentAt = new Date().toISOString();
  if (!appt.remindersSent) appt.remindersSent = [];
  appt.remindersSent.push({ sentAt: appt.reminderSentAt, channel: 'email', status: 'sent' });
  res.json({ success: true, data: appt, message: 'Reminder sent successfully' });
});

// Admin appointments routes
router.get('/admin/appointments/stats', protect, authorize('admin', 'superadmin'), (req, res) => {
  const total = syntheticAppointments.length;
  const completed = syntheticAppointments.filter(a => a.status === 'completed').length;
  const cancelled = syntheticAppointments.filter(a => a.status === 'cancelled').length;
  const noShow = syntheticAppointments.filter(a => a.status === 'no_show').length;
  const upcoming = syntheticAppointments.filter(a => new Date(a.scheduledDate) >= new Date() && !['cancelled','no_show'].includes(a.status)).length;
  const noShowRate = completed + noShow > 0 ? Math.round((noShow / (completed + noShow)) * 100 * 10) / 10 : 0;
  const byType = {};
  syntheticAppointments.forEach(a => { byType[a.appointmentType] = (byType[a.appointmentType] || 0) + 1; });
  const appointmentsByType = Object.entries(byType).map(([type, count]) => ({ type, count }));
  const topProviders = [
    { providerName: 'Dr. John Smith', count: syntheticAppointments.filter(a => a.providerId === 'u002').length },
    { providerName: 'Dr. Michael Chen', count: syntheticAppointments.filter(a => a.providerId === 'u003').length },
  ];
  res.json({ success: true, data: { total, completed, cancelled, noShow, upcoming, noShowRate, avgUtilizationPct: Math.round((completed / Math.max(total - cancelled, 1)) * 100), topProviders, appointmentsByType, recentTrend: [] } });
});

router.get('/admin/appointments/no-show-report', protect, authorize('admin', 'superadmin'), (req, res) => {
  const noShows = syntheticAppointments.filter(a => a.status === 'no_show');
  res.json({ success: true, data: { report: noShows, total: noShows.length } });
});

router.get('/admin/appointments', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { status, appointmentType, search, page = 1, limit = 15 } = req.query;
  let results = [...syntheticAppointments];
  if (status && status !== 'all') results = results.filter(a => a.status === status);
  if (appointmentType && appointmentType !== 'all') results = results.filter(a => a.appointmentType === appointmentType);
  if (search) { const q = search.toLowerCase(); results = results.filter(a => (a.patientName || '').toLowerCase().includes(q) || (a.providerName || '').toLowerCase().includes(q) || (a.appointmentId || '').toLowerCase().includes(q)); }
  results.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 15;
  const paged = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ success: true, data: { appointments: paged, total: results.length, page: pageNum, limit: limitNum } });
});

router.get('/admin/appointments/provider-utilization', protect, authorize('admin', 'superadmin'), (req, res) => {
  const range = req.query.range || '30d';
  const rangeDays = { '7d': 7, '30d': 30, '90d': 90, 'ytd': new Date().getMonth() * 30 + 1 }[range] || 30;

  const providers = [
    { providerId: 'u002', providerName: 'Dr. John Smith',    specialty: 'Family Medicine',  totalSlots: rangeDays * 8, bookedSlots: Math.round(rangeDays * 8 * 0.87), completed: Math.round(rangeDays * 5.8), noShow: Math.round(rangeDays * 0.6), cancelled: Math.round(rangeDays * 0.4), avgDuration: 22, tokensEarned: Math.round(rangeDays * 5.8) * 15 },
    { providerId: 'u003', providerName: 'Dr. Michael Chen',  specialty: 'Cardiology',       totalSlots: rangeDays * 6, bookedSlots: Math.round(rangeDays * 6 * 0.72), completed: Math.round(rangeDays * 3.6), noShow: Math.round(rangeDays * 0.5), cancelled: Math.round(rangeDays * 0.7), avgDuration: 35, tokensEarned: Math.round(rangeDays * 3.6) * 15 },
    { providerId: 'u004', providerName: 'Dr. Sarah Patel',   specialty: 'Neurology',        totalSlots: rangeDays * 5, bookedSlots: Math.round(rangeDays * 5 * 0.91), completed: Math.round(rangeDays * 3.8), noShow: Math.round(rangeDays * 0.3), cancelled: Math.round(rangeDays * 0.3), avgDuration: 40, tokensEarned: Math.round(rangeDays * 3.8) * 15 },
    { providerId: 'u005', providerName: 'Dr. Amanda Torres', specialty: 'Orthopedics',      totalSlots: rangeDays * 7, bookedSlots: Math.round(rangeDays * 7 * 0.55), completed: Math.round(rangeDays * 2.9), noShow: Math.round(rangeDays * 0.8), cancelled: Math.round(rangeDays * 0.9), avgDuration: 28, tokensEarned: Math.round(rangeDays * 2.9) * 15 },
    { providerId: 'u006', providerName: 'Dr. James Liu',     specialty: 'Pulmonology',      totalSlots: rangeDays * 4, bookedSlots: Math.round(rangeDays * 4 * 0.63), completed: Math.round(rangeDays * 2.1), noShow: Math.round(rangeDays * 0.4), cancelled: Math.round(rangeDays * 0.2), avgDuration: 30, tokensEarned: Math.round(rangeDays * 2.1) * 15 },
  ].map(p => {
    const fillRate = Math.round((p.bookedSlots / p.totalSlots) * 100);
    const cancelRate = Math.round((p.cancelled / Math.max(p.bookedSlots, 1)) * 100);
    return { ...p, fillRate, cancelRate };
  });

  const sortedByFill = [...providers].sort((a, b) => b.fillRate - a.fillRate);
  const avgFillRate = Math.round(providers.reduce((s, p) => s + p.fillRate, 0) / providers.length);
  const topPerformer = sortedByFill[0]?.providerName || '—';
  const belowThreshold = providers.filter(p => p.fillRate < 60).length;

  const peakHours = [
    { hour: 8,  label: '8:00 – 9:00 AM',   count: Math.round(rangeDays * 1.8) },
    { hour: 9,  label: '9:00 – 10:00 AM',  count: Math.round(rangeDays * 3.2) },
    { hour: 10, label: '10:00 – 11:00 AM', count: Math.round(rangeDays * 4.1) },
    { hour: 11, label: '11:00 – 12:00 PM', count: Math.round(rangeDays * 3.7) },
    { hour: 13, label: '1:00 – 2:00 PM',   count: Math.round(rangeDays * 3.9) },
    { hour: 14, label: '2:00 – 3:00 PM',   count: Math.round(rangeDays * 4.4) },
    { hour: 15, label: '3:00 – 4:00 PM',   count: Math.round(rangeDays * 3.1) },
    { hour: 16, label: '4:00 – 5:00 PM',   count: Math.round(rangeDays * 1.5) },
  ];

  res.json({
    success: true,
    data: {
      range,
      rangeDays,
      summary: { totalProviders: providers.length, avgFillRate, topPerformer, belowThreshold },
      providers: sortedByFill,
      peakHours,
    }
  });
});

router.get('/admin/appointments/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const appt = syntheticAppointments.find(a => a._id === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
  res.json({ success: true, data: appt });
});

router.put('/admin/appointments/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const idx = syntheticAppointments.findIndex(a => a._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Appointment not found' });
  Object.assign(syntheticAppointments[idx], req.body, { _id: syntheticAppointments[idx]._id });
  res.json({ success: true, data: syntheticAppointments[idx] });
});

// Provider Schedule routes
router.get('/schedules/:providerId/availability', protect, (req, res) => {
  const schedules = syntheticSchedules.filter(s => s.providerId === req.params.providerId);
  res.json({ success: true, data: { schedules } });
});

router.post('/schedules/:providerId/availability', protect, (req, res) => {
  const updates = Array.isArray(req.body) ? req.body : [req.body];
  updates.forEach(upd => {
    const idx = syntheticSchedules.findIndex(s => s.providerId === req.params.providerId && s.dayOfWeek === upd.dayOfWeek);
    if (idx >= 0) Object.assign(syntheticSchedules[idx], upd);
    else syntheticSchedules.push({ _id: 'sch' + Date.now(), providerId: req.params.providerId, ...upd });
  });
  res.json({ success: true, data: { schedules: syntheticSchedules.filter(s => s.providerId === req.params.providerId) } });
});

router.get('/schedules/:providerId/slots', protect, (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * day);
  const results = [];
  const cur = new Date(start);
  while (cur <= end && results.length < 60) {
    const dateStr = cur.toISOString().split('T')[0];
    const slots = generateSyntheticSlots(req.params.providerId, dateStr);
    if (slots.some(s => s.available)) results.push({ date: dateStr, slots, availableCount: slots.filter(s => s.available).length });
    cur.setDate(cur.getDate() + 1);
  }
  res.json({ success: true, data: { slots: results, providerId: req.params.providerId } });
});

router.get('/schedules/:providerId/exceptions', protect, (req, res) => {
  res.json({ success: true, data: { exceptions: [] } });
});

router.post('/schedules/:providerId/exceptions', protect, (req, res) => {
  res.status(201).json({ success: true, data: { _id: 'exc' + Date.now(), providerId: req.params.providerId, ...req.body, createdAt: new Date() } });
});


// ---------------------------------------------------------------------------
// Digital Therapeutics (DTx) Marketplace routes (synthetic mode)
// ---------------------------------------------------------------------------

const syntheticDtxPrograms = [
  { _id: 'dtx-001', name: 'Diabetes Prevention Program', vendor: 'Omada Health', category: 'metabolic', description: 'A CDC-recognized lifestyle change program for preventing Type 2 diabetes through coaching, curriculum, and community.', conditions: ['Type 2 Diabetes', 'Pre-diabetes', 'Obesity'], evidenceLevel: 'fda_cleared', durationWeeks: 52, deliveryFormat: 'both', contentTypes: ['Coaching', 'Nutrition', 'Exercise'], highlights: ['CDC-recognized program', 'Proven 4-7% weight loss', 'Human health coach included', '35+ group sessions'], contraindications: ['Type 1 Diabetes'], tokenReward: 15, isActive: true, prescriptionCount: 48, avgEngagementScore: 78 },
  { _id: 'dtx-002', name: 'Back & Joint Care', vendor: 'Kaia Health', category: 'musculoskeletal', description: 'AI-guided exercise therapy for chronic back, knee, and hip pain using computer-vision motion feedback.', conditions: ['Chronic Back Pain', 'Knee Osteoarthritis', 'Hip Pain'], evidenceLevel: 'peer_reviewed', durationWeeks: 12, deliveryFormat: 'app', contentTypes: ['Exercise', 'CBT', 'Education'], highlights: ['AI motion feedback', 'No equipment needed', 'Clinically validated in RCTs'], contraindications: ['Recent spinal surgery'], tokenReward: 10, isActive: true, prescriptionCount: 62, avgEngagementScore: 82 },
  { _id: 'dtx-003', name: 'Sleepio CBT-I', vendor: 'Big Health', category: 'mental_health', description: 'FDA-cleared digital CBT for insomnia (CBT-I) delivering 6-session structured sleep therapy through an AI therapist.', conditions: ['Chronic Insomnia', 'Sleep Disorder'], evidenceLevel: 'fda_cleared', durationWeeks: 6, deliveryFormat: 'web', contentTypes: ['CBT', 'Education'], highlights: ['FDA Breakthrough Device', '76% of users achieve normal sleep', 'No medication required'], contraindications: [], tokenReward: 10, isActive: true, prescriptionCount: 31, avgEngagementScore: 74 },
  { _id: 'dtx-004', name: 'Rejoyn CBT App', vendor: 'Alto Neuroscience', category: 'mental_health', description: 'FDA-authorized prescription digital therapeutic for major depressive disorder, used adjunctively with antidepressants.', conditions: ['Major Depressive Disorder', 'Depression'], evidenceLevel: 'fda_authorized', durationWeeks: 8, deliveryFormat: 'app', contentTypes: ['CBT', 'Behavioral Activation'], highlights: ['FDA De Novo authorized', 'Adjunctive to antidepressants', 'Used alongside medication'], contraindications: ['Bipolar disorder', 'Active suicidal ideation'], tokenReward: 12, isActive: true, prescriptionCount: 19, avgEngagementScore: 69 },
  { _id: 'dtx-005', name: 'Quit Genius', vendor: 'Quit Genius', category: 'behavioral', description: 'Evidence-based digital therapeutic for smoking cessation combining CBT, medication support, and 1-on-1 coaching.', conditions: ['Nicotine Addiction', 'Smoking Cessation'], evidenceLevel: 'clinical_study', durationWeeks: 12, deliveryFormat: 'app', contentTypes: ['CBT', 'Coaching', 'NRT Integration'], highlights: ['3x quit rates vs. standard care', 'NRT coordination', 'Clinical coach included'], contraindications: [], tokenReward: 10, isActive: true, prescriptionCount: 27, avgEngagementScore: 71 },
  { _id: 'dtx-006', name: 'Cardiac Rehab PRO', vendor: 'Movn', category: 'cardiovascular', description: 'Home-based cardiac rehabilitation program for post-MI and heart failure patients, monitored by care team.', conditions: ['Post-MI', 'Heart Failure', 'Coronary Artery Disease'], evidenceLevel: 'clinical_study', durationWeeks: 12, deliveryFormat: 'hybrid', contentTypes: ['Exercise', 'Education', 'Monitoring'], highlights: ['Remote monitoring', 'Care team dashboard', 'Equivalent outcomes to in-person rehab'], contraindications: ['Unstable angina', 'Decompensated heart failure'], tokenReward: 15, isActive: true, prescriptionCount: 14, avgEngagementScore: 85 },
  { _id: 'dtx-007', name: 'Noom Weight', vendor: 'Noom', category: 'metabolic', description: 'Psychology-based weight management program using CBT and behavioral change science to create sustainable habits.', conditions: ['Obesity', 'Overweight', 'Metabolic Syndrome'], evidenceLevel: 'peer_reviewed', durationWeeks: 16, deliveryFormat: 'app', contentTypes: ['CBT', 'Nutrition', 'Coaching'], highlights: ['Psychology-first approach', 'Personal goal specialist', '45% of users maintain weight loss at 1 year'], contraindications: [], tokenReward: 10, isActive: true, prescriptionCount: 55, avgEngagementScore: 76 },
  { _id: 'dtx-008', name: 'MindShift CBT', vendor: 'Anxiety Canada', category: 'mental_health', description: 'CBT-based digital therapeutic for generalized anxiety disorder and social anxiety using evidence-based strategies.', conditions: ['Generalized Anxiety', 'Social Anxiety', 'Panic Disorder'], evidenceLevel: 'evidence_based', durationWeeks: 8, deliveryFormat: 'app', contentTypes: ['CBT', 'Mindfulness', 'Exposure Therapy'], highlights: ['Free to prescribe', 'Developed by anxiety experts', 'Proven anxiety reduction'], contraindications: [], tokenReward: 8, isActive: true, prescriptionCount: 43, avgEngagementScore: 68 },
  { _id: 'dtx-009', name: 'PT Anywhere', vendor: 'Reflexion Health', category: 'musculoskeletal', description: 'Computer vision-guided home physical therapy for post-surgical rehabilitation and musculoskeletal conditions.', conditions: ['Post-surgical Rehab', 'ACL Reconstruction', 'Rotator Cuff', 'Knee Replacement'], evidenceLevel: 'peer_reviewed', durationWeeks: 8, deliveryFormat: 'app', contentTypes: ['Exercise', 'Physical Therapy'], highlights: ['Motion capture via smartphone', 'Reduces costly PT visits', 'Real-time form correction'], contraindications: ['Open wounds at treatment site'], tokenReward: 10, isActive: true, prescriptionCount: 22, avgEngagementScore: 80 },
  { _id: 'dtx-010', name: 'Headspace Clinical', vendor: 'Headspace Health', category: 'mental_health', description: 'Clinical mindfulness and meditation program for stress, burnout, and mild anxiety with evidence-based guided content.', conditions: ['Stress', 'Burnout', 'Mild Anxiety', 'Insomnia'], evidenceLevel: 'evidence_based', durationWeeks: 8, deliveryFormat: 'both', contentTypes: ['Mindfulness', 'Meditation', 'Education'], highlights: ['500+ guided sessions', 'Clinician-recommended tracks', 'Proven stress reduction'], contraindications: [], tokenReward: 8, isActive: true, prescriptionCount: 89, avgEngagementScore: 72 },
];

const syntheticDtxPrescriptions = [
  { _id: 'rx-001', programId: 'dtx-001', programName: 'Diabetes Prevention Program', programVendor: 'Omada Health', programCategory: 'metabolic', providerId: 'u002', providerName: 'Dr. John Smith', patientName: 'James Wilson', patientId: 'PT-100001', patientEmail: 'james.wilson@email.com', status: 'active', prescribedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), enrolledAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), engagementScore: null, outcomeNotes: null, tokenRewardIssued: false, clinicalNotes: 'Patient at high risk for T2D. A1C 6.1%.' },
  { _id: 'rx-002', programId: 'dtx-010', programName: 'Headspace Clinical', programVendor: 'Headspace Health', programCategory: 'mental_health', providerId: 'u002', providerName: 'Dr. John Smith', patientName: 'Emily Rodriguez', patientId: 'PT-100002', patientEmail: 'emily.rodriguez@email.com', status: 'completed', prescribedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(), enrolledAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), engagementScore: 84, outcomeNotes: 'Patient reported significant stress reduction. PHQ-4 improved from 8 to 3.', tokenRewardIssued: true, tokenRewardAmount: 8 },
  { _id: 'rx-003', programId: 'dtx-002', programName: 'Back & Joint Care', programVendor: 'Kaia Health', programCategory: 'musculoskeletal', providerId: 'u003', providerName: 'Dr. Michael Chen', patientName: 'Thomas Brown', patientId: 'PT-100003', status: 'enrolled', prescribedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), enrolledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), engagementScore: null, tokenRewardIssued: false, clinicalNotes: 'Chronic lower back pain. Avoidance of opioids preferred.' },
  { _id: 'rx-004', programId: 'dtx-003', programName: 'Sleepio CBT-I', programVendor: 'Big Health', programCategory: 'mental_health', providerId: 'u002', providerName: 'Dr. John Smith', patientName: 'Maria Garcia', patientId: 'PT-100004', status: 'prescribed', prescribedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), engagementScore: null, tokenRewardIssued: false, clinicalNotes: 'Insomnia NOS. Avoid benzodiazepines.' },
  { _id: 'rx-005', programId: 'dtx-005', programName: 'Quit Genius', programVendor: 'Quit Genius', programCategory: 'behavioral', providerId: 'u003', providerName: 'Dr. Michael Chen', patientName: 'David Lee', patientId: 'PT-100005', status: 'dropped', prescribedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), enrolledAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(), droppedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), engagementScore: 22, outcomeNotes: 'Patient disengaged after week 4. Considering NRT patch instead.', tokenRewardIssued: false },
  { _id: 'rx-006', programId: 'dtx-007', programName: 'Noom Weight', programVendor: 'Noom', programCategory: 'metabolic', providerId: 'u004', providerName: 'Dr. Sarah Patel', patientName: 'Linda Chen', patientId: 'PT-100009', status: 'completed', prescribedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), enrolledAt: new Date(Date.now() - 115 * 24 * 60 * 60 * 1000).toISOString(), completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), engagementScore: 91, outcomeNotes: 'Excellent outcomes. Lost 18 lbs over 16 weeks. BMI reduced from 32 to 29.', tokenRewardIssued: true, tokenRewardAmount: 10 },
  { _id: 'rx-007', programId: 'dtx-006', programName: 'Cardiac Rehab PRO', programVendor: 'Movn', programCategory: 'cardiovascular', providerId: 'u003', providerName: 'Dr. Michael Chen', patientName: 'Robert Johnson', patientId: 'PT-100010', status: 'active', prescribedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), enrolledAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), engagementScore: null, tokenRewardIssued: false, clinicalNotes: 'Post-NSTEMI. Declined in-person cardiac rehab due to work schedule.' },
];

// GET /dtx/programs
router.get('/dtx/programs', protect, (req, res) => {
  const { category, evidenceLevel, search } = req.query;
  let results = syntheticDtxPrograms.filter(p => p.isActive);
  if (category && category !== 'all') results = results.filter(p => p.category === category);
  if (evidenceLevel && evidenceLevel !== 'all') results = results.filter(p => p.evidenceLevel === evidenceLevel);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.vendor.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.conditions || []).some(c => c.toLowerCase().includes(q))
    );
  }
  res.json({ success: true, data: { programs: results, total: results.length } });
});

// GET /dtx/programs/:id
router.get('/dtx/programs/:id', protect, (req, res) => {
  const prog = syntheticDtxPrograms.find(p => p._id === req.params.id);
  if (!prog) return res.status(404).json({ success: false, error: 'Program not found' });
  res.json({ success: true, data: prog });
});

// POST /dtx/prescriptions
router.post('/dtx/prescriptions', protect, (req, res) => {
  const { programId, patientName, patientId, patientEmail, clinicalNotes, linkedReferralId } = req.body;
  if (!programId || !patientName) return res.status(400).json({ success: false, error: 'programId and patientName are required' });
  const prog = syntheticDtxPrograms.find(p => p._id === programId);
  const newRx = {
    _id: 'rx-' + Date.now(),
    programId,
    programName: prog?.name || 'Unknown Program',
    programVendor: prog?.vendor || '',
    programCategory: prog?.category || '',
    providerId: req.user?.id || 'u002',
    providerName: req.user?.name || 'Dr. John Smith',
    patientName,
    patientId: patientId || '',
    patientEmail: patientEmail || '',
    status: 'prescribed',
    prescribedAt: new Date().toISOString(),
    linkedReferralId: linkedReferralId || undefined,
    engagementScore: null,
    outcomeNotes: null,
    tokenRewardIssued: false,
    clinicalNotes: clinicalNotes || '',
    statusHistory: [{ status: 'prescribed', changedAt: new Date().toISOString(), notes: 'Initial prescription' }],
  };
  if (prog) prog.prescriptionCount = (prog.prescriptionCount || 0) + 1;
  syntheticDtxPrescriptions.push(newRx);
  res.status(201).json({ success: true, data: newRx });
});

// GET /dtx/prescriptions
router.get('/dtx/prescriptions', protect, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  let results = [...syntheticDtxPrescriptions];
  if (req.user?.id) results = results.filter(r => r.providerId === req.user.id || true); // show all in synthetic
  if (status && status !== 'all') results = results.filter(r => r.status === status);
  results.sort((a, b) => new Date(b.prescribedAt) - new Date(a.prescribedAt));
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const paged = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ success: true, data: { prescriptions: paged, total: results.length } });
});

// PUT /dtx/prescriptions/:id/status
router.put('/dtx/prescriptions/:id/status', protect, (req, res) => {
  const rx = syntheticDtxPrescriptions.find(r => r._id === req.params.id);
  if (!rx) return res.status(404).json({ success: false, error: 'Prescription not found' });
  const { status, engagementScore, outcomeNotes } = req.body;
  rx.status = status;
  if (engagementScore !== null && engagementScore !== undefined) rx.engagementScore = engagementScore;
  if (outcomeNotes) rx.outcomeNotes = outcomeNotes;
  const now = new Date().toISOString();
  if (status === 'enrolled') rx.enrolledAt = now;
  if (status === 'completed') { rx.completedAt = now; rx.tokenRewardIssued = true; rx.tokenRewardAmount = syntheticDtxPrograms.find(p => p._id === rx.programId)?.tokenReward || 10; }
  if (status === 'dropped') rx.droppedAt = now;
  if (!rx.statusHistory) rx.statusHistory = [];
  rx.statusHistory.push({ status, changedAt: now, notes: req.body.notes || '' });
  res.json({ success: true, data: rx });
});

// GET /admin/dtx/stats
router.get('/admin/dtx/stats', protect, authorize('admin', 'superadmin'), (req, res) => {
  const total = syntheticDtxPrescriptions.length;
  const completed = syntheticDtxPrescriptions.filter(r => r.status === 'completed').length;
  const active = syntheticDtxPrescriptions.filter(r => ['active', 'enrolled'].includes(r.status)).length;
  const dropped = syntheticDtxPrescriptions.filter(r => r.status === 'dropped').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const tokensAwarded = syntheticDtxPrescriptions.filter(r => r.tokenRewardIssued).reduce((s, r) => s + (r.tokenRewardAmount || 0), 0);
  const catMap = {};
  syntheticDtxPrescriptions.forEach(r => { catMap[r.programCategory] = (catMap[r.programCategory] || 0) + 1; });
  const byCategory = Object.entries(catMap).map(([_id, count]) => ({ _id, count })).sort((a, b) => b.count - a.count);
  const statusMap = {};
  syntheticDtxPrescriptions.forEach(r => { statusMap[r.status] = (statusMap[r.status] || 0) + 1; });
  const byStatus = Object.entries(statusMap).map(([_id, count]) => ({ _id, count }));
  const progMap = {};
  syntheticDtxPrescriptions.forEach(r => {
    if (!progMap[r.programId]) progMap[r.programId] = { _id: r.programId, programName: r.programName, count: 0, scores: [] };
    progMap[r.programId].count++;
    if (r.engagementScore !== null && r.engagementScore !== undefined) progMap[r.programId].scores.push(r.engagementScore);
  });
  const topPrograms = Object.values(progMap).map(p => ({
    ...p, avgEngagement: p.scores.length ? Math.round(p.scores.reduce((s, x) => s + x, 0) / p.scores.length) : null
  })).sort((a, b) => b.count - a.count).slice(0, 5);
  res.json({ success: true, data: { totalPrograms: syntheticDtxPrograms.filter(p => p.isActive).length, totalPrescriptions: total, completed, active, dropped, completionRate, tokensAwarded, byCategory, byStatus, topPrograms } });
});

// GET /admin/dtx/programs
router.get('/admin/dtx/programs', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { category, isActive } = req.query;
  let results = [...syntheticDtxPrograms];
  if (category && category !== 'all') results = results.filter(p => p.category === category);
  if (isActive !== undefined) results = results.filter(p => p.isActive === (isActive === 'true'));
  res.json({ success: true, data: { programs: results, total: results.length } });
});

// POST /admin/dtx/programs
router.post('/admin/dtx/programs', protect, authorize('admin', 'superadmin'), (req, res) => {
  const newProg = { _id: 'dtx-' + Date.now(), ...req.body, isActive: true, prescriptionCount: 0, avgEngagementScore: 0, createdAt: new Date().toISOString() };
  syntheticDtxPrograms.push(newProg);
  res.status(201).json({ success: true, data: newProg });
});

// PUT /admin/dtx/programs/:id
router.put('/admin/dtx/programs/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const idx = syntheticDtxPrograms.findIndex(p => p._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Program not found' });
  Object.assign(syntheticDtxPrograms[idx], req.body);
  res.json({ success: true, data: syntheticDtxPrograms[idx] });
});

// GET /admin/dtx/prescriptions
router.get('/admin/dtx/prescriptions', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  let results = [...syntheticDtxPrescriptions];
  if (status && status !== 'all') results = results.filter(r => r.status === status);
  results.sort((a, b) => new Date(b.prescribedAt) - new Date(a.prescribedAt));
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const paged = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ success: true, data: { prescriptions: paged, total: results.length } });
});

// ---------------------------------------------------------------------------
// FHIR R4 API routes (synthetic mode — transforms in-memory data)
// ---------------------------------------------------------------------------

const FHIR_CT = 'application/fhir+json';
const getFhirBase = (req) => `${req.protocol}://${req.get('host')}/api/fhir`;

// GET /fhir/metadata — public CapabilityStatement
router.get('/fhir/metadata', (req, res) => {
  res.type(FHIR_CT).json(capabilityStatement(getFhirBase(req)));
});

// GET /fhir/Patient
router.get('/fhir/Patient', protect, (req, res) => {
  let patients = store.patients.findAll();
  if (req.query.identifier) {
    patients = patients.filter((p) => p.patientId === req.query.identifier);
  }
  if (req.query.name) {
    const q = req.query.name.toLowerCase();
    patients = patients.filter((p) => (p.name || '').toLowerCase().includes(q));
  }
  const resources = patients.map((p) => {
    const provider = p.primaryProvider ? store.users.findById(p.primaryProvider) : null;
    return toFHIRPatient(p, provider ? provider._id : null);
  });
  res.type(FHIR_CT).json(toFHIRBundle('Patient', resources, getFhirBase(req)));
});

// GET /fhir/Patient/:id
router.get('/fhir/Patient/:id', protect, (req, res) => {
  const patients = store.patients.findAll();
  const patient = patients.find((p) => p.patientId === req.params.id || p._id === req.params.id);
  if (!patient) {
    return res.status(404).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
    });
  }
  const provider = patient.primaryProvider ? store.users.findById(patient.primaryProvider) : null;
  res.type(FHIR_CT).json(toFHIRPatient(patient, provider ? provider._id : null));
});

// GET /fhir/Practitioner/:id
router.get('/fhir/Practitioner/:id', protect, (req, res) => {
  const user = store.users.findById(req.params.id);
  if (!user) {
    return res.status(404).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Practitioner not found' }],
    });
  }
  res.type(FHIR_CT).json(toFHIRPractitioner(user));
});

// Helper — resolve patient from patientId or _id
const resolveSyntheticPatient = (idParam) => {
  const all = store.patients.findAll();
  return all.find((p) => p.patientId === idParam || p._id === idParam) || null;
};

// GET /fhir/Condition?patient=:id
router.get('/fhir/Condition', protect, (req, res) => {
  if (!req.query.patient) {
    return res.status(400).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: 'patient parameter is required' }],
    });
  }
  const patient = resolveSyntheticPatient(req.query.patient);
  if (!patient) {
    return res.status(404).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
    });
  }
  const patientId = patient.patientId || patient._id;
  const resources = (patient.medicalHistory || []).map((c, i) => toFHIRCondition(c, patientId, i));
  res.type(FHIR_CT).json(toFHIRBundle('Condition', resources, getFhirBase(req)));
});

// GET /fhir/MedicationRequest?patient=:id
router.get('/fhir/MedicationRequest', protect, (req, res) => {
  if (!req.query.patient) {
    return res.status(400).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: 'patient parameter is required' }],
    });
  }
  const patient = resolveSyntheticPatient(req.query.patient);
  if (!patient) {
    return res.status(404).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
    });
  }
  const patientId = patient.patientId || patient._id;
  const resources = (patient.medications || []).map((m, i) => toFHIRMedicationRequest(m, patientId, i));
  res.type(FHIR_CT).json(toFHIRBundle('MedicationRequest', resources, getFhirBase(req)));
});

// GET /fhir/AllergyIntolerance?patient=:id
router.get('/fhir/AllergyIntolerance', protect, (req, res) => {
  if (!req.query.patient) {
    return res.status(400).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: 'patient parameter is required' }],
    });
  }
  const patient = resolveSyntheticPatient(req.query.patient);
  if (!patient) {
    return res.status(404).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
    });
  }
  const patientId = patient.patientId || patient._id;
  const resources = (patient.allergies || []).map((a, i) => toFHIRAllergyIntolerance(a, patientId, i));
  res.type(FHIR_CT).json(toFHIRBundle('AllergyIntolerance', resources, getFhirBase(req)));
});

// GET /fhir/Coverage?patient=:id
router.get('/fhir/Coverage', protect, (req, res) => {
  if (!req.query.patient) {
    return res.status(400).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: 'patient parameter is required' }],
    });
  }
  const patient = resolveSyntheticPatient(req.query.patient);
  if (!patient) {
    return res.status(404).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
    });
  }
  const patientId = patient.patientId || patient._id;
  const resources = patient.insuranceInfo ? [toFHIRCoverage(patient.insuranceInfo, patientId)] : [];
  res.type(FHIR_CT).json(toFHIRBundle('Coverage', resources, getFhirBase(req)));
});

// GET /fhir/ServiceRequest?patient=:id
router.get('/fhir/ServiceRequest', protect, (req, res) => {
  if (!req.query.patient) {
    return res.status(400).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: 'patient parameter is required' }],
    });
  }
  const patient = resolveSyntheticPatient(req.query.patient);
  if (!patient) {
    return res.status(404).type(FHIR_CT).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }],
    });
  }
  const referrals = store.referrals.findAll().filter(
    (r) => r.patient === patient._id || r.patientId === patient._id
  );
  const resources = referrals.map(toFHIRServiceRequest);
  res.type(FHIR_CT).json(toFHIRBundle('ServiceRequest', resources, getFhirBase(req)));
});

// (Prior Authorization routes — see earlier in file, after the admin AI management section)

const _legacyRemoved = [
  {
    _id: 'placeholder',
    diagnosisCodes: [{ code: 'G35', description: 'Multiple sclerosis' }, { code: 'R51', description: 'Headache' }],
    clinicalNotes: 'Patient presents with recurring headaches and vision changes. Neurological symptoms suggest possible demyelinating disease. MRI of brain with contrast required for diagnosis and treatment planning.',
    urgency: 'Urgent',
    insurancePlan: 'Blue Cross Blue Shield',
    memberId: 'BCBS-100001',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 88,
    aiReasoning: 'Clinical presentation is consistent with neurological disorder requiring imaging. Documentation supports medical necessity. Proceed with scheduling the authorized service within the approval window.',
    aiAnalyzedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved based on clinical necessity and AI recommendation.',
    approvedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-002',
    patientId: 'PT-100002',
    patientName: 'Bob Martinez',
    requestingProviderId: 'user-1',
    requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'City Orthopedic Specialists',
    serviceType: 'Physical Therapy',
    serviceCode: '97110',
    diagnosisCodes: [{ code: 'M54.5', description: 'Low back pain' }, { code: 'M47.816', description: 'Spondylosis with radiculopathy, lumbar region' }],
    clinicalNotes: 'Patient has chronic low back pain with lumbar radiculopathy confirmed by EMG. Conservative treatment with PT recommended before considering surgical intervention. 12-week program requested.',
    urgency: 'Routine',
    insurancePlan: 'Aetna',
    memberId: 'AET-200002',
    status: 'Under Review',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 82,
    aiReasoning: 'Physical therapy for lumbar radiculopathy is well-supported by evidence. Documentation adequately establishes medical necessity. Routine request aligns with standard treatment protocols.',
    aiAnalyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: '',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-003',
    patientId: 'PT-100003',
    patientName: 'Carol White',
    requestingProviderId: 'user-2',
    requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Regional Cancer Center',
    serviceType: 'PET Scan',
    serviceCode: '78816',
    diagnosisCodes: [{ code: 'C34.10', description: 'Malignant neoplasm of upper lobe, unspecified bronchus or lung' }],
    clinicalNotes: 'Patient with confirmed Stage II lung cancer. PET scan required for accurate staging and treatment planning. CT showed suspicious mediastinal lymph nodes requiring characterization.',
    urgency: 'Urgent',
    insurancePlan: 'UnitedHealth',
    memberId: 'UHC-300003',
    status: 'Pending',
    aiRecommendation: null,
    aiConfidenceScore: null,
    aiReasoning: '',
    aiAnalyzedAt: null,
    reviewerNotes: '',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-004',
    patientId: 'PT-100004',
    patientName: 'David Kim',
    requestingProviderId: 'user-2',
    requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: '',
    serviceType: 'Cardiac Catheterization',
    serviceCode: '93460',
    diagnosisCodes: [{ code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' }, { code: 'I20.9', description: 'Angina pectoris, unspecified' }],
    clinicalNotes: 'Patient with unstable angina and positive stress test. Cardiac catheterization needed to evaluate coronary anatomy and guide revascularization.',
    urgency: 'Emergent',
    insurancePlan: 'Medicare',
    memberId: 'MCR-400004',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 95,
    aiReasoning: 'Emergent cardiac catheterization for unstable angina with positive stress test meets criteria for urgent authorization. Clinical documentation supports medical necessity.',
    aiAnalyzedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Emergent case approved immediately.',
    approvedDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-005',
    patientId: 'PT-100005',
    patientName: 'Emma Davis',
    requestingProviderId: 'user-3',
    requestingProviderName: 'Dr. Mike Johnson',
    targetProviderName: 'Behavioral Health Associates',
    serviceType: 'Mental Health Services',
    serviceCode: '90837',
    diagnosisCodes: [{ code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate' }, { code: 'F41.1', description: 'Generalized anxiety disorder' }],
    clinicalNotes: 'Patient with treatment-resistant depression and comorbid anxiety. Requires intensive outpatient mental health services. Previous treatments with SSRIs insufficient.',
    urgency: 'Routine',
    insurancePlan: 'Cigna',
    memberId: 'CGN-500005',
    status: 'Denied',
    aiRecommendation: 'Review',
    aiConfidenceScore: 58,
    aiReasoning: 'While mental health services are medically warranted, the documentation does not adequately demonstrate that standard outpatient therapy has been exhausted. Additional clinical documentation is needed.',
    aiAnalyzedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Denied pending additional documentation of prior treatment failure. Please provide therapy notes from previous providers.',
    deniedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-006',
    patientId: 'PT-100006',
    patientName: 'Frank Wilson',
    requestingProviderId: 'user-1',
    requestingProviderName: 'Dr. John Smith',
    targetProviderName: '',
    serviceType: 'Surgical Procedure',
    serviceCode: '27447',
    diagnosisCodes: [{ code: 'M17.11', description: 'Primary osteoarthritis, right knee' }],
    clinicalNotes: 'Patient with severe bilateral knee osteoarthritis, failed conservative management including PT and injections. Total knee replacement recommended for right knee.',
    urgency: 'Routine',
    insurancePlan: 'Humana',
    memberId: 'HUM-600006',
    status: 'Appealing',
    aiRecommendation: 'Review',
    aiConfidenceScore: 67,
    aiReasoning: 'Surgical procedure requires additional documentation of failed conservative treatments. Submit additional clinical documentation.',
    aiAnalyzedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Denied initially due to insufficient documentation of conservative treatment failure.',
    deniedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    appealNotes: 'Attaching 18 months of PT records, 3 corticosteroid injections, and 2 orthopaedic consultations demonstrating failed conservative management.',
    appealSubmittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-007',
    patientId: 'PT-100007',
    patientName: 'Grace Lee',
    requestingProviderId: 'user-2',
    requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Advanced Oncology Partners',
    serviceType: 'Infusion Therapy',
    serviceCode: '96413',
    diagnosisCodes: [
      { code: 'C50.911', description: 'Malignant neoplasm of unspecified site of right female breast' },
      { code: 'Z79.899', description: 'Other long-term drug therapy' }
    ],
    clinicalNotes: 'Patient is a 52-year-old female with Stage III breast cancer on active chemotherapy regimen (Adriamycin + Cyclophosphamide). Requesting prior auth for 4 cycles of IV infusion therapy at outpatient oncology center. Tumor markers show response to treatment. Continuation of regimen is medically necessary.',
    urgency: 'Urgent',
    insurancePlan: 'Kaiser Permanente',
    memberId: 'KP-700007',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 93,
    aiReasoning: 'Chemotherapy infusion for active Stage III breast cancer meets all criteria for prior authorization. Documented treatment response supports continuation. Proceed with scheduling the authorized service.',
    aiAnalyzedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved. Treatment response documented. Authorize 4 cycles.',
    approvedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 87 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-008',
    patientId: 'PT-100008',
    patientName: 'Henry Thompson',
    requestingProviderId: 'user-3',
    requestingProviderName: 'Dr. Mike Johnson',
    targetProviderName: 'Westside Sleep Disorders Clinic',
    serviceType: 'Sleep Study',
    serviceCode: '95810',
    diagnosisCodes: [
      { code: 'G47.33', description: 'Obstructive sleep apnea (adult)' },
      { code: 'R06.83', description: 'Snoring' }
    ],
    clinicalNotes: 'Patient reports excessive daytime sleepiness, loud snoring, and witnessed apneas per spouse. Epworth Sleepiness Scale score 16/24. BMI 34.2. Overnight polysomnography requested to confirm OSA diagnosis and titrate CPAP therapy.',
    urgency: 'Routine',
    insurancePlan: 'Anthem',
    memberId: 'ANT-800008',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 85,
    aiReasoning: 'Clinical presentation with high Epworth score, BMI, and witnessed apneas strongly supports medical necessity for polysomnography. Documentation meets insurance criteria.',
    aiAnalyzedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved. ESS score and clinical findings meet criteria.',
    approvedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-009',
    patientId: 'PT-100009',
    patientName: 'Isabella Garcia',
    requestingProviderId: 'user-1',
    requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'Metro Spine Institute',
    serviceType: 'Epidural Steroid Injection',
    serviceCode: '62323',
    diagnosisCodes: [
      { code: 'M51.16', description: 'Intervertebral disc degeneration, lumbar region' },
      { code: 'M54.4', description: 'Lumbago with sciatica, right side' }
    ],
    clinicalNotes: 'Patient has refractory lumbar radiculopathy with right-sided sciatica unresponsive to 8 weeks of physical therapy and oral NSAIDs. MRI confirms L4-L5 disc herniation with nerve root compression. Epidural steroid injection recommended for pain management and to avoid surgical intervention.',
    urgency: 'Routine',
    insurancePlan: 'Aetna',
    memberId: 'AET-900009',
    status: 'Pending',
    aiRecommendation: null,
    aiConfidenceScore: null,
    aiReasoning: '',
    aiAnalyzedAt: null,
    reviewerNotes: '',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-010',
    patientId: 'PT-100010',
    patientName: 'James Brown',
    requestingProviderId: 'user-2',
    requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Pediatric Neurology Associates',
    serviceType: 'Specialist Consultation',
    serviceCode: '99244',
    diagnosisCodes: [
      { code: 'G40.909', description: 'Epilepsy, unspecified, not intractable, without status epilepticus' },
      { code: 'R56.9', description: 'Unspecified convulsions' }
    ],
    clinicalNotes: 'Patient is a 9-year-old male presenting with new-onset seizure activity. Two witnessed tonic-clonic episodes in the past month. EEG shows abnormal epileptiform discharges. Referral to pediatric neurologist required for seizure classification and management plan.',
    urgency: 'Urgent',
    insurancePlan: 'Blue Cross Blue Shield',
    memberId: 'BCBS-101010',
    status: 'Under Review',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 91,
    aiReasoning: 'New-onset pediatric epilepsy with confirmed EEG abnormalities requires urgent specialist evaluation. Clinical documentation clearly establishes medical necessity for neurology consultation.',
    aiAnalyzedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: '',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-011',
    patientId: 'PT-100011',
    patientName: 'Karen Martinez',
    requestingProviderId: 'user-3',
    requestingProviderName: 'Dr. Mike Johnson',
    targetProviderName: 'Regional Bariatric Center',
    serviceType: 'Surgical Procedure',
    serviceCode: '43644',
    diagnosisCodes: [
      { code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories' },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
      { code: 'I10', description: 'Essential (primary) hypertension' }
    ],
    clinicalNotes: 'Patient is a 41-year-old female with morbid obesity (BMI 43.8), type 2 diabetes, and hypertension. Has completed 6-month medically supervised weight loss program without sufficient response. Laparoscopic gastric bypass surgery requested. Psychological evaluation and nutritional counseling completed. Patient meets NIH criteria for bariatric surgery.',
    urgency: 'Routine',
    insurancePlan: 'UnitedHealth',
    memberId: 'UHC-111011',
    status: 'Denied',
    aiRecommendation: 'Review',
    aiConfidenceScore: 62,
    aiReasoning: 'While BMI and comorbidities meet surgical criteria, the documentation of the 6-month supervised weight loss program requires additional verification. Submit additional clinical documentation of supervised program completion.',
    aiAnalyzedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Denied — supervised diet program documentation is incomplete. Monthly weigh-in records and provider notes for all 6 months required.',
    deniedDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-012',
    patientId: 'PT-100012',
    patientName: 'Liam Anderson',
    requestingProviderId: 'user-1',
    requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'City Cardiology Group',
    serviceType: 'CT Scan',
    serviceCode: '71250',
    diagnosisCodes: [
      { code: 'R05.9', description: 'Cough, unspecified' },
      { code: 'R04.2', description: 'Haemoptysis' },
      { code: 'Z87.891', description: 'Personal history of nicotine dependence' }
    ],
    clinicalNotes: 'Patient is a 58-year-old male with 30 pack-year smoking history presenting with 6-week history of persistent cough and one episode of hemoptysis. Chest X-ray shows right upper lobe opacity. Low-dose CT chest required for lung cancer screening and characterization of opacity. High clinical suspicion for malignancy.',
    urgency: 'Urgent',
    insurancePlan: 'Medicare',
    memberId: 'MCR-121212',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 96,
    aiReasoning: 'Hemoptysis with chest X-ray opacity in a heavy smoker constitutes high clinical suspicion for lung malignancy. CT chest is medically necessary and meets Medicare low-dose CT screening criteria. Proceed with scheduling.',
    aiAnalyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved immediately. High-priority case.',
    approvedDate: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-013',
    patientId: 'PT-100013',
    patientName: 'Mia Robinson',
    requestingProviderId: 'user-2',
    requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Reproductive Endocrinology Associates',
    serviceType: 'Lab Testing',
    serviceCode: '89264',
    diagnosisCodes: [
      { code: 'N97.9', description: 'Female infertility, unspecified' },
      { code: 'E28.2', description: 'Polycystic ovarian syndrome' }
    ],
    clinicalNotes: 'Patient is a 33-year-old female with PCOS and 18 months of primary infertility. Requesting comprehensive fertility panel including AMH, FSH, LH, estradiol, antral follicle count, and semen analysis for partner. Baseline evaluation required before initiating IUI or IVF treatment protocol.',
    urgency: 'Routine',
    insurancePlan: 'Cigna',
    memberId: 'CGN-131313',
    status: 'Pending',
    aiRecommendation: null,
    aiConfidenceScore: null,
    aiReasoning: '',
    aiAnalyzedAt: null,
    reviewerNotes: '',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-014',
    patientId: 'PT-100014',
    patientName: 'Noah Clark',
    requestingProviderId: 'user-3',
    requestingProviderName: 'Dr. Mike Johnson',
    targetProviderName: 'Comprehensive Rehab Center',
    serviceType: 'Occupational Therapy',
    serviceCode: '97530',
    diagnosisCodes: [
      { code: 'I63.9', description: 'Cerebral infarction, unspecified' },
      { code: 'G81.90', description: 'Hemiplegia, unspecified, affecting unspecified side' }
    ],
    clinicalNotes: 'Patient is a 67-year-old male recovering from ischemic stroke 3 weeks ago with residual left-sided hemiplegia and significant ADL deficits. Occupational therapy required for upper extremity retraining, ADL adaptation, and cognitive rehabilitation. FIM score 62. Requesting 30 sessions over 10 weeks.',
    urgency: 'Urgent',
    insurancePlan: 'Medicare',
    memberId: 'MCR-141414',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 94,
    aiReasoning: 'Post-stroke occupational therapy with documented FIM score and functional deficits clearly meets medical necessity criteria. Acute recovery phase supports urgent authorization for comprehensive rehabilitation.',
    aiAnalyzedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved. Post-stroke rehab is medically necessary. Authorize 30 sessions.',
    approvedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 88 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-015',
    patientId: 'PT-100015',
    patientName: 'Olivia Harris',
    requestingProviderId: 'user-1',
    requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'Endocrine Specialty Clinic',
    serviceType: 'Durable Medical Equipment',
    serviceCode: 'E0784',
    diagnosisCodes: [
      { code: 'E10.649', description: 'Type 1 diabetes mellitus with hypoglycemia without coma' },
      { code: 'Z96.41', description: 'Presence of insulin pump' }
    ],
    clinicalNotes: 'Patient is a 28-year-old female with Type 1 diabetes, currently on insulin pump therapy with frequent hypoglycemic episodes (>3/week). Requesting authorization for continuous glucose monitor (CGM) to improve glycemic control and reduce hypoglycemia risk. HbA1c 8.9%. Patient has demonstrated motivation and ability to use CGM technology.',
    urgency: 'Routine',
    insurancePlan: 'Blue Cross Blue Shield',
    memberId: 'BCBS-151515',
    status: 'Under Review',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 87,
    aiReasoning: 'CGM for Type 1 diabetes with documented hypoglycemic episodes and elevated HbA1c meets standard criteria for authorization. Insulin pump use confirms advanced diabetes management need.',
    aiAnalyzedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: '',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-016',
    patientId: 'PT-100016',
    patientName: 'Peter Williams',
    requestingProviderId: 'user-2',
    requestingProviderName: 'Dr. Sarah Chen',
    targetProviderName: 'Gastroenterology Specialists',
    serviceType: 'Colonoscopy',
    serviceCode: '45378',
    diagnosisCodes: [
      { code: 'K92.1', description: 'Melaena' },
      { code: 'Z80.0', description: 'Family history of malignant neoplasm of digestive organs' }
    ],
    clinicalNotes: 'Patient is a 52-year-old male presenting with 2-week history of dark stools consistent with melena. Family history of colon cancer (father at age 55). Hemoglobin 10.2 g/dL (down from 13.8 three months ago). Colonoscopy urgently needed to evaluate source of GI bleeding and rule out colorectal malignancy.',
    urgency: 'Urgent',
    insurancePlan: 'Anthem',
    memberId: 'ANT-161616',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 98,
    aiReasoning: 'Active GI bleeding with anemia and family history of colorectal cancer represents an urgent indication for colonoscopy. Documentation strongly supports medical necessity. Immediate authorization recommended.',
    aiAnalyzedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved urgently. Active bleeding requiring immediate evaluation.',
    approvedDate: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'pa-017',
    patientId: 'PT-100001',
    patientName: 'Alice Johnson',
    requestingProviderId: 'user-1',
    requestingProviderName: 'Dr. John Smith',
    targetProviderName: 'NeuroRehab Specialists',
    serviceType: 'Speech Therapy',
    serviceCode: '92507',
    diagnosisCodes: [
      { code: 'G35', description: 'Multiple sclerosis' },
      { code: 'R47.1', description: 'Dysarthria and anarthria' }
    ],
    clinicalNotes: 'Patient with confirmed MS now presenting with progressive dysarthria affecting communication. Speech-language pathology evaluation and treatment requested. Patient currently scores 3/7 on Dysarthria Impact Profile. Weekly sessions for 12 weeks requested for motor speech rehabilitation.',
    urgency: 'Routine',
    insurancePlan: 'Blue Cross Blue Shield',
    memberId: 'BCBS-100001',
    status: 'Expired',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 83,
    aiReasoning: 'Speech therapy for MS-related dysarthria is clinically indicated. Functional communication impact documented with standardized tool. Approval criteria met.',
    aiAnalyzedAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
    reviewerNotes: 'Approved. 12 sessions authorized.',
    approvedDate: new Date(Date.now() - 94 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 97 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

router.get('/prior-auth', protect, (req, res) => {
  const { status, page = 0, limit = 20 } = req.query;
  let results = [...syntheticPAs];
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    results = results.filter(p => p.requestingProviderId === req.user.id || p.requestingProviderId === 'user-1');
  }
  if (status && status !== 'all') results = results.filter(p => p.status === status);
  const total = results.length;
  const paginated = results.slice(parseInt(page) * parseInt(limit), (parseInt(page) + 1) * parseInt(limit));
  res.json({ success: true, data: { priorAuths: paginated, total } });
});

router.get('/prior-auth/:id', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: pa });
});

router.post('/prior-auth', protect, (req, res) => {
  const { analyzePriorAuthorization } = require('../services/azureAIService');
  const newPA = {
    _id: 'pa-' + Date.now(),
    ...req.body,
    requestingProviderId: req.user.id,
    requestingProviderName: req.user.name || req.user.email,
    status: 'Pending',
    aiRecommendation: null,
    aiConfidenceScore: null,
    aiReasoning: '',
    aiAnalyzedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  syntheticPAs.push(newPA);
  analyzePriorAuthorization(newPA).then(aiResult => {
    newPA.aiRecommendation = aiResult.recommendation;
    newPA.aiConfidenceScore = aiResult.confidenceScore;
    newPA.aiReasoning = aiResult.reasoning;
    newPA.aiAnalyzedAt = new Date().toISOString();
    newPA.status = 'Under Review';
  }).catch(() => {});
  res.status(201).json({ success: true, data: newPA });
});

router.post('/prior-auth/:id/appeal', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  pa.status = 'Appealing';
  pa.appealNotes = req.body.appealNotes || '';
  pa.appealSubmittedAt = new Date().toISOString();
  pa.updatedAt = new Date().toISOString();
  res.json({ success: true, data: pa });
});

router.post('/prior-auth/:id/analyze', protect, (req, res) => {
  const { analyzePriorAuthorization } = require('../services/azureAIService');
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  analyzePriorAuthorization(pa).then(aiResult => {
    pa.aiRecommendation = aiResult.recommendation;
    pa.aiConfidenceScore = aiResult.confidenceScore;
    pa.aiReasoning = aiResult.reasoning;
    pa.aiAnalyzedAt = new Date().toISOString();
    pa.updatedAt = new Date().toISOString();
    res.json({ success: true, data: { ...aiResult, pa } });
  }).catch(err => res.status(500).json({ success: false, error: err.message }));
});

// Admin prior-auth routes (synthetic)
router.get('/admin/prior-auth', protect, (req, res) => {
  const { status, search = '', page = 0, limit = 20 } = req.query;
  let results = [...syntheticPAs];
  if (status && status !== 'all') results = results.filter(p => p.status === status);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(p =>
      p.patientName?.toLowerCase().includes(q) ||
      p.serviceType?.toLowerCase().includes(q) ||
      p.requestingProviderName?.toLowerCase().includes(q)
    );
  }
  const total = results.length;
  const paginated = results.slice(parseInt(page) * parseInt(limit), (parseInt(page) + 1) * parseInt(limit));
  const statMap = { Pending: 0, 'Under Review': 0, Approved: 0, Denied: 0, Appealing: 0, Expired: 0 };
  syntheticPAs.forEach(p => { if (statMap[p.status] !== undefined) statMap[p.status]++; });
  res.json({ success: true, data: { priorAuths: paginated, total, stats: statMap } });
});

router.get('/admin/prior-auth/:id', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: pa });
});

router.put('/admin/prior-auth/:id/review', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  const { decision, reviewerNotes } = req.body;
  pa.status = decision;
  pa.reviewerNotes = reviewerNotes || '';
  pa.reviewedAt = new Date().toISOString();
  if (decision === 'Approved') {
    pa.approvedDate = new Date().toISOString();
    const exp = new Date(); exp.setDate(exp.getDate() + 90);
    pa.expiryDate = exp.toISOString();
  } else {
    pa.deniedDate = new Date().toISOString();
  }
  pa.updatedAt = new Date().toISOString();
  res.json({ success: true, data: pa });
});

router.put('/admin/prior-auth/:id/appeal-review', protect, (req, res) => {
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  const { outcome, reviewerNotes } = req.body;
  pa.status = outcome;
  pa.appealOutcome = outcome;
  pa.appealReviewedAt = new Date().toISOString();
  pa.reviewerNotes = reviewerNotes || pa.reviewerNotes;
  pa.updatedAt = new Date().toISOString();
  res.json({ success: true, data: pa });
});

router.post('/admin/prior-auth/:id/analyze', protect, (req, res) => {
  const { analyzePriorAuthorization } = require('../services/azureAIService');
  const pa = syntheticPAs.find(p => p._id === req.params.id);
  if (!pa) return res.status(404).json({ success: false, error: 'Not found' });
  analyzePriorAuthorization(pa).then(aiResult => {
    pa.aiRecommendation = aiResult.recommendation;
    pa.aiConfidenceScore = aiResult.confidenceScore;
    pa.aiReasoning = aiResult.reasoning;
    pa.aiAnalyzedAt = new Date().toISOString();
    pa.updatedAt = new Date().toISOString();
    res.json({ success: true, data: { ...aiResult, pa } });
  }).catch(err => res.status(500).json({ success: false, error: err.message }));
});

// ---------------------------------------------------------------------------
// GraphQL stub (returns helpful message when DB is unavailable)
// ---------------------------------------------------------------------------

router.use('/graphql', (req, res) => {
  res.status(503).json({
    errors: [{ message: 'GraphQL is unavailable in synthetic data mode. The REST API is fully functional.' }],
  });
});

// ── NPI lookup (synthetic) ──────────────────────────────────────────────────
const SYNTHETIC_NPIS = {
  '1234567890': {
    npi: '1234567890', enumerationType: 'NPI-1',
    firstName: 'James', lastName: 'Wilson', name: 'James Wilson',
    credential: 'MD', gender: 'M', organizationName: '',
    specialty: 'Internal Medicine', taxonomyCode: '207R00000X',
    licenseNumber: 'MD123456', licenseState: 'NY',
    address: { line1: '123 Medical Plaza', line2: 'Suite 400', city: 'New York', state: 'NY', zip: '10001', phone: '212-555-0101', fax: '' },
  },
  '9876543210': {
    npi: '9876543210', enumerationType: 'NPI-1',
    firstName: 'Emily', lastName: 'Chen', name: 'Emily Chen',
    credential: 'MD', gender: 'F', organizationName: '',
    specialty: 'Cardiology', taxonomyCode: '207RC0000X',
    licenseNumber: 'MD654321', licenseState: 'CA',
    address: { line1: '456 Heart Center Blvd', line2: '', city: 'Los Angeles', state: 'CA', zip: '90001', phone: '310-555-0202', fax: '' },
  },
  '1111111111': {
    npi: '1111111111', enumerationType: 'NPI-1',
    firstName: 'Michael', lastName: 'Patel', name: 'Michael Patel',
    credential: 'DO', gender: 'M', organizationName: '',
    specialty: 'Neurology', taxonomyCode: '2084N0400X',
    licenseNumber: 'DO111111', licenseState: 'TX',
    address: { line1: '789 Neuro Way', line2: '', city: 'Houston', state: 'TX', zip: '77001', phone: '713-555-0303', fax: '' },
  },
};

router.get('/npi/lookup/:npi', (req, res) => {
  const { npi } = req.params;
  if (!/^\d{10}$/.test(npi)) {
    return res.status(400).json({ success: false, error: 'NPI must be a 10-digit number' });
  }
  const data = SYNTHETIC_NPIS[npi];
  if (!data) {
    return res.status(404).json({ success: false, error: 'NPI not found in the NPPES registry' });
  }
  res.json({ success: true, alreadyRegistered: false, data });
});

// ── Onboarding (synthetic) ──────────────────────────────────────────────────
const syntheticProfiles = {};

router.get('/onboarding/status', protect, (req, res) => {
  const profile = syntheticProfiles[req.user.id] || {
    onboardingStatus: req.user.onboardingStatus || 'pending_email',
    steps: { profile_created: true, email_verified: false, profile_reviewed: false, docs_uploaded: false, first_patient: false, first_referral: false, colleague_invited: false },
    kycStatus: 'pending_email', npi: null, hasDoc: false,
  };
  res.json({ success: true, data: profile });
});

router.get('/auth/verify-email', (req, res) => {
  res.json({ success: true, message: 'Email verified successfully.' });
});

router.post('/auth/resend-verification', protect, (req, res) => {
  logger.info(`[SYNTHETIC] Resend verification email to ${req.user.email}`);
  res.json({ success: true, message: 'Verification email sent.' });
});

router.patch('/onboarding/profile', protect, (req, res) => {
  if (!syntheticProfiles[req.user.id]) syntheticProfiles[req.user.id] = { steps: { profile_created: true } };
  syntheticProfiles[req.user.id].steps.profile_reviewed = true;
  res.json({ success: true, data: syntheticProfiles[req.user.id] });
});

router.post('/onboarding/documents', protect, (req, res) => {
  if (!syntheticProfiles[req.user.id]) syntheticProfiles[req.user.id] = { steps: { profile_created: true } };
  syntheticProfiles[req.user.id].steps.docs_uploaded = true;
  syntheticProfiles[req.user.id].kycStatus = 'under_review';
  res.json({ success: true, message: 'Documents submitted.' });
});

router.patch('/onboarding/steps/:step', protect, (req, res) => {
  if (!syntheticProfiles[req.user.id]) syntheticProfiles[req.user.id] = { steps: { profile_created: true } };
  syntheticProfiles[req.user.id].steps[req.params.step] = true;
  res.json({ success: true, data: syntheticProfiles[req.user.id] });
});

router.post('/onboarding/invite', protect, (req, res) => {
  res.json({ success: true, message: `Invite sent to ${req.body.email}` });
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ANALYTICS — dashboard endpoints
// ═══════════════════════════════════════════════════════════════════════════

router.get('/admin/analytics/platform-health', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    data: {
      activeProviders: { count: 4, total: 5 },
      referralsThisMonth: { count: 12, trend: 15 },
      appointmentsThisWeek: { scheduled: 8, completed: 5 },
      priorAuthPending: { count: 3, overdueCount: 1 },
      dtxActivePrescriptions: { count: 5 },
      tokensInCirculation: { total: 1235, issuedThisMonth: 145 },
    },
  });
});

router.get('/admin/analytics/alerts', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    data: [
      { type: 'prior_auth_overdue', severity: 'error', message: '1 prior auth request pending > 7 days without a decision', count: 1, link: '/admin/prior-auth' },
      { type: 'referral_stale', severity: 'warning', message: '2 referrals stuck in pending > 14 days with no provider response', count: 2, link: '/admin/referrals' },
      { type: 'provider_inactive', severity: 'warning', message: '1 provider with no login activity this month', count: 1, link: '/admin/users' },
      { type: 'dtx_unused', severity: 'info', message: '3 active DTx programs with 0 prescriptions — consider catalog review', count: 3, link: '/admin/dtx' },
    ],
  });
});

router.get('/admin/analytics/care-funnel', protect, authorize('admin', 'superadmin'), (req, res) => {
  const stages = [
    { stage: 'Referrals Created', count: 47, color: '#1976d2', dropoffPct: null },
    { stage: 'Referrals Accepted', count: 38, color: '#0288d1', dropoffPct: 19 },
    { stage: 'Appointments Booked', count: 31, color: '#00897b', dropoffPct: 18 },
    { stage: 'Appointments Completed', count: 25, color: '#388e3c', dropoffPct: 19 },
    { stage: 'DTx Prescribed', count: 12, color: '#7b1fa2', dropoffPct: 52 },
    { stage: 'DTx Completed', count: 7, color: '#f57c00', dropoffPct: 42 },
  ];
  res.json({ success: true, data: stages });
});

router.get('/admin/analytics/activity-feed', protect, authorize('admin', 'superadmin'), (req, res) => {
  const now = Date.now();
  const feed = [
    { type: 'appointment', title: 'Appointment completed', description: 'James Wilson with Dr. John Smith — follow_up', timestamp: new Date(now - 1200000), link: '/admin/appointments' },
    { type: 'referral', title: 'Referral accepted', description: 'Neurology referral for Thomas Brown', timestamp: new Date(now - 3600000), link: '/admin/referrals' },
    { type: 'dtx', title: 'DTx active', description: 'Emily Rodriguez — Calm Mind CBT Program', timestamp: new Date(now - 7200000), link: '/admin/dtx' },
    { type: 'prior_auth', title: 'Prior Auth Approved', description: 'James Wilson — Cardiology consultation', timestamp: new Date(now - 10800000), link: '/admin/prior-auth' },
    { type: 'appointment', title: 'Appointment confirmed', description: 'Thomas Brown with Dr. Michael Chen — new_patient', timestamp: new Date(now - 14400000), link: '/admin/appointments' },
    { type: 'ambient', title: 'Ambient AI approved', description: 'Chest pain assessment — Dr. John Smith', timestamp: new Date(now - 18000000), link: '/admin/ambient-sessions' },
    { type: 'referral', title: 'Referral completed', description: 'Cardiology referral for James Wilson', timestamp: new Date(now - 21600000), link: '/admin/referrals' },
    { type: 'dtx', title: 'DTx prescribed', description: 'Thomas Brown — DiaBetter Metabolic Program', timestamp: new Date(now - 28800000), link: '/admin/dtx' },
    { type: 'appointment', title: 'Appointment no_show', description: 'Emily Rodriguez with Dr. Robert Williams', timestamp: new Date(now - 36000000), link: '/admin/appointments' },
    { type: 'prior_auth', title: 'Prior Auth Pending', description: 'Thomas Brown — Neurology follow-up', timestamp: new Date(now - 43200000), link: '/admin/prior-auth' },
  ];
  res.json({ success: true, data: feed });
});

router.get('/admin/analytics/platform-overview', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    data: {
      dtx: { activePrograms: 10, prescriptionsThisMonth: 7, completionRate: 43, tokensAwarded: 120 },
      priorAuth: { submitted: 10, pending: 3, approved: 5, denied: 2, avgTurnaroundDays: 4.2 },
      engagement: { sent: 48, deliveryRate: 94 },
      ambientAI: { sessionsThisMonth: 8, approvedThisMonth: 6, approvalRate: 75 },
    },
  });
});

router.get('/admin/analytics/provider-performance', protect, authorize('admin', 'superadmin'), (req, res) => {
  const providers = store.users.findAll().filter(u => ['doctor', 'nurse', 'provider'].includes(u.role));
  const data = providers.map((p, i) => ({
    id: p._id,
    name: p.name,
    specialty: p.specialty,
    organization: p.organization,
    referrals: [8, 12, 6, 10][i] || 5,
    acceptanceRate: [0.87, 0.92, 0.78, 0.83][i] || 0.8,
    avgResponseTime: [22, 18, 30, 24][i] || 24,
    tokenBalance: p.tokenBalance || 0,
    tokenEarnedThisMonth: [45, 60, 30, 50][i] || 25,
    dtxPrescriptions: [3, 5, 2, 4][i] || 1,
    appointmentsTotal: [16, 20, 12, 18][i] || 10,
    appointmentsCompleted: [13, 18, 9, 15][i] || 8,
    noShowRate: [12, 5, 18, 8][i] || 10,
  }));
  res.json({ success: true, data });
});

router.get('/admin/analytics/referral-conversion', protect, authorize('admin', 'superadmin'), (req, res) => {
  const period = req.query.period || 'last6months';
  const numMonths = period === 'last3months' ? 3 : period === 'lastyear' ? 12 : 6;
  const base = [
    { sent: 8, accepted: 7, completed: 5 },
    { sent: 10, accepted: 8, completed: 6 },
    { sent: 7, accepted: 6, completed: 5 },
    { sent: 12, accepted: 10, completed: 8 },
    { sent: 9, accepted: 7, completed: 6 },
    { sent: 11, accepted: 9, completed: 7 },
    { sent: 13, accepted: 11, completed: 9 },
    { sent: 8, accepted: 7, completed: 5 },
    { sent: 10, accepted: 9, completed: 7 },
    { sent: 14, accepted: 12, completed: 10 },
    { sent: 11, accepted: 9, completed: 8 },
    { sent: 12, accepted: 10, completed: 8 },
  ];
  const data = Array.from({ length: numMonths }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (numMonths - 1 - i));
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const b = base[i % base.length];
    return { month: label, ...b };
  });
  const totals = data.reduce((a, m) => ({ sent: a.sent + m.sent, accepted: a.accepted + m.accepted, completed: a.completed + m.completed }), { sent: 0, accepted: 0, completed: 0 });
  res.json({
    success: true, data,
    meta: {
      ...totals,
      acceptanceRate: Math.round((totals.accepted / totals.sent) * 100),
      completionRate: Math.round((totals.completed / totals.accepted) * 100),
      overallConversion: Math.round((totals.completed / totals.sent) * 100),
      referralToApptRate: 68,
      rejectionReasons: [
        { reason: 'Insurance not accepted', count: 4 },
        { reason: 'At capacity', count: 3 },
        { reason: 'Incomplete referral info', count: 2 },
        { reason: 'Out of specialty scope', count: 1 },
      ],
    },
  });
});

router.get('/admin/analytics/token-economy', protect, authorize('admin', 'superadmin'), (req, res) => {
  const period = req.query.period || 'last6months';
  const numMonths = period === 'last3months' ? 3 : period === 'lastyear' ? 12 : 6;
  const base = [35, 42, 38, 55, 48, 62, 70, 45, 58, 75, 63, 80];
  let running = 800;
  const data = Array.from({ length: numMonths }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (numMonths - 1 - i));
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const issued = base[i % base.length];
    const redeemed = Math.floor(issued * 0.35);
    running = Math.max(0, running + issued - redeemed);
    return { month: label, issued, redeemed, circulation: running };
  });
  res.json({
    success: true, data,
    meta: {
      totalIssued: data.reduce((s, m) => s + m.issued, 0),
      totalRedeemed: data.reduce((s, m) => s + m.redeemed, 0),
      currentCirculation: data[data.length - 1]?.circulation || 0,
      leaderboard: [
        { rank: 1, name: 'Dr. Michael Chen', specialty: 'Neurology', balance: 420 },
        { rank: 2, name: 'Dr. John Smith', specialty: 'Cardiology', balance: 350 },
        { rank: 3, name: 'Dr. Robert Williams', specialty: 'General Practice', balance: 290 },
        { rank: 4, name: 'Nurse Sarah Johnson', specialty: 'Pediatric Nursing', balance: 175 },
      ],
      breakdown: { referral: 380, appointment: 290, dtx: 120, other: 210 },
    },
  });
});

router.get('/admin/analytics/ai-performance', protect, authorize('admin', 'superadmin'), (req, res) => {
  const months = ['Jan 25', 'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25'];
  const usage = months.map((month, i) => ({
    month,
    ambientSessions: [3, 5, 4, 7, 8, 10][i],
    matchSessions: [5, 8, 7, 10, 12, 15][i],
    recommendationEngine: [5, 8, 7, 10, 12, 15][i],
  }));
  res.json({
    success: true,
    data: {
      accuracy: { riskAssessment: 0.87, summaryGeneration: 0.92, recommendationEngine: 0.85 },
      ambientAI: { total: 37, approved: 28, rejected: 5, pending: 4, approvalRate: 76 },
      referralMatching: { sessions: 57, withSelection: 48, selectionRate: 84, avgMatchScore: 78.4 },
      usage,
      falsePositives: 12,
      falseNegatives: 8,
      improvementRate: 0.082,
    },
  });
});

// ── PROVIDER SECURE MESSAGING ─────────────────────────────────────────────────
// In-memory thread store for synthetic mode.
const syntheticMessages = [
  // Thread 1 — referral ref-001 (Dr. John Smith ↔ Dr. Michael Chen)
  {
    _id: 'msg-001', referralId: 'ref-001',
    senderId: 'user-2', senderName: 'Dr. John Smith', senderRole: 'doctor',
    receiverId: 'user-4', receiverName: 'Dr. Michael Chen',
    content: "Hi Dr. Chen, I'm referring Alice Johnson for an orthopedic consult. She's been experiencing knee pain for 3 months. Please review the attached imaging.",
    readAt: new Date(Date.now() - 82800000), createdAt: new Date(Date.now() - 86400000),
  },
  {
    _id: 'msg-002', referralId: 'ref-001',
    senderId: 'user-4', senderName: 'Dr. Michael Chen', senderRole: 'doctor',
    receiverId: 'user-2', receiverName: 'Dr. John Smith',
    content: "Thanks Dr. Smith, I've reviewed the X-rays. Consistent with moderate medial compartment OA. I'll schedule her for next Tuesday. Any contraindications to intra-articular injections?",
    readAt: new Date(Date.now() - 79200000), createdAt: new Date(Date.now() - 82800000),
  },
  {
    _id: 'msg-003', referralId: 'ref-001',
    senderId: 'user-2', senderName: 'Dr. John Smith', senderRole: 'doctor',
    receiverId: 'user-4', receiverName: 'Dr. Michael Chen',
    content: "No contraindications. She's on warfarin (INR 2.1 last week) — please coordinate with hematology before any injection. Her INR target is 2.0–3.0.",
    readAt: null, createdAt: new Date(Date.now() - 3600000),
  },
  // Thread 2 — referral ref-002 (Dr. Sarah Johnson ↔ Dr. Emily Rodriguez)
  {
    _id: 'msg-004', referralId: 'ref-002',
    senderId: 'user-3', senderName: 'Dr. Sarah Johnson', senderRole: 'doctor',
    receiverId: 'user-5', receiverName: 'Dr. Emily Rodriguez',
    content: "Dr. Rodriguez, Bob Williams needs a behavioral health evaluation. He's been presenting with increased anxiety post his neuro diagnosis. Do you have capacity this month?",
    readAt: new Date(Date.now() - 43200000), createdAt: new Date(Date.now() - 48000000),
  },
  {
    _id: 'msg-005', referralId: 'ref-002',
    senderId: 'user-5', senderName: 'Dr. Emily Rodriguez', senderRole: 'doctor',
    receiverId: 'user-3', receiverName: 'Dr. Sarah Johnson',
    content: "Yes, I can take him. I have an opening Thursday at 2 PM. I'll also initiate the DTx AnxietyFree program as adjunct therapy. Please send over his full psych history if available.",
    readAt: null, createdAt: new Date(Date.now() - 7200000),
  },
  // Thread 3 — referral ref-004 (Dr. Emily Rodriguez ↔ Dr. John Smith)
  {
    _id: 'msg-006', referralId: 'ref-004',
    senderId: 'user-5', senderName: 'Dr. Emily Rodriguez', senderRole: 'doctor',
    receiverId: 'user-2', receiverName: 'Dr. John Smith',
    content: "Dr. Smith, quick note on David Brown's cardiology referral — patient mentioned he had a reaction to beta-blockers in 2019. I don't see this documented in the referral form. Can you confirm?",
    readAt: null, createdAt: new Date(Date.now() - 1800000),
  },
];

const _buildThreadSummary = (messages, requestingUserId) => {
  const byReferral = {};
  for (const m of messages) {
    if (!byReferral[m.referralId]) byReferral[m.referralId] = [];
    byReferral[m.referralId].push(m);
  }
  return Object.entries(byReferral).map(([referralId, msgs]) => {
    const sorted = msgs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const lastMessage = sorted[0];
    const unreadCount = msgs.filter(
      (m) => m.receiverId === requestingUserId && !m.readAt
    ).length;
    return { _id: referralId, lastMessage, totalMessages: msgs.length, unreadCount };
  }).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
};

// GET /api/messages/threads — provider inbox
router.get('/messages/threads', protect, (req, res) => {
  const uid = req.user._id || req.user.id;
  const userThreads = syntheticMessages.filter(
    (m) => m.senderId === uid || m.receiverId === uid
  );
  // If user isn't a participant in any thread, show all threads (demo mode)
  const filtered = userThreads.length > 0 ? userThreads : syntheticMessages;
  res.json({ success: true, data: _buildThreadSummary(filtered, uid) });
});

// GET /api/messages/threads/:referralId — full conversation
router.get('/messages/threads/:referralId', protect, (req, res) => {
  const { referralId } = req.params;
  const messages = syntheticMessages
    .filter((m) => m.referralId === referralId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Mark as read
  const uid = req.user._id || req.user.id;
  syntheticMessages.forEach((m) => {
    if (m.referralId === referralId && m.receiverId === uid && !m.readAt) {
      m.readAt = new Date();
    }
  });

  const referralMeta = {
    _id: referralId,
    reason: 'Specialist consultation',
    status: 'accepted',
    patient: { name: 'See referral record' },
  };
  res.json({ success: true, data: { referral: referralMeta, messages } });
});

// POST /api/messages/threads/:referralId — send message
router.post('/messages/threads/:referralId', protect, (req, res) => {
  const { referralId } = req.params;
  const { content, receiverId, receiverName } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: 'Content is required' });
  }
  const uid = String(req.user._id || req.user.id);
  const newMsg = {
    _id: `msg-${Date.now()}`,
    referralId,
    senderId: uid,
    senderName: req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
    senderRole: req.user.role,
    receiverId: receiverId || 'user-2',
    receiverName: receiverName || 'Provider',
    content: content.trim(),
    readAt: null,
    createdAt: new Date(),
  };
  syntheticMessages.push(newMsg);
  res.status(201).json({ success: true, data: newMsg });
});

// PATCH /api/messages/read/:referralId — mark thread read
router.patch('/messages/read/:referralId', protect, (req, res) => {
  const { referralId } = req.params;
  const uid = req.user._id || req.user.id;
  syntheticMessages.forEach((m) => {
    if (m.referralId === referralId && m.receiverId === uid && !m.readAt) {
      m.readAt = new Date();
    }
  });
  res.json({ success: true });
});

// GET /api/messages/admin/threads — admin monitoring
router.get('/messages/admin/threads', protect, authorize('admin', 'superadmin'), (req, res) => {
  const summaries = _buildThreadSummary(syntheticMessages, null);
  // Enrich with participant list for admin view
  const enriched = summaries.map((t) => {
    const msgs = syntheticMessages.filter((m) => m.referralId === t._id);
    const names = [...new Set(msgs.map((m) => m.senderName))];
    return { ...t, participants: names };
  });
  res.json({ success: true, data: enriched });
});

// ── Contact form (public) ─────────────────────────────────────────────────────
const syntheticContacts = [];

router.post('/contact', (req, res) => {
  const { name, email, phone, organization, inquiryType, subject, message } = req.body;
  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, error: 'Name, email, subject, and message are required.' });
  }
  const entry = {
    _id: `contact-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || '',
    organization: organization?.trim() || '',
    inquiryType: inquiryType || 'general',
    subject: subject.trim(),
    message: message.trim(),
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  syntheticContacts.unshift(entry);
  res.status(201).json({
    success: true,
    data: { id: entry._id, message: "Your message has been received. We'll be in touch within 1 business day." },
  });
});

router.get('/contact', (req, res) => {
  const { status } = req.query;
  const data = status && status !== 'all'
    ? syntheticContacts.filter(c => c.status === status)
    : syntheticContacts;
  const newCount = syntheticContacts.filter(c => c.status === 'new').length;
  const respondedCount = syntheticContacts.filter(c => c.status === 'responded').length;
  const demoCount = syntheticContacts.filter(c => c.inquiryType === 'demo').length;
  res.json({ success: true, data, meta: { total: syntheticContacts.length, newCount, respondedCount, demoCount } });
});

router.patch('/contact/:id/status', (req, res) => {
  const idx = syntheticContacts.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found.' });
  syntheticContacts[idx].status = req.body.status;
  res.json({ success: true, data: syntheticContacts[idx] });
});

router.delete('/contact/:id', (req, res) => {
  const idx = syntheticContacts.findIndex(c => c._id === req.params.id);
  if (idx !== -1) syntheticContacts.splice(idx, 1);
  res.json({ success: true, data: {} });
});

// ── Analytics job (synthetic stub) ───────────────────────────────────────────
router.post('/admin/analytics/run-job', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    message: 'Analytics job completed successfully (synthetic mode)',
    data: {
      snapshotId: 'snap-' + Date.now(),
      patientsUpdated: 5,
      computedAt: new Date().toISOString(),
      durationMs: 42,
      metrics: {
        riskDistribution: { low: 2, medium: 2, high: 1 },
        patientEngagement: { score: 74 },
        treatmentAdherence: { rate: 0.82 },
        missedAppointments: { count: 1 },
        referralAcceptanceRate: { rate: 0.87 },
      },
    },
  });
});

router.get('/admin/analytics/run-job', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: null, message: 'No analytics job has been run yet (synthetic mode).' });
});

// ── Token staking (synthetic) ─────────────────────────────────────────────────

const SYNTHETIC_STAKES = [
  {
    _id: 'stake-001', userId: null, amount: 100, periodDays: 30, multiplier: 1.10,
    startDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    status: 'active', bonusAmount: 0, releaseTxId: null,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    _id: 'stake-002', userId: null, amount: 200, periodDays: 60, multiplier: 1.25,
    startDate: new Date(Date.now() - 65 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: 'completed', bonusAmount: 50, releaseTxId: 'tx_synthetic_stake_001',
    completedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 65 * 86400000).toISOString(),
  },
];

router.post('/tokens/stake', protect, (req, res) => {
  const { amount, periodDays } = req.body;
  if (!amount || amount < 1) return res.status(400).json({ success: false, error: 'amount must be >= 1' });
  const valid = [30, 60, 90];
  if (!valid.includes(Number(periodDays))) {
    return res.status(400).json({ success: false, error: `periodDays must be one of ${valid.join(', ')}` });
  }
  const mults = { 30: 1.10, 60: 1.25, 90: 1.50 };
  const multiplier = mults[periodDays];
  const user = store.users.findById(req.user.id);
  if (!user || user.tokenBalance < amount) {
    return res.status(400).json({ success: false, error: 'Insufficient token balance' });
  }
  user.tokenBalance -= amount;
  const stake = {
    _id: `stake-${Date.now()}`, userId: req.user.id, amount, periodDays, multiplier,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + periodDays * 86400000).toISOString(),
    status: 'active', bonusAmount: 0, releaseTxId: null,
    createdAt: new Date().toISOString(),
  };
  SYNTHETIC_STAKES.push(stake);
  res.status(201).json({
    success: true,
    data: { stake, newBalance: user.tokenBalance, stakedBalance: amount, expectedBonus: Math.floor(amount * (multiplier - 1)), releaseAt: stake.endDate },
  });
});

router.get('/tokens/stakes', protect, (req, res) => {
  const userStakes = SYNTHETIC_STAKES.map(s => ({ ...s, userId: s.userId || req.user.id }))
    .filter(s => !s.userId || s.userId === req.user.id);
  const user = store.users.findById(req.user.id);
  res.json({
    success: true,
    data: userStakes,
    summary: {
      activeCount: userStakes.filter(s => s.status === 'active').length,
      totalStaked: userStakes.filter(s => s.status === 'active').reduce((s, x) => s + x.amount, 0),
      tokenBalance: user?.tokenBalance || 0,
    },
  });
});

router.delete('/tokens/stakes/:id', protect, (req, res) => {
  const idx = SYNTHETIC_STAKES.findIndex(s => s._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Stake not found' });
  const stake = SYNTHETIC_STAKES[idx];
  if (stake.status !== 'active') return res.status(400).json({ success: false, error: `Cannot cancel a ${stake.status} stake` });
  SYNTHETIC_STAKES[idx].status = 'cancelled';
  const user = store.users.findById(req.user.id);
  if (user) user.tokenBalance += stake.amount;
  res.json({
    success: true,
    data: { stakeId: stake._id, returnedAmount: stake.amount, newBalance: user?.tokenBalance || 0, note: 'Early cancellation — bonus forfeited.' },
  });
});

// ── Premium analytics export (synthetic) ─────────────────────────────────────

router.post('/analytics/:id/export', protect, (req, res) => {
  const user = store.users.findById(req.user.id);
  const cost = 25;
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if ((user.tokenBalance || 0) < cost) {
    return res.status(402).json({ success: false, error: `Insufficient tokens. Requires ${cost} CLT.`, required: cost, balance: user.tokenBalance || 0 });
  }
  user.tokenBalance -= cost;
  res.json({
    success: true,
    data: {
      analytics: {
        id: req.params.id,
        name: 'Synthetic Analytics Report',
        type: 'patient_outcomes',
        status: 'completed',
        results: {
          summary: 'Synthetic export — full data available in live DB mode.',
          data: { patientCount: 42, avgRisk: 0.31, adherenceRate: 0.84 },
          visualizations: [],
        },
        blockchainReference: { transactionId: 'tx_synthetic_export', hash: 'abc123' },
        confidenceScore: 0.92,
        completedAt: new Date().toISOString(),
      },
      export: { format: 'json', tokenCost: cost, newBalance: user.tokenBalance, exportedAt: new Date().toISOString() },
    },
  });
});

// ── Blockchain admin (synthetic stubs) ───────────────────────────────────────

// Static synthetic chain with a genesis block
const SYNTHETIC_GENESIS_HASH = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
const syntheticChainTip = (() => {
  const h = require('crypto').createHash('sha256').update(JSON.stringify({ type: 'genesis', previousHash: 'genesis', blockNumber: 0 })).digest('hex');
  return h;
})();

router.get('/admin/blockchain/status', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    data: {
      mode: 'ledger',
      network: 'synthetic',
      contractAddress: null,
      totalTransactions: 3,
      currentBlock: 3,
      genesisHash: SYNTHETIC_GENESIS_HASH,
      chainTipHash: syntheticChainTip,
      chainTipAt: new Date(Date.now() - 60000).toISOString(),
    },
  });
});

router.get('/admin/blockchain/integrity', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    data: { audited: 3, intact: 3, broken: 0, valid: true, issues: [] },
  });
});

const SYNTHETIC_BLOCKCHAIN_TXS = [
  { transactionId: 'genesis_synthetic', type: 'genesis', blockNumber: 0, previousHash: 'genesis', hash: SYNTHETIC_GENESIS_HASH, timestamp: new Date(Date.now() - 86400000).toISOString(), data: { type: 'genesis', message: 'ClinicTrust AI — genesis block (synthetic)' } },
  { transactionId: 'tx_synthetic_001', type: 'token', blockNumber: 1, previousHash: SYNTHETIC_GENESIS_HASH, hash: 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2', timestamp: new Date(Date.now() - 3600000).toISOString(), data: { type: 'token', fromUserId: 'system', toUserId: 'user-2', amount: 50, reason: 'KYC verified bonus' } },
  { transactionId: 'tx_synthetic_002', type: 'analytics_anchor', blockNumber: 2, previousHash: 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2', hash: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2', timestamp: new Date(Date.now() - 1800000).toISOString(), data: { type: 'analytics_anchor', resultsHash: 'abc123', analyticsId: 'anl-001' } },
];

router.get('/admin/blockchain/transactions', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    data: SYNTHETIC_BLOCKCHAIN_TXS,
    pagination: { page: 0, limit: 20, total: 3, pages: 1 },
  });
});

router.get('/admin/blockchain/transactions/:txId', protect, authorize('admin', 'superadmin'), (req, res) => {
  const tx = SYNTHETIC_BLOCKCHAIN_TXS.find(t => t.transactionId === req.params.txId);
  if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
  res.json({ success: true, data: { ...tx, verification: { verified: true, source: 'synthetic' } } });
});

router.get('/admin/blockchain/operations', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/admin/blockchain/operations/:id/approve', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(404).json({ success: false, error: 'No pending operations in synthetic mode' });
});

router.post('/admin/blockchain/operations/:id/reject', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(404).json({ success: false, error: 'No pending operations in synthetic mode' });
});

// Allowance (synthetic stubs)
router.get('/admin/blockchain/allowance/:providerId', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({
    success: true,
    data: {
      provider: { id: req.params.providerId, name: 'Synthetic Provider', walletAddress: '0xSYNTHETIC' },
      mode: 'synthetic',
      platformWallet: '0xPLATFORM_SYNTHETIC',
      onChainAllowance: null,
      allowanceSufficient: null,
      pendingBurnTotal: 0,
      pendingBurns: 0,
      note: 'Synthetic mode — allowance not applicable. Switch to live DB + Polygon to see real allowance data.',
    },
  });
});

router.post('/admin/blockchain/allowance/:providerId/approve', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(400).json({ success: false, error: 'Allowance approval not available in synthetic mode — requires live Polygon connection.' });
});

// ── Admin Messaging — broadcast messages (synthetic stubs) ───────────────────

const SYNTHETIC_BROADCASTS = [
  { _id: 'broadcast-1', title: 'Platform Update v2.4.0', content: 'We are pleased to announce the release of platform version 2.4.0, which includes improved referral tracking, enhanced token analytics, and blockchain audit logging.', sender: 'Platform Administrator', sentAt: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'sent', priority: 'medium', category: 'general', recipientCount: 156, readCount: 98 },
  { _id: 'broadcast-2', title: 'New Security Policy: Multi-Factor Authentication', content: 'Effective next month, all provider accounts will be required to use multi-factor authentication (MFA). Please ensure your account is set up for MFA to avoid disruption.', sender: 'Security Team', sentAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'sent', priority: 'high', category: 'security', recipientCount: 156, readCount: 112 },
  { _id: 'broadcast-3', title: 'Token Earning Opportunities: New Activities', content: 'Three new token-earning activities have been added: completing patient satisfaction surveys (15 CLT), adding clinical notes within 24 hours (10 CLT), and referring providers to the platform (50 CLT).', sender: 'Token Management', sentAt: new Date(Date.now() - 1 * 86400000).toISOString(), status: 'sent', priority: 'medium', category: 'token', recipientCount: 156, readCount: 142 },
  { _id: 'broadcast-4', title: 'Upcoming Training Session: AI-Assisted Diagnosis', content: 'We will be hosting a training session on AI-Assisted Diagnosis on August 20th at 1:00 PM EST. This session will cover how to effectively use our AI tools.', sender: 'Training Coordinator', sentAt: null, status: 'draft', priority: 'medium', category: 'training', recipientCount: 0, readCount: 0 },
];

router.get('/admin/messages/broadcast', protect, authorize('admin', 'superadmin'), (req, res) => {
  let data = [...SYNTHETIC_BROADCASTS];
  if (req.query.status) data = data.filter(m => m.status === req.query.status);
  if (req.query.priority) data = data.filter(m => m.priority === req.query.priority);
  if (req.query.category) data = data.filter(m => m.category === req.query.category);
  res.json({ success: true, data });
});

router.get('/admin/messages/broadcast/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const msg = SYNTHETIC_BROADCASTS.find(m => m._id === req.params.id);
  if (!msg) return res.status(404).json({ success: false, error: 'Broadcast message not found' });
  res.json({ success: true, data: msg });
});

router.post('/admin/messages/broadcast', protect, authorize('admin', 'superadmin'), (req, res) => {
  const msg = { _id: `broadcast-${Date.now()}`, ...req.body, sentAt: req.body.status === 'sent' ? new Date().toISOString() : null, recipientCount: req.body.status === 'sent' ? 156 : 0, readCount: 0, createdAt: new Date().toISOString() };
  res.status(201).json({ success: true, data: msg });
});

router.put('/admin/messages/broadcast/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const msg = SYNTHETIC_BROADCASTS.find(m => m._id === req.params.id);
  if (!msg) return res.status(404).json({ success: false, error: 'Broadcast message not found' });
  const updated = { ...msg, ...req.body };
  res.json({ success: true, data: updated });
});

router.delete('/admin/messages/broadcast/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { success: true, message: 'Broadcast message deleted successfully' } });
});

router.post('/admin/messages/broadcast/:id/send', protect, authorize('admin', 'superadmin'), (req, res) => {
  const msg = SYNTHETIC_BROADCASTS.find(m => m._id === req.params.id);
  if (!msg) return res.status(404).json({ success: false, error: 'Broadcast message not found' });
  const sent = { ...msg, status: 'sent', sentAt: new Date().toISOString(), recipientCount: 156 };
  res.json({ success: true, data: sent });
});

// ── Admin Messaging — targeted alerts (synthetic stubs) ──────────────────────

const SYNTHETIC_ALERTS = [
  { _id: 'alert-1', title: 'Referral Approved: Patient John Doe', content: 'Your referral for patient John Doe (ID: PT-12345) to Cardiology has been approved.', sender: 'Referral Management System', sentAt: new Date(Date.now() - 4 * 86400000).toISOString(), status: 'sent', priority: 'medium', category: 'referral', recipients: [{ id: 'user-1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@clinictrust.ai', readAt: new Date(Date.now() - 3.5 * 86400000).toISOString() }], relatedEntityId: 'REF-67890', relatedEntityType: 'referral' },
  { _id: 'alert-2', title: 'Policy Update: New Referral Guidelines', content: 'The referral guidelines for Neurology have been updated. Please review before submitting new referrals.', sender: 'Policy Management', sentAt: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'sent', priority: 'high', category: 'policy', recipients: [{ id: 'user-1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@clinictrust.ai', readAt: new Date(Date.now() - 6 * 86400000).toISOString() }, { id: 'user-2', name: 'Dr. Michael Chen', email: 'michael.chen@clinictrust.ai', readAt: null }], relatedEntityId: 'POL-12345', relatedEntityType: 'policy' },
  { _id: 'alert-3', title: 'Token Reward: Quality Reporting', content: 'You have been awarded 50 tokens for your consistent high-quality reporting.', sender: 'Token Management System', sentAt: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'sent', priority: 'low', category: 'token', recipients: [{ id: 'user-2', name: 'Dr. Michael Chen', email: 'michael.chen@clinictrust.ai', readAt: new Date(Date.now() - 4 * 86400000).toISOString() }], relatedEntityId: 'TRX-54321', relatedEntityType: 'transaction' },
];

router.get('/admin/messages/alerts', protect, authorize('admin', 'superadmin'), (req, res) => {
  let data = [...SYNTHETIC_ALERTS];
  if (req.query.status) data = data.filter(a => a.status === req.query.status);
  if (req.query.priority) data = data.filter(a => a.priority === req.query.priority);
  if (req.query.category) data = data.filter(a => a.category === req.query.category);
  res.json({ success: true, data });
});

router.get('/admin/messages/alerts/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const alert = SYNTHETIC_ALERTS.find(a => a._id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, error: 'Targeted alert not found' });
  res.json({ success: true, data: alert });
});

router.post('/admin/messages/alerts', protect, authorize('admin', 'superadmin'), (req, res) => {
  const alert = { _id: `alert-${Date.now()}`, ...req.body, sentAt: req.body.status === 'sent' ? new Date().toISOString() : null, createdAt: new Date().toISOString() };
  res.status(201).json({ success: true, data: alert });
});

router.put('/admin/messages/alerts/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const alert = SYNTHETIC_ALERTS.find(a => a._id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, error: 'Targeted alert not found' });
  const updated = { ...alert, ...req.body };
  res.json({ success: true, data: updated });
});

router.delete('/admin/messages/alerts/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { success: true, message: 'Targeted alert deleted successfully' } });
});

router.post('/admin/messages/alerts/:id/send', protect, authorize('admin', 'superadmin'), (req, res) => {
  const alert = SYNTHETIC_ALERTS.find(a => a._id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, error: 'Targeted alert not found' });
  const sent = { ...alert, status: 'sent', sentAt: new Date().toISOString() };
  res.json({ success: true, data: sent });
});

// ── Admin Escalation Workflows (synthetic stubs) ─────────────────────────────

const SYNTHETIC_ESCALATIONS = [
  { _id: 'escalation-1', title: 'High Readmission Risk - Patient Jane Smith', patientId: 'PT-54321', patientName: 'Jane Smith', aiRiskScore: 0.89, flaggedAt: new Date(Date.now() - 4 * 86400000).toISOString(), status: 'pending_review', priority: 'high', category: 'readmission', assignedTo: { id: 'user-1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@clinictrust.ai' }, details: { riskFactors: ['Recent hospitalization within 30 days', 'Multiple chronic conditions', 'Medication adherence issues'], aiRecommendations: ['Schedule follow-up within 7 days', 'Arrange home care services', 'Medication reconciliation'], notes: 'AI flagged high readmission probability based on recent labs.' }, timeline: [{ action: 'Flagged by AI', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), user: 'AI System' }, { action: 'Assigned to Dr. Sarah Johnson', timestamp: new Date(Date.now() - 4 * 86400000 + 300000).toISOString(), user: 'Workflow Manager' }], resolution: null },
  { _id: 'escalation-2', title: 'Critical Lab Result - Patient Robert Brown', patientId: 'PT-67890', patientName: 'Robert Brown', aiRiskScore: 0.95, flaggedAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'in_progress', priority: 'critical', category: 'lab_result', assignedTo: { id: 'user-2', name: 'Dr. Michael Chen', email: 'michael.chen@clinictrust.ai' }, details: { riskFactors: ['Abnormal potassium levels', 'Recent medication change', 'History of cardiac issues'], aiRecommendations: ['Immediate provider notification', 'Repeat lab test', 'Medication adjustment'], notes: 'Potassium level at 6.8 mEq/L. Requires immediate attention.' }, timeline: [{ action: 'Flagged by AI', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), user: 'AI System' }, { action: 'Assigned to Dr. Michael Chen', timestamp: new Date(Date.now() - 3 * 86400000 + 60000).toISOString(), user: 'Workflow Manager' }], resolution: null },
  { _id: 'escalation-3', title: 'Care Gap Identified - Patient Maria Garcia', patientId: 'PT-11223', patientName: 'Maria Garcia', aiRiskScore: 0.72, flaggedAt: new Date(Date.now() - 10 * 86400000).toISOString(), status: 'resolved', priority: 'medium', category: 'care_gap', assignedTo: { id: 'user-1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@clinictrust.ai' }, details: { riskFactors: ['Overdue preventive screenings', 'Diabetes management gap'], aiRecommendations: ['Schedule HbA1c test', 'Retinal exam referral'], notes: 'Patient overdue for annual diabetic screenings.' }, timeline: [{ action: 'Flagged by AI', timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), user: 'AI System' }, { action: 'Case resolved', timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), user: 'Dr. Sarah Johnson' }], resolution: { action: 'Appointments scheduled', notes: 'HbA1c and retinal exam both scheduled. Patient notified.', timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), resolvedBy: { id: 'user-1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@clinictrust.ai' } } },
];

router.get('/admin/escalations/statistics', protect, authorize('admin', 'superadmin'), (req, res) => {
  const total = SYNTHETIC_ESCALATIONS.length;
  const pending = SYNTHETIC_ESCALATIONS.filter(w => w.status === 'pending_review').length;
  const inProgress = SYNTHETIC_ESCALATIONS.filter(w => w.status === 'in_progress').length;
  const resolved = SYNTHETIC_ESCALATIONS.filter(w => w.status === 'resolved').length;
  const highPriority = SYNTHETIC_ESCALATIONS.filter(w => w.priority === 'high' || w.priority === 'critical').length;
  const unassigned = SYNTHETIC_ESCALATIONS.filter(w => !w.assignedTo).length;
  const cats = {};
  SYNTHETIC_ESCALATIONS.forEach(w => { cats[w.category] = (cats[w.category] || 0) + 1; });

  res.json({
    success: true,
    data: {
      totalWorkflows: total,
      statusDistribution: { pendingReview: pending, inProgress, resolved },
      highPriority,
      unassigned,
      categoryDistribution: Object.entries(cats).map(([name, value]) => ({ name, value })),
      averageResolutionTime: '1.5 days',
    },
  });
});

router.get('/admin/escalations', protect, authorize('admin', 'superadmin'), (req, res) => {
  let data = [...SYNTHETIC_ESCALATIONS];
  if (req.query.status) data = data.filter(w => w.status === req.query.status);
  if (req.query.priority) data = data.filter(w => w.priority === req.query.priority);
  if (req.query.category) data = data.filter(w => w.category === req.query.category);
  res.json({ success: true, data });
});

router.get('/admin/escalations/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const workflow = SYNTHETIC_ESCALATIONS.find(w => w._id === req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: 'Escalation workflow not found' });
  res.json({ success: true, data: workflow });
});

router.put('/admin/escalations/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const workflow = SYNTHETIC_ESCALATIONS.find(w => w._id === req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: 'Escalation workflow not found' });
  const updated = { ...workflow, ...req.body };
  res.json({ success: true, data: updated });
});

router.post('/admin/escalations/:id/assign', protect, authorize('admin', 'superadmin'), (req, res) => {
  const workflow = SYNTHETIC_ESCALATIONS.find(w => w._id === req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: 'Escalation workflow not found' });
  const updated = { ...workflow, assignedTo: req.body, status: workflow.status === 'pending_review' ? 'in_progress' : workflow.status, timeline: [...workflow.timeline, { action: `Assigned to ${req.body.name}`, timestamp: new Date().toISOString(), user: 'Admin' }] };
  res.json({ success: true, data: updated });
});

router.post('/admin/escalations/:id/resolve', protect, authorize('admin', 'superadmin'), (req, res) => {
  const workflow = SYNTHETIC_ESCALATIONS.find(w => w._id === req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: 'Escalation workflow not found' });
  const updated = { ...workflow, status: 'resolved', resolution: { ...req.body, timestamp: new Date().toISOString() }, timeline: [...workflow.timeline, { action: 'Case resolved', timestamp: new Date().toISOString(), user: req.body.resolvedBy?.name || 'Admin' }] };
  res.json({ success: true, data: updated });
});

// ── Admin KYC (synthetic stubs) ──────────────────────────────────────────────

const SYNTHETIC_KYC_PROFILES = [
  { _id: 'kyc-1', userId: 'user-2', kycStatus: 'under_review', npi: '1234567890', specialty: 'Cardiology', licenseNumber: 'MD-12345', licenseState: 'CA', createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), user: { name: 'Dr. Michael Chen', email: 'michael.chen@clinictrust.ai', role: 'provider', organization: 'Pacific Medical Group' } },
  { _id: 'kyc-2', userId: 'user-3', kycStatus: 'verified', npi: '9876543210', specialty: 'Neurology', licenseNumber: 'MD-67890', licenseState: 'NY', kycReviewedAt: new Date(Date.now() - 5 * 86400000).toISOString(), createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), user: { name: 'Dr. Emily Rodriguez', email: 'emily.rodriguez@clinictrust.ai', role: 'provider', organization: 'NY Neuro Associates' } },
  { _id: 'kyc-3', userId: 'user-4', kycStatus: 'doc_pending', npi: null, specialty: 'Orthopedics', licenseNumber: null, licenseState: null, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), user: { name: 'Dr. James Wilson', email: 'james.wilson@clinictrust.ai', role: 'provider', organization: 'Ortho Specialists LLC' } },
  { _id: 'kyc-4', userId: 'user-5', kycStatus: 'rejected', npi: '5555555555', specialty: 'Dermatology', licenseNumber: 'MD-11111', licenseState: 'TX', kycRejectionReason: 'License could not be verified', kycReviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(), createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), user: { name: 'Dr. Anna Lee', email: 'anna.lee@clinictrust.ai', role: 'provider', organization: 'Texas Derm Center' } },
];

router.get('/admin/kyc', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  let data = [...SYNTHETIC_KYC_PROFILES];
  if (status && status !== 'all') data = data.filter(p => p.kycStatus === status);
  const total = data.length;
  data = data.slice((page - 1) * limit, page * limit);
  res.json({
    success: true,
    data,
    meta: {
      total,
      pendingDocs: SYNTHETIC_KYC_PROFILES.filter(p => ['profile_incomplete', 'doc_pending'].includes(p.kycStatus)).length,
      underReview: SYNTHETIC_KYC_PROFILES.filter(p => p.kycStatus === 'under_review').length,
      verified: SYNTHETIC_KYC_PROFILES.filter(p => p.kycStatus === 'verified').length,
      rejected: SYNTHETIC_KYC_PROFILES.filter(p => p.kycStatus === 'rejected').length,
    },
  });
});

router.get('/admin/kyc/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const profile = SYNTHETIC_KYC_PROFILES.find(p => p._id === req.params.id);
  if (!profile) return res.status(404).json({ success: false, error: 'Provider profile not found' });
  res.json({ success: true, data: profile });
});

router.patch('/admin/kyc/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const profile = SYNTHETIC_KYC_PROFILES.find(p => p._id === req.params.id);
  if (!profile) return res.status(404).json({ success: false, error: 'Provider profile not found' });
  const updated = { ...profile, ...req.body, kycReviewedAt: new Date().toISOString() };
  res.json({ success: true, data: updated });
});

router.patch('/admin/kyc/:id/profile', protect, authorize('admin', 'superadmin'), (req, res) => {
  const profile = SYNTHETIC_KYC_PROFILES.find(p => p._id === req.params.id);
  if (!profile) return res.status(404).json({ success: false, error: 'Provider profile not found' });
  const updated = { ...profile, ...req.body };
  res.json({ success: true, data: updated });
});

router.get('/admin/kyc/:id/wallet', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { walletAddress: '0xSYNTHETIC_WALLET', tokenBalance: 0, note: 'Synthetic mode — no real wallet' } });
});

router.delete('/admin/kyc/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { message: 'Provider profile deleted (synthetic)' } });
});

router.post('/admin/kyc/:id/resend-verification', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { message: 'Verification email resent (synthetic — no actual email sent)' } });
});

router.get('/admin/kyc/:id/document', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(404).json({ success: false, error: 'Document not available in synthetic mode' });
});

// ── Admin Matching Config (synthetic stubs) ───────────────────────────────────

const DEFAULT_SYNONYM_GROUPS = [
  { canonical: 'Cardiology', synonyms: ['Heart Specialist', 'Cardiac', 'Cardiologist'] },
  { canonical: 'Neurology', synonyms: ['Brain Specialist', 'Neuro', 'Neurologist'] },
  { canonical: 'Orthopedics', synonyms: ['Ortho', 'Bone Specialist', 'Orthopedic Surgery'] },
  { canonical: 'Dermatology', synonyms: ['Skin Specialist', 'Derm', 'Dermatologist'] },
  { canonical: 'Gastroenterology', synonyms: ['GI', 'GI Specialist', 'Gastroenterologist'] },
];

let syntheticMatchingConfig = {
  _id: 'matching-config-1',
  synonymGroups: DEFAULT_SYNONYM_GROUPS,
  distanceWeightKm: 50,
  specialtyWeight: 0.5,
  distanceWeight: 0.3,
  availabilityWeight: 0.2,
  updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
};

router.get('/admin/matching-config', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: syntheticMatchingConfig });
});

router.put('/admin/matching-config', protect, authorize('admin', 'superadmin'), (req, res) => {
  syntheticMatchingConfig = { ...syntheticMatchingConfig, ...req.body, updatedAt: new Date().toISOString() };
  res.json({ success: true, data: syntheticMatchingConfig });
});

router.post('/admin/matching-config/reset', protect, authorize('admin', 'superadmin'), (req, res) => {
  syntheticMatchingConfig = { ...syntheticMatchingConfig, synonymGroups: DEFAULT_SYNONYM_GROUPS, updatedAt: new Date().toISOString() };
  res.json({ success: true, data: syntheticMatchingConfig });
});

// ── Admin Patients (synthetic stubs) ─────────────────────────────────────────

const SYNTHETIC_PATIENTS = [
  { _id: 'patient-1', name: 'John Doe', dateOfBirth: '1975-04-12', gender: 'male', email: 'john.doe@example.com', phone: '555-0101', providerId: 'user-2', riskScore: 0.45, conditions: ['Hypertension', 'Type 2 Diabetes'], lastVisit: new Date(Date.now() - 14 * 86400000).toISOString(), status: 'active' },
  { _id: 'patient-2', name: 'Jane Smith', dateOfBirth: '1962-08-23', gender: 'female', email: 'jane.smith@example.com', phone: '555-0102', providerId: 'user-2', riskScore: 0.89, conditions: ['COPD', 'Heart Failure', 'Chronic Kidney Disease'], lastVisit: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'high_risk' },
  { _id: 'patient-3', name: 'Robert Brown', dateOfBirth: '1958-11-07', gender: 'male', email: 'robert.brown@example.com', phone: '555-0103', providerId: 'user-3', riskScore: 0.95, conditions: ['Atrial Fibrillation', 'Hypertension'], lastVisit: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'critical' },
  { _id: 'patient-4', name: 'Maria Garcia', dateOfBirth: '1980-03-15', gender: 'female', email: 'maria.garcia@example.com', phone: '555-0104', providerId: 'user-2', riskScore: 0.72, conditions: ['Type 2 Diabetes', 'Obesity'], lastVisit: new Date(Date.now() - 30 * 86400000).toISOString(), status: 'active' },
];

router.get('/admin/patients', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { status, providerId, page = 1, limit = 20 } = req.query;
  let data = [...SYNTHETIC_PATIENTS];
  if (status) data = data.filter(p => p.status === status);
  if (providerId) data = data.filter(p => p.providerId === providerId);
  const total = data.length;
  data = data.slice((page - 1) * limit, page * limit);
  res.json({ success: true, data, meta: { total, page: Number(page), limit: Number(limit) } });
});

router.get('/admin/patients/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const patient = SYNTHETIC_PATIENTS.find(p => p._id === req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  res.json({ success: true, data: patient });
});

// ── Admin AI Config (synthetic) ───────────────────────────────────────────────
const SYNTHETIC_AI_CONFIGS = [
  { _id: 'cfg-1', key: 'priorAuth.autoApproveThreshold', category: 'priorAuth', value: 0.95, label: 'Auto-Approve Threshold', dataType: 'number' },
  { _id: 'cfg-2', key: 'priorAuth.minConfidence', category: 'priorAuth', value: 0.80, label: 'Minimum Confidence', dataType: 'number' },
  { _id: 'cfg-3', key: 'riskScore.highRiskThreshold', category: 'riskScore', value: 75, label: 'High Risk Threshold', dataType: 'number' },
  { _id: 'cfg-4', key: 'riskScore.criticalRiskThreshold', category: 'riskScore', value: 90, label: 'Critical Risk Threshold', dataType: 'number' },
  { _id: 'cfg-5', key: 'referralMatching.maxCandidates', category: 'referralMatching', value: 10, label: 'Max Candidates', dataType: 'number' },
  { _id: 'cfg-6', key: 'escalation.flagThreshold', category: 'escalation', value: 0.70, label: 'Escalation Flag Threshold', dataType: 'number' },
];

router.get('/admin/ai-config', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: SYNTHETIC_AI_CONFIGS });
});
router.get('/admin/ai-config/category/:category', protect, authorize('admin', 'superadmin'), (req, res) => {
  const filtered = SYNTHETIC_AI_CONFIGS.filter(c => c.category === req.params.category);
  res.json({ success: true, data: filtered });
});
router.put('/admin/ai-config/:key(*)', protect, authorize('admin', 'superadmin'), (req, res) => {
  const cfg = SYNTHETIC_AI_CONFIGS.find(c => c.key === req.params.key);
  if (cfg) cfg.value = req.body.value;
  res.json({ success: true, data: cfg || { key: req.params.key, value: req.body.value } });
});
router.post('/admin/ai-config/bulk', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: req.body.configs });
});
router.post('/admin/ai-config/reset', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: SYNTHETIC_AI_CONFIGS });
});

// ── Predictive Alerts (synthetic) ────────────────────────────────────────────
const SYNTHETIC_PRED_ALERTS = [
  { _id: 'pal-1', patientId: 'patient-1', patientName: 'John Doe', providerId: 'user-2', type: 'readmission_risk', severity: 'high', title: 'High Readmission Risk — John Doe', description: 'Risk score of 82/100. Patient has 3 high-risk comorbidities and no visit in 45 days. Historical readmission rate for this profile: 34%.', recommendation: 'Schedule follow-up within 7 days. Consider medication reconciliation and care coordinator assignment.', riskScore: 82, status: 'active', generatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { _id: 'pal-2', patientId: 'patient-2', patientName: 'Jane Smith', providerId: 'user-2', type: 'risk_score_increase', severity: 'critical', title: 'Risk Score Spike — Jane Smith', description: 'Risk score increased from 61 to 89 (+28 pts) since last assessment. New high-risk condition detected: Heart Failure.', recommendation: 'Immediate clinical review required. Consider hospitalist consultation.', riskScore: 89, previousRiskScore: 61, deltaScore: 28, status: 'active', generatedAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: 'pal-3', patientId: 'patient-4', patientName: 'Maria Garcia', providerId: 'user-2', type: 'care_gap', severity: 'medium', title: 'Care Gap — Maria Garcia', description: 'No clinical visit recorded in 78 days. Patient has Type 2 Diabetes and Obesity. HbA1c overdue by 48 days.', recommendation: 'Reach out for annual diabetes management visit. Order HbA1c and lipid panel.', riskScore: 72, daysSinceLastVisit: 78, status: 'active', generatedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
];

router.get('/predictive-alerts', protect, (req, res) => {
  let data = [...SYNTHETIC_PRED_ALERTS];
  if (req.query.status && req.query.status !== 'all') data = data.filter(a => a.status === req.query.status);
  if (req.query.severity) data = data.filter(a => a.severity === req.query.severity);
  if (req.query.type) data = data.filter(a => a.type === req.query.type);
  res.json({ success: true, data, count: data.length });
});

router.get('/predictive-alerts/summary', protect, (req, res) => {
  const active = SYNTHETIC_PRED_ALERTS.filter(a => a.status === 'active');
  res.json({ success: true, data: { critical: active.filter(a => a.severity === 'critical').length, high: active.filter(a => a.severity === 'high').length, medium: active.filter(a => a.severity === 'medium').length, low: 0, total: active.length } });
});

router.patch('/predictive-alerts/:id/acknowledge', protect, (req, res) => {
  const a = SYNTHETIC_PRED_ALERTS.find(x => x._id === req.params.id);
  if (!a) return res.status(404).json({ success: false, error: 'Alert not found' });
  res.json({ success: true, data: { ...a, status: 'acknowledged' } });
});

router.patch('/predictive-alerts/:id/resolve', protect, (req, res) => {
  const a = SYNTHETIC_PRED_ALERTS.find(x => x._id === req.params.id);
  if (!a) return res.status(404).json({ success: false, error: 'Alert not found' });
  res.json({ success: true, data: { ...a, status: 'resolved', ...req.body } });
});

router.patch('/predictive-alerts/:id/dismiss', protect, (req, res) => {
  const a = SYNTHETIC_PRED_ALERTS.find(x => x._id === req.params.id);
  if (!a) return res.status(404).json({ success: false, error: 'Alert not found' });
  res.json({ success: true, data: { ...a, status: 'dismissed' } });
});

// ── Referral Outcomes (synthetic) ─────────────────────────────────────────────
router.post('/referral-outcomes', protect, (req, res) => {
  const outcome = { _id: `ro-${Date.now()}`, ...req.body, outcomeScore: 70, createdAt: new Date().toISOString() };
  res.status(201).json({ success: true, data: outcome });
});
router.get('/referral-outcomes/:referralId', protect, (req, res) => {
  res.status(404).json({ success: false, error: 'No outcome recorded yet' });
});
router.patch('/referral-outcomes/:referralId', protect, (req, res) => {
  res.json({ success: true, data: { referralId: req.params.referralId, ...req.body, outcomeScore: 75 } });
});

router.post('/admin/ai-management/feedback-loop', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: { alertAccuracy: { total: 0, byType: [] }, paAccuracy: { total: 0, accuracy: null }, note: 'Feedback loop ran (synthetic — no real data)' } });
});

// ── AI Clinical Assistant (synthetic stubs) ───────────────────────────────────

const SYNTHETIC_AI_RESPONSES = {
  cardiology: { answer: 'Based on the clinical presentation, referral to cardiology is appropriate. Key indicators include chest pain with exertional component, elevated BNP, and ECG changes. Recommend urgent referral given the symptom severity.', confidence: 'high', suggestedActions: ['Order 12-lead ECG if not already done', 'Check troponin and BNP levels', 'Schedule within 1-2 weeks for stable presentation'], relevantGuidelines: ['ACC/AHA Heart Failure Guidelines 2022', 'AHA Chest Pain Guidelines'] },
  priorAuth: { answer: 'For MRI authorization, payers typically require: (1) failure of conservative treatment for 4-6 weeks, (2) specific clinical indicators such as neurological deficits, (3) documentation of symptom severity and functional limitation. Medicare LCD L35083 applies for lumbar spine MRI.', confidence: 'high', suggestedActions: ['Document conservative treatment history', 'Include functional assessment scores', 'Reference specific LCD criteria in clinical notes'], relevantGuidelines: ['Medicare LCD L35083', 'ACR Appropriateness Criteria'] },
  default: { answer: 'Based on the available clinical information, I recommend reviewing the patient\'s full history and current medications before making a referral decision. Consider consulting with a specialist if symptoms persist or worsen.', confidence: 'medium', suggestedActions: ['Review complete medication list', 'Check for drug interactions', 'Schedule follow-up in 2-4 weeks'], relevantGuidelines: ['Clinical practice guidelines recommend individualized assessment'] },
};

router.post('/ai/clinical-insight', protect, (req, res) => {
  const { question = '' } = req.body;
  const lower = question.toLowerCase();
  let response = SYNTHETIC_AI_RESPONSES.default;
  if (lower.includes('cardio') || lower.includes('heart') || lower.includes('chest')) response = SYNTHETIC_AI_RESPONSES.cardiology;
  else if (lower.includes('prior auth') || lower.includes('mri') || lower.includes('authorization')) response = SYNTHETIC_AI_RESPONSES.priorAuth;
  res.json({ success: true, data: { ...response, question, generatedAt: new Date().toISOString(), mode: 'synthetic' } });
});

router.post('/ai/referral-summary', protect, (req, res) => {
  const { patientDiagnosis, requestedSpecialty, urgency } = req.body;
  res.json({ success: true, data: {
    clinicalJustification: `Patient presents with ${patientDiagnosis || 'documented condition'} requiring specialist evaluation by ${requestedSpecialty || 'specialist'}. Clinical findings support referral based on symptom severity and functional impact.`,
    urgencyRationale: urgency === 'Urgent' ? 'Urgent referral warranted based on acute symptom onset and potential for rapid deterioration.' : 'Routine referral appropriate given stable presentation and adequate response to current management.',
    keyFindings: ['Primary diagnosis documented', 'Conservative management attempted', 'Specialist evaluation required for definitive diagnosis or treatment'],
    mode: 'synthetic',
  }});
});

router.post('/ai/risk-analysis', protect, (req, res) => {
  const { riskScore = 50, conditions = [] } = req.body;
  const level = riskScore >= 90 ? 'critical' : riskScore >= 75 ? 'high' : riskScore >= 50 ? 'moderate' : 'low';
  res.json({ success: true, data: {
    riskNarrative: `This patient has a ${level} risk score of ${riskScore}/100. The primary drivers are ${conditions.slice(0,2).join(' and ') || 'multiple chronic conditions'} combined with care utilization patterns.`,
    topRiskDrivers: conditions.slice(0,3).map(c => ({ factor: c, contribution: 'significant' })),
    interventionRecommendations: ['Schedule follow-up within 30 days', 'Review medication adherence', 'Consider care coordinator assignment'],
    mode: 'synthetic',
  }});
});

// ---------------------------------------------------------------------------
// ── User Profile & Settings (synthetic stubs) ─────────────────────────────────
// In-memory stores keyed by userId — persist within a server session
const syntheticUserSettings = {};
const syntheticUserProfiles = {};

router.get('/users/profile', protect, (req, res) => {
  const u = req.user;
  const saved = syntheticUserProfiles[u._id] || {};
  res.json({ success: true, data: {
    _id: u._id, firstName: u.firstName, lastName: u.lastName, name: u.name,
    email: u.email, role: u.role,
    specialty: saved.specialty || u.specialty || 'Internal Medicine',
    credential: saved.credential || u.credential || 'MD',
    organization: u.organization,
    phone: saved.phone || u.phone || '', fax: saved.fax || u.fax || '',
    bio: saved.bio || u.bio || '',
    npi: u.npi || u.kycDocuments?.licenseNumber || '',
    kycVerified: u.kycVerified || false,
    profileImage: saved.profileImage || u.profileImage || null,
    accountStatus: u.accountStatus, onboardingStatus: u.onboardingStatus,
    tokenBalance: u.tokenBalance || 0, walletAddress: u.walletAddress || null,
    settings: syntheticUserSettings[u._id] || {},
  }});
});

router.put('/users/profile', protect, (req, res) => {
  const u = req.user;
  syntheticUserProfiles[u._id] = { ...(syntheticUserProfiles[u._id] || {}), ...req.body };
  res.json({ success: true, data: { ...u, ...req.body } });
});

router.post('/users/profile/image', protect, (req, res) => {
  const { imageData } = req.body;
  if (!imageData) return res.status(400).json({ success: false, error: 'imageData required' });
  syntheticUserProfiles[req.user._id] = { ...(syntheticUserProfiles[req.user._id] || {}), profileImage: imageData };
  res.json({ success: true, data: { profileImage: imageData } });
});

router.get('/users/settings', protect, (req, res) => {
  res.json({ success: true, data: syntheticUserSettings[req.user._id] || {} });
});

router.put('/users/settings', protect, (req, res) => {
  syntheticUserSettings[req.user._id] = req.body;
  res.json({ success: true, data: req.body });
});

router.post('/users/blockchain/verify', protect, (req, res) => {
  const u = req.user;
  if (u.blockchainId) {
    return res.json({ success: true, data: { alreadyVerified: true, blockchainId: u.blockchainId, walletAddress: u.walletAddress } });
  }
  const blockchainId = '0xSYNTHETIC' + u._id.replace(/-/g, '').padEnd(30, '0').slice(0, 30);
  const walletAddress = '0xWALLET' + u._id.replace(/-/g, '').padEnd(33, '0').slice(0, 33);
  res.json({ success: true, data: { alreadyVerified: false, blockchainId, walletAddress } });
});

// Admin: list + get users
router.get('/users', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: [], total: 0, page: 1, pages: 0 });
});

router.get('/users/:userId', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.json({ success: true, data: null });
});

// ── Provider Profile (synthetic stubs) ───────────────────────────────────────
// Keyed by userId — stores each provider's own editable practice profile
const syntheticMyProviderProfile = {};

router.get('/providers/profile', protect, (req, res) => {
  const saved = syntheticMyProviderProfile[req.user._id] || {
    userId: req.user._id, npi: '', specialty: req.user.specialty || '',
    acceptingNewPatients: true, telehealthAvailable: false,
    languagesSpoken: ['English'], insuranceAccepted: [],
    boardCertifications: [], hospitalAffiliations: [], conditionsTreated: [],
    ageGroupsTreated: ['Adult (18-64)'],
  };
  res.json({ success: true, data: saved });
});

router.put('/providers/profile', protect, (req, res) => {
  syntheticMyProviderProfile[req.user._id] = { ...(syntheticMyProviderProfile[req.user._id] || {}), ...req.body };
  res.json({ success: true, data: syntheticMyProviderProfile[req.user._id] });
});

// Catch-all for any unmapped synthetic route
// ---------------------------------------------------------------------------

router.use('*', (req, res) => {
  res.status(404).json({ success: false, error: `Synthetic route not found: ${req.method} ${req.originalUrl}` });
});

module.exports = router;
