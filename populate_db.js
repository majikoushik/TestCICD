// Database populate script — run with: npm run populate_db
// Drops and recreates all collections with fresh sample data.
require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinictrustai';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log('Connected. Dropping and recreating all collections...\n');

// ── Drop ALL collections for a clean slate ───────────────────────────────
await db.collection('users').drop().catch(() => {});
await db.collection('patients').drop().catch(() => {});
await db.collection('referrals').drop().catch(() => {});
await db.collection('analytics').drop().catch(() => {});
await db.collection('tokenTransactions').drop().catch(() => {});
await db.collection('tokenServices').drop().catch(() => {});
await db.collection('tokenEarnSources').drop().catch(() => {});
await db.collection('medicalRecords').drop().catch(() => {});
await db.collection('consentRecords').drop().catch(() => {});
await db.collection('systemStatus').drop().catch(() => {});
await db.collection('settings').drop().catch(() => {});
await db.collection('activities').drop().catch(() => {});
await db.collection('broadcastMessages').drop().catch(() => {});
await db.collection('targetedAlerts').drop().catch(() => {});
await db.collection('escalationWorkflows').drop().catch(() => {});
await db.collection('adminSettings').drop().catch(() => {});
await db.collection('referralTransactions').drop().catch(() => {});
await db.collection('referralDisputes').drop().catch(() => {});
await db.collection('aiReports').drop().catch(() => {});
await db.collection('ehi_audit_logs').drop().catch(() => {});
await db.collection('providerprofiles').drop().catch(() => {});
await db.collection('priorauthorizations').drop().catch(() => {});
await db.collection('appointments').drop().catch(() => {});
await db.collection('appointmenttypes').drop().catch(() => {});
await db.collection('providerschedules').drop().catch(() => {});
await db.collection('scheduleexceptions').drop().catch(() => {});
await db.collection('waitlistentries').drop().catch(() => {});
await db.collection('dtxprescriptions').drop().catch(() => {});
await db.collection('dtxprograms').drop().catch(() => {});
await db.collection('contacts').drop().catch(() => {});
await db.collection('ambientSessions').drop().catch(() => {});
await db.collection('providerMatchProfiles').drop().catch(() => {});
await db.collection('notificationtemplates').drop().catch(() => {});
await db.collection('patientnotifications').drop().catch(() => {});
await db.collection('notificationcampaigns').drop().catch(() => {});

// Create users collection
// Password hash for "Demo1234!" with bcrypt cost 10
const DEMO_PASSWORD_HASH = "$2a$10$tt2ByN.Kwh8N117aBIDNs.uF6q8wIcYlRzK1LWcwyrpR85iMNNoli";

console.log("Creating users collection...");
const users = [
  {
    _id: "user-1",
    name: "Admin User",
    firstName: "Admin",
    lastName: "User",
    email: "admin@clinictrustai.com",
    password: DEMO_PASSWORD_HASH,
    role: "admin",
    organization: "ClinicTrust Health Network",
    specialty: "Healthcare Administration",
    walletAddress: "0xAB23F890CD45E67A8B901C2D3E456F78D9A0B1C2",
    isActive: true,
    accountStatus: "approved",
    kycVerified: true,
    emailVerified: true,
    onboardingStatus: "verified",
    loginAttempts: 0,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(),
    profileImage: null,
    status: "active",
    blockchainId: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
    verificationStatus: "verified",
    tokenBalance: 500
  },
  {
    _id: "user-2",
    name: "Dr. John Smith",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@clinictrustai.com",
    password: DEMO_PASSWORD_HASH,
    role: "doctor",
    organization: "Metro Heart Institute",
    specialty: "Cardiology",
    walletAddress: "0xBC34D567EF89A01B2C3D4E5F67890A1B2C3D4E5F",
    isActive: true,
    accountStatus: "approved",
    kycVerified: true,
    emailVerified: true,
    onboardingStatus: "verified",
    loginAttempts: 0,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    profileImage: null,
    status: "active",
    blockchainId: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u",
    verificationStatus: "verified",
    tokenBalance: 350
  },
  {
    _id: "user-3",
    name: "Nurse Sarah Johnson",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@clinictrustai.com",
    password: DEMO_PASSWORD_HASH,
    role: "provider",
    organization: "Community Care Hospital",
    specialty: "Pediatric Nursing",
    walletAddress: "0xDE45F678AB90C12D3E4F56789A0B1C2D3E4F5678",
    isActive: true,
    accountStatus: "approved",
    kycVerified: true,
    emailVerified: true,
    onboardingStatus: "verified",
    loginAttempts: 0,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    profileImage: null,
    status: "active",
    blockchainId: "0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v",
    verificationStatus: "verified",
    tokenBalance: 175
  },
  {
    _id: "user-4",
    name: "Dr. Michael Chen",
    firstName: "Michael",
    lastName: "Chen",
    email: "michael.chen@clinictrustai.com",
    password: DEMO_PASSWORD_HASH,
    role: "doctor",
    organization: "Neuroscience Medical Center",
    specialty: "Neurology",
    walletAddress: "0xEF56789AB01C2D3E4F56789A0B1C2D3E4F56789A",
    isActive: true,
    accountStatus: "approved",
    kycVerified: true,
    emailVerified: true,
    onboardingStatus: "verified",
    loginAttempts: 0,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    profileImage: null,
    status: "active",
    blockchainId: "0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w",
    verificationStatus: "verified",
    tokenBalance: 420
  },
  {
    _id: "user-5",
    name: "Dr. Robert Williams",
    firstName: "Robert",
    lastName: "Williams",
    email: "robert.williams@clinictrustai.com",
    password: DEMO_PASSWORD_HASH,
    role: "doctor",
    organization: "Westside Family Medicine",
    specialty: "General Practice",
    walletAddress: "0xF6789AB01C2D3E4F56789A0B1C2D3E4F56789AB0",
    isActive: true,
    accountStatus: "approved",
    kycVerified: true,
    emailVerified: true,
    onboardingStatus: "verified",
    loginAttempts: 0,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    profileImage: null,
    status: "active",
    blockchainId: "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x",
    verificationStatus: "verified",
    tokenBalance: 290
  }
];
await db.collection('users').insertMany(users);

// Create patients collection
console.log("Creating patients collection...");
const patients = [
  {
    _id: "patient-1",
    patientId: "PT-100001",
    name: "James Wilson",
    firstName: "James",
    lastName: "Wilson",
    dateOfBirth: new Date(1975, 3, 12),
    gender: "male",
    contactInfo: {
      email: "james.wilson@example.com",
      phone: "(555) 123-4567",
      address: "123 Main St, Anytown, NY 10001"
    },
    insuranceInfo: {
      provider: "HealthPlus Insurance",
      policyNumber: "HP-987654321",
      groupNumber: "G-12345"
    },
    primaryProvider: "user-2",
    riskScore: 75,
    medicalHistory: [
      { condition: "Hypertension", diagnosedDate: new Date(2018, 2, 10), notes: "Stage 1 hypertension; managed with lifestyle changes and medication." },
      { condition: "Type 2 Diabetes", diagnosedDate: new Date(2020, 8, 15), notes: "HbA1c 7.2%; on Metformin 500mg twice daily." }
    ],
    medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", startDate: new Date(2018, 3, 1) },
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily with meals", startDate: new Date(2020, 9, 1) },
      { name: "Aspirin", dosage: "81mg", frequency: "Once daily", startDate: new Date(2019, 0, 15) }
    ],
    allergies: [
      { allergen: "Penicillin", reaction: "Rash and hives", severity: "Moderate" },
      { allergen: "Shellfish", reaction: "Anaphylaxis", severity: "Severe" }
    ],
    recentVisits: [
      { date: new Date(2026, 4, 15), provider: "Dr. John Smith", reason: "Diabetes follow-up", notes: "HbA1c improved to 7.0%. Continue current regimen." },
      { date: new Date(2026, 2, 3), provider: "Dr. John Smith", reason: "Annual physical", notes: "BP 138/88. Adjusted Lisinopril dosage." },
      { date: new Date(2025, 11, 10), provider: "Dr. John Smith", reason: "Hypertension check", notes: "BP trending down. Good medication adherence." }
    ],
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-2",
    patientId: "PT-100002",
    name: "Emily Rodriguez",
    firstName: "Emily",
    lastName: "Rodriguez",
    dateOfBirth: new Date(1988, 7, 23),
    gender: "female",
    contactInfo: {
      email: "emily.rodriguez@example.com",
      phone: "(555) 234-5678",
      address: "456 Oak Ave, Miami, FL 33101"
    },
    insuranceInfo: {
      provider: "MediCare Plus",
      policyNumber: "MC-123456789",
      groupNumber: "G-67890"
    },
    primaryProvider: "user-2",
    riskScore: 45,
    medicalHistory: [
      { condition: "Asthma", diagnosedDate: new Date(2005, 6, 20), notes: "Mild persistent asthma; well-controlled with inhaler." },
      { condition: "Iron Deficiency Anemia", diagnosedDate: new Date(2022, 1, 14), notes: "Hemoglobin 10.2 g/dL. On iron supplementation." }
    ],
    medications: [
      { name: "Albuterol", dosage: "90mcg", frequency: "As needed for asthma symptoms", startDate: new Date(2005, 7, 1) },
      { name: "Fluticasone", dosage: "100mcg", frequency: "Twice daily", startDate: new Date(2010, 0, 1) },
      { name: "Ferrous Sulfate", dosage: "325mg", frequency: "Once daily with orange juice", startDate: new Date(2022, 2, 1) }
    ],
    allergies: [
      { allergen: "NSAIDs (Ibuprofen)", reaction: "Bronchospasm", severity: "Severe" }
    ],
    recentVisits: [
      { date: new Date(2026, 5, 1), provider: "Dr. John Smith", reason: "Asthma management review", notes: "Peak flow improved. Reducing inhaler frequency." },
      { date: new Date(2026, 2, 20), provider: "Dr. John Smith", reason: "Anemia follow-up", notes: "Hemoglobin 11.8 g/dL. Good response to iron therapy." }
    ],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-3",
    patientId: "PT-100003",
    name: "Thomas Brown",
    firstName: "Thomas",
    lastName: "Brown",
    dateOfBirth: new Date(1965, 11, 5),
    gender: "male",
    contactInfo: {
      email: "thomas.brown@example.com",
      phone: "(555) 345-6789",
      address: "789 Pine St, Chicago, IL 60601"
    },
    insuranceInfo: {
      provider: "Blue Shield",
      policyNumber: "BS-567891234",
      groupNumber: "G-24680"
    },
    primaryProvider: "user-2",
    riskScore: 85,
    medicalHistory: [
      { condition: "Coronary Artery Disease", diagnosedDate: new Date(2015, 4, 10), notes: "Stent placed in LAD 2015. On dual antiplatelet therapy." },
      { condition: "Hyperlipidemia", diagnosedDate: new Date(2012, 9, 8), notes: "LDL 110 mg/dL on statin therapy." },
      { condition: "COPD", diagnosedDate: new Date(2019, 1, 28), notes: "Gold Stage II. Former smoker, quit 2018." }
    ],
    medications: [
      { name: "Atorvastatin", dosage: "40mg", frequency: "Once daily at bedtime", startDate: new Date(2012, 10, 1) },
      { name: "Clopidogrel", dosage: "75mg", frequency: "Once daily", startDate: new Date(2015, 5, 1) },
      { name: "Tiotropium", dosage: "18mcg", frequency: "Once daily via inhaler", startDate: new Date(2019, 2, 1) },
      { name: "Metoprolol", dosage: "25mg", frequency: "Twice daily", startDate: new Date(2015, 5, 1) }
    ],
    allergies: [
      { allergen: "ACE Inhibitors", reaction: "Angioedema", severity: "Severe" },
      { allergen: "Latex", reaction: "Contact dermatitis", severity: "Mild" }
    ],
    recentVisits: [
      { date: new Date(2026, 5, 10), provider: "Dr. John Smith", reason: "Cardiology follow-up", notes: "EKG unchanged. Ejection fraction 55%. Stable." },
      { date: new Date(2026, 3, 5), provider: "Dr. John Smith", reason: "COPD exacerbation", notes: "Prescribed short-course prednisone. Spirometry scheduled." },
      { date: new Date(2026, 0, 18), provider: "Dr. John Smith", reason: "Annual cardiac review", notes: "Stress test normal. Continue current regimen." }
    ],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-4",
    patientId: "PT-100004",
    name: "Maria Garcia",
    firstName: "Maria",
    lastName: "Garcia",
    dateOfBirth: new Date(1980, 5, 18),
    gender: "female",
    contactInfo: {
      email: "maria.garcia@example.com",
      phone: "(555) 456-7890",
      address: "321 Elm St, Houston, TX 77001"
    },
    insuranceInfo: {
      provider: "Aetna Health",
      policyNumber: "AH-112233445",
      groupNumber: "G-55500"
    },
    primaryProvider: "user-2",
    riskScore: 60,
    medicalHistory: [
      { condition: "Hypothyroidism", diagnosedDate: new Date(2016, 3, 22), notes: "TSH 6.8 at diagnosis. Now TSH 2.1 on Levothyroxine." },
      { condition: "Migraine", diagnosedDate: new Date(2010, 7, 5), notes: "Chronic migraines 3–4x/month. Triggers: stress, hormonal changes." }
    ],
    medications: [
      { name: "Levothyroxine", dosage: "75mcg", frequency: "Once daily on empty stomach", startDate: new Date(2016, 4, 1) },
      { name: "Sumatriptan", dosage: "50mg", frequency: "As needed for migraines (max 2/day)", startDate: new Date(2011, 0, 15) },
      { name: "Propranolol", dosage: "40mg", frequency: "Twice daily for migraine prevention", startDate: new Date(2018, 6, 1) }
    ],
    allergies: [
      { allergen: "Sulfa drugs", reaction: "Rash", severity: "Moderate" }
    ],
    recentVisits: [
      { date: new Date(2026, 4, 28), provider: "Dr. John Smith", reason: "Thyroid management", notes: "TSH 2.4 — well controlled. Continue current dose." },
      { date: new Date(2026, 1, 14), provider: "Dr. John Smith", reason: "Migraine frequency review", notes: "Frequency reduced to 1–2x/month on propranolol. Good response." }
    ],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-5",
    patientId: "PT-100005",
    name: "David Lee",
    firstName: "David",
    lastName: "Lee",
    dateOfBirth: new Date(1955, 9, 30),
    gender: "male",
    contactInfo: {
      email: "david.lee@example.com",
      phone: "(555) 567-8901",
      address: "654 Maple Ave, Seattle, WA 98101"
    },
    insuranceInfo: {
      provider: "Medicare",
      policyNumber: "MC-998877665",
      groupNumber: "G-77700"
    },
    primaryProvider: "user-2",
    riskScore: 90,
    medicalHistory: [
      { condition: "Chronic Kidney Disease Stage 3", diagnosedDate: new Date(2017, 8, 12), notes: "eGFR 42 mL/min. Dietary protein restriction advised." },
      { condition: "Atrial Fibrillation", diagnosedDate: new Date(2019, 11, 3), notes: "Paroxysmal AFib. On anticoagulation." },
      { condition: "Osteoarthritis", diagnosedDate: new Date(2014, 5, 20), notes: "Bilateral knee involvement. Managed conservatively." }
    ],
    medications: [
      { name: "Rivaroxaban", dosage: "20mg", frequency: "Once daily with evening meal", startDate: new Date(2020, 0, 10) },
      { name: "Furosemide", dosage: "20mg", frequency: "Once daily", startDate: new Date(2018, 2, 1) },
      { name: "Calcium Carbonate", dosage: "500mg", frequency: "Three times daily with meals", startDate: new Date(2017, 9, 1) },
      { name: "Acetaminophen", dosage: "500mg", frequency: "Every 6 hours as needed for pain", startDate: new Date(2015, 0, 1) }
    ],
    allergies: [
      { allergen: "NSAIDs", reaction: "Acute kidney injury", severity: "Severe" },
      { allergen: "Contrast dye", reaction: "Nephrotoxicity", severity: "Severe" }
    ],
    recentVisits: [
      { date: new Date(2026, 5, 15), provider: "Dr. John Smith", reason: "CKD monitoring", notes: "eGFR stable at 40. Creatinine 1.8. Continue current management." },
      { date: new Date(2026, 3, 2), provider: "Dr. John Smith", reason: "AFib follow-up", notes: "Rate controlled. INR therapeutic. No new episodes reported." },
      { date: new Date(2026, 1, 20), provider: "Dr. John Smith", reason: "Knee pain assessment", notes: "Referred to orthopedics for evaluation of knee replacement." }
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-6",
    patientId: "PT-100006",
    name: "Aisha Patel",
    firstName: "Aisha",
    lastName: "Patel",
    dateOfBirth: new Date(1992, 2, 8),
    gender: "female",
    contactInfo: {
      email: "aisha.patel@example.com",
      phone: "(555) 678-9012",
      address: "88 Lotus Lane, San Jose, CA 95101"
    },
    insuranceInfo: {
      provider: "Cigna Health",
      policyNumber: "CG-334455667",
      groupNumber: "G-88800"
    },
    primaryProvider: "user-2",
    riskScore: 30,
    medicalHistory: [
      { condition: "Polycystic Ovary Syndrome (PCOS)", diagnosedDate: new Date(2014, 9, 12), notes: "Managed with lifestyle modification and oral contraceptives." },
      { condition: "Anxiety Disorder", diagnosedDate: new Date(2018, 4, 3), notes: "Generalized anxiety; on SSRI with good response." }
    ],
    medications: [
      { name: "Sertraline", dosage: "50mg", frequency: "Once daily in the morning", startDate: new Date(2018, 5, 1) },
      { name: "Metformin", dosage: "500mg", frequency: "Once daily with dinner", startDate: new Date(2016, 1, 1) }
    ],
    allergies: [
      { allergen: "Amoxicillin", reaction: "Urticaria", severity: "Mild" }
    ],
    recentVisits: [
      { date: new Date(2026, 5, 5), provider: "Dr. John Smith", reason: "Annual wellness visit", notes: "All labs within normal limits. Anxiety well-managed." },
      { date: new Date(2026, 2, 12), provider: "Dr. John Smith", reason: "PCOS review", notes: "Regular cycles. Weight stable. Continue current plan." }
    ],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-7",
    patientId: "PT-100007",
    name: "Robert Johnson",
    firstName: "Robert",
    lastName: "Johnson",
    dateOfBirth: new Date(1948, 6, 4),
    gender: "male",
    contactInfo: {
      email: "robert.johnson@example.com",
      phone: "(555) 789-0123",
      address: "200 Freedom Dr, Atlanta, GA 30301"
    },
    insuranceInfo: {
      provider: "Humana Gold",
      policyNumber: "HG-776655443",
      groupNumber: "G-33300"
    },
    primaryProvider: "user-2",
    riskScore: 88,
    medicalHistory: [
      { condition: "Congestive Heart Failure", diagnosedDate: new Date(2016, 7, 22), notes: "HFrEF, EF 35%. Compensated on medical therapy." },
      { condition: "Type 2 Diabetes", diagnosedDate: new Date(2008, 3, 14), notes: "HbA1c 8.1%. On insulin." },
      { condition: "Hypertension", diagnosedDate: new Date(2005, 10, 30), notes: "BP 145/90 on combination therapy." }
    ],
    medications: [
      { name: "Carvedilol", dosage: "12.5mg", frequency: "Twice daily with food", startDate: new Date(2016, 8, 1) },
      { name: "Sacubitril/Valsartan", dosage: "49/51mg", frequency: "Twice daily", startDate: new Date(2018, 3, 1) },
      { name: "Insulin Glargine", dosage: "20 units", frequency: "Once nightly", startDate: new Date(2015, 0, 1) },
      { name: "Spironolactone", dosage: "25mg", frequency: "Once daily", startDate: new Date(2017, 1, 1) }
    ],
    allergies: [
      { allergen: "Aspirin", reaction: "GI bleeding history", severity: "Moderate" }
    ],
    recentVisits: [
      { date: new Date(2026, 5, 18), provider: "Dr. John Smith", reason: "CHF management", notes: "Weight stable, no edema. EF improved to 40%." },
      { date: new Date(2026, 4, 2), provider: "Dr. John Smith", reason: "Diabetes management", notes: "HbA1c 7.8%. Adjusting insulin to 22 units nightly." },
      { date: new Date(2026, 2, 15), provider: "Dr. John Smith", reason: "Hypertension review", notes: "BP 138/86. Good response to regimen." }
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-8",
    patientId: "PT-100008",
    name: "Sophia Kim",
    firstName: "Sophia",
    lastName: "Kim",
    dateOfBirth: new Date(2001, 10, 17),
    gender: "female",
    contactInfo: {
      email: "sophia.kim@example.com",
      phone: "(555) 890-1234",
      address: "15 Cherry Blossom Ct, Portland, OR 97201"
    },
    insuranceInfo: {
      provider: "UnitedHealth",
      policyNumber: "UH-221133445",
      groupNumber: "G-11100"
    },
    primaryProvider: "user-2",
    riskScore: 20,
    medicalHistory: [
      { condition: "Seasonal Allergic Rhinitis", diagnosedDate: new Date(2012, 3, 5), notes: "Pollen and dust mite allergy confirmed by skin prick test." }
    ],
    medications: [
      { name: "Cetirizine", dosage: "10mg", frequency: "Once daily during allergy season", startDate: new Date(2014, 2, 1) },
      { name: "Fluticasone Nasal Spray", dosage: "50mcg", frequency: "2 sprays per nostril once daily", startDate: new Date(2015, 2, 1) }
    ],
    allergies: [
      { allergen: "Tree pollen", reaction: "Rhinorrhea, sneezing, itchy eyes", severity: "Mild" },
      { allergen: "Dust mites", reaction: "Nasal congestion, wheezing", severity: "Mild" }
    ],
    recentVisits: [
      { date: new Date(2026, 4, 20), provider: "Dr. John Smith", reason: "Allergy season review", notes: "Symptoms controlled. No escalation needed." }
    ],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-9",
    patientId: "PT-100009",
    name: "Marcus Thompson",
    firstName: "Marcus",
    lastName: "Thompson",
    dateOfBirth: new Date(1970, 8, 25),
    gender: "male",
    contactInfo: {
      email: "marcus.thompson@example.com",
      phone: "(555) 901-2345",
      address: "310 Oak Blvd, Detroit, MI 48201"
    },
    insuranceInfo: {
      provider: "Blue Cross Blue Shield",
      policyNumber: "BC-556677889",
      groupNumber: "G-44400"
    },
    primaryProvider: "user-2",
    riskScore: 70,
    medicalHistory: [
      { condition: "Sickle Cell Trait", diagnosedDate: new Date(1998, 0, 15), notes: "Carrier, not disease state. Counselled on implications." },
      { condition: "Hypertension", diagnosedDate: new Date(2013, 6, 9), notes: "Controlled on single agent. BP target <130/80." },
      { condition: "Major Depressive Disorder", diagnosedDate: new Date(2021, 2, 18), notes: "Moderate severity. On antidepressant + therapy." }
    ],
    medications: [
      { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", startDate: new Date(2013, 7, 1) },
      { name: "Bupropion", dosage: "150mg", frequency: "Once daily in the morning", startDate: new Date(2021, 3, 1) }
    ],
    allergies: [],
    recentVisits: [
      { date: new Date(2026, 5, 8), provider: "Dr. John Smith", reason: "Depression follow-up", notes: "PHQ-9 score improved from 14 to 8. Continuing bupropion." },
      { date: new Date(2026, 3, 14), provider: "Dr. John Smith", reason: "Hypertension check", notes: "BP 128/78 — at goal. No medication changes." }
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-10",
    patientId: "PT-100010",
    name: "Linda Chen",
    firstName: "Linda",
    lastName: "Chen",
    dateOfBirth: new Date(1963, 1, 28),
    gender: "female",
    contactInfo: {
      email: "linda.chen@example.com",
      phone: "(555) 012-3456",
      address: "77 Bamboo Way, San Francisco, CA 94102"
    },
    insuranceInfo: {
      provider: "Kaiser Permanente",
      policyNumber: "KP-998811223",
      groupNumber: "G-66600"
    },
    primaryProvider: "user-2",
    riskScore: 55,
    medicalHistory: [
      { condition: "Osteoporosis", diagnosedDate: new Date(2019, 10, 5), notes: "T-score -2.7 at lumbar spine. On bisphosphonate therapy." },
      { condition: "Breast Cancer (in remission)", diagnosedDate: new Date(2017, 4, 12), notes: "Stage II, hormone receptor positive. Completed chemo + radiation 2018. On tamoxifen." },
      { condition: "Hypothyroidism", diagnosedDate: new Date(2014, 8, 20), notes: "Post-radiation hypothyroidism. TSH well-controlled." }
    ],
    medications: [
      { name: "Tamoxifen", dosage: "20mg", frequency: "Once daily", startDate: new Date(2018, 8, 1) },
      { name: "Alendronate", dosage: "70mg", frequency: "Once weekly on empty stomach", startDate: new Date(2019, 11, 1) },
      { name: "Levothyroxine", dosage: "50mcg", frequency: "Once daily on empty stomach", startDate: new Date(2015, 2, 1) },
      { name: "Calcium + Vitamin D", dosage: "1200mg/2000IU", frequency: "Once daily with food", startDate: new Date(2019, 11, 1) }
    ],
    allergies: [
      { allergen: "Codeine", reaction: "Nausea and vomiting", severity: "Moderate" },
      { allergen: "Morphine", reaction: "Respiratory depression", severity: "Severe" }
    ],
    recentVisits: [
      { date: new Date(2026, 5, 12), provider: "Dr. John Smith", reason: "Oncology follow-up", notes: "5-year remission maintained. No evidence of recurrence." },
      { date: new Date(2026, 4, 8), provider: "Dr. John Smith", reason: "Osteoporosis monitoring", notes: "Repeat DEXA: T-score -2.4 (improved). Continue alendronate." },
      { date: new Date(2026, 2, 25), provider: "Dr. John Smith", reason: "Thyroid check", notes: "TSH 2.2 — well-controlled. No dose change." }
    ],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  }
];
await db.collection('patients').insertMany(patients);

// Create medical records for patients
console.log("Creating medical records collection...");
const medicalRecords = [
  {
    _id: "medrec-1",
    patientId: "patient-1",
    type: "condition",
    condition: "Hypertension",
    diagnosedDate: new Date(2018, 3, 10).toISOString(),
    notes: "Controlled with medication",
    providerId: "user-2",
    createdAt: new Date(2018, 3, 10).toISOString(),
    updatedAt: new Date(2023, 1, 15).toISOString()
  },
  {
    _id: "medrec-2",
    patientId: "patient-1",
    type: "medication",
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    startDate: new Date(2018, 3, 15).toISOString(),
    providerId: "user-2",
    createdAt: new Date(2018, 3, 15).toISOString(),
    updatedAt: new Date(2023, 1, 15).toISOString()
  },
  {
    _id: "medrec-3",
    patientId: "patient-1",
    type: "allergy",
    allergen: "Penicillin",
    reaction: "Rash",
    severity: "Moderate",
    providerId: "user-2",
    createdAt: new Date(2018, 5, 20).toISOString(),
    updatedAt: new Date(2018, 5, 20).toISOString()
  },
  {
    _id: "medrec-4",
    patientId: "patient-2",
    type: "condition",
    condition: "Asthma",
    diagnosedDate: new Date(2015, 6, 12).toISOString(),
    notes: "Mild, controlled with inhaler",
    providerId: "user-4",
    createdAt: new Date(2015, 6, 12).toISOString(),
    updatedAt: new Date(2022, 8, 5).toISOString()
  },
  {
    _id: "medrec-5",
    patientId: "patient-2",
    type: "medication",
    name: "Albuterol",
    dosage: "90mcg",
    frequency: "As needed",
    startDate: new Date(2015, 6, 15).toISOString(),
    providerId: "user-4",
    createdAt: new Date(2015, 6, 15).toISOString(),
    updatedAt: new Date(2022, 8, 5).toISOString()
  },
  {
    _id: "medrec-6",
    patientId: "patient-3",
    type: "condition",
    condition: "Type 2 Diabetes",
    diagnosedDate: new Date(2010, 2, 8).toISOString(),
    notes: "Managed with medication and diet",
    providerId: "user-5",
    createdAt: new Date(2010, 2, 8).toISOString(),
    updatedAt: new Date(2023, 0, 10).toISOString()
  },
  {
    _id: "medrec-7",
    patientId: "patient-3",
    type: "medication",
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    startDate: new Date(2010, 2, 10).toISOString(),
    providerId: "user-5",
    createdAt: new Date(2010, 2, 10).toISOString(),
    updatedAt: new Date(2023, 0, 10).toISOString()
  }
];
await db.collection('medicalRecords').insertMany(medicalRecords);

// Create referrals collection
console.log("Creating referrals collection...");
const referrals = [
  {
    _id: "referral-1",
    patientId: "patient-1",
    referringProviderId: "user-2",
    specialistId: "user-4",
    specialty: "Cardiology",
    reason: "Abnormal ECG findings",
    status: "completed",
    priority: "high",
    notes: "Patient has family history of heart disease",
    createdAt: new Date(2023, 6, 10).toISOString(),
    updatedAt: new Date(2023, 7, 3).toISOString(),
    completedAt: new Date(2023, 7, 3).toISOString(),
    blockchainTransactionId: "tx_r1a2b3c4d5e6f7g8h9"
  },
  {
    _id: "referral-2",
    patientId: "patient-3",
    referringProviderId: "user-5",
    specialistId: "user-4",
    specialty: "Neurology",
    reason: "Recurring headaches and dizziness",
    status: "pending",
    priority: "medium",
    notes: "Patient reports symptoms worsening over past month",
    createdAt: new Date(2023, 6, 28).toISOString(),
    updatedAt: new Date(2023, 6, 28).toISOString(),
    blockchainTransactionId: "tx_r2b3c4d5e6f7g8h9i0"
  },
  {
    _id: "referral-3",
    patientId: "patient-2",
    referringProviderId: "user-2",
    specialistId: "user-5",
    specialty: "General Practice",
    reason: "Annual wellness exam and preventive care follow-up",
    status: "accepted",
    priority: "low",
    notes: "Patient needs routine bloodwork review",
    createdAt: new Date(2023, 8, 5).toISOString(),
    updatedAt: new Date(2023, 8, 10).toISOString(),
    blockchainTransactionId: "tx_r3c4d5e6f7g8h9i0j1"
  }
];
await db.collection('referrals').insertMany(referrals);

// Create analytics reports collection
console.log("Creating analytics collection...");
const analytics = [
  {
    _id: "ar-001",
    name: "Q2 Patient Outcome Analysis",
    type: "Outcome Analysis",
    status: "completed",
    createdAt: new Date(2023, 6, 28).toISOString(),
    updatedAt: new Date(2023, 6, 30).toISOString(),
    author: "Dr. Sarah Johnson",
    authorId: "user-3",
    insights: 5,
    recommendations: 3,
    summary: "This analysis shows a 15% improvement in patient outcomes for Q2 compared to Q1, with notable improvements in post-surgical recovery times and medication adherence.",
    data: {
      metrics: {
        patientSatisfaction: 4.7,
        readmissionRate: 0.05,
        averageLOS: 3.2
      },
      trends: [
        { month: "April", value: 0.82 },
        { month: "May", value: 0.87 },
        { month: "June", value: 0.91 }
      ]
    }
  },
  {
    _id: "ar-002",
    name: "Diabetes Risk Stratification",
    type: "Risk Analysis",
    status: "completed",
    createdAt: new Date(2023, 6, 25).toISOString(),
    updatedAt: new Date(2023, 6, 26).toISOString(),
    author: "Dr. Michael Chen",
    authorId: "user-4",
    insights: 7,
    recommendations: 4,
    summary: "This analysis identifies 37 high-risk patients who would benefit from proactive intervention. Key risk factors include family history, BMI > 30, and A1C levels > 5.7%.",
    data: {
      riskGroups: {
        high: 37,
        medium: 124,
        low: 87
      },
      keyFactors: [
        "Family history",
        "BMI > 30",
        "A1C > 5.7%",
        "Sedentary lifestyle"
      ]
    }
  },
  {
    _id: "ar-003",
    name: "Cardiology Department Efficiency",
    type: "Operational Analysis",
    status: "in-progress",
    createdAt: new Date(2023, 7, 1).toISOString(),
    updatedAt: new Date(2023, 7, 1).toISOString(),
    author: "Dr. Robert Williams",
    authorId: "user-5",
    insights: 0,
    recommendations: 0,
    summary: "Analysis in progress",
    data: {
      metrics: {
        averageWaitTime: 18.5,
        patientVolume: 342,
        staffUtilization: 0.78
      }
    }
  }
];
await db.collection('analytics').insertMany(analytics);

// Create token transactions collection
console.log("Creating token transactions collection...");
const tokenTransactions = [
  {
    _id: "tx-1",
    type: "earned",
    amount: 15,
    description: "Reward for Patient Risk Analysis",
    timestamp: new Date(2023, 6, 15),
    transactionId: "tx_a1b2c3d4e5f6",
    userId: "user-4",
    status: "completed",
    category: "data_contribution",
    source: "ai_risk_assessment",
    metadata: {
      patientCount: 12,
      datasetId: "ds-456",
      contributionType: "risk_factors"
    },
    blockchainTxHash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t"
  },
  {
    _id: "tx-2",
    type: "earned",
    amount: 20,
    description: "Reward for Data Contribution",
    timestamp: new Date(2023, 5, 21),
    transactionId: "tx_g7h8i9j0k1l2",
    userId: "user-2",
    status: "completed",
    category: "data_contribution",
    source: "clinical_outcomes",
    metadata: {
      patientCount: 8,
      datasetId: "ds-123",
      contributionType: "treatment_outcomes"
    },
    blockchainTxHash: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u"
  },
  {
    _id: "tx-3",
    type: "spent",
    amount: 25,
    description: "Redeemed for Premium Analytics Report",
    timestamp: new Date(2023, 5, 10),
    transactionId: "tx_m3n4o5p6q7r8",
    userId: "user-5",
    status: "completed",
    category: "service_redemption",
    serviceId: "svc-1",
    metadata: {
      serviceName: "Premium Analytics Report",
      reportId: "ar-001",
      validUntil: new Date(2023, 8, 10)
    },
    blockchainTxHash: "0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v"
  },
  {
    _id: "tx-4",
    type: "transfer",
    amount: 10,
    description: "Transferred to Dr. Robert Williams",
    recipient: "Dr. Robert Williams",
    recipientId: "user-5",
    timestamp: new Date(2023, 4, 25),
    transactionId: "tx_s9t8u7v6w5x4y3z2",
    userId: "user-2",
    status: "completed",
    category: "peer_transfer",
    metadata: {
      reason: "Consultation assistance",
      message: "Thanks for your help with the complex case"
    },
    blockchainTxHash: "0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w"
  },
  {
    _id: "tx-5",
    type: "earned",
    amount: 15,
    description: "Reward for Patient Outcomes Analysis",
    timestamp: new Date(2023, 4, 11),
    transactionId: "tx_a2b3c4d5e6f7g8h9",
    userId: "user-3",
    status: "completed",
    category: "data_contribution",
    source: "outcomes_reporting",
    metadata: {
      patientCount: 15,
      datasetId: "ds-789",
      contributionType: "nursing_outcomes"
    },
    blockchainTxHash: "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x"
  },
  {
    _id: "tx-6",
    type: "earned",
    amount: 30,
    description: "Reward for Research Participation",
    timestamp: new Date(2023, 6, 5),
    transactionId: "tx_b2c3d4e5f6g7h8i9",
    userId: "user-4",
    status: "completed",
    category: "research",
    source: "clinical_trial_data",
    metadata: {
      studyId: "study-456",
      contributionType: "patient_enrollment",
      patientsEnrolled: 3
    },
    blockchainTxHash: "0x6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y"
  },
  {
    _id: "tx-7",
    type: "spent",
    amount: 50,
    description: "Redeemed for AI Consultation Assistant",
    timestamp: new Date(2023, 6, 12),
    transactionId: "tx_c3d4e5f6g7h8i9j0",
    userId: "user-2",
    status: "completed",
    category: "service_redemption",
    serviceId: "svc-4",
    metadata: {
      serviceName: "AI Consultation Assistant",
      subscriptionPeriod: "1 month",
      validUntil: new Date(2023, 7, 12)
    },
    blockchainTxHash: "0x7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z"
  },
  {
    _id: "tx-8",
    type: "earned",
    amount: 5,
    description: "Reward for Peer Review",
    timestamp: new Date(2023, 6, 18),
    transactionId: "tx_d4e5f6g7h8i9j0k1",
    userId: "user-5",
    status: "completed",
    category: "peer_review",
    source: "case_review",
    metadata: {
      reviewType: "Treatment Plan Review",
      caseId: "case-789",
      specialtyArea: "Cardiology"
    },
    blockchainTxHash: "0x8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a"
  },
  {
    _id: "tx-9",
    type: "spent",
    amount: 15,
    description: "Redeemed for Priority Referral Processing",
    timestamp: new Date(2023, 6, 20),
    transactionId: "tx_e5f6g7h8i9j0k1l2",
    userId: "user-3",
    status: "completed",
    category: "service_redemption",
    serviceId: "svc-2",
    metadata: {
      serviceName: "Priority Referral Processing",
      referralId: "ref-005",
      patientId: "pt-003"
    },
    blockchainTxHash: "0x9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b"
  },
  {
    _id: "tx-10",
    type: "earned",
    amount: 25,
    description: "Reward for Quality Reporting",
    timestamp: new Date(2023, 6, 25),
    transactionId: "tx_f6g7h8i9j0k1l2m3",
    userId: "user-2",
    status: "pending",
    category: "quality_metrics",
    source: "quality_improvement",
    metadata: {
      reportId: "qr-123",
      metricsSubmitted: 12,
      improvementArea: "Medication Reconciliation"
    },
    blockchainTxHash: null
  },
  {
    _id: "tx-11",
    type: "adjustment",
    amount: 10,
    description: "Administrative Token Adjustment",
    timestamp: new Date(2023, 6, 28),
    transactionId: "tx_g7h8i9j0k1l2m3n4",
    userId: "user-4",
    status: "completed",
    category: "administrative",
    source: "admin_adjustment",
    metadata: {
      reason: "Correction for system error",
      approvedBy: "user-1",
      originalTransactionId: "tx_a1b2c3d4e5f6"
    },
    blockchainTxHash: "0xa0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9"
  },
  {
    _id: "tx-12",
    type: "transfer",
    amount: 15,
    description: "Transferred to Dr. Sarah Johnson",
    recipient: "Dr. Sarah Johnson",
    recipientId: "user-3",
    timestamp: new Date(2023, 7, 2),
    transactionId: "tx_h8i9j0k1l2m3n4o5",
    userId: "user-5",
    status: "completed",
    category: "peer_transfer",
    metadata: {
      reason: "Collaboration on research project",
      message: "For your contribution to our joint research"
    },
    blockchainTxHash: "0xb1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0"
  },
  {
    _id: "tx-13",
    type: "earned",
    amount: 20,
    description: "Reward for AI Model Feedback",
    timestamp: new Date(2023, 7, 5),
    transactionId: "tx_i9j0k1l2m3n4o5p6",
    userId: "user-2",
    status: "completed",
    category: "ai_feedback",
    source: "model_improvement",
    metadata: {
      feedbackType: "False Positive Correction",
      modelId: "ai-model-456",
      improvementCategory: "Readmission Risk"
    },
    blockchainTxHash: "0xc2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1"
  },
  {
    _id: "tx-14",
    type: "spent",
    amount: 30,
    description: "Redeemed for Extended Data Storage",
    timestamp: new Date(2023, 7, 8),
    transactionId: "tx_j0k1l2m3n4o5p6q7",
    userId: "user-4",
    status: "processing",
    category: "service_redemption",
    serviceId: "svc-3",
    metadata: {
      serviceName: "Extended Data Storage",
      storageIncrease: "500GB",
      validUntil: new Date(2024, 7, 8)
    },
    blockchainTxHash: null
  },
  {
    _id: "tx-15",
    type: "earned",
    amount: 15,
    description: "Reward for Educational Content Creation",
    timestamp: new Date(2023, 7, 10),
    transactionId: "tx_k1l2m3n4o5p6q7r8",
    userId: "user-5",
    status: "completed",
    category: "education",
    source: "content_creation",
    metadata: {
      contentType: "Clinical Guidelines",
      contentId: "edu-789",
      specialtyArea: "Cardiology"
    },
    blockchainTxHash: "0xd3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2"
  }
];
await db.collection('tokenTransactions').insertMany(tokenTransactions);

// Create token services collection
console.log("Creating token services collection...");
const tokenServices = [
  {
    _id: "svc-1",
    name: "Premium Analytics Report",
    description: "Access to advanced analytics reports with detailed insights and recommendations",
    tokenCost: 25,
    category: "analytics",
    available: true,
    benefits: [
      "Detailed patient risk stratification",
      "Operational efficiency insights",
      "Custom report generation"
    ]
  },
  {
    _id: "svc-2",
    name: "Priority Referral Processing",
    description: "Expedited processing of patient referrals",
    tokenCost: 15,
    category: "referrals",
    available: true,
    benefits: [
      "Faster referral completion",
      "Automated documentation",
      "Priority queue placement"
    ]
  },
  {
    _id: "svc-3",
    name: "Extended Data Storage",
    description: "Additional secure storage for patient records and analytics data",
    tokenCost: 30,
    category: "storage",
    available: true,
    benefits: [
      "Increased storage capacity",
      "Enhanced backup frequency",
      "Extended retention period"
    ]
  },
  {
    _id: "svc-4",
    name: "AI Consultation Assistant",
    description: "AI-powered assistant for patient consultations with real-time insights",
    tokenCost: 50,
    category: "ai",
    available: true,
    benefits: [
      "Real-time clinical decision support",
      "Automated documentation",
      "Treatment recommendation engine"
    ]
  }
];
await db.collection('tokenServices').insertMany(tokenServices);

// Create token earn sources collection
console.log("Creating token earn sources collection...");
const tokenEarnSources = [
  {
    _id: "earn-analytics-risk",
    name: "Risk Analysis Report",
    description: "Create and share a patient risk analysis report",
    type: "analytics",
    tokenAmount: 15,
    frequency: "per report",
    requirements: "Report must include at least 10 patients and have a confidence score of 80% or higher"
  },
  {
    _id: "earn-data-contribution",
    name: "Data Contribution",
    description: "Contribute anonymized patient data to the network",
    type: "data",
    tokenAmount: 20,
    frequency: "per 100 records",
    requirements: "Data must be properly anonymized and include complete medical history"
  },
  {
    _id: "earn-referral-completion",
    name: "Referral Completion",
    description: "Successfully complete a patient referral workflow",
    type: "referral",
    tokenAmount: 10,
    frequency: "per referral",
    requirements: "Referral must be completed within 48 hours with all required documentation"
  },
  {
    _id: "earn-clinical-outcome",
    name: "Clinical Outcome Reporting",
    description: "Report clinical outcomes for treated patients",
    type: "clinical",
    tokenAmount: 25,
    frequency: "per 20 outcomes",
    requirements: "Outcomes must include treatment efficacy data and follow-up information"
  }
];
await db.collection('tokenEarnSources').insertMany(tokenEarnSources);

// Create consent records collection
console.log("Creating consent records collection...");
const consentRecords = [
  {
    _id: "consent-1",
    patientId: "patient-1",
    providerId: "user-4",
    providerName: "Dr. Michael Chen",
    organization: "City Medical Center",
    accessLevel: "partial",
    dataElements: ["demographics", "medications", "allergies"],
    consentDate: new Date(2023, 1, 15).toISOString(),
    expiryDate: new Date(2024, 1, 15).toISOString(),
    blockchainTransactionId: "tx_c1a2b3c4d5e6f7g8h9"
  },
  {
    _id: "consent-2",
    patientId: "patient-2",
    providerId: "user-2",
    providerName: "Dr. John Smith",
    organization: "City Medical Center",
    accessLevel: "full",
    dataElements: ["demographics", "medications", "allergies", "conditions", "lab_results", "imaging"],
    consentDate: new Date(2023, 2, 10).toISOString(),
    expiryDate: new Date(2024, 2, 10).toISOString(),
    blockchainTransactionId: "tx_c2b3c4d5e6f7g8h9i0"
  }
];
await db.collection('consentRecords').insertMany(consentRecords);

// Create system status collection
console.log("Creating system status collection...");
const systemStatus = {
  _id: "system-status-1",
  database: {
    status: "healthy",
    connections: 12,
    latency: "5ms"
  },
  ai: {
    status: "healthy",
    models: ["risk-assessment", "diagnosis-helper", "treatment-recommender"],
    lastUpdated: new Date()
  },
  blockchain: {
    status: "healthy",
    lastBlock: 12345678,
    syncStatus: "100%"
  },
  storage: {
    status: "healthy",
    usedSpace: "45GB",
    totalSpace: "500GB"
  },
  updatedAt: new Date()
};
await db.collection('systemStatus').insertOne(systemStatus);

// Create settings collection
console.log("Creating settings collection...");
const settings = [
  {
    _id: "setting-1",
    key: "general.clinicName",
    value: "ClinicTrust AI",
    category: "general",
    description: "Clinic name displayed in the platform",
    isActive: true,
    lastModifiedAt: new Date()
  },
  {
    _id: "setting-2",
    key: "security.passwordPolicy.minLength",
    value: 8,
    category: "security",
    description: "Minimum password length",
    isActive: true,
    lastModifiedAt: new Date()
  },
  {
    _id: "setting-3",
    key: "ai.riskAssessment.threshold",
    value: 0.75,
    category: "ai",
    description: "Risk assessment threshold for alerts",
    isActive: true,
    lastModifiedAt: new Date()
  },
  {
    _id: "setting-4",
    key: "blockchain.verificationRequired",
    value: true,
    category: "blockchain",
    description: "Require blockchain verification for critical operations",
    isActive: true,
    lastModifiedAt: new Date()
  },
  {
    _id: "setting-5",
    key: "notifications.email.enabled",
    value: true,
    category: "notifications",
    description: "Enable email notifications",
    isActive: true,
    lastModifiedAt: new Date()
  }
];
await db.collection('settings').insertMany(settings);

// Create activities collection
console.log("Creating activities collection...");
const activities = [
  {
    _id: "act-001",
    type: "referral",
    title: "Referral completed",
    description: "Cardiology referral for James Wilson",
    timestamp: new Date(2023, 7, 3, 14, 25).toISOString(),
    userId: "user-2",
    patientId: "patient-1",
    referralId: "referral-1"
  },
  {
    _id: "act-002",
    type: "analytics",
    title: "Analytics report completed",
    description: "Q2 Patient Outcome Analysis",
    timestamp: new Date(2023, 6, 30, 16, 45).toISOString(),
    userId: "user-3",
    reportId: "ar-001"
  },
  {
    _id: "act-003",
    type: "patient",
    title: "Patient added",
    description: "New patient: Emily Rodriguez",
    timestamp: new Date(2023, 6, 29, 11, 15).toISOString(),
    userId: "user-5",
    patientId: "patient-2"
  },
  {
    _id: "act-004",
    type: "referral",
    title: "Referral created",
    description: "Neurology referral for Thomas Brown",
    timestamp: new Date(2023, 6, 28, 9, 30).toISOString(),
    userId: "user-5",
    patientId: "patient-3",
    referralId: "referral-2"
  },
  {
    _id: "act-005",
    type: "token",
    title: "Tokens earned",
    description: "Earned 25 tokens for Risk Analysis Report",
    timestamp: new Date(2023, 6, 27, 15, 10).toISOString(),
    userId: "user-4",
    transactionId: "tx-1"
  }
];
await db.collection('activities').insertMany(activities);

// Create broadcast messages collection
console.log("Creating broadcast messages collection...");
const broadcastMessages = [
  {
    _id: "broadcast-1",
    title: "System Maintenance Notification",
    content: "The system will be undergoing scheduled maintenance on August 15th from 2:00 AM to 4:00 AM EST. During this time, the platform may experience brief periods of unavailability.",
    sender: "System Administrator",
    sentAt: new Date(2025, 7, 10, 9, 0),
    status: "sent",
    priority: "medium",
    recipientCount: 156,
    readCount: 89,
    category: "maintenance"
  },
  {
    _id: "broadcast-2",
    title: "New Feature Release: Enhanced Analytics Dashboard",
    content: "We are excited to announce the release of our enhanced analytics dashboard. The new features include customizable charts, improved filtering options, and the ability to export data in multiple formats.",
    sender: "Product Team",
    sentAt: new Date(2025, 7, 5, 11, 30),
    status: "sent",
    priority: "low",
    recipientCount: 156,
    readCount: 124,
    category: "feature"
  },
  {
    _id: "broadcast-3",
    title: "Important: Security Protocol Update",
    content: "To enhance the security of our platform, we have updated our authentication protocols. All users are required to reset their passwords within the next 7 days. Please follow the instructions sent to your email.",
    sender: "Security Team",
    sentAt: new Date(2025, 7, 1, 14, 15),
    status: "sent",
    priority: "high",
    recipientCount: 156,
    readCount: 142,
    category: "security"
  },
  {
    _id: "broadcast-4",
    title: "Upcoming Training Session: AI-Assisted Diagnosis",
    content: "We will be hosting a training session on AI-Assisted Diagnosis on August 20th at 1:00 PM EST. This session will cover how to effectively use our AI tools to improve diagnostic accuracy and efficiency.",
    sender: "Training Coordinator",
    sentAt: new Date(2025, 7, 12, 10, 0),
    status: "draft",
    priority: "medium",
    recipientCount: 0,
    readCount: 0,
    category: "training"
  }
];
await db.collection('broadcastMessages').insertMany(broadcastMessages);

// Create targeted alerts collection
console.log("Creating targeted alerts collection...");
const targetedAlerts = [
  {
    _id: "alert-1",
    title: "Referral Approved: Patient John Doe",
    content: "Your referral for patient John Doe (ID: PT-12345) to Cardiology has been approved. The appointment has been scheduled for August 18th at 10:30 AM.",
    sender: "Referral Management System",
    sentAt: new Date(2025, 7, 12, 15, 45),
    status: "sent",
    priority: "medium",
    recipients: [
      {
        id: "user-1",
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@clinictrust.ai",
        readAt: new Date(2025, 7, 12, 16, 30)
      }
    ],
    category: "referral",
    relatedEntityId: "REF-67890",
    relatedEntityType: "referral"
  },
  {
    _id: "alert-2",
    title: "Policy Update: New Referral Guidelines",
    content: "The referral guidelines for Neurology have been updated. Please review the new guidelines before submitting new referrals. The changes include updated documentation requirements and preferred communication channels.",
    sender: "Policy Management",
    sentAt: new Date(2025, 7, 8, 9, 0),
    status: "sent",
    priority: "high",
    recipients: [
      {
        id: "user-1",
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@clinictrust.ai",
        readAt: new Date(2025, 7, 8, 10, 15)
      },
      {
        id: "user-2",
        name: "Dr. Michael Chen",
        email: "michael.chen@clinictrust.ai",
        readAt: null
      },
      {
        id: "user-3",
        name: "Dr. Emily Rodriguez",
        email: "emily.rodriguez@clinictrust.ai",
        readAt: new Date(2025, 7, 8, 14, 20)
      }
    ],
    category: "policy",
    relatedEntityId: "POL-12345",
    relatedEntityType: "policy"
  },
  {
    _id: "alert-3",
    title: "Token Reward: Quality Reporting",
    content: "You have been awarded 50 tokens for your consistent high-quality reporting and documentation. These tokens have been added to your account and can be used for various services within the platform.",
    sender: "Token Management System",
    sentAt: new Date(2025, 7, 10, 11, 30),
    status: "sent",
    priority: "low",
    recipients: [
      {
        id: "user-2",
        name: "Dr. Michael Chen",
        email: "michael.chen@clinictrust.ai",
        readAt: new Date(2025, 7, 10, 13, 45)
      }
    ],
    category: "token",
    relatedEntityId: "TRX-54321",
    relatedEntityType: "transaction"
  },
  {
    _id: "alert-4",
    title: "Upcoming Maintenance: Provider Portal",
    content: "The provider portal will be undergoing maintenance on August 16th from 1:00 AM to 3:00 AM EST. During this time, you may experience limited functionality. Please plan accordingly.",
    sender: "System Administrator",
    sentAt: new Date(2025, 7, 14, 8, 0),
    status: "draft",
    priority: "medium",
    recipients: [
      {
        id: "user-1",
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@clinictrust.ai",
        readAt: null
      },
      {
        id: "user-2",
        name: "Dr. Michael Chen",
        email: "michael.chen@clinictrust.ai",
        readAt: null
      },
      {
        id: "user-3",
        name: "Dr. Emily Rodriguez",
        email: "emily.rodriguez@clinictrust.ai",
        readAt: null
      },
      {
        id: "user-4",
        name: "Dr. Robert Davis",
        email: "robert.davis@clinictrust.ai",
        readAt: null
      }
    ],
    category: "maintenance",
    relatedEntityId: null,
    relatedEntityType: null
  }
];
await db.collection('targetedAlerts').insertMany(targetedAlerts);

// Create escalation workflows collection
console.log("Creating escalation workflows collection...");
const escalationWorkflows = [
  {
    _id: "escalation-1",
    title: "High Readmission Risk - Patient Jane Smith",
    patientId: "PT-54321",
    patientName: "Jane Smith",
    aiRiskScore: 0.89,
    flaggedAt: new Date(2025, 7, 11, 14, 30),
    status: "pending_review",
    priority: "high",
    category: "readmission",
    assignedTo: {
      id: "user-1",
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@clinictrust.ai"
    },
    details: {
      riskFactors: [
        "Recent hospitalization within 30 days",
        "Multiple chronic conditions",
        "Medication adherence issues",
        "Limited social support"
      ],
      aiRecommendations: [
        "Schedule follow-up appointment within 7 days",
        "Arrange home care services",
        "Medication reconciliation",
        "Social worker consultation"
      ],
      notes: "Patient has history of multiple readmissions. AI system flagged high probability of readmission based on recent lab results and medication changes."
    },
    timeline: [
      {
        action: "Flagged by AI",
        timestamp: new Date(2025, 7, 11, 14, 30),
        user: "AI System"
      },
      {
        action: "Assigned to Dr. Sarah Johnson",
        timestamp: new Date(2025, 7, 11, 14, 35),
        user: "Workflow Manager"
      }
    ]
  },
  {
    _id: "escalation-2",
    title: "Critical Lab Result - Patient Robert Brown",
    patientId: "PT-67890",
    patientName: "Robert Brown",
    aiRiskScore: 0.95,
    flaggedAt: new Date(2025, 7, 12, 9, 15),
    status: "in_progress",
    priority: "critical",
    category: "lab_result",
    assignedTo: {
      id: "user-2",
      name: "Dr. Michael Chen",
      email: "michael.chen@clinictrust.ai"
    },
    details: {
      riskFactors: [
        "Abnormal potassium levels",
        "Recent medication change",
        "History of cardiac issues"
      ],
      aiRecommendations: [
        "Immediate provider notification",
        "Repeat lab test",
        "Medication adjustment",
        "Possible hospital admission"
      ],
      notes: "Critical lab value detected. Potassium level at 6.8 mEq/L. AI system flagged as requiring immediate attention."
    },
    timeline: [
      {
        action: "Flagged by AI",
        timestamp: new Date(2025, 7, 12, 9, 15),
        user: "AI System"
      },
      {
        action: "Assigned to Dr. Michael Chen",
        timestamp: new Date(2025, 7, 12, 9, 16),
        user: "Workflow Manager"
      },
      {
        action: "Reviewed by Dr. Michael Chen",
        timestamp: new Date(2025, 7, 12, 9, 45),
        user: "Dr. Michael Chen"
      },
      {
        action: "Patient contacted for immediate follow-up",
        timestamp: new Date(2025, 7, 12, 10, 0),
        user: "Dr. Michael Chen"
      }
    ]
  },
  {
    _id: "escalation-3",
    title: "Medication Interaction Alert - Patient Maria Garcia",
    patientId: "PT-24680",
    patientName: "Maria Garcia",
    aiRiskScore: 0.82,
    flaggedAt: new Date(2025, 7, 10, 16, 45),
    status: "resolved",
    priority: "medium",
    category: "medication",
    assignedTo: {
      id: "user-3",
      name: "Dr. Emily Rodriguez",
      email: "emily.rodriguez@clinictrust.ai"
    },
    details: {
      riskFactors: [
        "Potential drug-drug interaction",
        "Multiple prescribers",
        "Complex medication regimen"
      ],
      aiRecommendations: [
        "Medication reconciliation",
        "Consider alternative medication",
        "Patient education on medication safety"
      ],
      notes: "AI system detected potential interaction between newly prescribed antibiotic and existing medication."
    },
    timeline: [
      {
        action: "Flagged by AI",
        timestamp: new Date(2025, 7, 10, 16, 45),
        user: "AI System"
      },
      {
        action: "Assigned to Dr. Emily Rodriguez",
        timestamp: new Date(2025, 7, 10, 16, 50),
        user: "Workflow Manager"
      },
      {
        action: "Reviewed by Dr. Emily Rodriguez",
        timestamp: new Date(2025, 7, 10, 17, 30),
        user: "Dr. Emily Rodriguez"
      },
      {
        action: "Medication changed to alternative",
        timestamp: new Date(2025, 7, 10, 17, 45),
        user: "Dr. Emily Rodriguez"
      },
      {
        action: "Patient notified of medication change",
        timestamp: new Date(2025, 7, 10, 18, 0),
        user: "Dr. Emily Rodriguez"
      },
      {
        action: "Case resolved",
        timestamp: new Date(2025, 7, 10, 18, 5),
        user: "Dr. Emily Rodriguez"
      }
    ],
    resolution: {
      action: "Medication changed",
      notes: "Prescribed alternative antibiotic with no interaction risk. Patient educated on medication safety.",
      timestamp: new Date(2025, 7, 10, 18, 5),
      resolvedBy: {
        id: "user-3",
        name: "Dr. Emily Rodriguez",
        email: "emily.rodriguez@clinictrust.ai"
      }
    }
  },
  {
    _id: "escalation-4",
    title: "Missed Appointment Pattern - Patient William Johnson",
    patientId: "PT-13579",
    patientName: "William Johnson",
    aiRiskScore: 0.76,
    flaggedAt: new Date(2025, 7, 9, 10, 0),
    status: "pending_review",
    priority: "low",
    category: "appointment",
    assignedTo: null,
    details: {
      riskFactors: [
        "Multiple missed appointments",
        "Chronic condition requiring regular monitoring",
        "Transportation barriers identified in previous visits"
      ],
      aiRecommendations: [
        "Outreach to patient",
        "Assess barriers to care",
        "Consider telehealth options",
        "Social services referral for transportation assistance"
      ],
      notes: "Patient has missed 3 consecutive appointments. AI system identified pattern and potential risk to care continuity."
    },
    timeline: [
      {
        action: "Flagged by AI",
        timestamp: new Date(2025, 7, 9, 10, 0),
        user: "AI System"
      }
    ]
  }
];
await db.collection('escalationWorkflows').insertMany(escalationWorkflows);

// Create indexes for better performance
console.log("Creating indexes...");
// db.collection('users').createIndex({ email: 1 }, { unique: true });
// db.collection('patients').createIndex({ patientId: 1 }, { unique: true });
// db.collection('patients').createIndex({ email: 1 });
// db.collection('referrals').createIndex({ patientId: 1 });
// db.collection('referrals').createIndex({ status: 1 });
// db.collection('medicalRecords').createIndex({ patientId: 1 });
// db.collection('tokenTransactions').createIndex({ userId: 1 });
// db.collection('tokenTransactions').createIndex({ timestamp: -1 });
// db.collection('activities').createIndex({ timestamp: -1 });
// db.collection('activities').createIndex({ userId: 1 });
// db.collection('activities').createIndex({ patientId: 1 });
// db.collection('consentRecords').createIndex({ patientId: 1 });
// db.collection('consentRecords').createIndex({ providerId: 1 });

// db.collection('broadcastMessages').createIndex({ status: 1 });
// db.collection('broadcastMessages').createIndex({ sentAt: -1 });
// db.collection('broadcastMessages').createIndex({ priority: 1 });
// db.collection('broadcastMessages').createIndex({ category: 1 });

// db.collection('targetedAlerts').createIndex({ status: 1 });
// db.collection('targetedAlerts').createIndex({ sentAt: -1 });
// db.collection('targetedAlerts').createIndex({ priority: 1 });
// db.collection('targetedAlerts').createIndex({ category: 1 });
// db.collection('targetedAlerts').createIndex({ "recipients.id": 1 });

// db.collection('escalationWorkflows').createIndex({ status: 1 });
// db.collection('escalationWorkflows').createIndex({ flaggedAt: -1 });
// db.collection('escalationWorkflows').createIndex({ priority: 1 });
// db.collection('escalationWorkflows').createIndex({ category: 1 });
// db.collection('escalationWorkflows').createIndex({ "assignedTo.id": 1 });
// db.collection('escalationWorkflows').createIndex({ patientId: 1 });

console.log("Creating referral transactions collection...");
const referralTransactions = [
  {
    _id: "reftx-001",
    referralId: "ref-001",
    transactionType: "creation",
    timestamp: new Date(2023, 5, 15, 9, 30),
    performedBy: {
      userId: "user-2",
      name: "Dr. John Smith",
      role: "doctor"
    },
    details: {
      patientId: "pt-001",
      patientName: "John Doe",
      specialtyRequested: "Cardiology",
      urgency: "routine",
      notes: "Initial referral creation"
    },
    tokenImpact: 0,
    blockchainTxId: "0xabc123def456"
  },
  {
    _id: "reftx-002",
    referralId: "ref-001",
    transactionType: "acceptance",
    timestamp: new Date(2023, 5, 16, 10, 15),
    performedBy: {
      userId: "user-4",
      name: "Dr. Michael Chen",
      role: "doctor"
    },
    details: {
      acceptanceNotes: "Will schedule patient for initial consultation",
      estimatedAppointmentDate: new Date(2023, 5, 23)
    },
    tokenImpact: 5,
    blockchainTxId: "0xdef456ghi789"
  },
  {
    _id: "reftx-003",
    referralId: "ref-002",
    transactionType: "creation",
    timestamp: new Date(2023, 5, 17, 14, 45),
    performedBy: {
      userId: "user-5",
      name: "Dr. Robert Williams",
      role: "doctor"
    },
    details: {
      patientId: "pt-003",
      patientName: "Emily Johnson",
      specialtyRequested: "Neurology",
      urgency: "urgent",
      notes: "Patient experiencing frequent migraines with visual disturbances"
    },
    tokenImpact: 0,
    blockchainTxId: "0xghi789jkl012"
  },
  {
    _id: "reftx-004",
    referralId: "ref-002",
    transactionType: "rejection",
    timestamp: new Date(2023, 5, 18, 9, 0),
    performedBy: {
      userId: "user-4",
      name: "Dr. Michael Chen",
      role: "doctor"
    },
    details: {
      rejectionReason: "Patient should see ophthalmology first",
      alternativeRecommendation: "Referring to Dr. Lisa Wong in Ophthalmology"
    },
    tokenImpact: 0,
    blockchainTxId: "0xjkl012mno345"
  },
  {
    _id: "reftx-005",
    referralId: "ref-003",
    transactionType: "creation",
    timestamp: new Date(2023, 5, 20, 11, 30),
    performedBy: {
      userId: "user-2",
      name: "Dr. John Smith",
      role: "doctor"
    },
    details: {
      patientId: "pt-002",
      patientName: "Sarah Miller",
      specialtyRequested: "Endocrinology",
      urgency: "routine",
      notes: "Follow-up for diabetes management"
    },
    tokenImpact: 0,
    blockchainTxId: "0xmno345pqr678"
  },
  {
    _id: "reftx-006",
    referralId: "ref-003",
    transactionType: "acceptance",
    timestamp: new Date(2023, 5, 21, 13, 45),
    performedBy: {
      userId: "user-6",
      name: "Dr. Jennifer Lee",
      role: "doctor"
    },
    details: {
      acceptanceNotes: "Will review patient records before appointment",
      estimatedAppointmentDate: new Date(2023, 6, 5)
    },
    tokenImpact: 5,
    blockchainTxId: "0xpqr678stu901"
  },
  {
    _id: "reftx-007",
    referralId: "ref-003",
    transactionType: "completion",
    timestamp: new Date(2023, 6, 7, 16, 30),
    performedBy: {
      userId: "user-6",
      name: "Dr. Jennifer Lee",
      role: "doctor"
    },
    details: {
      completionNotes: "Adjusted insulin regimen, recommended dietary changes",
      followUpNeeded: true,
      followUpTimeframe: "3 months"
    },
    tokenImpact: 10,
    blockchainTxId: "0xstu901vwx234"
  }
];
await db.collection('referralTransactions').insertMany(referralTransactions);

// Create referral disputes collection
console.log("Creating referral disputes collection...");
const referralDisputes = [
  {
    _id: "dispute-001",
    referralId: "ref-004",
    status: "open",
    createdAt: new Date(2023, 6, 10, 9, 15),
    updatedAt: new Date(2023, 6, 10, 9, 15),
    initiatedBy: {
      userId: "user-2",
      name: "Dr. John Smith",
      role: "doctor"
    },
    respondent: {
      userId: "user-4",
      name: "Dr. Michael Chen",
      role: "doctor"
    },
    reason: "inappropriate_rejection",
    details: "Referral was rejected without appropriate clinical justification",
    evidence: [
      {
        type: "note",
        content: "Patient has clear neurological symptoms that warrant specialist evaluation",
        timestamp: new Date(2023, 6, 10, 9, 15)
      },
      {
        type: "attachment",
        content: "patient_history.pdf",
        timestamp: new Date(2023, 6, 10, 9, 15)
      }
    ],
    timeline: [
      {
        action: "dispute_created",
        performedBy: "user-2",
        timestamp: new Date(2023, 6, 10, 9, 15),
        notes: "Initial dispute filing"
      }
    ]
  },
  {
    _id: "dispute-002",
    referralId: "ref-005",
    status: "under_review",
    createdAt: new Date(2023, 6, 12, 14, 30),
    updatedAt: new Date(2023, 6, 15, 10, 45),
    initiatedBy: {
      userId: "user-5",
      name: "Dr. Robert Williams",
      role: "doctor"
    },
    respondent: {
      userId: "user-6",
      name: "Dr. Jennifer Lee",
      role: "doctor"
    },
    reason: "delayed_response",
    details: "Urgent referral has not been addressed within required 48-hour timeframe",
    evidence: [
      {
        type: "note",
        content: "Patient condition requires timely specialist evaluation",
        timestamp: new Date(2023, 6, 12, 14, 30)
      }
    ],
    timeline: [
      {
        action: "dispute_created",
        performedBy: "user-5",
        timestamp: new Date(2023, 6, 12, 14, 30),
        notes: "Initial dispute filing"
      },
      {
        action: "assigned_to_review",
        performedBy: "user-1",
        timestamp: new Date(2023, 6, 13, 9, 0),
        notes: "Assigned to admin for review"
      },
      {
        action: "response_added",
        performedBy: "user-6",
        timestamp: new Date(2023, 6, 15, 10, 45),
        notes: "Was on emergency leave due to family situation, will process referral immediately"
      }
    ],
    reviewedBy: {
      userId: "user-1",
      name: "Admin User",
      role: "admin"
    }
  },
  {
    _id: "dispute-003",
    referralId: "ref-006",
    status: "resolved",
    createdAt: new Date(2023, 6, 5, 11, 20),
    updatedAt: new Date(2023, 6, 8, 15, 30),
    initiatedBy: {
      userId: "user-4",
      name: "Dr. Michael Chen",
      role: "doctor"
    },
    respondent: {
      userId: "user-2",
      name: "Dr. John Smith",
      role: "doctor"
    },
    reason: "incomplete_information",
    details: "Referral submitted with incomplete patient history and missing test results",
    evidence: [
      {
        type: "note",
        content: "Missing recent lab work and medication history",
        timestamp: new Date(2023, 6, 5, 11, 20)
      }
    ],
    timeline: [
      {
        action: "dispute_created",
        performedBy: "user-4",
        timestamp: new Date(2023, 6, 5, 11, 20),
        notes: "Initial dispute filing"
      },
      {
        action: "response_added",
        performedBy: "user-2",
        timestamp: new Date(2023, 6, 6, 9, 45),
        notes: "Will provide missing information today"
      },
      {
        action: "information_updated",
        performedBy: "user-2",
        timestamp: new Date(2023, 6, 6, 14, 30),
        notes: "Added lab results and complete medication history"
      },
      {
        action: "dispute_resolved",
        performedBy: "user-4",
        timestamp: new Date(2023, 6, 8, 15, 30),
        notes: "Information is now complete, referral accepted"
      }
    ],
    resolution: {
      outcome: "accepted",
      resolvedAt: new Date(2023, 6, 8, 15, 30),
      resolvedBy: "user-4",
      notes: "Dispute resolved after receiving complete information"
    }
  }
];
await db.collection('referralDisputes').insertMany(referralDisputes);

// Create admin settings collection
console.log("Creating admin settings collection...");
const adminSettings = [
  {
    _id: "setting-general",
    category: "general",
    settings: {
      systemName: "ClinicTrust AI Platform",
      organizationName: "ClinicTrust Health Network",
      supportEmail: "support@clinictrustai.com",
      supportPhone: "+1-800-555-0123",
      maintenanceMode: false,
      maintenanceScheduled: null,
      lastUpdated: new Date()
    },
    access: ["admin"]
  },
  {
    _id: "setting-security",
    category: "security",
    settings: {
      passwordPolicy: {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        passwordExpiryDays: 90
      },
      mfaRequired: true,
      sessionTimeout: 30, // minutes
      maxLoginAttempts: 5,
      ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
      auditLogRetention: 365 // days
    },
    access: ["admin"]
  },
  {
    _id: "setting-notifications",
    category: "notifications",
    settings: {
      emailNotifications: true,
      smsNotifications: true,
      inAppNotifications: true,
      criticalAlertChannels: ["email", "sms", "inApp"],
      dailyDigest: true,
      digestTime: "08:00",
      weeklyReport: true,
      weeklyReportDay: "Monday"
    },
    access: ["admin", "manager"]
  },
  {
    _id: "setting-ai",
    category: "ai",
    settings: {
      riskThresholds: {
        readmission: 0.65,
        adverseEvent: 0.75,
        medicationInteraction: 0.70
      },
      modelVersions: {
        readmissionPrediction: "v2.3.1",
        diagnosisSuggestion: "v1.9.4",
        medicationInteraction: "v3.0.2"
      },
      reviewRequired: {
        highRiskPredictions: true,
        patientSummaries: true,
        treatmentRecommendations: true
      },
      feedbackCollection: true,
      continuousLearning: true,
      explainabilityLevel: "detailed" // basic, standard, detailed
    },
    access: ["admin"]
  },
  {
    _id: "setting-tokens",
    category: "tokens",
    settings: {
      tokenEconomy: true,
      earnRates: {
        dataContribution: 10,
        qualityReporting: 15,
        researchParticipation: 25,
        peerReview: 5
      },
      redemptionOptions: [
        {
          service: "Premium Analytics",
          cost: 50,
          active: true
        },
        {
          service: "Priority Referrals",
          cost: 30,
          active: true
        },
        {
          service: "Advanced AI Features",
          cost: 75,
          active: true
        }
      ],
      transfersEnabled: true,
      maxDailyEarn: 100
    },
    access: ["admin"]
  }
];
await db.collection('adminSettings').insertMany(adminSettings);

// Create AI reports collection
console.log("Creating AI reports collection...");
const aiReports = [
  {
    _id: "ai-report-001",
    title: "Readmission Risk Analysis - Q2 2023",
    type: "risk_assessment",
    status: "published",
    createdAt: new Date(2023, 5, 15),
    publishedAt: new Date(2023, 5, 20),
    createdBy: {
      userId: "user-1",
      name: "Admin User",
      role: "admin"
    },
    reviewedBy: {
      userId: "user-2",
      name: "Dr. John Smith",
      role: "doctor"
    },
    metrics: {
      accuracy: 0.87,
      precision: 0.83,
      recall: 0.91,
      f1Score: 0.87,
      falsePositives: 12,
      falseNegatives: 8,
      improvementFromLastQuarter: 0.05
    },
    summary: "AI readmission risk model performance for Q2 2023 shows significant improvement over Q1. The model successfully identified 91% of high-risk patients, with a false positive rate of 17%. Overall accuracy increased by 5% compared to the previous quarter.",
    insights: [
      "Strongest predictors of readmission continue to be previous hospitalizations within 30 days and medication non-adherence",
      "The model shows improved performance for elderly patients (75+) compared to Q1",
      "Cardiac patients show the highest prediction accuracy at 92%"
    ],
    recommendations: [
      "Consider lowering the risk threshold for cardiac patients to capture more potential readmissions",
      "Implement targeted intervention for medication adherence based on AI predictions",
      "Expand model to include social determinants of health data for improved accuracy"
    ],
    dataPoints: 1250,
    modelVersion: "2.3.1",
    tags: ["readmission", "risk", "quarterly", "cardiology"]
  },
  {
    _id: "ai-report-002",
    title: "AI-Assisted Diagnosis Accuracy Report",
    type: "diagnostic_accuracy",
    status: "under_review",
    createdAt: new Date(2023, 6, 10),
    publishedAt: null,
    createdBy: {
      userId: "user-1",
      name: "Admin User",
      role: "admin"
    },
    reviewedBy: null,
    metrics: {
      accuracy: 0.82,
      precision: 0.79,
      recall: 0.85,
      f1Score: 0.82,
      falsePositives: 24,
      falseNegatives: 18,
      improvementFromLastQuarter: 0.03
    },
    summary: "The AI diagnostic assistance system demonstrated an 82% overall accuracy rate across all specialties. Performance varies significantly by specialty, with highest accuracy in dermatology (91%) and lowest in neurology (76%).",
    insights: [
      "Image-based diagnoses show significantly higher accuracy (89%) compared to symptom-based diagnoses (74%)",
      "The system performs better on common conditions versus rare diseases",
      "Diagnostic confidence scores strongly correlate with actual accuracy"
    ],
    recommendations: [
      "Expand training data for neurological conditions to improve performance",
      "Implement specialty-specific confidence thresholds for recommendations",
      "Add explainability features to improve provider trust and adoption"
    ],
    dataPoints: 3450,
    modelVersion: "1.9.4",
    tags: ["diagnosis", "accuracy", "specialty", "dermatology", "neurology"]
  },
  {
    _id: "ai-report-003",
    title: "Medication Interaction Alert System Performance",
    type: "medication_safety",
    status: "published",
    createdAt: new Date(2023, 6, 5),
    publishedAt: new Date(2023, 6, 8),
    createdBy: {
      userId: "user-1",
      name: "Admin User",
      role: "admin"
    },
    reviewedBy: {
      userId: "user-5",
      name: "Dr. Robert Williams",
      role: "doctor"
    },
    metrics: {
      accuracy: 0.94,
      precision: 0.92,
      recall: 0.97,
      f1Score: 0.94,
      falsePositives: 8,
      falseNegatives: 3,
      improvementFromLastQuarter: 0.02
    },
    summary: "The medication interaction alert system demonstrated excellent performance with 94% accuracy and 97% recall, meaning it caught nearly all potential harmful interactions. The system generated 8% fewer false alarms compared to the previous version.",
    insights: [
      "System performs exceptionally well for common medications but has some gaps with newer specialty drugs",
      "Alert fatigue has been reduced by 23% due to improved precision",
      "Provider override rates decreased from 34% to 21%, indicating improved trust in alerts"
    ],
    recommendations: [
      "Update drug database monthly instead of quarterly to capture newer medications",
      "Implement severity-based alert visualization to further reduce alert fatigue",
      "Expand interaction checking to include herbal supplements and over-the-counter medications"
    ],
    dataPoints: 12500,
    modelVersion: "3.0.2",
    tags: ["medication", "interaction", "safety", "alerts"]
  },
  {
    _id: "ai-report-004",
    title: "Clinical Documentation AI Assistant Evaluation",
    type: "documentation_assistance",
    status: "draft",
    createdAt: new Date(2023, 7, 1),
    publishedAt: null,
    createdBy: {
      userId: "user-1",
      name: "Admin User",
      role: "admin"
    },
    reviewedBy: null,
    metrics: {
      accuracy: 0.89,
      precision: 0.91,
      recall: 0.87,
      f1Score: 0.89,
      falsePositives: 15,
      falseNegatives: 18,
      improvementFromLastQuarter: 0.07
    },
    summary: "Preliminary results from the Clinical Documentation AI Assistant show significant improvements in documentation quality and time savings. Providers using the AI assistant completed documentation 37% faster with a 24% reduction in missing information.",
    insights: [
      "The system performs best for structured visit types like annual physicals and follow-ups",
      "Specialty-specific terminology recognition varies widely across medical specialties",
      "User satisfaction scores average 4.2/5, with time savings cited as the primary benefit"
    ],
    recommendations: [
      "Expand specialty-specific training data, particularly for surgical specialties",
      "Implement voice-to-text integration to further improve efficiency",
      "Develop customizable templates based on provider preferences and specialties"
    ],
    dataPoints: 850,
    modelVersion: "1.2.0",
    tags: ["documentation", "efficiency", "clinical notes", "time savings"]
  }
];
await db.collection('aiReports').insertMany(aiReports);

// Create indexes for new collections
console.log("Creating indexes for new collections...");

// Indexes for adminSettings collection
// db.collection('adminSettings').createIndex({ category: 1 });
// db.collection('adminSettings').createIndex({ "access": 1 });

// Indexes for referralTransactions collection
// db.collection('referralTransactions').createIndex({ referralId: 1 });
// db.collection('referralTransactions').createIndex({ transactionType: 1 });
// db.collection('referralTransactions').createIndex({ timestamp: -1 });
// db.collection('referralTransactions').createIndex({ "performedBy.userId": 1 });
// db.collection('referralTransactions').createIndex({ "details.patientId": 1 });

// Indexes for referralDisputes collection
// db.collection('referralDisputes').createIndex({ referralId: 1 });
// db.collection('referralDisputes').createIndex({ status: 1 });
// db.collection('referralDisputes').createIndex({ createdAt: -1 });
// db.collection('referralDisputes').createIndex({ "initiatedBy.userId": 1 });
// db.collection('referralDisputes').createIndex({ "respondent.userId": 1 });
// db.collection('referralDisputes').createIndex({ "reviewedBy.userId": 1 });

// Indexes for aiReports collection
// db.collection('aiReports').createIndex({ type: 1 });
// db.collection('aiReports').createIndex({ status: 1 });
// db.collection('aiReports').createIndex({ createdAt: -1 });
// db.collection('aiReports').createIndex({ "createdBy.userId": 1 });
// db.collection('aiReports').createIndex({ "reviewedBy.userId": 1 });
// db.collection('aiReports').createIndex({ tags: 1 });

// Enhanced indexes for tokenTransactions collection
// db.collection('tokenTransactions').createIndex({ userId: 1 });
// db.collection('tokenTransactions').createIndex({ category: 1 });
// db.collection('tokenTransactions').createIndex({ status: 1 });
// db.collection('tokenTransactions').createIndex({ type: 1 });
// db.collection('tokenTransactions').createIndex({ source: 1 });
// db.collection('tokenTransactions').createIndex({ serviceId: 1 });
// db.collection('tokenTransactions').createIndex({ timestamp: -1 });

// ============================================================
// EHI Audit Logs — ONC 21st Century Cures Act (45 CFR Part 171)
// Collection: ehi_audit_logs
// Retention: 7-year TTL index (HIPAA minimum 6 years)
// ============================================================
console.log("Creating ehi_audit_logs collection...");

const now = new Date();
const daysAgo = (d, h) => new Date(now - d * 86400000 - (h || 0) * 3600000);

const ehiAuditLogs = [
  // ── Day 1 ──
  {
    timestamp: daysAgo(1, 0),
    userId: null, userEmail: "admin@clinictrustai.com", userRole: "admin",
    action: "READ", resourceType: "Patient",
    resourceId: "patient-1", patientId: "patient-1",
    endpoint: "/api/patients/patient-1", method: "GET",
    ipAddress: "192.168.1.10", userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    responseStatus: 200, oncException: null
  },
  {
    timestamp: daysAgo(1, 1),
    userId: "user-2", userEmail: "john.smith@clinictrustai.com", userRole: "doctor",
    action: "READ", resourceType: "Patient",
    resourceId: "patient-1", patientId: "patient-1",
    endpoint: "/api/patients/patient-1", method: "GET",
    ipAddress: "192.168.1.11", userAgent: "Mozilla/5.0 (Macintosh)",
    responseStatus: 200, oncException: null
  },
  {
    timestamp: daysAgo(1, 2),
    userId: "user-5", userEmail: "robert.williams@clinictrustai.com", userRole: "doctor",
    action: "READ", resourceType: "Patient",
    resourceId: "patient-1", patientId: "patient-1",
    endpoint: "/api/patients/patient-1", method: "GET",
    ipAddress: "192.168.1.15", userAgent: "Safari/14.1",
    responseStatus: 403, oncException: "privacy"
  },
  // ── Day 2: EHI Exports ──
  {
    timestamp: daysAgo(2, 0),
    userId: null, userEmail: "admin@clinictrustai.com", userRole: "admin",
    action: "EXPORT", resourceType: "Patient",
    resourceId: "patient-1", patientId: "patient-1",
    endpoint: "/api/patients/patient-1/export", method: "GET",
    ipAddress: "192.168.1.10", userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    responseStatus: 200, oncException: null
  },
  {
    timestamp: daysAgo(2, 1),
    userId: "user-2", userEmail: "john.smith@clinictrustai.com", userRole: "doctor",
    action: "EXPORT", resourceType: "Patient",
    resourceId: "patient-1", patientId: "patient-1",
    endpoint: "/api/patients/patient-1/export", method: "GET",
    ipAddress: "192.168.1.11", userAgent: "Mozilla/5.0 (Macintosh)",
    responseStatus: 200, oncException: null
  },
  {
    timestamp: daysAgo(2, 2),
    userId: "user-4", userEmail: "michael.chen@clinictrustai.com", userRole: "doctor",
    action: "EXPORT", resourceType: "Patient",
    resourceId: "patient-1", patientId: "patient-1",
    endpoint: "/api/patients/patient-1/export", method: "GET",
    ipAddress: "192.168.1.14", userAgent: "Chrome/114.0",
    responseStatus: 403, oncException: "privacy"
  },
  // ── Day 3: Referrals ──
  {
    timestamp: daysAgo(3, 0),
    userId: "user-2", userEmail: "john.smith@clinictrustai.com", userRole: "doctor",
    action: "CREATE", resourceType: "Referral",
    resourceId: "referral-1", patientId: "patient-1",
    endpoint: "/api/referrals", method: "POST",
    ipAddress: "192.168.1.11", userAgent: "Mozilla/5.0 (Macintosh)",
    responseStatus: 201, oncException: null
  },
  {
    timestamp: daysAgo(3, 1),
    userId: "user-4", userEmail: "michael.chen@clinictrustai.com", userRole: "doctor",
    action: "READ", resourceType: "Referral",
    resourceId: "referral-1", patientId: null,
    endpoint: "/api/referrals/referral-1", method: "GET",
    ipAddress: "192.168.1.14", userAgent: "Chrome/114.0",
    responseStatus: 200, oncException: null
  },
  {
    timestamp: daysAgo(3, 2),
    userId: "user-3", userEmail: "sarah.johnson@clinictrustai.com", userRole: "provider",
    action: "READ", resourceType: "Referral",
    resourceId: "referral-1", patientId: null,
    endpoint: "/api/referrals/referral-1", method: "GET",
    ipAddress: "192.168.1.13", userAgent: "Firefox/115.0",
    responseStatus: 403, oncException: "privacy"
  },
  // ── Day 4: Analytics ──
  {
    timestamp: daysAgo(4, 0),
    userId: null, userEmail: "admin@clinictrustai.com", userRole: "admin",
    action: "READ", resourceType: "Analytics",
    resourceId: "patient-1", patientId: "patient-1",
    endpoint: "/api/analytics/insights/patient/patient-1", method: "GET",
    ipAddress: "192.168.1.10", userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    responseStatus: 200, oncException: null
  },
  {
    timestamp: daysAgo(4, 2),
    userId: "user-3", userEmail: "sarah.johnson@clinictrustai.com", userRole: "provider",
    action: "READ", resourceType: "Analytics",
    resourceId: "patient-2", patientId: "patient-2",
    endpoint: "/api/analytics/insights/patient/patient-2", method: "GET",
    ipAddress: "192.168.1.13", userAgent: "Firefox/115.0",
    responseStatus: 403, oncException: "privacy"
  },
  // ── Day 5: Consent ──
  {
    timestamp: daysAgo(5, 0),
    userId: "user-2", userEmail: "john.smith@clinictrustai.com", userRole: "doctor",
    action: "CONSENT_GRANT", resourceType: "Patient",
    resourceId: "patient-3", patientId: "patient-3",
    endpoint: "/api/patients/patient-3/consent", method: "POST",
    ipAddress: "192.168.1.11", userAgent: "Mozilla/5.0 (Macintosh)",
    responseStatus: 201, oncException: null
  },
  {
    timestamp: daysAgo(5, 3),
    userId: "user-2", userEmail: "john.smith@clinictrustai.com", userRole: "doctor",
    action: "UPDATE", resourceType: "Patient",
    resourceId: "patient-2", patientId: "patient-2",
    endpoint: "/api/patients/patient-2", method: "PUT",
    ipAddress: "192.168.1.11", userAgent: "Mozilla/5.0 (Macintosh)",
    responseStatus: 200, oncException: null
  },
  // ── Day 6: Referral update + export ──
  {
    timestamp: daysAgo(6, 0),
    userId: "user-4", userEmail: "michael.chen@clinictrustai.com", userRole: "doctor",
    action: "UPDATE", resourceType: "Referral",
    resourceId: "referral-2", patientId: null,
    endpoint: "/api/referrals/referral-2/status", method: "PUT",
    ipAddress: "192.168.1.14", userAgent: "Chrome/114.0",
    responseStatus: 200, oncException: null
  },
  {
    timestamp: daysAgo(6, 2),
    userId: "user-4", userEmail: "michael.chen@clinictrustai.com", userRole: "doctor",
    action: "EXPORT", resourceType: "Patient",
    resourceId: "patient-3", patientId: "patient-3",
    endpoint: "/api/patients/patient-3/export", method: "GET",
    ipAddress: "192.168.1.14", userAgent: "Chrome/114.0",
    responseStatus: 200, oncException: null
  },
  // ── Day 8 ──
  {
    timestamp: daysAgo(8, 1),
    userId: null, userEmail: "admin@clinictrustai.com", userRole: "admin",
    action: "CONSENT_REVOKE", resourceType: "Patient",
    resourceId: "patient-2", patientId: "patient-2",
    endpoint: "/api/patients/patient-2/consent/revoke", method: "POST",
    ipAddress: "192.168.1.10", userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    responseStatus: 200, oncException: null
  },
  {
    timestamp: daysAgo(8, 4),
    userId: "user-5", userEmail: "robert.williams@clinictrustai.com", userRole: "doctor",
    action: "CREATE", resourceType: "Patient",
    resourceId: "patient-5", patientId: "patient-5",
    endpoint: "/api/patients", method: "POST",
    ipAddress: "192.168.1.15", userAgent: "Safari/14.1",
    responseStatus: 201, oncException: null
  },
  // ── Day 10: Blocked — security exception ──
  {
    timestamp: daysAgo(10, 0),
    userId: "user-5", userEmail: "robert.williams@clinictrustai.com", userRole: "doctor",
    action: "READ", resourceType: "Analytics",
    resourceId: "patient-3", patientId: "patient-3",
    endpoint: "/api/analytics/insights/patient/patient-3", method: "GET",
    ipAddress: "10.0.0.55", userAgent: "Edge/114.0",
    responseStatus: 403, oncException: "security"
  },
  // ── Day 14 ──
  {
    timestamp: daysAgo(14, 0),
    userId: "user-2", userEmail: "john.smith@clinictrustai.com", userRole: "doctor",
    action: "READ", resourceType: "Referral",
    resourceId: null, patientId: null,
    endpoint: "/api/referrals", method: "GET",
    ipAddress: "192.168.1.11", userAgent: "Mozilla/5.0 (Macintosh)",
    responseStatus: 200, oncException: null
  },
  // ── Day 20 ──
  {
    timestamp: daysAgo(20, 0),
    userId: null, userEmail: "admin@clinictrustai.com", userRole: "admin",
    action: "READ", resourceType: "Patient",
    resourceId: "patient-5", patientId: "patient-5",
    endpoint: "/api/patients/patient-5", method: "GET",
    ipAddress: "192.168.1.10", userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    responseStatus: 200, oncException: null
  }
];
await db.collection('ehi_audit_logs').insertMany(ehiAuditLogs);

// EHI audit log indexes
// TTL index — 7-year retention (HIPAA minimum 6 years, §164.530)
// db.collection('ehi_audit_logs').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60, name: "ttl_7yr_retention" });
// db.collection('ehi_audit_logs').createIndex({ userId: 1 });
// db.collection('ehi_audit_logs').createIndex({ userEmail: 1 });
// db.collection('ehi_audit_logs').createIndex({ action: 1 });
// db.collection('ehi_audit_logs').createIndex({ resourceType: 1 });
// db.collection('ehi_audit_logs').createIndex({ patientId: 1 });
// db.collection('ehi_audit_logs').createIndex({ responseStatus: 1 });
// db.collection('ehi_audit_logs').createIndex({ oncException: 1 });
// Compound index for the most common admin query pattern
// db.collection('ehi_audit_logs').createIndex({ timestamp: -1, action: 1, resourceType: 1 });

// ---------------------------------------------------------------------------
// FHIR R4 API — No new MongoDB collections required.
// The FHIR layer is a read-only transformation of existing collections:
//   patients     → Patient, Condition, MedicationRequest, AllergyIntolerance, Coverage
//   users        → Practitioner
//   referrals    → ServiceRequest
//
// Recommended supporting indexes for FHIR query performance:
// ---------------------------------------------------------------------------

// Fast Patient lookup by patientId (used by all /fhir/* patient-scoped queries)
// db.collection('patients').createIndex({ patientId: 1 }, { unique: true, sparse: true, name: "fhir_patientId_lookup" });

// Fast Practitioner lookup (already covered by _id, but alias for FHIR clarity)
// db.users._id is always indexed by MongoDB.

// Fast ServiceRequest (Referral) lookup by patient ref
// db.collection('referrals').createIndex({ patient: 1 }, { name: "fhir_referral_by_patient" });

// ── Prior Authorization Collection ───────────────────────────────────────────
console.log('Creating priorauthorizations collection...');

// Sample Prior Authorization data
await db.collection('priorauthorizations').insertMany([
  // ── Approved ──────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100001',
    patientName: 'Alice Johnson',
    serviceType: 'MRI Scan',
    serviceCode: '70553',
    diagnosisCodes: [{ code: 'G35', description: 'Multiple sclerosis' }, { code: 'R51', description: 'Headache' }],
    clinicalNotes: 'Patient presents with recurring headaches and vision changes. Neurological symptoms suggest possible demyelinating disease. MRI of brain with contrast required for diagnosis and treatment planning.',
    urgency: 'Urgent',
    insurancePlan: 'Blue Cross Blue Shield',
    memberId: 'BCBS-100001',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 88,
    aiReasoning: 'Clinical presentation is consistent with neurological disorder requiring imaging. Documentation supports medical necessity. Proceed with scheduling the authorized service within the approval window.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    reviewerNotes: 'Approved based on clinical necessity and AI recommendation.',
    approvedDate: new Date(new Date().setDate(new Date().getDate() - 1)),
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 89)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  {
    patientId: 'PT-100004',
    patientName: 'David Kim',
    serviceType: 'Cardiac Catheterization',
    serviceCode: '93460',
    diagnosisCodes: [{ code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' }, { code: 'I20.9', description: 'Angina pectoris, unspecified' }],
    clinicalNotes: 'Patient with unstable angina and positive stress test. Cardiac catheterization needed to evaluate coronary anatomy and guide revascularization decision.',
    urgency: 'Emergent',
    insurancePlan: 'Medicare',
    memberId: 'MCR-400004',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 95,
    aiReasoning: 'Emergent cardiac catheterization for unstable angina with positive stress test meets criteria for urgent authorization. Clinical documentation supports medical necessity.',
    aiAnalyzedAt: new Date(new Date().setHours(new Date().getHours() - 6)),
    reviewerNotes: 'Emergent case approved immediately.',
    approvedDate: new Date(new Date().setHours(new Date().getHours() - 5)),
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 90)),
    createdAt: new Date(new Date().setHours(new Date().getHours() - 7)),
    updatedAt: new Date(new Date().setHours(new Date().getHours() - 5))
  },
  {
    patientId: 'PT-100007',
    patientName: 'Grace Lee',
    serviceType: 'Infusion Therapy',
    serviceCode: '96413',
    diagnosisCodes: [{ code: 'C50.911', description: 'Malignant neoplasm of unspecified site of right female breast' }],
    clinicalNotes: 'Patient is a 52-year-old female with Stage III breast cancer on active chemotherapy. Requesting prior auth for 4 cycles of IV infusion therapy. Tumor markers show treatment response. Continuation of regimen is medically necessary.',
    urgency: 'Urgent',
    insurancePlan: 'Kaiser Permanente',
    memberId: 'KP-700007',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 93,
    aiReasoning: 'Chemotherapy infusion for active Stage III breast cancer meets all criteria for prior authorization. Documented treatment response supports continuation.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 4)),
    reviewerNotes: 'Approved. Treatment response documented. Authorize 4 cycles.',
    approvedDate: new Date(new Date().setDate(new Date().getDate() - 3)),
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 87)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 3))
  },
  {
    patientId: 'PT-100008',
    patientName: 'Henry Thompson',
    serviceType: 'Sleep Study',
    serviceCode: '95810',
    diagnosisCodes: [{ code: 'G47.33', description: 'Obstructive sleep apnea (adult)' }],
    clinicalNotes: 'Patient reports excessive daytime sleepiness, loud snoring, and witnessed apneas. Epworth Sleepiness Scale score 16/24. BMI 34.2. Overnight polysomnography requested to confirm OSA diagnosis and titrate CPAP therapy.',
    urgency: 'Routine',
    insurancePlan: 'Anthem',
    memberId: 'ANT-800008',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 85,
    aiReasoning: 'Clinical presentation with high Epworth score, BMI, and witnessed apneas strongly supports medical necessity for polysomnography.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 6)),
    reviewerNotes: 'Approved. ESS score and clinical findings meet criteria.',
    approvedDate: new Date(new Date().setDate(new Date().getDate() - 5)),
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 85)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 8)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 5))
  },
  {
    patientId: 'PT-100012',
    patientName: 'Liam Anderson',
    serviceType: 'CT Scan',
    serviceCode: '71250',
    diagnosisCodes: [{ code: 'R04.2', description: 'Haemoptysis' }, { code: 'Z87.891', description: 'Personal history of nicotine dependence' }],
    clinicalNotes: '58-year-old male with 30 pack-year smoking history, persistent cough and hemoptysis. Chest X-ray shows right upper lobe opacity. Low-dose CT chest required for lung cancer screening and opacity characterization.',
    urgency: 'Urgent',
    insurancePlan: 'Medicare',
    memberId: 'MCR-121212',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 96,
    aiReasoning: 'Hemoptysis with chest X-ray opacity in a heavy smoker constitutes high clinical suspicion for lung malignancy. CT chest is medically necessary.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 1)),
    reviewerNotes: 'Approved immediately. High-priority case.',
    approvedDate: new Date(new Date().setHours(new Date().getHours() - 22)),
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 89)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    updatedAt: new Date(new Date().setHours(new Date().getHours() - 22))
  },
  {
    patientId: 'PT-100014',
    patientName: 'Noah Clark',
    serviceType: 'Occupational Therapy',
    serviceCode: '97530',
    diagnosisCodes: [{ code: 'I63.9', description: 'Cerebral infarction, unspecified' }, { code: 'G81.90', description: 'Hemiplegia, unspecified, affecting unspecified side' }],
    clinicalNotes: '67-year-old male recovering from ischemic stroke 3 weeks ago with residual left-sided hemiplegia. FIM score 62. Requesting 30 occupational therapy sessions over 10 weeks for ADL rehabilitation.',
    urgency: 'Urgent',
    insurancePlan: 'Medicare',
    memberId: 'MCR-141414',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 94,
    aiReasoning: 'Post-stroke occupational therapy with documented FIM score and functional deficits clearly meets medical necessity criteria.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    reviewerNotes: 'Approved. Post-stroke rehab is medically necessary. Authorize 30 sessions.',
    approvedDate: new Date(new Date().setDate(new Date().getDate() - 2)),
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 88)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 4)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 2))
  },
  {
    patientId: 'PT-100016',
    patientName: 'Peter Williams',
    serviceType: 'Colonoscopy',
    serviceCode: '45378',
    diagnosisCodes: [{ code: 'K92.1', description: 'Melaena' }, { code: 'Z80.0', description: 'Family history of malignant neoplasm of digestive organs' }],
    clinicalNotes: '52-year-old male with 2-week history of melena and hemoglobin drop from 13.8 to 10.2 g/dL. Family history of colon cancer. Colonoscopy urgently needed to evaluate GI bleeding source.',
    urgency: 'Urgent',
    insurancePlan: 'Anthem',
    memberId: 'ANT-161616',
    status: 'Approved',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 98,
    aiReasoning: 'Active GI bleeding with anemia and family history of colorectal cancer represents an urgent indication for colonoscopy.',
    aiAnalyzedAt: new Date(new Date().setHours(new Date().getHours() - 8)),
    reviewerNotes: 'Approved urgently. Active bleeding requiring immediate evaluation.',
    approvedDate: new Date(new Date().setHours(new Date().getHours() - 7)),
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 90)),
    createdAt: new Date(new Date().setHours(new Date().getHours() - 10)),
    updatedAt: new Date(new Date().setHours(new Date().getHours() - 7))
  },
  // ── Under Review ──────────────────────────────────────────────────────────
  {
    patientId: 'PT-100002',
    patientName: 'Bob Martinez',
    serviceType: 'Physical Therapy',
    serviceCode: '97110',
    diagnosisCodes: [{ code: 'M54.5', description: 'Low back pain' }, { code: 'M47.816', description: 'Spondylosis with radiculopathy, lumbar region' }],
    clinicalNotes: 'Patient has chronic low back pain with lumbar radiculopathy confirmed by EMG. Conservative treatment with PT recommended before surgical intervention. 12-week program requested.',
    urgency: 'Routine',
    insurancePlan: 'Aetna',
    memberId: 'AET-200002',
    status: 'Under Review',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 82,
    aiReasoning: 'Physical therapy for lumbar radiculopathy is well-supported by evidence. Documentation adequately establishes medical necessity.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 1)),
    reviewerNotes: '',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  {
    patientId: 'PT-100010',
    patientName: 'James Brown',
    serviceType: 'Specialist Consultation',
    serviceCode: '99244',
    diagnosisCodes: [{ code: 'G40.909', description: 'Epilepsy, unspecified, not intractable, without status epilepticus' }],
    clinicalNotes: '9-year-old male with new-onset seizure activity. Two tonic-clonic episodes in the past month. EEG shows abnormal epileptiform discharges. Referral to pediatric neurologist required.',
    urgency: 'Urgent',
    insurancePlan: 'Blue Cross Blue Shield',
    memberId: 'BCBS-101010',
    status: 'Under Review',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 91,
    aiReasoning: 'New-onset pediatric epilepsy with confirmed EEG abnormalities requires urgent specialist evaluation.',
    aiAnalyzedAt: new Date(new Date().setHours(new Date().getHours() - 3)),
    reviewerNotes: '',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),
    updatedAt: new Date(new Date().setHours(new Date().getHours() - 3))
  },
  {
    patientId: 'PT-100015',
    patientName: 'Olivia Harris',
    serviceType: 'Durable Medical Equipment',
    serviceCode: 'E0784',
    diagnosisCodes: [{ code: 'E10.649', description: 'Type 1 diabetes mellitus with hypoglycemia without coma' }],
    clinicalNotes: '28-year-old female with Type 1 diabetes on insulin pump therapy with frequent hypoglycemic episodes (>3/week). Requesting CGM authorization. HbA1c 8.9%.',
    urgency: 'Routine',
    insurancePlan: 'Blue Cross Blue Shield',
    memberId: 'BCBS-151515',
    status: 'Under Review',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 87,
    aiReasoning: 'CGM for Type 1 diabetes with documented hypoglycemic episodes and elevated HbA1c meets standard criteria for authorization.',
    aiAnalyzedAt: new Date(new Date().setHours(new Date().getHours() - 5)),
    reviewerNotes: '',
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),
    updatedAt: new Date(new Date().setHours(new Date().getHours() - 5))
  },
  // ── Pending ───────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100003',
    patientName: 'Carol White',
    serviceType: 'PET Scan',
    serviceCode: '78816',
    diagnosisCodes: [{ code: 'C34.10', description: 'Malignant neoplasm of upper lobe, unspecified bronchus or lung' }],
    clinicalNotes: 'Patient with confirmed Stage II lung cancer. PET scan required for accurate staging. CT showed suspicious mediastinal lymph nodes requiring characterization.',
    urgency: 'Urgent',
    insurancePlan: 'UnitedHealth',
    memberId: 'UHC-300003',
    status: 'Pending',
    aiRecommendation: null,
    aiConfidenceScore: null,
    aiReasoning: '',
    aiAnalyzedAt: null,
    reviewerNotes: '',
    createdAt: new Date(new Date().setHours(new Date().getHours() - 4)),
    updatedAt: new Date(new Date().setHours(new Date().getHours() - 4))
  },
  {
    patientId: 'PT-100009',
    patientName: 'Isabella Garcia',
    serviceType: 'Epidural Steroid Injection',
    serviceCode: '62323',
    diagnosisCodes: [{ code: 'M51.16', description: 'Intervertebral disc degeneration, lumbar region' }, { code: 'M54.4', description: 'Lumbago with sciatica, right side' }],
    clinicalNotes: 'Refractory lumbar radiculopathy unresponsive to 8 weeks of PT and NSAIDs. MRI confirms L4-L5 disc herniation with nerve root compression. Epidural steroid injection recommended.',
    urgency: 'Routine',
    insurancePlan: 'Aetna',
    memberId: 'AET-900009',
    status: 'Pending',
    aiRecommendation: null,
    aiConfidenceScore: null,
    aiReasoning: '',
    aiAnalyzedAt: null,
    reviewerNotes: '',
    createdAt: new Date(new Date().setHours(new Date().getHours() - 2)),
    updatedAt: new Date(new Date().setHours(new Date().getHours() - 2))
  },
  {
    patientId: 'PT-100013',
    patientName: 'Mia Robinson',
    serviceType: 'Lab Testing',
    serviceCode: '89264',
    diagnosisCodes: [{ code: 'N97.9', description: 'Female infertility, unspecified' }, { code: 'E28.2', description: 'Polycystic ovarian syndrome' }],
    clinicalNotes: '33-year-old female with PCOS and 18 months of primary infertility. Comprehensive fertility panel requested including AMH, FSH, LH, estradiol, and antral follicle count before initiating IUI/IVF.',
    urgency: 'Routine',
    insurancePlan: 'Cigna',
    memberId: 'CGN-131313',
    status: 'Pending',
    aiRecommendation: null,
    aiConfidenceScore: null,
    aiReasoning: '',
    aiAnalyzedAt: null,
    reviewerNotes: '',
    createdAt: new Date(new Date().setMinutes(new Date().getMinutes() - 30)),
    updatedAt: new Date(new Date().setMinutes(new Date().getMinutes() - 30))
  },
  // ── Denied ────────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100005',
    patientName: 'Emma Davis',
    serviceType: 'Mental Health Services',
    serviceCode: '90837',
    diagnosisCodes: [{ code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate' }, { code: 'F41.1', description: 'Generalized anxiety disorder' }],
    clinicalNotes: 'Patient with treatment-resistant depression and comorbid anxiety. Requires intensive outpatient mental health services. Previous SSRI treatments insufficient.',
    urgency: 'Routine',
    insurancePlan: 'Cigna',
    memberId: 'CGN-500005',
    status: 'Denied',
    aiRecommendation: 'Review',
    aiConfidenceScore: 58,
    aiReasoning: 'Documentation does not adequately demonstrate that standard outpatient therapy has been exhausted. Additional clinical documentation is needed.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    reviewerNotes: 'Denied pending additional documentation of prior treatment failure. Therapy notes from previous providers required.',
    deniedDate: new Date(new Date().setDate(new Date().getDate() - 4)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 7)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 4))
  },
  {
    patientId: 'PT-100011',
    patientName: 'Karen Martinez',
    serviceType: 'Surgical Procedure',
    serviceCode: '43644',
    diagnosisCodes: [{ code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories' }, { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' }],
    clinicalNotes: '41-year-old female with morbid obesity (BMI 43.8), type 2 diabetes, and hypertension. 6-month medically supervised weight loss program completed. Laparoscopic gastric bypass requested.',
    urgency: 'Routine',
    insurancePlan: 'UnitedHealth',
    memberId: 'UHC-111011',
    status: 'Denied',
    aiRecommendation: 'Review',
    aiConfidenceScore: 62,
    aiReasoning: 'While BMI and comorbidities meet surgical criteria, documentation of the 6-month supervised weight loss program requires additional verification.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 12)),
    reviewerNotes: 'Denied — supervised diet program documentation is incomplete. Monthly weigh-in records for all 6 months required.',
    deniedDate: new Date(new Date().setDate(new Date().getDate() - 11)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 15)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 11))
  },
  // ── Appealing ─────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100006',
    patientName: 'Frank Wilson',
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
    aiReasoning: 'Surgical procedure requires additional documentation of failed conservative treatments.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 10)),
    reviewerNotes: 'Denied initially due to insufficient documentation of conservative treatment failure.',
    deniedDate: new Date(new Date().setDate(new Date().getDate() - 8)),
    appealNotes: 'Attaching 18 months of PT records, 3 corticosteroid injections, and 2 orthopaedic consultations demonstrating failed conservative management.',
    appealSubmittedAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 14)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 2))
  },
  // ── Expired ───────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100001',
    patientName: 'Alice Johnson',
    serviceType: 'Speech Therapy',
    serviceCode: '92507',
    diagnosisCodes: [{ code: 'G35', description: 'Multiple sclerosis' }, { code: 'R47.1', description: 'Dysarthria and anarthria' }],
    clinicalNotes: 'Patient with confirmed MS presenting with progressive dysarthria. Speech-language pathology evaluation and treatment requested. Patient scores 3/7 on Dysarthria Impact Profile.',
    urgency: 'Routine',
    insurancePlan: 'Blue Cross Blue Shield',
    memberId: 'BCBS-100001',
    status: 'Expired',
    aiRecommendation: 'Approve',
    aiConfidenceScore: 83,
    aiReasoning: 'Speech therapy for MS-related dysarthria is clinically indicated. Functional communication impact documented.',
    aiAnalyzedAt: new Date(new Date().setDate(new Date().getDate() - 95)),
    reviewerNotes: 'Approved. 12 sessions authorized.',
    approvedDate: new Date(new Date().setDate(new Date().getDate() - 94)),
    expiryDate: new Date(new Date().setDate(new Date().getDate() - 4)),
    createdAt: new Date(new Date().setDate(new Date().getDate() - 97)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 4))
  }
]);

console.log('Prior Authorization sample data inserted (17 records across all statuses)');

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating appointments collection...");
await db.collection('appointments').insertMany([
  // ── Completed ─────────────────────────────────────────────────────────────
  {
    _id: "appt-001",
    providerId: "user-2",
    providerName: "Dr. John Smith",
    patientId: "PT-100001",
    patientName: "Alice Johnson",
    patientEmail: "alice.johnson@email.com",
    patientPhone: "555-101-0001",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 20)),
    duration: 30,
    appointmentType: "Follow-up",
    status: "completed",
    location: "Metro Heart Institute — Room 201",
    linkedReferralId: "ref-001",
    notes: "Post-referral cardiology follow-up. Patient stable.",
    reminderSent: true,
    tokenRewardIssued: true,
    tokenRewardAmount: 15,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 25)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 20))
  },
  {
    _id: "appt-002",
    providerId: "user-3",
    providerName: "Dr. Sarah Johnson",
    patientId: "PT-100002",
    patientName: "Bob Williams",
    patientEmail: "bob.williams@email.com",
    patientPhone: "555-101-0002",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 18)),
    duration: 45,
    appointmentType: "Initial Consultation",
    status: "completed",
    location: "Central Neurology Center — Suite 300",
    linkedReferralId: "ref-002",
    notes: "Initial neuro consult completed. MRI ordered.",
    reminderSent: true,
    tokenRewardIssued: true,
    tokenRewardAmount: 20,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 22)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 18))
  },
  {
    _id: "appt-003",
    providerId: "user-4",
    providerName: "Dr. Michael Chen",
    patientId: "PT-100003",
    patientName: "Carol Davis",
    patientEmail: "carol.davis@email.com",
    patientPhone: "555-101-0003",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 15)),
    duration: 30,
    appointmentType: "Follow-up",
    status: "completed",
    location: "North Orthopedic Clinic — Room 110",
    linkedReferralId: "ref-003",
    notes: "Post-op follow-up. Recovery on track.",
    reminderSent: true,
    tokenRewardIssued: true,
    tokenRewardAmount: 15,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 19)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 15))
  },
  {
    _id: "appt-004",
    providerId: "user-5",
    providerName: "Dr. Emily Rodriguez",
    patientId: "PT-100004",
    patientName: "David Brown",
    patientEmail: "david.brown@email.com",
    patientPhone: "555-101-0004",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 10)),
    duration: 60,
    appointmentType: "Consultation",
    status: "completed",
    location: "South Mental Health Center — Office 7",
    linkedReferralId: "ref-004",
    notes: "Psychiatric intake evaluation completed.",
    reminderSent: true,
    tokenRewardIssued: true,
    tokenRewardAmount: 25,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 14)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 10))
  },
  {
    _id: "appt-005",
    providerId: "user-2",
    providerName: "Dr. John Smith",
    patientId: "PT-100005",
    patientName: "Eva Martinez",
    patientEmail: "eva.martinez@email.com",
    patientPhone: "555-101-0005",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 8)),
    duration: 30,
    appointmentType: "Follow-up",
    status: "completed",
    location: "Metro Heart Institute — Room 201",
    linkedReferralId: "ref-005",
    notes: "Echo review — ejection fraction improved.",
    reminderSent: true,
    tokenRewardIssued: true,
    tokenRewardAmount: 15,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 12)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 8))
  },
  // ── No-Show ───────────────────────────────────────────────────────────────
  {
    _id: "appt-006",
    providerId: "user-3",
    providerName: "Dr. Sarah Johnson",
    patientId: "PT-100006",
    patientName: "Frank Wilson",
    patientEmail: "frank.wilson@email.com",
    patientPhone: "555-101-0006",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 12)),
    duration: 45,
    appointmentType: "Follow-up",
    status: "no_show",
    location: "Central Neurology Center — Suite 300",
    linkedReferralId: "ref-006",
    notes: "Patient did not attend. Reminder sent 24h prior.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 16)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 12))
  },
  {
    _id: "appt-007",
    providerId: "user-4",
    providerName: "Dr. Michael Chen",
    patientId: "PT-100007",
    patientName: "Grace Lee",
    patientEmail: "grace.lee@email.com",
    patientPhone: "555-101-0007",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    duration: 30,
    appointmentType: "Initial Consultation",
    status: "no_show",
    location: "North Orthopedic Clinic — Room 110",
    notes: "Patient unreachable. Slot reallocated.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 11)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 7))
  },
  {
    _id: "appt-008",
    providerId: "user-5",
    providerName: "Dr. Emily Rodriguez",
    patientId: "PT-100008",
    patientName: "Henry Clark",
    patientEmail: "henry.clark@email.com",
    patientPhone: "555-101-0008",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 5)),
    duration: 60,
    appointmentType: "Consultation",
    status: "no_show",
    location: "South Mental Health Center — Office 7",
    notes: "Second no-show. Follow-up outreach initiated.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 9)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 5))
  },
  // ── Cancelled ─────────────────────────────────────────────────────────────
  {
    _id: "appt-009",
    providerId: "user-2",
    providerName: "Dr. John Smith",
    patientId: "PT-100009",
    patientName: "Iris Thompson",
    patientEmail: "iris.thompson@email.com",
    patientPhone: "555-101-0009",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 9)),
    duration: 30,
    appointmentType: "Follow-up",
    status: "cancelled",
    location: "Metro Heart Institute — Room 201",
    cancellationReason: "Patient requested reschedule due to conflict",
    reminderSent: false,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 14)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 9))
  },
  {
    _id: "appt-010",
    providerId: "user-3",
    providerName: "Dr. Sarah Johnson",
    patientId: "PT-100010",
    patientName: "James Anderson",
    patientEmail: "james.anderson@email.com",
    patientPhone: "555-101-0010",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() - 4)),
    duration: 45,
    appointmentType: "Initial Consultation",
    status: "cancelled",
    location: "Central Neurology Center — Suite 300",
    cancellationReason: "Provider unavailable — rescheduling",
    reminderSent: false,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 8)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 4))
  },
  // ── Scheduled (upcoming) ───────────────────────────────────────────────────
  {
    _id: "appt-011",
    providerId: "user-4",
    providerName: "Dr. Michael Chen",
    patientId: "PT-100001",
    patientName: "Alice Johnson",
    patientEmail: "alice.johnson@email.com",
    patientPhone: "555-101-0001",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() + 3)),
    duration: 30,
    appointmentType: "Follow-up",
    status: "scheduled",
    location: "North Orthopedic Clinic — Room 110",
    linkedReferralId: "ref-008",
    notes: "Orthopedic assessment for knee pain.",
    reminderSent: false,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 3))
  },
  {
    _id: "appt-012",
    providerId: "user-5",
    providerName: "Dr. Emily Rodriguez",
    patientId: "PT-100002",
    patientName: "Bob Williams",
    patientEmail: "bob.williams@email.com",
    patientPhone: "555-101-0002",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    duration: 60,
    appointmentType: "Consultation",
    status: "scheduled",
    location: "South Mental Health Center — Office 7",
    linkedReferralId: "ref-009",
    notes: "Anxiety and stress management initial consult.",
    reminderSent: false,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 2))
  },
  {
    _id: "appt-013",
    providerId: "user-2",
    providerName: "Dr. John Smith",
    patientId: "PT-100003",
    patientName: "Carol Davis",
    patientEmail: "carol.davis@email.com",
    patientPhone: "555-101-0003",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() + 7)),
    duration: 30,
    appointmentType: "Follow-up",
    status: "scheduled",
    location: "Metro Heart Institute — Room 201",
    notes: "6-week cardiac stress test follow-up.",
    reminderSent: false,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  {
    _id: "appt-014",
    providerId: "user-3",
    providerName: "Dr. Sarah Johnson",
    patientId: "PT-100004",
    patientName: "David Brown",
    patientEmail: "david.brown@email.com",
    patientPhone: "555-101-0004",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() + 10)),
    duration: 45,
    appointmentType: "Initial Consultation",
    status: "scheduled",
    location: "Central Neurology Center — Suite 300",
    notes: "EEG and migraine assessment.",
    reminderSent: false,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // ── Confirmed ─────────────────────────────────────────────────────────────
  {
    _id: "appt-015",
    providerId: "user-4",
    providerName: "Dr. Michael Chen",
    patientId: "PT-100005",
    patientName: "Eva Martinez",
    patientEmail: "eva.martinez@email.com",
    patientPhone: "555-101-0005",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    duration: 30,
    appointmentType: "Follow-up",
    status: "confirmed",
    location: "North Orthopedic Clinic — Room 110",
    linkedReferralId: "ref-010",
    notes: "Physical therapy progress review.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 4)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  {
    _id: "appt-016",
    providerId: "user-5",
    providerName: "Dr. Emily Rodriguez",
    patientId: "PT-100006",
    patientName: "Frank Wilson",
    patientEmail: "frank.wilson@email.com",
    patientPhone: "555-101-0006",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() + 4)),
    duration: 60,
    appointmentType: "Consultation",
    status: "confirmed",
    location: "South Mental Health Center — Office 7",
    notes: "Re-scheduled session from previous no-show.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  {
    _id: "appt-017",
    providerId: "user-2",
    providerName: "Dr. John Smith",
    patientId: "PT-100007",
    patientName: "Grace Lee",
    patientEmail: "grace.lee@email.com",
    patientPhone: "555-101-0007",
    scheduledDate: new Date(new Date().setDate(new Date().getDate() + 6)),
    duration: 30,
    appointmentType: "Follow-up",
    status: "confirmed",
    location: "Metro Heart Institute — Room 201",
    linkedReferralId: "ref-011",
    notes: "Holter monitor results review.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  // ── Checked-in ────────────────────────────────────────────────────────────
  {
    _id: "appt-018",
    providerId: "user-3",
    providerName: "Dr. Sarah Johnson",
    patientId: "PT-100008",
    patientName: "Henry Clark",
    patientEmail: "henry.clark@email.com",
    patientPhone: "555-101-0008",
    scheduledDate: new Date(),
    duration: 45,
    appointmentType: "Consultation",
    status: "checked_in",
    location: "Central Neurology Center — Suite 300",
    linkedReferralId: "ref-012",
    notes: "Patient arrived. Waiting for provider.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    updatedAt: new Date()
  },
  {
    _id: "appt-019",
    providerId: "user-4",
    providerName: "Dr. Michael Chen",
    patientId: "PT-100009",
    patientName: "Iris Thompson",
    patientEmail: "iris.thompson@email.com",
    patientPhone: "555-101-0009",
    scheduledDate: new Date(),
    duration: 30,
    appointmentType: "Follow-up",
    status: "checked_in",
    location: "North Orthopedic Clinic — Room 110",
    notes: "Checked in 10 minutes early.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    updatedAt: new Date()
  },
  {
    _id: "appt-020",
    providerId: "user-5",
    providerName: "Dr. Emily Rodriguez",
    patientId: "PT-100010",
    patientName: "James Anderson",
    patientEmail: "james.anderson@email.com",
    patientPhone: "555-101-0010",
    scheduledDate: new Date(new Date().setHours(new Date().getHours() + 1)),
    duration: 60,
    appointmentType: "Initial Consultation",
    status: "checked_in",
    location: "South Mental Health Center — Office 7",
    linkedReferralId: "ref-013",
    notes: "Walk-in — converted from waitlist.",
    reminderSent: true,
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),
    updatedAt: new Date()
  }
]);
// db.collection('appointments').createIndex({ providerId: 1 });
// db.collection('appointments').createIndex({ status: 1 });
// db.collection('appointments').createIndex({ scheduledDate: 1 });
// db.collection('appointments').createIndex({ linkedReferralId: 1 });
console.log('Appointments inserted (20 records — completed:5, no_show:3, cancelled:2, scheduled:4, confirmed:3, checked_in:3)');

// ═══════════════════════════════════════════════════════════════════════════
// DTX PROGRAMS
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating dtxprograms collection...");
await db.collection('dtxprograms').insertMany([
  {
    _id: "dtx-prog-001",
    name: "MindPath — Cognitive Behavioral Therapy for Depression",
    shortName: "MindPath CBT",
    category: "mental_health",
    condition: "Major Depressive Disorder",
    icdCodes: ["F32.1", "F32.2", "F33.1"],
    description: "FDA-authorized app-based CBT program delivering 12-week structured modules for mild-to-moderate depression. Evidence-based with 78% symptom improvement in clinical trials.",
    manufacturer: "NeuroWell Digital Health",
    fdaClearance: "De Novo — DEN200XXX",
    duration: 84,
    durationUnit: "days",
    sessionCount: 36,
    sessionFrequency: "3x per week",
    evidenceLevel: "RCT — Level 1",
    reimbursementCode: "DTX-MH-001",
    insuranceAccepted: ["Aetna", "Blue Cross Blue Shield", "United Health", "Cigna"],
    tokenRewardOnComplete: 50,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 1))
  },
  {
    _id: "dtx-prog-002",
    name: "Somryst — Insomnia Cognitive Behavioral Therapy",
    shortName: "Somryst",
    category: "mental_health",
    condition: "Chronic Insomnia Disorder",
    icdCodes: ["G47.00", "G47.01"],
    description: "Prescription digital therapeutic for adults with chronic insomnia. Delivers Cognitive Behavioral Therapy for Insomnia (CBT-I) through adaptive algorithms. FDA De Novo authorized.",
    manufacturer: "Pear Therapeutics",
    fdaClearance: "De Novo — DEN200018",
    duration: 63,
    durationUnit: "days",
    sessionCount: 9,
    sessionFrequency: "Weekly",
    evidenceLevel: "RCT — Level 1",
    reimbursementCode: "DTX-MH-002",
    insuranceAccepted: ["Aetna", "Blue Cross Blue Shield", "United Health", "Humana"],
    tokenRewardOnComplete: 40,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 5)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 1))
  },
  {
    _id: "dtx-prog-003",
    name: "GlucoseGuard — T2DM Self-Management",
    shortName: "GlucoseGuard",
    category: "metabolic",
    condition: "Type 2 Diabetes Mellitus",
    icdCodes: ["E11.9", "E11.65", "E11.40"],
    description: "AI-powered diabetes coaching platform. Continuous glucose pattern analysis, personalized meal planning, medication adherence tracking, and provider-facing dashboards. Integrates with CGM devices.",
    manufacturer: "MetaboTech Digital",
    fdaClearance: "510(k) — K210XXX",
    duration: 180,
    durationUnit: "days",
    sessionCount: 24,
    sessionFrequency: "Bi-weekly check-ins",
    evidenceLevel: "RCT — Level 2",
    reimbursementCode: "DTX-MET-001",
    insuranceAccepted: ["Aetna", "Blue Cross Blue Shield", "United Health", "Cigna", "Medicare"],
    tokenRewardOnComplete: 75,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 8)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 2))
  },
  {
    _id: "dtx-prog-004",
    name: "WeightWise — Metabolic Wellness Program",
    shortName: "WeightWise",
    category: "metabolic",
    condition: "Obesity / Metabolic Syndrome",
    icdCodes: ["E66.01", "E66.09", "E88.81"],
    description: "Comprehensive digital obesity management: calorie tracking, exercise coaching, behavioral change modules, and weekly dietitian messaging. Designed as an adjunct to pharmacotherapy.",
    manufacturer: "FitPath Health",
    fdaClearance: "Exempt — wellness device",
    duration: 365,
    durationUnit: "days",
    sessionCount: 52,
    sessionFrequency: "Weekly",
    evidenceLevel: "Observational — Level 3",
    reimbursementCode: "DTX-MET-002",
    insuranceAccepted: ["United Health", "Cigna", "Humana"],
    tokenRewardOnComplete: 60,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 4)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 1))
  },
  {
    _id: "dtx-prog-005",
    name: "RehabPath — Post-Surgical Musculoskeletal Recovery",
    shortName: "RehabPath",
    category: "musculoskeletal",
    condition: "Post-surgical rehabilitation",
    icdCodes: ["M96.1", "Z96.641", "M17.11"],
    description: "Guided video physical therapy for post-orthopedic surgery recovery. AI motion analysis via smartphone camera detects form errors in real time and adjusts exercise intensity.",
    manufacturer: "KineticAI Therapeutics",
    fdaClearance: "De Novo — DEN210XXX",
    duration: 90,
    durationUnit: "days",
    sessionCount: 30,
    sessionFrequency: "5x per week initially, tapering",
    evidenceLevel: "RCT — Level 1",
    reimbursementCode: "DTX-MSK-001",
    insuranceAccepted: ["Aetna", "Blue Cross Blue Shield", "United Health", "Cigna", "Humana"],
    tokenRewardOnComplete: 55,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 7)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 1))
  },
  {
    _id: "dtx-prog-006",
    name: "SpineCare — Chronic Low Back Pain",
    shortName: "SpineCare",
    category: "musculoskeletal",
    condition: "Chronic Low Back Pain",
    icdCodes: ["M54.5", "M54.50", "M54.51"],
    description: "Evidence-based digital program combining pain neuroscience education, graded movement therapy, and mindfulness. Reduces opioid dependency and improves functional outcomes.",
    manufacturer: "AxisHealth Digital",
    fdaClearance: "Exempt — wellness device",
    duration: 120,
    durationUnit: "days",
    sessionCount: 40,
    sessionFrequency: "4x per week",
    evidenceLevel: "RCT — Level 2",
    reimbursementCode: "DTX-MSK-002",
    insuranceAccepted: ["United Health", "Cigna", "Medicare", "Medicaid"],
    tokenRewardOnComplete: 50,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 3)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 1))
  },
  {
    _id: "dtx-prog-007",
    name: "CardioPath — Heart Failure Self-Management",
    shortName: "CardioPath",
    category: "cardiovascular",
    condition: "Congestive Heart Failure",
    icdCodes: ["I50.20", "I50.22", "I50.30"],
    description: "Remote patient monitoring with daily symptom tracking, weight monitoring, and medication adherence alerts. Provider dashboard flags decompensation early to prevent hospitalization.",
    manufacturer: "HeartTech Digital",
    fdaClearance: "510(k) — K220XXX",
    duration: 365,
    durationUnit: "days",
    sessionCount: 365,
    sessionFrequency: "Daily check-in",
    evidenceLevel: "RCT — Level 1",
    reimbursementCode: "DTX-CV-001",
    insuranceAccepted: ["Aetna", "Blue Cross Blue Shield", "United Health", "Medicare"],
    tokenRewardOnComplete: 100,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 9)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 2))
  },
  {
    _id: "dtx-prog-008",
    name: "HyperBalance — Hypertension Management",
    shortName: "HyperBalance",
    category: "cardiovascular",
    condition: "Essential Hypertension",
    icdCodes: ["I10", "I11.9"],
    description: "Daily blood pressure logging, DASH diet coaching, stress reduction modules, and medication reminder system. Integrates with Bluetooth BP cuffs for automated readings.",
    manufacturer: "VascularWell Digital",
    fdaClearance: "Exempt — wellness device",
    duration: 180,
    durationUnit: "days",
    sessionCount: 26,
    sessionFrequency: "Bi-weekly",
    evidenceLevel: "Observational — Level 3",
    reimbursementCode: "DTX-CV-002",
    insuranceAccepted: ["United Health", "Cigna", "Humana", "Medicare"],
    tokenRewardOnComplete: 45,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 5)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 1))
  },
  {
    _id: "dtx-prog-009",
    name: "SoberPath — Alcohol Use Disorder Recovery",
    shortName: "SoberPath",
    category: "behavioral",
    condition: "Alcohol Use Disorder",
    icdCodes: ["F10.10", "F10.20", "F10.21"],
    description: "reSET-O-inspired modular recovery platform delivering community reinforcement approach (CRA) therapy and contingency management. Includes peer support network and crisis hotline integration.",
    manufacturer: "RenewHealth Digital",
    fdaClearance: "De Novo — DEN200XXX",
    duration: 90,
    durationUnit: "days",
    sessionCount: 67,
    sessionFrequency: "Daily",
    evidenceLevel: "RCT — Level 1",
    reimbursementCode: "DTX-BH-001",
    insuranceAccepted: ["Aetna", "Blue Cross Blue Shield", "Medicaid"],
    tokenRewardOnComplete: 80,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 1))
  },
  {
    _id: "dtx-prog-010",
    name: "AnxietyFree — Generalized Anxiety Disorder",
    shortName: "AnxietyFree",
    category: "behavioral",
    condition: "Generalized Anxiety Disorder",
    icdCodes: ["F41.1", "F41.0", "F41.3"],
    description: "App-based acceptance and commitment therapy (ACT) for GAD. Daily mindfulness exercises, worry exposure protocols, and cognitive defusion techniques. Integrates with wearable HRV sensors.",
    manufacturer: "CalmPath Digital",
    fdaClearance: "Exempt — wellness device",
    duration: 56,
    durationUnit: "days",
    sessionCount: 28,
    sessionFrequency: "Daily",
    evidenceLevel: "RCT — Level 2",
    reimbursementCode: "DTX-BH-002",
    insuranceAccepted: ["United Health", "Cigna", "Humana", "Aetna"],
    tokenRewardOnComplete: 35,
    isActive: true,
    createdAt: new Date(new Date().setMonth(new Date().getMonth() - 4)),
    updatedAt: new Date(new Date().setMonth(new Date().getMonth() - 1))
  }
]);
// db.collection('dtxprograms').createIndex({ category: 1 });
// db.collection('dtxprograms').createIndex({ isActive: 1 });
// db.collection('dtxprograms').createIndex({ condition: 1 });
console.log('DTx programs inserted (10 records across mental_health, metabolic, musculoskeletal, cardiovascular, behavioral)');

// ═══════════════════════════════════════════════════════════════════════════
// DTX PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating dtxprescriptions collection...");
await db.collection('dtxprescriptions').insertMany([
  {
    _id: "dtx-rx-001",
    programId: "dtx-prog-001",
    programName: "MindPath CBT",
    providerId: "user-5",
    providerName: "Dr. Emily Rodriguez",
    patientId: "PT-100004",
    patientName: "David Brown",
    patientEmail: "david.brown@email.com",
    linkedReferralId: "ref-004",
    status: "active",
    prescribedAt: new Date(new Date().setDate(new Date().getDate() - 30)),
    enrolledAt: new Date(new Date().setDate(new Date().getDate() - 28)),
    expectedCompletionDate: new Date(new Date().setDate(new Date().getDate() + 54)),
    progressPct: 34,
    adherencePct: 89,
    sessionCompleted: 12,
    sessionTotal: 36,
    providerNotes: "Patient engaging well with CBT modules. Depression score (PHQ-9) improved from 16 → 11.",
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 30)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  {
    _id: "dtx-rx-002",
    programId: "dtx-prog-003",
    programName: "GlucoseGuard",
    providerId: "user-2",
    providerName: "Dr. John Smith",
    patientId: "PT-100001",
    patientName: "Alice Johnson",
    patientEmail: "alice.johnson@email.com",
    linkedReferralId: "ref-001",
    status: "enrolled",
    prescribedAt: new Date(new Date().setDate(new Date().getDate() - 10)),
    enrolledAt: new Date(new Date().setDate(new Date().getDate() - 7)),
    expectedCompletionDate: new Date(new Date().setDate(new Date().getDate() + 173)),
    progressPct: 4,
    adherencePct: 100,
    sessionCompleted: 1,
    sessionTotal: 24,
    providerNotes: "Just enrolled. Baseline HbA1c: 8.2%. CGM device shipped.",
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 10)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 7))
  },
  {
    _id: "dtx-rx-003",
    programId: "dtx-prog-005",
    programName: "RehabPath",
    providerId: "user-4",
    providerName: "Dr. Michael Chen",
    patientId: "PT-100003",
    patientName: "Carol Davis",
    patientEmail: "carol.davis@email.com",
    linkedReferralId: "ref-003",
    status: "completed",
    prescribedAt: new Date(new Date().setDate(new Date().getDate() - 100)),
    enrolledAt: new Date(new Date().setDate(new Date().getDate() - 98)),
    completedAt: new Date(new Date().setDate(new Date().getDate() - 8)),
    expectedCompletionDate: new Date(new Date().setDate(new Date().getDate() - 8)),
    progressPct: 100,
    adherencePct: 93,
    sessionCompleted: 30,
    sessionTotal: 30,
    providerNotes: "Program completed successfully. ROM returned to 95% of pre-surgical baseline. Excellent adherence.",
    tokenRewardIssued: true,
    tokenRewardAmount: 55,
    outcomeNotes: "Pain VAS improved from 7/10 to 1/10. Patient discharged from DTx program.",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 100)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 8))
  },
  {
    _id: "dtx-rx-004",
    programId: "dtx-prog-007",
    programName: "CardioPath",
    providerId: "user-2",
    providerName: "Dr. John Smith",
    patientId: "PT-100005",
    patientName: "Eva Martinez",
    patientEmail: "eva.martinez@email.com",
    linkedReferralId: "ref-005",
    status: "active",
    prescribedAt: new Date(new Date().setDate(new Date().getDate() - 60)),
    enrolledAt: new Date(new Date().setDate(new Date().getDate() - 58)),
    expectedCompletionDate: new Date(new Date().setDate(new Date().getDate() + 305)),
    progressPct: 16,
    adherencePct: 78,
    sessionCompleted: 58,
    sessionTotal: 365,
    providerNotes: "Heart failure daily check-ins ongoing. One alert triggered last week for weight gain — resolved after diuretic adjustment.",
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 60)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  {
    _id: "dtx-rx-005",
    programId: "dtx-prog-002",
    programName: "Somryst",
    providerId: "user-5",
    providerName: "Dr. Emily Rodriguez",
    patientId: "PT-100008",
    patientName: "Henry Clark",
    patientEmail: "henry.clark@email.com",
    status: "prescribed",
    prescribedAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    expectedCompletionDate: new Date(new Date().setDate(new Date().getDate() + 60)),
    progressPct: 0,
    adherencePct: 0,
    sessionCompleted: 0,
    sessionTotal: 9,
    providerNotes: "CBT-I prescribed for chronic insomnia. Patient has tried sleep hygiene without success. Access code sent via email.",
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 3))
  },
  {
    _id: "dtx-rx-006",
    programId: "dtx-prog-009",
    programName: "SoberPath",
    providerId: "user-3",
    providerName: "Dr. Sarah Johnson",
    patientId: "PT-100002",
    patientName: "Bob Williams",
    patientEmail: "bob.williams@email.com",
    status: "dropped",
    prescribedAt: new Date(new Date().setDate(new Date().getDate() - 50)),
    enrolledAt: new Date(new Date().setDate(new Date().getDate() - 48)),
    droppedAt: new Date(new Date().setDate(new Date().getDate() - 20)),
    expectedCompletionDate: new Date(new Date().setDate(new Date().getDate() + 40)),
    progressPct: 32,
    adherencePct: 44,
    sessionCompleted: 22,
    sessionTotal: 67,
    dropReason: "Patient reported app fatigue and low motivation. Referred to in-person IOP program.",
    providerNotes: "Discussed barriers to engagement. Transitioning to intensive outpatient program.",
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 50)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 20))
  },
  {
    _id: "dtx-rx-007",
    programId: "dtx-prog-010",
    programName: "AnxietyFree",
    providerId: "user-5",
    providerName: "Dr. Emily Rodriguez",
    patientId: "PT-100010",
    patientName: "James Anderson",
    patientEmail: "james.anderson@email.com",
    linkedReferralId: "ref-013",
    status: "active",
    prescribedAt: new Date(new Date().setDate(new Date().getDate() - 21)),
    enrolledAt: new Date(new Date().setDate(new Date().getDate() - 20)),
    expectedCompletionDate: new Date(new Date().setDate(new Date().getDate() + 35)),
    progressPct: 38,
    adherencePct: 82,
    sessionCompleted: 11,
    sessionTotal: 28,
    providerNotes: "GAD-7 score improved from 14 to 9. Patient responding well to ACT modules.",
    tokenRewardIssued: false,
    tokenRewardAmount: 0,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 21)),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 1))
  }
]);
// db.collection('dtxprescriptions').createIndex({ providerId: 1 });
// db.collection('dtxprescriptions').createIndex({ patientId: 1 });
// db.collection('dtxprescriptions').createIndex({ status: 1 });
// db.collection('dtxprescriptions').createIndex({ programId: 1 });
// db.collection('dtxprescriptions').createIndex({ linkedReferralId: 1 });
console.log('DTx prescriptions inserted (7 records — active:3, enrolled:1, prescribed:1, completed:1, dropped:1)');

// ── Provider Profiles (onboarding/KYC) ─────────────────────────────────────
console.log("Creating provider profiles collection...");
await db.collection('providerprofiles').insertMany([
  {
    _id: "profile-1",
    userId: "user-2",
    npi: "1234567890",
    npiData: { npi: "1234567890", enumerationType: "NPI-1", firstName: "John", lastName: "Smith" },
    credential: "MD",
    specialty: "Cardiology",
    taxonomyCode: "207RC0000X",
    enumerationType: "NPI-1",
    organizationName: "Metro Heart Institute",
    gender: "M",
    phone: "212-555-0102",
    fax: "",
    address: { line1: "456 Heart Ave", line2: "Suite 200", city: "New York", state: "NY", zip: "10002" },
    licenseNumber: "MD-NY-12345",
    licenseState: "NY",
    deaNumber: "",
    kycDocumentPath: "",
    kycDocumentOriginalName: "",
    kycStatus: "verified",
    kycReviewedBy: "user-1",
    kycReviewedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    kycRejectionReason: "",
    onboardingSteps: {
      profile_created: true,
      email_verified: true,
      profile_reviewed: true,
      docs_uploaded: true,
      first_patient: true,
      first_referral: true,
      colleague_invited: false
    },
    invitesSent: [],
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "profile-2",
    userId: "user-3",
    npi: "9876543210",
    npiData: { npi: "9876543210", enumerationType: "NPI-1", firstName: "Sarah", lastName: "Johnson" },
    credential: "NP",
    specialty: "Pediatric Nursing",
    taxonomyCode: "163W00000X",
    enumerationType: "NPI-1",
    organizationName: "Community Care Hospital",
    gender: "F",
    phone: "310-555-0203",
    fax: "",
    address: { line1: "789 Care Blvd", line2: "", city: "Los Angeles", state: "CA", zip: "90002" },
    licenseNumber: "NP-CA-67890",
    licenseState: "CA",
    deaNumber: "",
    kycDocumentPath: "",
    kycDocumentOriginalName: "",
    kycStatus: "under_review",
    kycReviewedBy: null,
    kycReviewedAt: null,
    kycRejectionReason: "",
    onboardingSteps: {
      profile_created: true,
      email_verified: true,
      profile_reviewed: true,
      docs_uploaded: true,
      first_patient: false,
      first_referral: false,
      colleague_invited: false
    },
    invitesSent: [],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "profile-3",
    userId: "user-4",
    npi: "1111111111",
    npiData: { npi: "1111111111", enumerationType: "NPI-1", firstName: "Michael", lastName: "Chen" },
    credential: "MD",
    specialty: "Neurology",
    taxonomyCode: "2084N0400X",
    enumerationType: "NPI-1",
    organizationName: "Neuroscience Medical Center",
    gender: "M",
    phone: "713-555-0304",
    fax: "",
    address: { line1: "321 Neuro Pkwy", line2: "Floor 3", city: "Houston", state: "TX", zip: "77002" },
    licenseNumber: "MD-TX-11111",
    licenseState: "TX",
    deaNumber: "BC1234567",
    kycDocumentPath: "",
    kycDocumentOriginalName: "",
    kycStatus: "pending_docs",
    kycReviewedBy: null,
    kycReviewedAt: null,
    kycRejectionReason: "",
    onboardingSteps: {
      profile_created: true,
      email_verified: true,
      profile_reviewed: true,
      docs_uploaded: false,
      first_patient: false,
      first_referral: false,
      colleague_invited: false
    },
    invitesSent: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "profile-4",
    userId: "user-5",
    npi: "2222222222",
    npiData: { npi: "2222222222", enumerationType: "NPI-1", firstName: "Robert", lastName: "Williams" },
    credential: "MD",
    specialty: "General Practice",
    taxonomyCode: "208D00000X",
    enumerationType: "NPI-1",
    organizationName: "Westside Family Medicine",
    gender: "M",
    phone: "303-555-0405",
    fax: "",
    address: { line1: "555 Family Way", line2: "", city: "Denver", state: "CO", zip: "80201" },
    licenseNumber: "MD-CO-22222",
    licenseState: "CO",
    deaNumber: "",
    kycDocumentPath: "",
    kycDocumentOriginalName: "",
    kycStatus: "verified",
    kycReviewedBy: "user-1",
    kycReviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    kycRejectionReason: "",
    onboardingSteps: {
      profile_created: true,
      email_verified: true,
      profile_reviewed: true,
      docs_uploaded: true,
      first_patient: true,
      first_referral: false,
      colleague_invited: true
    },
    invitesSent: [{ email: "colleague@example.com", sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  }
]);
console.log("Provider profiles created: " + (await db.collection('providerprofiles').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating appointmenttypes collection...");
await db.collection('appointmenttypes').insertMany([
  { code: 'new_patient', name: 'New Patient Consultation', description: 'First visit for new patients', defaultDurationMinutes: 60, color: '#2196F3', requiresPriorAuth: false, requiresReferral: false, telehealthEligible: true, bufferBeforeMinutes: 10, bufferAfterMinutes: 10, sortOrder: 0 },
  { code: 'follow_up', name: 'Follow-Up Visit', description: 'Return visit for established patients', defaultDurationMinutes: 30, color: '#4CAF50', requiresPriorAuth: false, requiresReferral: false, telehealthEligible: true, bufferBeforeMinutes: 5, bufferAfterMinutes: 5, sortOrder: 1 },
  { code: 'telehealth', name: 'Telehealth Visit', description: 'Virtual appointment via video', defaultDurationMinutes: 30, color: '#9C27B0', requiresPriorAuth: false, requiresReferral: false, telehealthEligible: true, bufferBeforeMinutes: 5, bufferAfterMinutes: 5, sortOrder: 2 },
  { code: 'urgent', name: 'Urgent Care Visit', description: 'Same-day urgent appointment', defaultDurationMinutes: 45, color: '#F44336', requiresPriorAuth: false, requiresReferral: false, telehealthEligible: false, bufferBeforeMinutes: 5, bufferAfterMinutes: 10, sortOrder: 3 },
  { code: 'procedure', name: 'Procedure / Treatment', description: 'In-office procedure or treatment', defaultDurationMinutes: 60, color: '#FF9800', requiresPriorAuth: true, requiresReferral: true, telehealthEligible: false, bufferBeforeMinutes: 15, bufferAfterMinutes: 15, sortOrder: 4 }
]);
console.log("Appointment types created: " + (await db.collection('appointmenttypes').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER SCHEDULES
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating providerschedules collection...");
var allTypeCodes = ['new_patient', 'follow_up', 'telehealth', 'urgent', 'procedure'];
var scheduleProviders = [
  { _id: 'user-2', name: 'Dr. John Smith', saturday: true },
  { _id: 'user-3', name: 'Nurse Sarah Johnson', saturday: true },
  { _id: 'user-4', name: 'Dr. Michael Chen', saturday: false },
  { _id: 'user-5', name: 'Dr. Robert Williams', saturday: false }
];
var providerSchedules = [];
scheduleProviders.forEach(function(prov) {
  for (var day = 1; day <= 5; day++) {
    providerSchedules.push({ providerId: prov._id, providerName: prov.name, dayOfWeek: day, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 16, appointmentTypes: allTypeCodes, isActive: true });
  }
  if (prov.saturday) {
    providerSchedules.push({ providerId: prov._id, providerName: prov.name, dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, bufferMinutes: 5, maxDailyAppointments: 8, appointmentTypes: allTypeCodes, isActive: true });
  }
});
await db.collection('providerschedules').insertMany(providerSchedules);
console.log("Provider schedules created: " + (await db.collection('providerschedules').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE EXCEPTIONS
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating scheduleexceptions collection...");
await db.collection('scheduleexceptions').insertMany([
  { providerId: 'user-2', providerName: 'Dr. John Smith', type: 'unavailable', reason: 'vacation', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), notes: 'Annual leave' },
  { providerId: 'user-2', providerName: 'Dr. John Smith', type: 'unavailable', reason: 'conference', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), notes: 'Medical conference' },
  { providerId: 'user-2', providerName: 'Dr. John Smith', type: 'extra_hours', date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), startTime: '07:00', endTime: '19:00', reason: 'other', notes: 'Extended hours' }
]);
console.log("Schedule exceptions created: " + (await db.collection('scheduleexceptions').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// WAITLIST ENTRIES
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating waitlistentries collection...");
await db.collection('waitlistentries').insertMany([
  { patientId: 'PT-100001', patientName: 'James Wilson', providerId: 'user-2', providerName: 'Dr. John Smith', appointmentType: 'new_patient', requestedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), flexibleDates: true, status: 'waiting', priority: 'normal', notes: 'Patient prefers morning appointments, Monday or Wednesday.', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100002', patientName: 'Emily Rodriguez', providerId: 'user-2', providerName: 'Dr. John Smith', appointmentType: 'follow_up', requestedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), flexibleDates: false, status: 'waiting', priority: 'high', notes: 'Post-discharge follow-up — needs earliest available slot.', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100003', patientName: 'Thomas Brown', providerId: 'user-3', providerName: 'Nurse Sarah Johnson', appointmentType: 'procedure', requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), flexibleDates: true, status: 'waiting', priority: 'normal', notes: 'Procedure requires prior authorization — patient has been notified to expect a 1-2 week wait.', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
]);
console.log("Waitlist entries created: " + (await db.collection('waitlistentries').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// AMBIENT SESSIONS (ACI - Ambient Clinical Intelligence)
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating ambientSessions collection...");
await db.collection('ambientSessions').insertMany([
  { sessionId: 'ACI-001', providerName: 'Dr. John Smith', patientId: 'PT-100001', patientName: 'James Wilson', patientDOB: new Date('1968-03-15'), patientInsurance: 'Blue Cross Blue Shield', chiefComplaint: 'Chest pain', recordingDuration: 210, urgencyClassification: 'urgent', audioTranscript: 'Patient James Wilson, 56-year-old male, presents with intermittent chest pain over the past three days. Pain is described as pressure-like, 6 out of 10, radiating to the left arm. No diaphoresis. No prior cardiac history. EKG performed in office shows no acute changes. Troponin pending. Vitals stable, BP 138/88, HR 84.', clinicalSummary: 'S: 56-year-old male with 3-day history of intermittent pressure-like chest pain, 6/10, radiating to left arm. No diaphoresis or syncope.\nO: BP 138/88, HR 84, RR 16, SpO2 98%. EKG: no acute ST changes. Troponin pending.\nA: Chest pain, etiology unclear — rule out ACS.\nP: Troponin follow-up, cardiology referral pending results.', status: 'draft', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-002', providerName: 'Dr. Sarah Chen', patientId: 'PT-100003', patientName: 'Thomas Brown', patientDOB: new Date('1975-07-22'), patientInsurance: 'Aetna', chiefComplaint: 'Chronic headaches', recordingDuration: 145, urgencyClassification: 'routine', audioTranscript: 'Patient Thomas Brown, 49-year-old male, reports chronic daily headaches for approximately 4 months. Pain is bifrontal, 5 out of 10, worse in the mornings. No visual aura. No nausea or vomiting. Taking OTC ibuprofen with partial relief. Neurological exam grossly intact. Sleep reported as poor.', clinicalSummary: 'S: 49-year-old male with 4-month history of chronic daily bifrontal headaches, 5/10, worse in mornings. OTC ibuprofen provides partial relief.\nO: Neuro exam intact. BP 124/78. No papilledema.\nA: Chronic daily headache, possible tension-type vs. medication overuse.\nP: Neurology referral for further evaluation.', status: 'draft', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-003', providerName: 'Dr. John Smith', patientId: 'PT-100002', patientName: 'Emily Rodriguez', patientDOB: new Date('1990-11-05'), patientInsurance: 'UnitedHealth', chiefComplaint: 'Blurred vision', recordingDuration: 185, urgencyClassification: 'urgent', audioTranscript: 'Patient Emily Rodriguez, 34-year-old female, presents with sudden onset blurred vision in the right eye, onset 48 hours ago. Denies pain. No floaters or flashes initially but reports a small shadow in peripheral vision since this morning. History of mild myopia. No prior ocular surgery.', clinicalSummary: 'S: 34-year-old female with 48-hour history of blurred vision right eye and new peripheral shadow. No pain.\nO: Visual acuity 20/200 right, 20/20 left. Fundoscopic exam limited without dilation. Pupils equal and reactive.\nA: Right eye visual disturbance, possible retinal pathology — urgent ophthalmology evaluation required.\nP: Same-day ophthalmology referral.', referralNoteDraft: 'Dear Ophthalmology Colleague,\n\nI am referring Ms. Emily Rodriguez, a 34-year-old female, for urgent evaluation of sudden-onset right eye blurred vision with peripheral shadow of 48-hour duration. Visual acuity is 20/200 OD. Given the acute presentation and concern for possible retinal detachment or other urgent retinal pathology, same-day or next-day evaluation is strongly recommended.\n\nThank you for your prompt attention.\n\nSincerely,\nDr. John Smith', urgencyReason: 'Acute visual loss with peripheral shadow raises concern for retinal detachment requiring same-day ophthalmology evaluation.', icdCodes: ['H53.10', 'H33.009', 'H52.10'], recommendedSpecialty: 'Ophthalmology', status: 'reviewing', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-004', providerName: 'Dr. John Smith', patientId: 'PT-100001', patientName: 'James Wilson', patientDOB: new Date('1968-03-15'), patientInsurance: 'Blue Cross Blue Shield', chiefComplaint: 'Shortness of breath', recordingDuration: 320, urgencyClassification: 'urgent', audioTranscript: 'Patient James Wilson returns with progressive shortness of breath on exertion over 2 weeks. Now limited to 1 flight of stairs. BNP elevated at 480. Echo ordered. History of hypertension, well controlled on lisinopril. No orthopnea. Mild bilateral ankle edema noted on exam. Crackles bilateral bases.', clinicalSummary: 'S: 56-year-old male with 2-week history of progressive dyspnea on exertion, now limited to 1 flight of stairs. Mild bilateral ankle edema.\nO: BP 142/90, HR 92, SpO2 94% on room air. Bilateral basal crackles. 1+ pitting edema ankles. BNP 480 pg/mL.\nA: New onset heart failure with reduced or preserved ejection fraction — cardiology referral warranted.\nP: Echo ordered, cardiology referral initiated, low-sodium diet counseling provided.', referralNoteDraft: 'Dear Cardiology Colleague,\n\nI am referring Mr. James Wilson, a 56-year-old male with hypertension, for evaluation of new onset heart failure. He presents with progressive exertional dyspnea, bilateral basal crackles, 1+ ankle edema, and an elevated BNP of 480 pg/mL. An echocardiogram has been ordered. Cardiology evaluation for management and further workup is requested.\n\nThank you,\nDr. John Smith', urgencyReason: 'Elevated BNP with clinical signs of heart failure requires urgent cardiology evaluation and echocardiogram.', icdCodes: ['I50.9', 'I10', 'R06.09'], recommendedSpecialty: 'Cardiology', status: 'approved', approvedNote: 'Dear Cardiology Colleague,\n\nI am referring Mr. James Wilson, a 56-year-old male with hypertension, for evaluation of new onset heart failure. He presents with progressive exertional dyspnea, bilateral basal crackles, 1+ ankle edema, and an elevated BNP of 480 pg/mL. An echocardiogram has been ordered. Cardiology evaluation for management and further workup is requested.\n\nThank you,\nDr. John Smith', reviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-005', providerName: 'Dr. Sarah Chen', patientId: 'PT-100004', patientName: 'Maria Garcia', patientDOB: new Date('1982-09-18'), patientInsurance: 'Cigna', chiefComplaint: 'Joint pain', recordingDuration: 265, urgencyClassification: 'routine', audioTranscript: 'Patient Maria Garcia, 43-year-old female, with 6-month history of symmetric polyarthritis involving MCPs, PIPs, and wrists bilaterally. Morning stiffness lasting over 2 hours. RF and anti-CCP both positive. ESR 68, CRP 3.2. Radiographs of hands ordered — no erosions yet. No current DMARDs.', clinicalSummary: 'S: 43-year-old female with 6-month symmetric polyarthritis — MCPs, PIPs, wrists bilaterally. Morning stiffness >2 hours.\nO: Tender and swollen MCPs/PIPs bilateral. RF positive, anti-CCP positive. ESR 68, CRP 3.2. Hand XR: no erosions.\nA: Seropositive rheumatoid arthritis, early disease.\nP: Rheumatology referral for DMARD initiation.', referralNoteDraft: 'Dear Rheumatology Colleague,\n\nI am referring Ms. Maria Garcia, a 43-year-old female, for evaluation and management of newly diagnosed seropositive rheumatoid arthritis.\n\nThank you,\nDr. Sarah Chen', urgencyReason: 'Early seropositive RA requires timely DMARD initiation to prevent joint destruction.', icdCodes: ['M05.79', 'M79.3', 'Z13.828'], recommendedSpecialty: 'Rheumatology', status: 'approved', reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-006', providerName: 'Dr. John Smith', patientId: 'PT-100005', patientName: 'David Lee', patientDOB: new Date('1955-01-30'), patientInsurance: 'Medicare', chiefComplaint: 'Type 2 diabetes management', recordingDuration: 480, urgencyClassification: 'routine', audioTranscript: 'Patient David Lee, 70-year-old male, established patient with type 2 diabetes. Last HbA1c 9.4% three months ago. Currently on metformin 1000mg twice daily and glipizide 10mg daily. Reports polyuria and polydipsia.', clinicalSummary: 'S: 70-year-old male with poorly controlled T2DM. HbA1c 9.4%. Polyuria and polydipsia. On metformin + glipizide.\nO: BP 148/92. BG 214 fasting. Fundoscopic: early NPDR bilateral. Microalbumin/Cr ratio elevated. Monofilament: decreased sensation bilateral feet.\nA: Poorly controlled T2DM with early diabetic nephropathy, retinopathy, and peripheral neuropathy.\nP: Endocrinology referral for regimen optimization.', referralNoteDraft: 'Dear Endocrinology Colleague,\n\nI am referring Mr. David Lee, a 70-year-old male, for optimization of his type 2 diabetes management. His most recent HbA1c is 9.4% despite metformin and glipizide.\n\nThank you,\nDr. John Smith', urgencyReason: 'Poorly controlled T2DM with multi-organ complications requires specialist optimization.', icdCodes: ['E11.65', 'E11.319', 'E11.40', 'N18.2'], recommendedSpecialty: 'Endocrinology', status: 'approved', reviewedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-007', providerName: 'Dr. John Smith', patientId: 'PT-100003', patientName: 'Thomas Brown', patientDOB: new Date('1975-07-22'), patientInsurance: 'Aetna', chiefComplaint: 'Abdominal pain', recordingDuration: 300, urgencyClassification: 'urgent', audioTranscript: 'Patient Thomas Brown returns with 3-week history of right upper quadrant abdominal pain, worse after fatty meals. One episode of jaundice noted by family last week. LFTs show elevated total bilirubin 2.8 and alkaline phosphatase 320. Ultrasound shows cholelithiasis with CBD dilation to 9mm.', clinicalSummary: 'S: 49-year-old male with 3-week RUQ colicky pain worsening post-fatty meals. Episode of jaundice reported.\nO: T 37.4, tenderness RUQ. Total bilirubin 2.8, ALP 320, ALT 88. US: cholelithiasis, CBD 9mm.\nA: Choledocholithiasis with obstructive jaundice pattern — GI/surgery referral indicated.\nP: GI referral for ERCP evaluation.', referralNoteDraft: 'Dear Gastroenterology Colleague,\n\nI am referring Mr. Thomas Brown, a 49-year-old male, for evaluation of likely choledocholithiasis.\n\nThank you,\nDr. John Smith', urgencyReason: 'Choledocholithiasis with obstructive jaundice pattern and CBD dilation requires timely ERCP evaluation.', icdCodes: ['K80.50', 'K83.1', 'R17'], recommendedSpecialty: 'Gastroenterology', status: 'approved', reviewedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-008', providerName: 'Dr. Sarah Chen', patientId: 'PT-100002', patientName: 'Emily Rodriguez', patientDOB: new Date('1990-11-05'), patientInsurance: 'UnitedHealth', chiefComplaint: 'Skin rash', recordingDuration: 120, urgencyClassification: 'routine', audioTranscript: 'Patient Emily Rodriguez with a 2-week pruritic rash on both forearms. Appears erythematous with well-demarcated borders. Started after using a new laundry detergent. Treated with topical hydrocortisone with minimal relief.', clinicalSummary: 'S: 34-year-old female with 2-week pruritic erythematous rash bilateral forearms following new detergent exposure.\nO: Well-demarcated erythematous plaques bilateral forearms. No systemic involvement.\nA: Allergic contact dermatitis.\nP: Switch to fragrance-free detergent, triamcinolone 0.1% ointment prescribed.', icdCodes: ['L23.7', 'L30.9'], recommendedSpecialty: 'Dermatology', status: 'rejected', reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-009', providerName: 'Dr. John Smith', patientId: 'PT-100005', patientName: 'David Lee', patientDOB: new Date('1955-01-30'), patientInsurance: 'Medicare', chiefComplaint: 'Hypertension follow-up', recordingDuration: 195, urgencyClassification: 'routine', audioTranscript: 'Patient David Lee follow-up for hypertension. Currently on lisinopril 20mg and amlodipine 10mg. BP today 162/98 despite maximal doses. Has been compliant with medications per refill records.', clinicalSummary: 'S: 70-year-old male with resistant hypertension. BP 162/98 on lisinopril 20mg and amlodipine 10mg at max doses.\nO: BP 162/98 bilateral arms. BMP: Cr 1.3, K 4.2. Echo: LVH.\nA: Resistant hypertension — secondary causes to be excluded.\nP: Nephrology referral.', icdCodes: ['I10', 'I51.7', 'N18.3'], recommendedSpecialty: 'Nephrology', status: 'submitted', reviewedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
  { sessionId: 'ACI-010', providerName: 'Dr. Sarah Chen', patientId: 'PT-100004', patientName: 'Maria Garcia', patientDOB: new Date('1982-09-18'), patientInsurance: 'Cigna', chiefComplaint: 'Knee injury', recordingDuration: 240, urgencyClassification: 'emergent', audioTranscript: 'Patient Maria Garcia presents with acute right knee injury sustained during recreational soccer 4 hours ago. Immediate swelling and inability to bear weight. Positive Lachman test and positive anterior drawer. McMurray test positive medial compartment. Radiograph rules out fracture.', clinicalSummary: 'S: 43-year-old female with acute right knee injury 4 hours ago during soccer. Immediate swelling, unable to bear weight.\nO: Significant knee effusion. Positive Lachman, positive anterior drawer, positive McMurray medial. XR: no fracture.\nA: Suspected ACL tear with concomitant medial meniscus injury.\nP: MRI right knee ordered, orthopedic referral same-day.', icdCodes: ['S83.511A', 'S83.201A', 'M23.200'], recommendedSpecialty: 'Orthopedic Surgery', status: 'submitted', reviewedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) }
]);
console.log("Ambient sessions created: " + (await db.collection('ambientSessions').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating notificationtemplates collection...");
await db.collection('notificationtemplates').insertMany([
  { name: 'Appointment Reminder', description: 'Reminds a patient of an upcoming scheduled appointment with date, time, and provider details.', type: 'appointment_reminder', subject: 'Reminder: Your Appointment on {{appointmentDate}}', body: 'Dear {{patientName}},\n\nThis is a friendly reminder that you have an upcoming appointment scheduled with {{providerName}} at {{clinicName}}.\n\nDate: {{appointmentDate}}\nTime: {{appointmentTime}}\nLocation: {{clinicAddress}}\n\nPlease arrive 15 minutes early. Call {{clinicPhone}} to reschedule.\n\n{{clinicName}} Care Team', smsBody: 'Reminder: Appt with {{providerName}} on {{appointmentDate}} at {{appointmentTime}}. Call {{clinicPhone}} to reschedule.', pushTitle: 'Upcoming Appointment Reminder', defaultChannels: ['email', 'sms', 'in_app'], variables: ['patientName', 'providerName', 'clinicName', 'appointmentDate', 'appointmentTime', 'clinicAddress', 'clinicPhone'], isActive: true, usageCount: 47, createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  { name: 'Referral Status Update', description: 'Notifies the patient when the status of a specialist referral has changed.', type: 'referral_update', subject: 'Update on Your Referral to {{specialistName}}', body: 'Dear {{patientName}},\n\nThere has been an update on your referral to {{specialistName}} at {{specialistClinic}}.\n\nReferral Status: {{referralStatus}}\n\nNext Steps:\n{{nextSteps}}\n\nIf you have any questions, please contact our office at {{clinicPhone}}.\n\nBest regards,\n{{sentByName}}\n{{clinicName}}', smsBody: 'Your referral to {{specialistName}} status: {{referralStatus}}. Questions? Call {{clinicPhone}}.', pushTitle: 'Referral Status Update', defaultChannels: ['email', 'in_app'], variables: ['patientName', 'specialistName', 'specialistClinic', 'referralStatus', 'referralNotes', 'nextSteps', 'clinicPhone', 'clinicName', 'sentByName'], isActive: true, usageCount: 23, createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
  { name: 'Prior Authorization Update', description: 'Informs the patient of a prior authorization approval, denial, or status change from their insurer.', type: 'prior_auth_update', subject: 'Prior Authorization Decision: {{serviceType}}', body: 'Dear {{patientName}},\n\nWe have received a decision from {{insurancePlan}} regarding the prior authorization request for {{serviceType}}.\n\nAuthorization Status: {{authStatus}}\nReference Number: {{authReferenceNumber}}\n\nIf you have questions, please do not hesitate to reach out.\n\nSincerely,\n{{sentByName}}\n{{clinicName}}', smsBody: 'PA Update: {{serviceType}} is {{authStatus}}. Ref: {{authReferenceNumber}}. Call {{clinicPhone}} for details.', pushTitle: 'Prior Auth Decision Received', defaultChannels: ['email', 'sms', 'in_app'], variables: ['patientName', 'insurancePlan', 'serviceType', 'authStatus', 'authReferenceNumber', 'effectiveDate', 'expiryDate', 'clinicPhone', 'clinicName', 'sentByName'], isActive: true, usageCount: 18, createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
  { name: 'Preventive Care Reminder', description: 'Alerts patients who are overdue for preventive screenings, vaccinations, or wellness visits.', type: 'care_gap', subject: 'Action Needed: You May Be Due for {{screeningType}}', body: 'Dear {{patientName}},\n\nOur records indicate you may be due for:\n  {{screeningType}}\n  Recommended Frequency: {{screeningFrequency}}\n  Last Completed: {{lastCompletedDate}}\n\nCall us at {{clinicPhone}} or visit our patient portal at {{portalUrl}} to schedule.\n\n{{clinicName}} Preventive Care Team', smsBody: 'Hi {{patientName}}, you may be due for {{screeningType}}. Call {{clinicPhone}} or visit {{portalUrl}} to schedule.', pushTitle: 'Preventive Care Reminder', defaultChannels: ['email', 'sms', 'push', 'in_app'], variables: ['patientName', 'screeningType', 'screeningFrequency', 'lastCompletedDate', 'screeningReason', 'clinicPhone', 'portalUrl', 'clinicName'], isActive: true, usageCount: 112, createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
  { name: 'General Health Update', description: 'A flexible template for general communications, health tips, or policy updates.', type: 'general', subject: '{{messageSubject}} — {{clinicName}}', body: 'Dear {{patientName}},\n\n{{messageBody}}\n\nIf you have any questions, contact our office at {{clinicPhone}} or send a message through the patient portal at {{portalUrl}}.\n\nSincerely,\n{{sentByName}}\n{{clinicName}}', smsBody: '{{clinicName}}: {{smsMessage}} Questions? Call {{clinicPhone}}.', pushTitle: '{{messageSubject}}', defaultChannels: ['in_app'], variables: ['patientName', 'messageSubject', 'messageBody', 'smsMessage', 'clinicPhone', 'portalUrl', 'clinicName', 'sentByName'], isActive: true, usageCount: 34, createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
  { name: 'Prescription Ready', description: 'Notifies a patient that their prescription is ready for pickup at the pharmacy.', type: 'prescription', subject: 'Your Prescription is Ready for Pickup', body: 'Dear {{patientName}},\n\nYour prescription is ready and waiting for you at the pharmacy.\n\nMedication: {{medicationName}}\nDosage: {{dosage}}\nPharmacy: {{pharmacyName}}\nAddress: {{pharmacyAddress}}\n\nPlease bring a valid photo ID when picking up.\n\nTake care,\n{{clinicName}}', smsBody: 'Rx Ready: {{medicationName}} is ready at {{pharmacyName}}. Pickup by {{prescriptionExpiryDate}}. ID required.', pushTitle: 'Prescription Ready for Pickup', defaultChannels: ['sms', 'push', 'in_app'], variables: ['patientName', 'medicationName', 'dosage', 'quantity', 'pharmacyName', 'pharmacyAddress', 'pharmacyPhone', 'prescriptionExpiryDate', 'clinicPhone', 'clinicName'], isActive: true, usageCount: 61, createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
]);
console.log("Notification templates created: " + (await db.collection('notificationtemplates').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating patientnotifications collection...");
await db.collection('patientnotifications').insertMany([
  { patientId: 'PT-100001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', patientPhone: '+1-555-0101', title: 'Appointment Reminder — Cardiology Follow-Up', message: 'Dear James Wilson, this is a reminder that you have an upcoming appointment with Dr. Sarah Chen at Metro Heart Institute on June 28, 2026 at 10:30 AM. Please arrive 15 minutes early. Call 555-0100 to reschedule.', type: 'appointment_reminder', priority: 'normal', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, sms: { sent: true, sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) } }, status: 'read', relatedType: 'appointment', sentByName: 'Admin User', sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100001', patientName: 'James Wilson', patientEmail: 'james.wilson@email.com', patientPhone: '+1-555-0101', title: 'Prior Authorization Approved — MRI Brain with Contrast', message: 'Dear James Wilson, your prior authorization for MRI Brain with Contrast has been approved by Blue Cross Blue Shield. Authorization Reference: PA-2026-0441. Valid through September 25, 2026. Please contact our office at 555-0100 to schedule your procedure.', type: 'prior_auth_update', priority: 'high', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, sms: { sent: true, sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) } }, status: 'read', relatedType: 'prior_auth', relatedId: 'PA-2026-0441', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100002', patientName: 'Emily Rodriguez', patientEmail: 'emily.rodriguez@email.com', patientPhone: '+1-555-0102', title: 'Preventive Care Reminder — Annual Mammogram Screening', message: 'Dear Emily Rodriguez, our records indicate you may be due for your Annual Mammogram Screening. Recommended annually for women aged 40+. Last completed: June 2025. Call 555-0100 or visit our portal to schedule.', type: 'care_gap', priority: 'normal', channels: ['email', 'push', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, push: { sent: true, sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, in_app: { sent: true, read: false } }, status: 'delivered', sentByName: 'Admin User', sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100002', patientName: 'Emily Rodriguez', patientEmail: 'emily.rodriguez@email.com', patientPhone: '+1-555-0102', title: 'Referral to Rheumatology — Status Update', message: 'Dear Emily Rodriguez, your referral to Dr. Patricia Moore at Rheumatology Specialists has been approved and the office will contact you within 3 business days to schedule. Questions? Reach us at 555-0100.', type: 'referral_update', priority: 'normal', channels: ['email', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) } }, status: 'read', relatedType: 'referral', relatedId: 'REF-2026-0118', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100003', patientName: 'Thomas Brown', patientEmail: 'thomas.brown@email.com', patientPhone: '+1-555-0103', title: 'Prescription Ready — Metformin 500mg', message: 'Dear Thomas Brown, your prescription for Metformin 500mg (90 tablets) is ready for pickup at City Pharmacy, 123 Main St. Bring a valid photo ID. Prescription expires July 25, 2026.', type: 'prescription', priority: 'normal', channels: ['sms', 'push', 'in_app'], channelStatus: { sms: { sent: true, sentAt: new Date(Date.now() - 18 * 60 * 60 * 1000) }, push: { sent: true, sentAt: new Date(Date.now() - 18 * 60 * 60 * 1000) }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 16 * 60 * 60 * 1000) } }, status: 'read', relatedType: 'prescription', relatedId: 'RX-2026-8834', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 18 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000) },
  { patientId: 'PT-100003', patientName: 'Thomas Brown', patientEmail: 'thomas.brown@email.com', patientPhone: '+1-555-0103', title: 'Prior Authorization Denied — PET Scan', message: 'Dear Thomas Brown, UnitedHealth has denied the prior authorization request for PET Scan. Reason: Additional clinical documentation required. You have the right to appeal within 30 days. Please call our office at 555-0100.', type: 'prior_auth_update', priority: 'high', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, sms: { sent: false, error: 'Carrier delivery failure' }, in_app: { sent: true, read: false } }, status: 'delivered', relatedType: 'prior_auth', relatedId: 'PA-2026-0389', sentByName: 'Admin User', sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100004', patientName: 'Maria Garcia', patientEmail: 'maria.garcia@email.com', patientPhone: '+1-555-0104', title: 'Appointment Reminder — Diabetes Management Check-In', message: 'Dear Maria Garcia, this is a reminder of your upcoming Diabetes Management appointment with Dr. Mike Johnson at Central Health Clinic on June 30, 2026 at 2:00 PM. Please fast for 8 hours before your appointment. Call 555-0100 with questions.', type: 'appointment_reminder', priority: 'normal', channels: ['email', 'sms'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }, sms: { sent: true, sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) } }, status: 'delivered', relatedType: 'appointment', sentByName: 'Admin User', sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100004', patientName: 'Maria Garcia', patientEmail: 'maria.garcia@email.com', patientPhone: '+1-555-0104', title: 'Preventive Care Reminder — HbA1c Screening Overdue', message: 'Dear Maria Garcia, our records show you are overdue for your HbA1c screening, recommended every 3 months for patients managing Type 2 Diabetes. Last completed: February 2026. Schedule today at 555-0100.', type: 'care_gap', priority: 'high', channels: ['email', 'sms', 'push', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, sms: { sent: true, sentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, push: { sent: true, sentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) } }, status: 'read', sentByName: 'Dr. Mike Johnson', sentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100005', patientName: 'David Lee', patientEmail: 'david.lee@email.com', patientPhone: '+1-555-0105', title: 'General Health Update — New Patient Portal Features', message: 'Dear David Lee, we are excited to share that our patient portal has been updated with new features including secure messaging, online prescription refill requests, and appointment self-scheduling.', type: 'general', priority: 'low', channels: ['email', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }, in_app: { sent: true, read: false } }, status: 'delivered', sentByName: 'Admin User', sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100005', patientName: 'David Lee', patientEmail: 'david.lee@email.com', patientPhone: '+1-555-0105', title: 'Referral Approved — Orthopedic Surgery Consultation', message: 'Dear David Lee, your referral to Dr. Alan Turner at Metro Orthopedic Center has been approved by your insurance. The specialist office will contact you within 5 business days. Referral ID: REF-2026-0203. Questions? Call 555-0100.', type: 'referral_update', priority: 'normal', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }, sms: { sent: true, sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, status: 'read', relatedType: 'referral', relatedId: 'REF-2026-0203', sentByName: 'Dr. Sarah Chen', sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100005', patientName: 'David Lee', patientEmail: 'david.lee@email.com', patientPhone: '+1-555-0105', title: 'Prescription Ready — Lisinopril 10mg', message: 'Dear David Lee, your prescription for Lisinopril 10mg (30 tablets) is ready at Central Pharmacy, 456 Oak Ave. Pickup hours: Mon-Sat 9 AM – 7 PM. Bring valid ID. Refills remaining: 5.', type: 'prescription', priority: 'normal', channels: ['sms', 'in_app'], channelStatus: { sms: { sent: false, error: 'Invalid phone number format' }, in_app: { sent: true, read: false } }, status: 'failed', relatedType: 'prescription', relatedId: 'RX-2026-9021', sentByName: 'Dr. John Smith', sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
  { patientId: 'PT-100003', patientName: 'Thomas Brown', patientEmail: 'thomas.brown@email.com', patientPhone: '+1-555-0103', title: 'Flu Vaccination Campaign — Schedule Your Shot Today', message: 'Dear Thomas Brown, flu season is here and we want to make sure you are protected. We are offering flu vaccinations during all clinic hours this month — no separate appointment needed. Walk-ins welcome. Call 555-0100 or book online.', type: 'campaign', priority: 'low', channels: ['email', 'sms', 'in_app'], channelStatus: { email: { sent: true, sentAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) }, sms: { sent: true, sentAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) }, in_app: { sent: true, read: true, readAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000) } }, status: 'read', sentByName: 'Admin User', sentAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), metadata: { campaignName: 'Flu Season Vaccination Reminder' } }
]);
console.log("Patient notifications created: " + (await db.collection('patientnotifications').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating notificationcampaigns collection...");
await db.collection('notificationcampaigns').insertMany([
  { name: 'Flu Season Vaccination Reminder', description: 'Outreach campaign to remind all active patients to schedule their annual flu vaccination before the peak season.', templateName: 'General Health Update', customSubject: 'Get Your Flu Shot — Protect Yourself This Season', customMessage: 'Flu season is here and we want to help you stay healthy. Flu vaccinations are now available during all clinic hours — walk-ins welcome, no separate appointment needed.', targetCriteria: { all: true, patientIds: [], conditions: [], insurancePlan: '' }, channels: ['email', 'sms'], status: 'completed', scheduledAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000), startedAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), stats: { totalTargeted: 1248, totalSent: 1242, totalDelivered: 1198, totalFailed: 44, totalRead: 874, openRate: 72.96 }, createdByName: 'Admin User', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
  { name: 'Annual Wellness Check — High-Risk Patients', description: 'Targeted campaign for patients with a risk score of 60 or above who have not completed their annual wellness visit.', templateName: 'Preventive Care Reminder', customSubject: 'Your Annual Wellness Visit is Overdue — Schedule Today', customMessage: 'As one of our high-priority patients, your annual wellness visit is an important part of managing your health. Please call us or use the patient portal to schedule.', targetCriteria: { all: false, patientIds: [], conditions: [], riskScoreMin: 60, insurancePlan: '' }, channels: ['email', 'sms', 'push'], status: 'completed', scheduledAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), startedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), stats: { totalTargeted: 312, totalSent: 312, totalDelivered: 298, totalFailed: 14, totalRead: 241, openRate: 80.87 }, createdByName: 'Dr. John Smith', createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) },
  { name: 'Diabetes Management Program', description: 'Educational and engagement campaign targeting patients diagnosed with Type 2 Diabetes.', templateName: 'Preventive Care Reminder', customSubject: 'Managing Type 2 Diabetes — Resources & Support From Our Team', customMessage: 'Living with Type 2 Diabetes can be challenging, but you do not have to do it alone. We are reaching out to share resources and let you know about our dedicated Diabetes Management Program.', targetCriteria: { all: false, patientIds: [], conditions: ['Type 2 Diabetes'], insurancePlan: '' }, channels: ['email', 'in_app'], status: 'draft', stats: { totalTargeted: 0, totalSent: 0, totalDelivered: 0, totalFailed: 0, totalRead: 0, openRate: 0 }, createdByName: 'Dr. Mike Johnson', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
]);
console.log("Notification campaigns created: " + (await db.collection('notificationcampaigns').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER MATCH PROFILES (Referral Matching)
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating providerMatchProfiles collection...");
await db.collection('providerMatchProfiles').insertMany([
  { providerId: new ObjectId(), providerName: 'Dr. James Hartwell', specialty: 'Cardiology', acceptedInsurance: ['Blue Cross Blue Shield', 'Medicare', 'Aetna', 'United Healthcare'], city: 'Boston', state: 'MA', acceptanceRate: 0.91, avgResponseTimeDays: 2, totalReferralsReceived: 420, completedReferrals: 382, tokenBalance: 1850, tokenEarned: 3200, availabilityScore: 88, yearsInPractice: 18, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Sandra Okafor', specialty: 'Cardiology', acceptedInsurance: ['Cigna', 'Humana', 'Anthem', 'Medicare', 'Medicaid'], city: 'Atlanta', state: 'GA', acceptanceRate: 0.85, avgResponseTimeDays: 3, totalReferralsReceived: 310, completedReferrals: 264, tokenBalance: 1100, tokenEarned: 2400, availabilityScore: 75, yearsInPractice: 12, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Michael Reyes', specialty: 'Cardiology', acceptedInsurance: ['United Healthcare', 'Blue Cross Blue Shield', 'WellCare', 'Kaiser Permanente'], city: 'Houston', state: 'TX', acceptanceRate: 0.94, avgResponseTimeDays: 1, totalReferralsReceived: 490, completedReferrals: 461, tokenBalance: 2450, tokenEarned: 4900, availabilityScore: 93, yearsInPractice: 22, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Priya Nambiar', specialty: 'Neurology', acceptedInsurance: ['Aetna', 'Blue Cross Blue Shield', 'Medicare', 'Cigna'], city: 'New York', state: 'NY', acceptanceRate: 0.88, avgResponseTimeDays: 2, totalReferralsReceived: 375, completedReferrals: 330, tokenBalance: 1620, tokenEarned: 3800, availabilityScore: 82, yearsInPractice: 15, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Thomas Bellamy', specialty: 'Neurology', acceptedInsurance: ['Humana', 'United Healthcare', 'Anthem', 'Medicaid'], city: 'Chicago', state: 'IL', acceptanceRate: 0.78, avgResponseTimeDays: 4, totalReferralsReceived: 210, completedReferrals: 164, tokenBalance: 740, tokenEarned: 1500, availabilityScore: 65, yearsInPractice: 8, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Rachel Cunningham', specialty: 'Orthopedics', acceptedInsurance: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'Medicare', 'WellCare'], city: 'Dallas', state: 'TX', acceptanceRate: 0.87, avgResponseTimeDays: 2, totalReferralsReceived: 460, completedReferrals: 400, tokenBalance: 2100, tokenEarned: 4200, availabilityScore: 85, yearsInPractice: 20, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Kevin Tran', specialty: 'Orthopedics', acceptedInsurance: ['Kaiser Permanente', 'United Healthcare', 'Humana'], city: 'Los Angeles', state: 'CA', acceptanceRate: 0.81, avgResponseTimeDays: 3, totalReferralsReceived: 280, completedReferrals: 227, tokenBalance: 950, tokenEarned: 2100, availabilityScore: 72, yearsInPractice: 10, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Angela Flores', specialty: 'Gastroenterology', acceptedInsurance: ['Medicare', 'Medicaid', 'Blue Cross Blue Shield', 'Aetna', 'Cigna'], city: 'Miami', state: 'FL', acceptanceRate: 0.90, avgResponseTimeDays: 2, totalReferralsReceived: 350, completedReferrals: 315, tokenBalance: 1780, tokenEarned: 3500, availabilityScore: 89, yearsInPractice: 16, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Nathan Pierce', specialty: 'Gastroenterology', acceptedInsurance: ['Anthem', 'United Healthcare', 'WellCare', 'Humana'], city: 'Phoenix', state: 'AZ', acceptanceRate: 0.76, avgResponseTimeDays: 5, totalReferralsReceived: 160, completedReferrals: 122, tokenBalance: 560, tokenEarned: 1100, availabilityScore: 61, yearsInPractice: 6, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Vivian Chen', specialty: 'Oncology', acceptedInsurance: ['Blue Cross Blue Shield', 'Medicare', 'Aetna', 'United Healthcare', 'Cigna', 'Anthem'], city: 'Boston', state: 'MA', acceptanceRate: 0.96, avgResponseTimeDays: 1, totalReferralsReceived: 500, completedReferrals: 480, tokenBalance: 2500, tokenEarned: 5000, availabilityScore: 95, yearsInPractice: 25, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Samuel Adeyemi', specialty: 'Pulmonology', acceptedInsurance: ['Medicare', 'Medicaid', 'Humana', 'WellCare'], city: 'Atlanta', state: 'GA', acceptanceRate: 0.83, avgResponseTimeDays: 3, totalReferralsReceived: 240, completedReferrals: 199, tokenBalance: 870, tokenEarned: 1900, availabilityScore: 78, yearsInPractice: 11, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Laura Steinberg', specialty: 'Rheumatology', acceptedInsurance: ['Cigna', 'Blue Cross Blue Shield', 'Aetna', 'Medicare'], city: 'Seattle', state: 'WA', acceptanceRate: 0.86, avgResponseTimeDays: 2, totalReferralsReceived: 195, completedReferrals: 168, tokenBalance: 1050, tokenEarned: 2200, availabilityScore: 80, yearsInPractice: 13, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Omar Hassan', specialty: 'Endocrinology', acceptedInsurance: ['United Healthcare', 'Aetna', 'Anthem', 'Medicare', 'Medicaid'], city: 'Chicago', state: 'IL', acceptanceRate: 0.89, avgResponseTimeDays: 2, totalReferralsReceived: 320, completedReferrals: 285, tokenBalance: 1400, tokenEarned: 3000, availabilityScore: 84, yearsInPractice: 14, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Jessica Park', specialty: 'Endocrinology', acceptedInsurance: ['Kaiser Permanente', 'Blue Cross Blue Shield', 'Cigna'], city: 'Los Angeles', state: 'CA', acceptanceRate: 0.80, avgResponseTimeDays: 4, totalReferralsReceived: 175, completedReferrals: 140, tokenBalance: 680, tokenEarned: 1400, availabilityScore: 69, yearsInPractice: 7, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Richard Nakamura', specialty: 'Ophthalmology', acceptedInsurance: ['Medicare', 'Blue Cross Blue Shield', 'Humana', 'United Healthcare', 'Aetna'], city: 'New York', state: 'NY', acceptanceRate: 0.93, avgResponseTimeDays: 2, totalReferralsReceived: 430, completedReferrals: 400, tokenBalance: 2050, tokenEarned: 4100, availabilityScore: 91, yearsInPractice: 21, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Monique Delacroix', specialty: 'Dermatology', acceptedInsurance: ['Cigna', 'Anthem', 'Blue Cross Blue Shield', 'Aetna'], city: 'Miami', state: 'FL', acceptanceRate: 0.84, avgResponseTimeDays: 3, totalReferralsReceived: 260, completedReferrals: 218, tokenBalance: 1200, tokenEarned: 2600, availabilityScore: 77, yearsInPractice: 9, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Anthony Morales', specialty: 'Nephrology', acceptedInsurance: ['Medicare', 'Medicaid', 'United Healthcare', 'WellCare', 'Humana'], city: 'Houston', state: 'TX', acceptanceRate: 0.92, avgResponseTimeDays: 1, totalReferralsReceived: 390, completedReferrals: 359, tokenBalance: 1950, tokenEarned: 4000, availabilityScore: 90, yearsInPractice: 19, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Claire Beaumont', specialty: 'Allergy', acceptedInsurance: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'Kaiser Permanente'], city: 'Seattle', state: 'WA', acceptanceRate: 0.74, avgResponseTimeDays: 4, totalReferralsReceived: 130, completedReferrals: 96, tokenBalance: 50, tokenEarned: 100, availabilityScore: 55, yearsInPractice: 5, telehealth: true },
  { providerId: new ObjectId(), providerName: 'Dr. Gregory Wallace', specialty: 'ENT', acceptedInsurance: ['Anthem', 'United Healthcare', 'Medicare', 'Blue Cross Blue Shield'], city: 'Dallas', state: 'TX', acceptanceRate: 0.82, avgResponseTimeDays: 3, totalReferralsReceived: 220, completedReferrals: 180, tokenBalance: 880, tokenEarned: 1800, availabilityScore: 74, yearsInPractice: 10, telehealth: false },
  { providerId: new ObjectId(), providerName: 'Dr. Amara Osei', specialty: 'Psychiatry', acceptedInsurance: ['Medicaid', 'Medicare', 'Cigna', 'Aetna', 'WellCare'], city: 'Phoenix', state: 'AZ', acceptanceRate: 0.79, avgResponseTimeDays: 4, totalReferralsReceived: 290, completedReferrals: 229, tokenBalance: 1030, tokenEarned: 2300, availabilityScore: 71, yearsInPractice: 12, telehealth: true }
]);
console.log("Provider match profiles created: " + (await db.collection('providerMatchProfiles').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// PRIOR AUTHORIZATIONS (John Smith — user-2, Cardiology)
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating priorauthorizations collection...");
await db.collection('priorauthorizations').insertMany([
  {
    patientId: "PT-100001", patientName: "James Wilson",
    requestingProviderId: "user-2", requestingProviderName: "Dr. John Smith",
    targetProviderName: "Radiology Associates",
    serviceType: "Cardiac MRI", serviceCode: "75561",
    diagnosisCodes: [
      { code: "I25.10", description: "Atherosclerotic heart disease of native coronary artery" },
      { code: "R00.0", description: "Tachycardia, unspecified" }
    ],
    clinicalNotes: "Patient presents with chest pain and palpitations. Echo shows EF 45%. Cardiac MRI needed for detailed assessment of myocardial viability and perfusion prior to potential intervention.",
    urgency: "Urgent", insurancePlan: "HealthPlus Insurance", memberId: "HP-987654321",
    status: "Pending",
    aiRecommendation: null, aiConfidenceScore: null, aiReasoning: "", aiAnalyzedAt: null,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    patientId: "PT-100002", patientName: "Emily Rodriguez",
    requestingProviderId: "user-2", requestingProviderName: "Dr. John Smith",
    targetProviderName: "Metro Nuclear Medicine",
    serviceType: "Nuclear Stress Test", serviceCode: "78451",
    diagnosisCodes: [
      { code: "I10", description: "Essential (primary) hypertension" },
      { code: "Z82.49", description: "Family history of ischemic heart disease" }
    ],
    clinicalNotes: "38-year-old female with hypertension and strong family history of CAD. Experiencing exertional dyspnea. Standard stress test inconclusive. Nuclear stress test requested for definitive perfusion evaluation.",
    urgency: "Routine", insurancePlan: "MediCare Plus", memberId: "MC-123456789",
    status: "Under Review",
    aiRecommendation: "Approve", aiConfidenceScore: 84,
    aiReasoning: "Patient presents with multiple CAD risk factors including hypertension and family history. Nuclear stress test is medically appropriate for further risk stratification. Clinical documentation supports medical necessity.",
    aiAnalyzedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
  },
  {
    patientId: "PT-100003", patientName: "Thomas Brown",
    requestingProviderId: "user-2", requestingProviderName: "Dr. John Smith",
    targetProviderName: "Advanced Imaging Center",
    serviceType: "Cardiac PET Scan", serviceCode: "78491",
    diagnosisCodes: [
      { code: "I25.10", description: "Atherosclerotic heart disease" },
      { code: "I50.32", description: "Chronic diastolic heart failure, moderate" }
    ],
    clinicalNotes: "61-year-old male with known CAD and diastolic HF. Prior CABG 2019. Progressive dyspnea. PET scan needed to assess hibernating myocardium before considering re-intervention.",
    urgency: "Urgent", insurancePlan: "Blue Shield", memberId: "BS-567891234",
    status: "Denied",
    aiRecommendation: "Deny", aiConfidenceScore: 71,
    aiReasoning: "While the patient has significant cardiac history, submitted documentation does not sufficiently establish that less intensive alternatives have been exhausted prior to PET imaging. Additional workup documentation is required.",
    aiAnalyzedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    reviewerNotes: "Insufficient documentation. Resubmit with recent stress test results and current echocardiogram report.",
    reviewedBy: "user-1", reviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    deniedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  },
  {
    patientId: "PT-100004", patientName: "Maria Garcia",
    requestingProviderId: "user-2", requestingProviderName: "Dr. John Smith",
    targetProviderName: "Metro Heart Institute Cath Lab",
    serviceType: "Cardiac Catheterization", serviceCode: "93454",
    diagnosisCodes: [
      { code: "I25.110", description: "Atherosclerotic heart disease with unstable angina pectoris" },
      { code: "R07.9", description: "Chest pain, unspecified" }
    ],
    clinicalNotes: "46-year-old female with Type 2 Diabetes and new onset unstable angina. Positive stress test. Cardiac catheterization indicated to define coronary anatomy and guide management.",
    urgency: "Urgent", insurancePlan: "Aetna Health", memberId: "AH-112233445",
    status: "Approved",
    aiRecommendation: "Approve", aiConfidenceScore: 92,
    aiReasoning: "Patient presents with unstable angina and positive stress test in the setting of diabetes. Cardiac catheterization meets medical necessity criteria for urgent evaluation of coronary anatomy.",
    aiAnalyzedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    reviewerNotes: "Approved. Procedure authorized. Valid for 90 days.",
    reviewedBy: "user-1", reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    approvedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 82 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  },
  {
    patientId: "PT-100005", patientName: "David Lee",
    requestingProviderId: "user-2", requestingProviderName: "Dr. John Smith",
    targetProviderName: "Metro Heart Institute EP Lab",
    serviceType: "Electrophysiology Study", serviceCode: "93619",
    diagnosisCodes: [
      { code: "I49.0", description: "Ventricular fibrillation and flutter" },
      { code: "I25.10", description: "Atherosclerotic heart disease of native coronary artery" }
    ],
    clinicalNotes: "71-year-old male with documented episodes of ventricular fibrillation and known CAD. EP study needed to guide ICD programming and ablation planning.",
    urgency: "Urgent", insurancePlan: "Medicare", memberId: "MC-998877665",
    status: "Appealing",
    aiRecommendation: "Review", aiConfidenceScore: 68,
    aiReasoning: "Patient has documented VF episodes which generally support EP study. However, submitted notes lack recent Holter monitor results and current medication list. Additional documentation would strengthen the case.",
    aiAnalyzedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    reviewerNotes: "Initially denied pending documentation of Holter results and specialist recommendation.",
    reviewedBy: "user-1", reviewedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    deniedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    appealNotes: "Resubmitting with 30-day Holter results confirming 3 VF episodes, current medication list, and EP consultant recommendation letter. Patient safety requires this procedure urgently.",
    appealSubmittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    patientId: "PT-100001", patientName: "James Wilson",
    requestingProviderId: "user-2", requestingProviderName: "Dr. John Smith",
    targetProviderName: "Cardiology Echo Lab",
    serviceType: "Transesophageal Echocardiogram", serviceCode: "93312",
    diagnosisCodes: [
      { code: "I34.0", description: "Nonrheumatic mitral valve regurgitation" },
      { code: "I48.2", description: "Chronic atrial fibrillation" }
    ],
    clinicalNotes: "Patient with known mitral regurgitation and new onset AFib. TEE needed to assess valve anatomy and exclude LA thrombus before cardioversion.",
    urgency: "Routine", insurancePlan: "HealthPlus Insurance", memberId: "HP-987654321",
    status: "Expired",
    aiRecommendation: "Approve", aiConfidenceScore: 89,
    aiReasoning: "TEE is the gold standard for assessing mitral valve morphology and excluding LA thrombus prior to cardioversion in patients with AFib. This request clearly meets medical necessity criteria.",
    aiAnalyzedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    reviewerNotes: "Approved. 90-day authorization window.",
    reviewedBy: "user-1", reviewedAt: new Date(Date.now() - 98 * 24 * 60 * 60 * 1000),
    approvedDate: new Date(Date.now() - 98 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  }
]);
console.log("Prior authorizations created: " + (await db.collection('priorauthorizations').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS (John Smith as provider — July 2026 upcoming)
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating appointments collection...");
await db.collection('appointments').insertMany([
  {
    appointmentId: "APT-2026-00001",
    patientId: "patient-1", patientName: "James Wilson",
    patientEmail: "james.wilson@example.com", patientPhone: "(555) 123-4567",
    providerId: "user-2", providerName: "Dr. John Smith", providerSpecialty: "Cardiology",
    organizationName: "Metro Heart Institute",
    appointmentType: "follow_up", status: "scheduled",
    scheduledDate: new Date(2026, 6, 21), startTime: "09:00", endTime: "09:30", durationMinutes: 30,
    location: "in_person",
    chiefComplaint: "Follow-up for hypertension management and cardiac monitoring",
    reasonForVisit: "Routine cardiology follow-up. Review BP logs and assess medication efficacy.",
    remindersSent: [], rescheduleHistory: [], tokenRewardIssued: false, followUpNeeded: false,
    createdBy: "provider",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  {
    appointmentId: "APT-2026-00002",
    patientId: "patient-2", patientName: "Emily Rodriguez",
    patientEmail: "emily.rodriguez@example.com", patientPhone: "(555) 234-5678",
    providerId: "user-2", providerName: "Dr. John Smith", providerSpecialty: "Cardiology",
    organizationName: "Metro Heart Institute",
    appointmentType: "new_patient", status: "confirmed",
    scheduledDate: new Date(2026, 6, 22), startTime: "10:30", endTime: "11:15", durationMinutes: 45,
    location: "in_person",
    chiefComplaint: "Cardiac evaluation — exertional chest discomfort and dyspnea",
    reasonForVisit: "New patient referral from PCP. Evaluate for suspected coronary artery disease.",
    notes: "Patient to bring prior ECG records and recent lab results.",
    remindersSent: [], rescheduleHistory: [], tokenRewardIssued: false, followUpNeeded: false,
    createdBy: "provider",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  {
    appointmentId: "APT-2026-00003",
    patientId: "patient-3", patientName: "Thomas Brown",
    patientEmail: "thomas.brown@example.com", patientPhone: "(555) 345-6789",
    providerId: "user-2", providerName: "Dr. John Smith", providerSpecialty: "Cardiology",
    organizationName: "Metro Heart Institute",
    appointmentType: "follow_up", status: "scheduled",
    scheduledDate: new Date(2026, 6, 24), startTime: "14:00", endTime: "14:30", durationMinutes: 30,
    location: "in_person",
    chiefComplaint: "Post-CABG follow-up and diastolic heart failure management",
    reasonForVisit: "Quarterly follow-up for chronic diastolic HF. Review NYHA class and optimize diuretic therapy.",
    remindersSent: [], rescheduleHistory: [], tokenRewardIssued: false, followUpNeeded: false,
    createdBy: "provider",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  },
  {
    appointmentId: "APT-2026-00004",
    patientId: "patient-4", patientName: "Maria Garcia",
    patientEmail: "maria.garcia@example.com", patientPhone: "(555) 456-7890",
    providerId: "user-2", providerName: "Dr. John Smith", providerSpecialty: "Cardiology",
    organizationName: "Metro Heart Institute",
    appointmentType: "follow_up", status: "confirmed",
    scheduledDate: new Date(2026, 6, 25), startTime: "11:00", endTime: "11:45", durationMinutes: 45,
    location: "in_person",
    chiefComplaint: "Post-catheterization follow-up and revascularization discussion",
    reasonForVisit: "Review cardiac catheterization results and discuss PCI vs. CABG options with patient.",
    notes: "Post-cath care instructions reviewed. Patient reports improved angina.",
    remindersSent: [], rescheduleHistory: [], tokenRewardIssued: false, followUpNeeded: false,
    createdBy: "provider",
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  },
  {
    appointmentId: "APT-2026-00005",
    patientId: "patient-5", patientName: "David Lee",
    patientEmail: "david.lee@example.com", patientPhone: "(555) 567-8901",
    providerId: "user-2", providerName: "Dr. John Smith", providerSpecialty: "Cardiology",
    organizationName: "Metro Heart Institute",
    appointmentType: "follow_up", status: "scheduled",
    scheduledDate: new Date(2026, 6, 28), startTime: "13:00", endTime: "13:30", durationMinutes: 30,
    location: "in_person",
    chiefComplaint: "VF management and EP study appeal review",
    reasonForVisit: "Urgent follow-up to review Holter results, discuss EP study authorization appeal, and assess ICD settings.",
    remindersSent: [], rescheduleHistory: [], tokenRewardIssued: false, followUpNeeded: false,
    createdBy: "provider",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    appointmentId: "APT-2026-00006",
    patientId: "patient-1", patientName: "James Wilson",
    patientEmail: "james.wilson@example.com", patientPhone: "(555) 123-4567",
    providerId: "user-2", providerName: "Dr. John Smith", providerSpecialty: "Cardiology",
    organizationName: "Metro Heart Institute",
    appointmentType: "telehealth", status: "scheduled",
    scheduledDate: new Date(2026, 6, 29), startTime: "15:30", endTime: "16:00", durationMinutes: 30,
    location: "telehealth",
    telehealthLink: "https://telehealth.clinictrustai.com/room/a1b2c3d4e5f67890",
    chiefComplaint: "Telehealth check-in — beta-blocker side effect review",
    reasonForVisit: "Patient reporting dizziness with new carvedilol dose. Telehealth consult to assess and adjust.",
    remindersSent: [], rescheduleHistory: [], tokenRewardIssued: false, followUpNeeded: false,
    createdBy: "provider",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    appointmentId: "APT-2026-00007",
    patientId: "patient-2", patientName: "Emily Rodriguez",
    patientEmail: "emily.rodriguez@example.com", patientPhone: "(555) 234-5678",
    providerId: "user-2", providerName: "Dr. John Smith", providerSpecialty: "Cardiology",
    organizationName: "Metro Heart Institute",
    appointmentType: "procedure", status: "scheduled",
    scheduledDate: new Date(2026, 6, 30), startTime: "08:00", endTime: "10:00", durationMinutes: 120,
    location: "in_person",
    chiefComplaint: "Nuclear Stress Test procedure",
    reasonForVisit: "Nuclear stress test per approved prior authorization (PA-2026). Assess myocardial perfusion.",
    linkedReferralId: "referral-1",
    notes: "NPO after midnight. Must be accompanied. Hold beta-blockers 24h prior. IV access required.",
    remindersSent: [], rescheduleHistory: [], tokenRewardIssued: false, followUpNeeded: false,
    createdBy: "provider",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    appointmentId: "APT-2026-00008",
    patientId: "patient-3", patientName: "Thomas Brown",
    patientEmail: "thomas.brown@example.com", patientPhone: "(555) 345-6789",
    providerId: "user-2", providerName: "Dr. John Smith", providerSpecialty: "Cardiology",
    organizationName: "Metro Heart Institute",
    appointmentType: "urgent", status: "confirmed",
    scheduledDate: new Date(2026, 6, 31), startTime: "09:00", endTime: "09:30", durationMinutes: 30,
    location: "in_person",
    chiefComplaint: "Acute onset shortness of breath and bilateral leg edema",
    reasonForVisit: "Patient called clinic with acute SOB and new bilateral pitting edema. Urgent slot for evaluation of possible acute HF decompensation.",
    notes: "Urgent. BNP and CXR orders pre-placed. Patient advised to restrict fluids.",
    remindersSent: [], rescheduleHistory: [], tokenRewardIssued: false, followUpNeeded: false,
    createdBy: "provider",
    createdAt: new Date(), updatedAt: new Date()
  }
]);
console.log("Appointments created: " + (await db.collection('appointments').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// DTx PROGRAMS — Respiratory & Neurology
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating dtxprograms collection...");
const dtxProgId1 = new ObjectId();
const dtxProgId2 = new ObjectId();
const dtxProgId3 = new ObjectId();
const dtxProgId4 = new ObjectId();
const dtxProgId5 = new ObjectId();
const dtxProgId6 = new ObjectId();

await db.collection('dtxprograms').insertMany([
  {
    _id: dtxProgId1,
    name: "BreathWell COPD Manager",
    vendor: "PulmoTech Solutions",
    category: "respiratory",
    description: "Comprehensive digital therapeutic for COPD patients combining real-time spirometry tracking, personalized breathing exercises, inhaler technique coaching, and AI-driven exacerbation risk prediction.",
    conditions: ["COPD", "Chronic Bronchitis", "Emphysema"],
    evidenceLevel: "fda_cleared",
    durationWeeks: 16,
    deliveryFormat: "app",
    contentTypes: ["breathing exercises", "spirometry logging", "inhaler technique coaching", "AI risk alerts"],
    highlights: ["FDA-cleared Class II device", "Reduces COPD exacerbations by 34%", "Integrates with Bluetooth spirometers", "Personalized action plans"],
    contraindications: ["Severe cognitive impairment", "Unable to use smartphone"],
    tokenReward: 20, isActive: true, prescriptionCount: 48, avgEngagementScore: 73
  },
  {
    _id: dtxProgId2,
    name: "AsthmaClear Pro",
    vendor: "AirWay Digital Health",
    category: "respiratory",
    description: "AI-driven asthma management platform tracking symptoms, peak flow, and environmental triggers, with step-up/step-down therapy guidance aligned to GINA 2025 guidelines.",
    conditions: ["Asthma", "Allergic Asthma", "Exercise-Induced Bronchoconstriction"],
    evidenceLevel: "fda_authorized",
    durationWeeks: 12,
    deliveryFormat: "both",
    contentTypes: ["symptom tracker", "peak flow monitoring", "trigger alerts", "medication reminders", "GINA-based care plans"],
    highlights: ["FDA-authorized", "GINA 2025 aligned", "Reduces ER visits by 42%", "Real-time air quality integration"],
    contraindications: ["Severe uncontrolled asthma requiring ICU care"],
    tokenReward: 15, isActive: true, prescriptionCount: 92, avgEngagementScore: 81
  },
  {
    _id: dtxProgId3,
    name: "PulmoRehab Connect",
    vendor: "RespiCare Innovations",
    category: "respiratory",
    description: "Digital pulmonary rehabilitation program with structured exercise training, education modules, nutritional guidance, and psychosocial support — designed for patients unable to attend in-person PR programs.",
    conditions: ["COPD", "Pulmonary Fibrosis", "Post-COVID Respiratory Syndrome", "Interstitial Lung Disease"],
    evidenceLevel: "peer_reviewed",
    durationWeeks: 8,
    deliveryFormat: "hybrid",
    contentTypes: ["video exercise sessions", "education modules", "nutritional coaching", "weekly provider check-ins"],
    highlights: ["Equivalent outcomes to in-person PR", "Covers rural and homebound patients", "Avg 6MWT improvement 18%", "Peer-reviewed in AJRCCM"],
    contraindications: ["O2 dependent > 4 L/min at rest", "Unstable cardiac comorbidity"],
    tokenReward: 18, isActive: true, prescriptionCount: 31, avgEngagementScore: 67
  },
  {
    _id: dtxProgId4,
    name: "NeuroBalance Migraine",
    vendor: "Cognify Health",
    category: "neurology",
    description: "Evidence-based digital therapeutic for chronic migraine combining headache diary logging, biofeedback, CBT modules, and ML-powered trigger identification to reduce monthly migraine frequency.",
    conditions: ["Chronic Migraine", "Episodic Migraine", "Tension-Type Headache"],
    evidenceLevel: "fda_cleared",
    durationWeeks: 20,
    deliveryFormat: "app",
    contentTypes: ["headache diary", "biofeedback exercises", "CBT modules", "trigger analysis", "medication tracking"],
    highlights: ["FDA-cleared for migraine prevention", "50% reduction in monthly headache days", "Validated biofeedback technology", "No systemic side effects"],
    contraindications: ["Secondary headache disorder undiagnosed", "Active psychiatric crisis"],
    tokenReward: 22, isActive: true, prescriptionCount: 65, avgEngagementScore: 78
  },
  {
    _id: dtxProgId5,
    name: "CogniPath Rehab",
    vendor: "MindBridge Digital Therapeutics",
    category: "neurology",
    description: "Adaptive cognitive rehabilitation platform for acquired brain injury, stroke, and mild cognitive impairment — using gamified exercises targeting attention, memory, processing speed, and executive function.",
    conditions: ["Mild Cognitive Impairment", "Post-Stroke Cognitive Deficits", "Traumatic Brain Injury", "Early-Stage Alzheimer's Disease"],
    evidenceLevel: "clinical_study",
    durationWeeks: 24,
    deliveryFormat: "both",
    contentTypes: ["adaptive cognitive exercises", "progress dashboards", "caregiver tools", "clinician outcome reports"],
    highlights: ["Validated in 3 RCTs", "Adaptive difficulty algorithm", "Caregiver integration portal", "HIPAA-compliant data sharing"],
    contraindications: ["Severe aphasia preventing program interaction", "Moderate-to-severe dementia"],
    tokenReward: 25, isActive: true, prescriptionCount: 39, avgEngagementScore: 72
  },
  {
    _id: dtxProgId6,
    name: "ParkinsonsCompanion",
    vendor: "NeuroTrack Systems",
    category: "neurology",
    description: "Holistic digital therapeutic for Parkinson's disease combining wearable-based tremor and gait analysis, medication adherence tracking, voice and motor exercises, and a caregiver communication dashboard.",
    conditions: ["Parkinson's Disease", "Parkinsonism", "Essential Tremor"],
    evidenceLevel: "fda_authorized",
    durationWeeks: 52,
    deliveryFormat: "hybrid",
    contentTypes: ["wearable sensor integration", "gait analysis", "medication tracker", "voice exercises", "caregiver dashboard"],
    highlights: ["FDA-authorized", "Integrates with Apple Watch & Fitbit", "UPDRS score improvement 22%", "Reduces caregiver burden"],
    contraindications: ["Unable to use wearable device", "Advanced PD Hoehn & Yahr Stage 5"],
    tokenReward: 30, isActive: true, prescriptionCount: 27, avgEngagementScore: 69
  }
]);
console.log("DTx programs created: " + (await db.collection('dtxprograms').countDocuments()));

// ═══════════════════════════════════════════════════════════════════════════
// DTx PRESCRIPTIONS — All statuses (John Smith — user-2)
// ═══════════════════════════════════════════════════════════════════════════
console.log("Creating dtxprescriptions collection...");
await db.collection('dtxprescriptions').insertMany([
  {
    programId: dtxProgId2, programName: "AsthmaClear Pro",
    programVendor: "AirWay Digital Health", programCategory: "respiratory",
    providerId: "user-2", providerName: "Dr. John Smith",
    patientName: "Emily Rodriguez", patientId: "patient-2",
    patientEmail: "emily.rodriguez@example.com", patientPhone: "(555) 234-5678",
    status: "prescribed",
    clinicalNotes: "Patient with new asthma exacerbations triggered by seasonal allergens. Prescribing AsthmaClear Pro as adjunct to GINA step-up therapy and to improve self-management between visits.",
    statusHistory: [{ status: "prescribed", changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), notes: "Initial prescription issued" }],
    prescribedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    tokenRewardIssued: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    programId: dtxProgId1, programName: "BreathWell COPD Manager",
    programVendor: "PulmoTech Solutions", programCategory: "respiratory",
    providerId: "user-2", providerName: "Dr. John Smith",
    patientName: "David Lee", patientId: "patient-5",
    patientEmail: "david.lee@example.com", patientPhone: "(555) 567-8901",
    status: "enrolled",
    clinicalNotes: "71-year-old with COPD and cardiac comorbidities. Enrolled in BreathWell to reduce exacerbation frequency and improve inhaler technique compliance.",
    statusHistory: [
      { status: "prescribed", changedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), notes: "Initial prescription issued" },
      { status: "enrolled", changedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), notes: "Patient completed onboarding and linked Bluetooth spirometer" }
    ],
    prescribedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    enrolledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    tokenRewardIssued: false,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    programId: dtxProgId4, programName: "NeuroBalance Migraine",
    programVendor: "Cognify Health", programCategory: "neurology",
    providerId: "user-2", providerName: "Dr. John Smith",
    patientName: "Maria Garcia", patientId: "patient-4",
    patientEmail: "maria.garcia@example.com", patientPhone: "(555) 456-7890",
    status: "active",
    clinicalNotes: "Patient with 15+ headache days/month. Pharmacological therapy partially effective. NeuroBalance prescribed as adjunct for headache prevention and trigger identification.",
    engagementScore: 76,
    statusHistory: [
      { status: "prescribed", changedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), notes: "Prescribed as adjunct to topiramate therapy" },
      { status: "enrolled", changedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), notes: "Patient completed setup and completed first CBT module" },
      { status: "active", changedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), notes: "Actively using daily. Headache frequency down from 15 to 9 days/month at week 2 review" }
    ],
    prescribedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    enrolledAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    tokenRewardIssued: false,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    programId: dtxProgId3, programName: "PulmoRehab Connect",
    programVendor: "RespiCare Innovations", programCategory: "respiratory",
    providerId: "user-2", providerName: "Dr. John Smith",
    patientName: "James Wilson", patientId: "patient-1",
    patientEmail: "james.wilson@example.com", patientPhone: "(555) 123-4567",
    status: "completed",
    clinicalNotes: "Patient completed 8-week digital pulmonary rehab following hospital admission for AECOPD. Excellent engagement and significant functional improvement documented.",
    engagementScore: 91,
    outcomeNotes: "8-week program fully completed. 6MWT improved from 340m to 412m (+21%). SGRQ quality-of-life score improved 18 points. Inhaler use reduced. Patient reports significantly improved exertional tolerance.",
    statusHistory: [
      { status: "prescribed", changedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000), notes: "Prescribed post-AECOPD hospitalization" },
      { status: "enrolled", changedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000), notes: "Patient enrolled and completed orientation" },
      { status: "active", changedAt: new Date(Date.now() - 63 * 24 * 60 * 60 * 1000), notes: "Week 1 completed. High engagement." },
      { status: "completed", changedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), notes: "All 8 weeks completed with excellent outcomes" }
    ],
    prescribedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
    enrolledAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
    tokenRewardIssued: true, tokenRewardAmount: 18,
    createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000)
  },
  {
    programId: dtxProgId5, programName: "CogniPath Rehab",
    programVendor: "MindBridge Digital Therapeutics", programCategory: "neurology",
    providerId: "user-2", providerName: "Dr. John Smith",
    patientName: "Thomas Brown", patientId: "patient-3",
    patientEmail: "thomas.brown@example.com", patientPhone: "(555) 345-6789",
    status: "dropped",
    clinicalNotes: "Post-stroke mild cognitive impairment. CogniPath prescribed for cognitive rehab targeting attention and memory deficits.",
    engagementScore: 34,
    outcomeNotes: "Patient engaged for first 2 weeks then discontinued. Reported difficulty using interface independently. Caregiver unable to provide consistent support. Dropped at week 3 due to usability and support barriers. Recommend revisiting with tablet-based interface and caregiver training.",
    statusHistory: [
      { status: "prescribed", changedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), notes: "Prescribed for post-stroke cognitive rehab" },
      { status: "enrolled", changedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), notes: "Patient enrolled with daughter's assistance" },
      { status: "active", changedAt: new Date(Date.now() - 46 * 24 * 60 * 60 * 1000), notes: "Initial engagement moderate, completing 2-3 sessions/week" },
      { status: "dropped", changedAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000), notes: "Patient unable to continue. Usability barriers and insufficient caregiver support." }
    ],
    prescribedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
    enrolledAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
    droppedAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
    tokenRewardIssued: false,
    createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), updatedAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000)
  }
]);
console.log("DTx prescriptions created: " + (await db.collection('dtxprescriptions').countDocuments()));

  console.log('\nDatabase population complete!');
  const collections = await db.listCollections().toArray();
  const names = collections.map(c => c.name).sort();
  for (const name of names) {
    const count = await db.collection(name).countDocuments();
    console.log(` - ${name}: ${count} documents`);
  }

  await mongoose.disconnect();
  console.log('\nDone. Connection closed.');
}

main().catch(err => {
  console.error('populate_db failed:', err.message);
  process.exit(1);
});