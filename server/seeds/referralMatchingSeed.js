const ProviderMatchProfile = require('../models/ProviderMatchProfile');

const providerProfiles = [
  // ── Cardiology (3) ────────────────────────────────────────────────────────
  {
    providerName: 'Dr. James Hartwell',
    specialty: 'Cardiology',
    acceptedInsurance: ['Blue Cross Blue Shield', 'Medicare', 'Aetna', 'United Healthcare'],
    city: 'Boston',
    state: 'MA',
    acceptanceRate: 0.91,
    avgResponseTimeDays: 2,
    totalReferralsReceived: 420,
    completedReferrals: 382,
    tokenBalance: 1850,
    tokenEarned: 3200,
    availabilityScore: 88,
    yearsInPractice: 18,
    telehealth: false
  },
  {
    providerName: 'Dr. Sandra Okafor',
    specialty: 'Cardiology',
    acceptedInsurance: ['Cigna', 'Humana', 'Anthem', 'Medicare', 'Medicaid'],
    city: 'Atlanta',
    state: 'GA',
    acceptanceRate: 0.85,
    avgResponseTimeDays: 3,
    totalReferralsReceived: 310,
    completedReferrals: 264,
    tokenBalance: 1100,
    tokenEarned: 2400,
    availabilityScore: 75,
    yearsInPractice: 12,
    telehealth: true
  },
  {
    providerName: 'Dr. Michael Reyes',
    specialty: 'Cardiology',
    acceptedInsurance: ['United Healthcare', 'Blue Cross Blue Shield', 'WellCare', 'Kaiser Permanente'],
    city: 'Houston',
    state: 'TX',
    acceptanceRate: 0.94,
    avgResponseTimeDays: 1,
    totalReferralsReceived: 490,
    completedReferrals: 461,
    tokenBalance: 2450,
    tokenEarned: 4900,
    availabilityScore: 93,
    yearsInPractice: 22,
    telehealth: false
  },
  // ── Neurology (2) ─────────────────────────────────────────────────────────
  {
    providerName: 'Dr. Priya Nambiar',
    specialty: 'Neurology',
    acceptedInsurance: ['Aetna', 'Blue Cross Blue Shield', 'Medicare', 'Cigna'],
    city: 'New York',
    state: 'NY',
    acceptanceRate: 0.88,
    avgResponseTimeDays: 2,
    totalReferralsReceived: 375,
    completedReferrals: 330,
    tokenBalance: 1620,
    tokenEarned: 3800,
    availabilityScore: 82,
    yearsInPractice: 15,
    telehealth: true
  },
  {
    providerName: 'Dr. Thomas Bellamy',
    specialty: 'Neurology',
    acceptedInsurance: ['Humana', 'United Healthcare', 'Anthem', 'Medicaid'],
    city: 'Chicago',
    state: 'IL',
    acceptanceRate: 0.78,
    avgResponseTimeDays: 4,
    totalReferralsReceived: 210,
    completedReferrals: 164,
    tokenBalance: 740,
    tokenEarned: 1500,
    availabilityScore: 65,
    yearsInPractice: 8,
    telehealth: false
  },
  // ── Orthopedics (2) ───────────────────────────────────────────────────────
  {
    providerName: 'Dr. Rachel Cunningham',
    specialty: 'Orthopedics',
    acceptedInsurance: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'Medicare', 'WellCare'],
    city: 'Dallas',
    state: 'TX',
    acceptanceRate: 0.87,
    avgResponseTimeDays: 2,
    totalReferralsReceived: 460,
    completedReferrals: 400,
    tokenBalance: 2100,
    tokenEarned: 4200,
    availabilityScore: 85,
    yearsInPractice: 20,
    telehealth: false
  },
  {
    providerName: 'Dr. Kevin Tran',
    specialty: 'Orthopedics',
    acceptedInsurance: ['Kaiser Permanente', 'United Healthcare', 'Humana'],
    city: 'Los Angeles',
    state: 'CA',
    acceptanceRate: 0.81,
    avgResponseTimeDays: 3,
    totalReferralsReceived: 280,
    completedReferrals: 227,
    tokenBalance: 950,
    tokenEarned: 2100,
    availabilityScore: 72,
    yearsInPractice: 10,
    telehealth: true
  },
  // ── Gastroenterology (2) ──────────────────────────────────────────────────
  {
    providerName: 'Dr. Angela Flores',
    specialty: 'Gastroenterology',
    acceptedInsurance: ['Medicare', 'Medicaid', 'Blue Cross Blue Shield', 'Aetna', 'Cigna'],
    city: 'Miami',
    state: 'FL',
    acceptanceRate: 0.90,
    avgResponseTimeDays: 2,
    totalReferralsReceived: 350,
    completedReferrals: 315,
    tokenBalance: 1780,
    tokenEarned: 3500,
    availabilityScore: 89,
    yearsInPractice: 16,
    telehealth: false
  },
  {
    providerName: 'Dr. Nathan Pierce',
    specialty: 'Gastroenterology',
    acceptedInsurance: ['Anthem', 'United Healthcare', 'WellCare', 'Humana'],
    city: 'Phoenix',
    state: 'AZ',
    acceptanceRate: 0.76,
    avgResponseTimeDays: 5,
    totalReferralsReceived: 160,
    completedReferrals: 122,
    tokenBalance: 560,
    tokenEarned: 1100,
    availabilityScore: 61,
    yearsInPractice: 6,
    telehealth: true
  },
  // ── Oncology (1) ──────────────────────────────────────────────────────────
  {
    providerName: 'Dr. Vivian Chen',
    specialty: 'Oncology',
    acceptedInsurance: ['Blue Cross Blue Shield', 'Medicare', 'Aetna', 'United Healthcare', 'Cigna', 'Anthem'],
    city: 'Boston',
    state: 'MA',
    acceptanceRate: 0.96,
    avgResponseTimeDays: 1,
    totalReferralsReceived: 500,
    completedReferrals: 480,
    tokenBalance: 2500,
    tokenEarned: 5000,
    availabilityScore: 95,
    yearsInPractice: 25,
    telehealth: false
  },
  // ── Pulmonology (1) ───────────────────────────────────────────────────────
  {
    providerName: 'Dr. Samuel Adeyemi',
    specialty: 'Pulmonology',
    acceptedInsurance: ['Medicare', 'Medicaid', 'Humana', 'WellCare'],
    city: 'Atlanta',
    state: 'GA',
    acceptanceRate: 0.83,
    avgResponseTimeDays: 3,
    totalReferralsReceived: 240,
    completedReferrals: 199,
    tokenBalance: 870,
    tokenEarned: 1900,
    availabilityScore: 78,
    yearsInPractice: 11,
    telehealth: true
  },
  // ── Rheumatology (1) ──────────────────────────────────────────────────────
  {
    providerName: 'Dr. Laura Steinberg',
    specialty: 'Rheumatology',
    acceptedInsurance: ['Cigna', 'Blue Cross Blue Shield', 'Aetna', 'Medicare'],
    city: 'Seattle',
    state: 'WA',
    acceptanceRate: 0.86,
    avgResponseTimeDays: 2,
    totalReferralsReceived: 195,
    completedReferrals: 168,
    tokenBalance: 1050,
    tokenEarned: 2200,
    availabilityScore: 80,
    yearsInPractice: 13,
    telehealth: true
  },
  // ── Endocrinology (2) ─────────────────────────────────────────────────────
  {
    providerName: 'Dr. Omar Hassan',
    specialty: 'Endocrinology',
    acceptedInsurance: ['United Healthcare', 'Aetna', 'Anthem', 'Medicare', 'Medicaid'],
    city: 'Chicago',
    state: 'IL',
    acceptanceRate: 0.89,
    avgResponseTimeDays: 2,
    totalReferralsReceived: 320,
    completedReferrals: 285,
    tokenBalance: 1400,
    tokenEarned: 3000,
    availabilityScore: 84,
    yearsInPractice: 14,
    telehealth: false
  },
  {
    providerName: 'Dr. Jessica Park',
    specialty: 'Endocrinology',
    acceptedInsurance: ['Kaiser Permanente', 'Blue Cross Blue Shield', 'Cigna'],
    city: 'Los Angeles',
    state: 'CA',
    acceptanceRate: 0.80,
    avgResponseTimeDays: 4,
    totalReferralsReceived: 175,
    completedReferrals: 140,
    tokenBalance: 680,
    tokenEarned: 1400,
    availabilityScore: 69,
    yearsInPractice: 7,
    telehealth: true
  },
  // ── Ophthalmology (1) ─────────────────────────────────────────────────────
  {
    providerName: 'Dr. Richard Nakamura',
    specialty: 'Ophthalmology',
    acceptedInsurance: ['Medicare', 'Blue Cross Blue Shield', 'Humana', 'United Healthcare', 'Aetna'],
    city: 'New York',
    state: 'NY',
    acceptanceRate: 0.93,
    avgResponseTimeDays: 2,
    totalReferralsReceived: 430,
    completedReferrals: 400,
    tokenBalance: 2050,
    tokenEarned: 4100,
    availabilityScore: 91,
    yearsInPractice: 21,
    telehealth: false
  },
  // ── Dermatology (1) ───────────────────────────────────────────────────────
  {
    providerName: 'Dr. Monique Delacroix',
    specialty: 'Dermatology',
    acceptedInsurance: ['Cigna', 'Anthem', 'Blue Cross Blue Shield', 'Aetna'],
    city: 'Miami',
    state: 'FL',
    acceptanceRate: 0.84,
    avgResponseTimeDays: 3,
    totalReferralsReceived: 260,
    completedReferrals: 218,
    tokenBalance: 1200,
    tokenEarned: 2600,
    availabilityScore: 77,
    yearsInPractice: 9,
    telehealth: true
  },
  // ── Nephrology (1) ────────────────────────────────────────────────────────
  {
    providerName: 'Dr. Anthony Morales',
    specialty: 'Nephrology',
    acceptedInsurance: ['Medicare', 'Medicaid', 'United Healthcare', 'WellCare', 'Humana'],
    city: 'Houston',
    state: 'TX',
    acceptanceRate: 0.92,
    avgResponseTimeDays: 1,
    totalReferralsReceived: 390,
    completedReferrals: 359,
    tokenBalance: 1950,
    tokenEarned: 4000,
    availabilityScore: 90,
    yearsInPractice: 19,
    telehealth: false
  },
  // ── Allergy (1) ───────────────────────────────────────────────────────────
  {
    providerName: 'Dr. Claire Beaumont',
    specialty: 'Allergy',
    acceptedInsurance: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'Kaiser Permanente'],
    city: 'Seattle',
    state: 'WA',
    acceptanceRate: 0.74,
    avgResponseTimeDays: 4,
    totalReferralsReceived: 130,
    completedReferrals: 96,
    tokenBalance: 50,
    tokenEarned: 100,
    availabilityScore: 55,
    yearsInPractice: 5,
    telehealth: true
  },
  // ── ENT (1) ───────────────────────────────────────────────────────────────
  {
    providerName: 'Dr. Gregory Wallace',
    specialty: 'ENT',
    acceptedInsurance: ['Anthem', 'United Healthcare', 'Medicare', 'Blue Cross Blue Shield'],
    city: 'Dallas',
    state: 'TX',
    acceptanceRate: 0.82,
    avgResponseTimeDays: 3,
    totalReferralsReceived: 220,
    completedReferrals: 180,
    tokenBalance: 880,
    tokenEarned: 1800,
    availabilityScore: 74,
    yearsInPractice: 10,
    telehealth: false
  },
  // ── Psychiatry (1) ────────────────────────────────────────────────────────
  {
    providerName: 'Dr. Amara Osei',
    specialty: 'Psychiatry',
    acceptedInsurance: ['Medicaid', 'Medicare', 'Cigna', 'Aetna', 'WellCare'],
    city: 'Phoenix',
    state: 'AZ',
    acceptanceRate: 0.79,
    avgResponseTimeDays: 4,
    totalReferralsReceived: 290,
    completedReferrals: 229,
    tokenBalance: 1030,
    tokenEarned: 2300,
    availabilityScore: 71,
    yearsInPractice: 12,
    telehealth: true
  }
];

async function seedReferralMatchingProfiles() {
  try {
    const count = await ProviderMatchProfile.countDocuments();
    if (count > 0) {
      console.log(`ProviderMatchProfile collection already has ${count} records — skipping seed.`);
      return;
    }
    await ProviderMatchProfile.insertMany(providerProfiles);
    console.log(`ProviderMatchProfile: seeded ${providerProfiles.length} sample records.`);
  } catch (err) {
    console.error('ProviderMatchProfile seed error:', err.message);
  }
}

module.exports = { seedReferralMatchingProfiles };
