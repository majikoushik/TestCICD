// MongoDB script to populate database with mock data
// Save this as populate_db.js and run with: mongo populate_db.js

// Connect to database (update with your connection details)
// If you're using MongoDB Atlas, you'll need to use a connection string instead
const dbName = "clinictrustai";
db = db.getSiblingDB(dbName);

// Clear existing collections to avoid duplicates
db.users.drop();
db.patients.drop();
db.referrals.drop();
db.analytics.drop();
db.tokenTransactions.drop();
db.tokenServices.drop();
db.tokenEarnSources.drop();
db.medicalRecords.drop();
db.consentRecords.drop();
db.systemStatus.drop();
db.settings.drop();
db.activities.drop();
db.broadcastMessages.drop();
db.targetedAlerts.drop();
db.escalationWorkflows.drop();
db.adminSettings.drop();
db.referralTransactions.drop();
db.referralDisputes.drop();
db.aiReports.drop();

// Create users collection
print("Creating users collection...");
const users = [
  {
    _id: "user-1",
    name: "Admin User",
    firstName: "Admin",
    lastName: "User",
    email: "admin@clinictrustai.com",
    role: "admin",
    organization: "ClinicTrust Health Network",
    specialty: "Healthcare Administration",
    walletAddress: "0xAB23F890CD45E67A8B901C2D3E456F78D9A0B1C2",
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(),
    profileImage: "https://i.pravatar.cc/150?u=user-1",
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
    role: "doctor",
    organization: "Metro Heart Institute",
    specialty: "Cardiology",
    walletAddress: "0xBC34D567EF89A01B2C3D4E5F67890A1B2C3D4E5F",
    isActive: true,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    profileImage: "https://i.pravatar.cc/150?u=user-2",
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
    role: "nurse",
    organization: "Community Care Hospital",
    specialty: "Pediatric Nursing",
    walletAddress: "0xDE45F678AB90C12D3E4F56789A0B1C2D3E4F5678",
    isActive: true,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    profileImage: "https://i.pravatar.cc/150?u=user-3",
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
    role: "doctor",
    organization: "Neuroscience Medical Center",
    specialty: "Neurology",
    walletAddress: "0xEF56789AB01C2D3E4F56789A0B1C2D3E4F56789A",
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    profileImage: "https://i.pravatar.cc/150?u=user-4",
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
    role: "doctor",
    organization: "Westside Family Medicine",
    specialty: "General Practice",
    walletAddress: "0xF6789AB01C2D3E4F56789A0B1C2D3E4F56789AB0",
    isActive: true,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    profileImage: "https://i.pravatar.cc/150?u=user-5",
    status: "active",
    blockchainId: "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x",
    verificationStatus: "verified",
    tokenBalance: 290
  }
];
db.users.insertMany(users);

// Create patients collection
print("Creating patients collection...");
const patients = [
  {
    _id: "patient-1",
    patientId: "PT-100001",
    firstName: "James",
    lastName: "Wilson",
    email: "james.wilson@example.com",
    gender: "Male",
    birthDate: new Date(1975, 3, 12).toISOString(),
    contactInfo: {
      phone: "(555) 123-4567",
      address: "123 Main St, Anytown, USA"
    },
    insuranceInfo: {
      provider: "HealthPlus Insurance",
      policyNumber: "HP-987654321",
      groupNumber: "G-12345"
    },
    primaryProvider: "Dr. John Smith",
    riskScore: 75,
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-2",
    patientId: "PT-100002",
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@example.com",
    gender: "Female",
    birthDate: new Date(1988, 7, 23).toISOString(),
    contactInfo: {
      phone: "(555) 234-5678",
      address: "456 Oak Ave, Somewhere, USA"
    },
    insuranceInfo: {
      provider: "MediCare Plus",
      policyNumber: "MC-123456789",
      groupNumber: "G-67890"
    },
    primaryProvider: "Dr. Sarah Johnson",
    riskScore: 45,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    _id: "patient-3",
    patientId: "PT-100003",
    firstName: "Thomas",
    lastName: "Brown",
    email: "thomas.brown@example.com",
    gender: "Male",
    birthDate: new Date(1965, 11, 5).toISOString(),
    contactInfo: {
      phone: "(555) 345-6789",
      address: "789 Pine St, Elsewhere, USA"
    },
    insuranceInfo: {
      provider: "Blue Shield",
      policyNumber: "BS-567891234",
      groupNumber: "G-24680"
    },
    primaryProvider: "Dr. Michael Chen",
    riskScore: 85,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  }
];
db.patients.insertMany(patients);

// Create medical records for patients
print("Creating medical records collection...");
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
db.medicalRecords.insertMany(medicalRecords);

// Create referrals collection
print("Creating referrals collection...");
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
  }
];
db.referrals.insertMany(referrals);

// Create analytics reports collection
print("Creating analytics collection...");
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
db.analytics.insertMany(analytics);

// Create token transactions collection
print("Creating token transactions collection...");
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
db.tokenTransactions.insertMany(tokenTransactions);

// Create token services collection
print("Creating token services collection...");
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
db.tokenServices.insertMany(tokenServices);

// Create token earn sources collection
print("Creating token earn sources collection...");
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
db.tokenEarnSources.insertMany(tokenEarnSources);

// Create consent records collection
print("Creating consent records collection...");
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
db.consentRecords.insertMany(consentRecords);

// Create system status collection
print("Creating system status collection...");
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
db.systemStatus.insertOne(systemStatus);

// Create settings collection
print("Creating settings collection...");
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
db.settings.insertMany(settings);

// Create activities collection
print("Creating activities collection...");
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
db.activities.insertMany(activities);

// Create broadcast messages collection
print("Creating broadcast messages collection...");
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
db.broadcastMessages.insertMany(broadcastMessages);

// Create targeted alerts collection
print("Creating targeted alerts collection...");
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
db.targetedAlerts.insertMany(targetedAlerts);

// Create escalation workflows collection
print("Creating escalation workflows collection...");
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
db.escalationWorkflows.insertMany(escalationWorkflows);

// Create indexes for better performance
print("Creating indexes...");
db.users.createIndex({ email: 1 }, { unique: true });
db.patients.createIndex({ patientId: 1 }, { unique: true });
db.patients.createIndex({ email: 1 });
db.referrals.createIndex({ patientId: 1 });
db.referrals.createIndex({ status: 1 });
db.medicalRecords.createIndex({ patientId: 1 });
db.tokenTransactions.createIndex({ userId: 1 });
db.tokenTransactions.createIndex({ timestamp: -1 });
db.activities.createIndex({ timestamp: -1 });
db.activities.createIndex({ userId: 1 });
db.activities.createIndex({ patientId: 1 });
db.consentRecords.createIndex({ patientId: 1 });
db.consentRecords.createIndex({ providerId: 1 });

db.broadcastMessages.createIndex({ status: 1 });
db.broadcastMessages.createIndex({ sentAt: -1 });
db.broadcastMessages.createIndex({ priority: 1 });
db.broadcastMessages.createIndex({ category: 1 });

db.targetedAlerts.createIndex({ status: 1 });
db.targetedAlerts.createIndex({ sentAt: -1 });
db.targetedAlerts.createIndex({ priority: 1 });
db.targetedAlerts.createIndex({ category: 1 });
db.targetedAlerts.createIndex({ "recipients.id": 1 });

db.escalationWorkflows.createIndex({ status: 1 });
db.escalationWorkflows.createIndex({ flaggedAt: -1 });
db.escalationWorkflows.createIndex({ priority: 1 });
db.escalationWorkflows.createIndex({ category: 1 });
db.escalationWorkflows.createIndex({ "assignedTo.id": 1 });
db.escalationWorkflows.createIndex({ patientId: 1 });

print("Creating referral transactions collection...");
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
db.referralTransactions.insertMany(referralTransactions);

// Create referral disputes collection
print("Creating referral disputes collection...");
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
db.referralDisputes.insertMany(referralDisputes);

// Create admin settings collection
print("Creating admin settings collection...");
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
db.adminSettings.insertMany(adminSettings);

// Create AI reports collection
print("Creating AI reports collection...");
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
db.aiReports.insertMany(aiReports);

// Create indexes for new collections
print("Creating indexes for new collections...");

// Indexes for adminSettings collection
db.adminSettings.createIndex({ category: 1 });
db.adminSettings.createIndex({ "access": 1 });

// Indexes for referralTransactions collection
db.referralTransactions.createIndex({ referralId: 1 });
db.referralTransactions.createIndex({ transactionType: 1 });
db.referralTransactions.createIndex({ timestamp: -1 });
db.referralTransactions.createIndex({ "performedBy.userId": 1 });
db.referralTransactions.createIndex({ "details.patientId": 1 });

// Indexes for referralDisputes collection
db.referralDisputes.createIndex({ referralId: 1 });
db.referralDisputes.createIndex({ status: 1 });
db.referralDisputes.createIndex({ createdAt: -1 });
db.referralDisputes.createIndex({ "initiatedBy.userId": 1 });
db.referralDisputes.createIndex({ "respondent.userId": 1 });
db.referralDisputes.createIndex({ "reviewedBy.userId": 1 });

// Indexes for aiReports collection
db.aiReports.createIndex({ type: 1 });
db.aiReports.createIndex({ status: 1 });
db.aiReports.createIndex({ createdAt: -1 });
db.aiReports.createIndex({ "createdBy.userId": 1 });
db.aiReports.createIndex({ "reviewedBy.userId": 1 });
db.aiReports.createIndex({ tags: 1 });

// Enhanced indexes for tokenTransactions collection
db.tokenTransactions.createIndex({ userId: 1 });
db.tokenTransactions.createIndex({ category: 1 });
db.tokenTransactions.createIndex({ status: 1 });
db.tokenTransactions.createIndex({ type: 1 });
db.tokenTransactions.createIndex({ source: 1 });
db.tokenTransactions.createIndex({ serviceId: 1 });
db.tokenTransactions.createIndex({ timestamp: -1 });

print("Database population complete!");
print("Created collections:");
db.getCollectionNames().forEach(function(collection) {
  print(" - " + collection + ": " + db[collection].count() + " documents");
});