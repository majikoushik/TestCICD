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
    console.error('Synthetic register error:', err.message);
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
    console.error('Synthetic login error:', err.message);
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
    console.error('Synthetic change-password error:', err.message);
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
    console.error('Synthetic admin login error:', err.message);
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

router.post('/referrals', protect, authorize('doctor', 'clinic', 'hospital'), (req, res) => {
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
    { id: 'ai-analysis-basic', name: 'Basic AI Analysis', description: 'Run basic AI analysis on patient data', tokenCost: 10, category: 'analytics' },
    { id: 'ai-analysis-advanced', name: 'Advanced AI Analysis', description: 'Run advanced AI analysis with predictive modeling', tokenCost: 25, category: 'analytics' },
    { id: 'priority-referral', name: 'Priority Referral Processing', description: 'Get priority handling for referrals', tokenCost: 5, category: 'operations' },
    { id: 'extended-data-access', name: 'Extended Network Data Access', description: 'Access anonymized network data for research', tokenCost: 50, category: 'research' },
    { id: 'premium-support', name: 'Premium Support', description: 'Get priority technical support', tokenCost: 15, category: 'support' },
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

router.post('/tokens/redeem', protect, (req, res) => {
  const SERVICES = { 'ai-analysis-basic': { name: 'Basic AI Analysis', tokenCost: 10 }, 'ai-analysis-advanced': { name: 'Advanced AI Analysis', tokenCost: 25 }, 'priority-referral': { name: 'Priority Referral Processing', tokenCost: 5 }, 'extended-data-access': { name: 'Extended Network Data Access', tokenCost: 50 }, 'premium-support': { name: 'Premium Support', tokenCost: 15 } };
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
// Admin routes  /api/admin/*
// ---------------------------------------------------------------------------

router.get('/admin/users', protect, authorize('admin', 'superadmin'), (req, res) => {
  const users = store.users.findAll().map(({ password: _p, ...u }) => u);
  res.status(200).json({ success: true, count: users.length, data: users });
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

router.get('/admin/settings', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(200).json({ success: true, count: store.adminSettings.findAll().length, data: store.adminSettings.findAll() });
});

router.get('/admin/settings/:category', protect, authorize('admin', 'superadmin'), (req, res) => {
  const settings = store.adminSettings.find({ category: req.params.category });
  if (!settings.length) return res.status(404).json({ success: false, error: `No settings found for category: ${req.params.category}` });
  res.status(200).json({ success: true, count: settings.length, data: settings });
});

router.put('/admin/settings/:category', protect, authorize('admin', 'superadmin'), (req, res) => {
  const existing = store.adminSettings.findOne({ category: req.params.category });
  if (existing) {
    existing.settings = { ...existing.settings, ...req.body };
    store.adminSettings.save(existing);
    return res.status(200).json({ success: true, data: existing });
  }
  const newSetting = { _id: `setting-${req.params.category}`, category: req.params.category, settings: req.body };
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
  res.status(200).json({
    success: true,
    data: {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      completed: referrals.filter((r) => r.status === 'completed').length,
      rejected: referrals.filter((r) => r.status === 'rejected').length,
    },
  });
});

router.get('/admin/referrals/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const referral = store.referrals.findById(req.params.id);
  if (!referral) return res.status(404).json({ success: false, error: 'Referral not found' });
  res.status(200).json({ success: true, data: referral });
});

// Admin AI management — stub responses so pages load without errors
router.get('/admin/ai-management/reports', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(200).json({ success: true, count: 0, data: [] });
});

router.get('/admin/ai-management/aggregate', protect, authorize('admin', 'superadmin'), (req, res) => {
  res.status(200).json({ success: true, data: { totalReports: 0, publishedReports: 0, avgAccuracy: 0 } });
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

// Admin prior-auth routes
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

router.get('/admin/patient-engagement', protect, authorize('admin', 'superadmin'), (req, res) => {
  const { status, type, patientId, search, page = 0, limit = 15 } = req.query;
  let results = [...syntheticPatientNotifications];
  if (status && status !== 'all') results = results.filter(n => n.status === status);
  if (type && type !== 'all') results = results.filter(n => n.type === type);
  if (patientId) results = results.filter(n => n.patientId === patientId);
  if (search) { const q = search.toLowerCase(); results = results.filter(n => n.patientName?.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q)); }
  const total = results.length;
  results = results.slice(parseInt(page) * parseInt(limit), (parseInt(page) + 1) * parseInt(limit));
  const totalSent = syntheticPatientNotifications.filter(n => ['sent','delivered','read'].includes(n.status)).length;
  const totalDelivered = syntheticPatientNotifications.filter(n => ['delivered','read'].includes(n.status)).length;
  const totalPending = syntheticPatientNotifications.filter(n => n.status === 'pending').length;
  const totalFailed = syntheticPatientNotifications.filter(n => n.status === 'failed').length;
  res.json({ success: true, data: { notifications: results, total, stats: { totalSent, totalDelivered, totalPending, totalFailed } } });
});

router.get('/admin/patient-engagement/:id', protect, authorize('admin', 'superadmin'), (req, res) => {
  const n = syntheticPatientNotifications.find(x => x._id === req.params.id);
  if (!n) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: n });
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

// ---------------------------------------------------------------------------
// Catch-all for any unmapped synthetic route
// ---------------------------------------------------------------------------

router.use('*', (req, res) => {
  res.status(404).json({ success: false, error: `Synthetic route not found: ${req.method} ${req.originalUrl}` });
});

module.exports = router;
