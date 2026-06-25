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
