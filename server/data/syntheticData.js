/**
 * Synthetic in-memory data store.
 * Mirrors the shape of populate_db.js so the server can run without MongoDB.
 * All user accounts share the demo password:  Demo1234!
 */
const bcrypt = require('bcryptjs');

const PASSWORD_HASH = bcrypt.hashSync('Demo1234!', 10);

// ---------------------------------------------------------------------------
// Raw data (converted from populate_db.js mongo shell script)
// ---------------------------------------------------------------------------

const users = [
  {
    _id: 'user-1', id: 'user-1',
    name: 'Admin User', firstName: 'Admin', lastName: 'User',
    email: 'admin@clinictrustai.com', password: PASSWORD_HASH,
    role: 'admin', organization: 'ClinicTrust Health Network',
    specialty: 'Healthcare Administration',
    walletAddress: '0xAB23F890CD45E67A8B901C2D3E456F78D9A0B1C2',
    blockchainId: '0x1a2b3c4d5e6f7g8h9i0j',
    isActive: true, accountStatus: 'approved', kycVerified: true,
    tokenBalance: 500, loginAttempts: 0,
    createdAt: new Date(Date.now() - 30 * 86400000), lastLogin: new Date(),
    profileImage: null,
  },
  {
    _id: 'user-2', id: 'user-2',
    name: 'Dr. John Smith', firstName: 'John', lastName: 'Smith',
    email: 'john.smith@clinictrustai.com', password: PASSWORD_HASH,
    role: 'doctor', organization: 'Metro Heart Institute',
    specialty: 'Cardiology',
    walletAddress: '0xBC34D567EF89A01B2C3D4E5F67890A1B2C3D4E5F',
    blockchainId: '0x2b3c4d5e6f7g8h9i0j1k',
    isActive: true, accountStatus: 'approved', kycVerified: true,
    tokenBalance: 350, loginAttempts: 0,
    createdAt: new Date(Date.now() - 25 * 86400000),
    lastLogin: new Date(Date.now() - 86400000), profileImage: null,
  },
  {
    _id: 'user-3', id: 'user-3',
    name: 'Nurse Sarah Johnson', firstName: 'Sarah', lastName: 'Johnson',
    email: 'sarah.johnson@clinictrustai.com', password: PASSWORD_HASH,
    role: 'provider', organization: 'Community Care Hospital',
    specialty: 'Pediatric Nursing',
    walletAddress: '0xDE45F678AB90C12D3E4F56789A0B1C2D3E4F5678',
    blockchainId: '0x3c4d5e6f7g8h9i0j1k2l',
    isActive: true, accountStatus: 'approved', kycVerified: true,
    tokenBalance: 175, loginAttempts: 0,
    createdAt: new Date(Date.now() - 20 * 86400000),
    lastLogin: new Date(Date.now() - 2 * 86400000), profileImage: null,
  },
  {
    _id: 'user-4', id: 'user-4',
    name: 'Dr. Michael Chen', firstName: 'Michael', lastName: 'Chen',
    email: 'michael.chen@clinictrustai.com', password: PASSWORD_HASH,
    role: 'doctor', organization: 'Neuroscience Medical Center',
    specialty: 'Neurology',
    walletAddress: '0xEF56789AB01C2D3E4F56789A0B1C2D3E4F56789A',
    blockchainId: '0x4d5e6f7g8h9i0j1k2l3m',
    isActive: true, accountStatus: 'approved', kycVerified: true,
    tokenBalance: 420, loginAttempts: 0,
    createdAt: new Date(Date.now() - 15 * 86400000),
    lastLogin: new Date(Date.now() - 3 * 86400000), profileImage: null,
  },
  {
    _id: 'user-5', id: 'user-5',
    name: 'Dr. Robert Williams', firstName: 'Robert', lastName: 'Williams',
    email: 'robert.williams@clinictrustai.com', password: PASSWORD_HASH,
    role: 'doctor', organization: 'Westside Family Medicine',
    specialty: 'General Practice',
    walletAddress: '0xF6789AB01C2D3E4F56789A0B1C2D3E4F56789AB0',
    blockchainId: '0x5e6f7g8h9i0j1k2l3m4n',
    isActive: true, accountStatus: 'approved', kycVerified: true,
    tokenBalance: 290, loginAttempts: 0,
    createdAt: new Date(Date.now() - 10 * 86400000),
    lastLogin: new Date(Date.now() - 86400000), profileImage: null,
  },
];

const patients = [
  {
    _id: 'patient-1', id: 'patient-1',
    patientId: 'PT-100001',
    name: 'James Wilson', firstName: 'James', lastName: 'Wilson',
    email: 'james.wilson@example.com', gender: 'Male',
    dateOfBirth: new Date(1975, 3, 12),
    contactInfo: { phone: '(555) 123-4567', address: '123 Main St, Anytown, USA' },
    insuranceInfo: { provider: 'HealthPlus Insurance', policyNumber: 'HP-987654321', groupNumber: 'G-12345' },
    primaryProvider: 'user-2',
    riskScore: 75, riskLevel: 'high',
    medicalHistory: [{ condition: 'Hypertension', diagnosedDate: new Date(2018, 3, 10), notes: 'Controlled with medication' }],
    medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', startDate: new Date(2018, 3, 15) }],
    allergies: [{ allergen: 'Penicillin', reaction: 'Rash', severity: 'Moderate' }],
    consentRecords: [],
    createdAt: new Date(Date.now() - 120 * 86400000),
    updatedAt: new Date(Date.now() - 5 * 86400000),
  },
  {
    _id: 'patient-2', id: 'patient-2',
    patientId: 'PT-100002',
    name: 'Emily Rodriguez', firstName: 'Emily', lastName: 'Rodriguez',
    email: 'emily.rodriguez@example.com', gender: 'Female',
    dateOfBirth: new Date(1988, 7, 23),
    contactInfo: { phone: '(555) 234-5678', address: '456 Oak Ave, Somewhere, USA' },
    insuranceInfo: { provider: 'MediCare Plus', policyNumber: 'MC-123456789', groupNumber: 'G-67890' },
    primaryProvider: 'user-2',
    riskScore: 45, riskLevel: 'medium',
    medicalHistory: [{ condition: 'Asthma', diagnosedDate: new Date(2015, 6, 12), notes: 'Mild, controlled with inhaler' }],
    medications: [{ name: 'Albuterol', dosage: '90mcg', frequency: 'As needed', startDate: new Date(2015, 6, 15) }],
    allergies: [],
    consentRecords: [],
    createdAt: new Date(Date.now() - 90 * 86400000),
    updatedAt: new Date(Date.now() - 2 * 86400000),
  },
  {
    _id: 'patient-3', id: 'patient-3',
    patientId: 'PT-100003',
    name: 'Thomas Brown', firstName: 'Thomas', lastName: 'Brown',
    email: 'thomas.brown@example.com', gender: 'Male',
    dateOfBirth: new Date(1965, 11, 5),
    contactInfo: { phone: '(555) 345-6789', address: '789 Pine St, Elsewhere, USA' },
    insuranceInfo: { provider: 'Blue Shield', policyNumber: 'BS-567891234', groupNumber: 'G-24680' },
    primaryProvider: 'user-4',
    riskScore: 85, riskLevel: 'high',
    medicalHistory: [{ condition: 'Type 2 Diabetes', diagnosedDate: new Date(2010, 2, 8), notes: 'Managed with medication and diet' }],
    medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', startDate: new Date(2010, 2, 10) }],
    allergies: [],
    consentRecords: [],
    createdAt: new Date(Date.now() - 60 * 86400000),
    updatedAt: new Date(Date.now() - 10 * 86400000),
  },
  {
    _id: 'patient-4', id: 'patient-4',
    patientId: 'PT-100004',
    name: 'Maria Garcia', firstName: 'Maria', lastName: 'Garcia',
    email: 'maria.garcia@example.com', gender: 'Female',
    dateOfBirth: new Date(1980, 5, 14),
    contactInfo: { phone: '(555) 456-7890', address: '321 Elm St, Anywhere, USA' },
    insuranceInfo: { provider: 'Aetna', policyNumber: 'AET-456789012', groupNumber: 'G-11111' },
    primaryProvider: 'user-5',
    riskScore: 30, riskLevel: 'low',
    medicalHistory: [],
    medications: [],
    allergies: [],
    consentRecords: [],
    createdAt: new Date(Date.now() - 30 * 86400000),
    updatedAt: new Date(Date.now() - 1 * 86400000),
  },
  {
    _id: 'patient-5', id: 'patient-5',
    patientId: 'PT-100005',
    name: 'David Lee', firstName: 'David', lastName: 'Lee',
    email: 'david.lee@example.com', gender: 'Male',
    dateOfBirth: new Date(1972, 9, 28),
    contactInfo: { phone: '(555) 567-8901', address: '654 Maple Ave, Somewhere, USA' },
    insuranceInfo: { provider: 'United Health', policyNumber: 'UH-789012345', groupNumber: 'G-22222' },
    primaryProvider: 'user-5',
    riskScore: 60, riskLevel: 'medium',
    medicalHistory: [{ condition: 'Hyperlipidemia', diagnosedDate: new Date(2020, 1, 20), notes: 'Diet controlled' }],
    medications: [{ name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', startDate: new Date(2020, 1, 25) }],
    allergies: [],
    consentRecords: [],
    createdAt: new Date(Date.now() - 45 * 86400000),
    updatedAt: new Date(Date.now() - 7 * 86400000),
  },
];

const referrals = [
  {
    _id: 'referral-1', id: 'referral-1',
    patient: 'patient-1', patientId: 'patient-1',
    referringProvider: 'user-2', receivingProvider: 'user-4',
    specialty: 'Cardiology', reason: 'Abnormal ECG findings',
    status: 'completed', urgency: 'urgent',
    notes: 'Patient has family history of heart disease',
    blockchainId: 'tx_r1a2b3c4d5e6f7g8h9',
    billing: { amount: 250, currency: 'USD', status: 'processed', smartContractId: 'sc-001', transactionId: 'tx_r1a2b3c4' },
    createdAt: new Date(2023, 6, 10), updatedAt: new Date(2023, 7, 3),
    completionDate: new Date(2023, 7, 3),
  },
  {
    _id: 'referral-2', id: 'referral-2',
    patient: 'patient-3', patientId: 'patient-3',
    referringProvider: 'user-5', receivingProvider: 'user-4',
    specialty: 'Neurology', reason: 'Recurring headaches and dizziness',
    status: 'pending', urgency: 'routine',
    notes: 'Patient reports symptoms worsening over past month',
    blockchainId: 'tx_r2b3c4d5e6f7g8h9i0',
    billing: { amount: 0, currency: 'USD', status: 'pending' },
    createdAt: new Date(2023, 6, 28), updatedAt: new Date(2023, 6, 28),
  },
  {
    _id: 'referral-3', id: 'referral-3',
    patient: 'patient-2', patientId: 'patient-2',
    referringProvider: 'user-2', receivingProvider: 'user-5',
    specialty: 'General Practice', reason: 'Annual follow-up - diabetes management',
    status: 'accepted', urgency: 'routine',
    notes: 'Patient doing well on current regimen',
    blockchainId: 'tx_r3c4d5e6f7g8h9i0j1',
    billing: { amount: 150, currency: 'USD', status: 'pending' },
    createdAt: new Date(Date.now() - 14 * 86400000), updatedAt: new Date(Date.now() - 10 * 86400000),
  },
];

const analytics = [
  {
    _id: 'ar-001', id: 'ar-001',
    name: 'Q2 Patient Outcome Analysis', type: 'patientOutcomes',
    status: 'completed', creator: 'user-3',
    createdAt: new Date(2023, 6, 28), updatedAt: new Date(2023, 6, 30),
    author: 'Nurse Sarah Johnson', authorId: 'user-3',
    confidenceScore: 0.87,
    results: {
      summary: '15% improvement in patient outcomes for Q2 compared to Q1.',
      insights: [
        { title: 'Improved Recovery Times', severity: 'info', recommendations: ['Continue current protocols'] },
      ],
    },
    sharedWith: [],
    tokenReward: 15,
  },
  {
    _id: 'ar-002', id: 'ar-002',
    name: 'Diabetes Risk Stratification', type: 'patientRisk',
    status: 'completed', creator: 'user-4',
    createdAt: new Date(2023, 6, 25), updatedAt: new Date(2023, 6, 26),
    author: 'Dr. Michael Chen', authorId: 'user-4',
    confidenceScore: 0.92,
    results: {
      summary: '37 high-risk patients identified for proactive intervention.',
      insights: [
        { title: 'High BMI Correlation', severity: 'warning', recommendations: ['Implement targeted diet program'] },
      ],
    },
    sharedWith: [],
    tokenReward: 20,
  },
  {
    _id: 'ar-003', id: 'ar-003',
    name: 'Cardiology Department Efficiency', type: 'operationalEfficiency',
    status: 'processing', creator: 'user-5',
    createdAt: new Date(2023, 7, 1), updatedAt: new Date(2023, 7, 1),
    author: 'Dr. Robert Williams', authorId: 'user-5',
    confidenceScore: 0,
    results: { summary: 'Analysis in progress' },
    sharedWith: [],
    tokenReward: 0,
  },
];

const tokenTransactions = [
  { _id: 'tx-1', userId: 'user-4', user: 'user-4', type: 'earn', amount: 15,
    reason: 'Reward for Patient Risk Analysis', status: 'completed',
    balanceAfter: 435, blockchainTransactionId: 'tx_a1b2c3d4e5f6',
    createdAt: new Date(2023, 6, 15) },
  { _id: 'tx-2', userId: 'user-2', user: 'user-2', type: 'earn', amount: 20,
    reason: 'Reward for Data Contribution', status: 'completed',
    balanceAfter: 370, blockchainTransactionId: 'tx_g7h8i9j0k1l2',
    createdAt: new Date(2023, 5, 21) },
  { _id: 'tx-3', userId: 'user-5', user: 'user-5', type: 'spend', amount: -25,
    reason: 'Redeemed for Premium Analytics Report', status: 'completed',
    balanceAfter: 315, blockchainTransactionId: 'tx_m3n4o5p6q7r8',
    createdAt: new Date(2023, 5, 10) },
  { _id: 'tx-4', userId: 'user-2', user: 'user-2', type: 'transfer', amount: -10,
    reason: 'Transferred to Dr. Robert Williams', status: 'completed',
    balanceAfter: 360, blockchainTransactionId: 'tx_s9t8u7v6w5x4',
    createdAt: new Date(2023, 4, 25) },
  { _id: 'tx-5', userId: 'user-3', user: 'user-3', type: 'earn', amount: 15,
    reason: 'Reward for Patient Outcomes Analysis', status: 'completed',
    balanceAfter: 190, blockchainTransactionId: 'tx_a2b3c4d5e6f7',
    createdAt: new Date(2023, 4, 11) },
  { _id: 'tx-6', userId: 'user-4', user: 'user-4', type: 'earn', amount: 30,
    reason: 'Reward for Research Participation', status: 'completed',
    balanceAfter: 450, blockchainTransactionId: 'tx_b2c3d4e5f6g7',
    createdAt: new Date(2023, 6, 5) },
];

const notifications = [
  { _id: 'notif-1', user: 'user-2', title: 'Referral Completed',
    message: 'Cardiology referral for James Wilson has been completed.',
    type: 'referral', isRead: false, createdAt: new Date(Date.now() - 2 * 86400000) },
  { _id: 'notif-2', user: 'user-2', title: 'Tokens Earned',
    message: 'You earned 20 tokens for data contribution.',
    type: 'token', isRead: true, createdAt: new Date(Date.now() - 5 * 86400000) },
  { _id: 'notif-3', user: 'user-4', title: 'New Referral Received',
    message: 'A new neurology referral has been assigned to you.',
    type: 'referral', isRead: false, createdAt: new Date(Date.now() - 86400000) },
];

const activities = [
  { _id: 'act-001', type: 'referral', title: 'Referral completed',
    description: 'Cardiology referral for James Wilson',
    timestamp: new Date(2023, 7, 3, 14, 25), userId: 'user-2', patientId: 'patient-1' },
  { _id: 'act-002', type: 'analytics', title: 'Analytics report completed',
    description: 'Q2 Patient Outcome Analysis',
    timestamp: new Date(2023, 6, 30, 16, 45), userId: 'user-3' },
  { _id: 'act-003', type: 'patient', title: 'Patient added',
    description: 'New patient: Emily Rodriguez',
    timestamp: new Date(2023, 6, 29, 11, 15), userId: 'user-5', patientId: 'patient-2' },
  { _id: 'act-004', type: 'referral', title: 'Referral created',
    description: 'Neurology referral for Thomas Brown',
    timestamp: new Date(2023, 6, 28, 9, 30), userId: 'user-5', patientId: 'patient-3' },
  { _id: 'act-005', type: 'token', title: 'Tokens earned',
    description: 'Earned 25 tokens for Risk Analysis Report',
    timestamp: new Date(2023, 6, 27, 15, 10), userId: 'user-4' },
];

const adminSettings = [
  { _id: 'setting-general', category: 'general', key: 'general',
    settings: { systemName: 'ClinicTrust AI Platform', organizationName: 'ClinicTrust Health Network',
      supportEmail: 'support@clinictrustai.com', maintenanceMode: false } },
  { _id: 'setting-security', category: 'security', key: 'security',
    settings: { passwordPolicy: { minLength: 8, requireUppercase: true }, mfaRequired: false,
      sessionTimeout: 30, maxLoginAttempts: 5 } },
  { _id: 'setting-ai', category: 'ai', key: 'ai',
    settings: { riskThresholds: { readmission: 0.65, adverseEvent: 0.75 },
      feedbackCollection: true } },
  { _id: 'setting-notifications', category: 'notifications', key: 'notifications',
    settings: { emailNotifications: true, inAppNotifications: true } },
  { _id: 'setting-tokens', category: 'tokens', key: 'tokens',
    settings: { tokenEconomy: true, transfersEnabled: true, maxDailyEarn: 100 } },
];

// ---------------------------------------------------------------------------
// CRUD helpers — synchronous, works like a mini in-memory DB
// ---------------------------------------------------------------------------

function makeStore(data) {
  const store = [...data];

  return {
    findAll() { return store; },
    findById(id) { return store.find((r) => r._id === id || r.id === id) || null; },
    findOne(criteria) {
      return store.find((r) => Object.entries(criteria).every(([k, v]) => r[k] === v)) || null;
    },
    find(criteria = {}) {
      if (Object.keys(criteria).length === 0) return [...store];
      return store.filter((r) => Object.entries(criteria).every(([k, v]) => r[k] === v));
    },
    save(record) {
      const idx = store.findIndex((r) => r._id === record._id);
      if (idx >= 0) { store[idx] = { ...store[idx], ...record }; return store[idx]; }
      store.push(record); return record;
    },
    remove(id) {
      const idx = store.findIndex((r) => r._id === id);
      if (idx >= 0) store.splice(idx, 1);
    },
    count(criteria = {}) { return this.find(criteria).length; },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const store = {
  users: makeStore(users),
  patients: makeStore(patients),
  referrals: makeStore(referrals),
  analytics: makeStore(analytics),
  tokenTransactions: makeStore(tokenTransactions),
  notifications: makeStore(notifications),
  activities: makeStore(activities),
  adminSettings: makeStore(adminSettings),
};

module.exports = { store, DEMO_PASSWORD: 'Demo1234!' };
