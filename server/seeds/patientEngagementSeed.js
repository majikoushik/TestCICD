const NotificationTemplate = require('../models/NotificationTemplate');
const PatientNotification = require('../models/PatientNotification');
const NotificationCampaign = require('../models/NotificationCampaign');

const d = (daysAgo) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
const h = (hoursAgo) => new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION TEMPLATES  (6 templates — one per enum type used in the UI)
// ─────────────────────────────────────────────────────────────────────────────
const sampleTemplates = [
  {
    name: 'Appointment Reminder',
    description: 'Reminds a patient of an upcoming scheduled appointment with date, time, and provider details.',
    type: 'appointment_reminder',
    subject: 'Reminder: Your Appointment on {{appointmentDate}}',
    body: `Dear {{patientName}},

This is a friendly reminder that you have an upcoming appointment scheduled with {{providerName}} at {{clinicName}}.

Appointment Details:
  Date: {{appointmentDate}}
  Time: {{appointmentTime}}
  Location: {{clinicAddress}}

Please arrive 15 minutes early to complete any necessary paperwork. If you need to reschedule or cancel, please call us at least 24 hours in advance at {{clinicPhone}}.

We look forward to seeing you.

Warm regards,
{{clinicName}} Care Team`,
    smsBody: 'Reminder: Appt with {{providerName}} on {{appointmentDate}} at {{appointmentTime}}. Call {{clinicPhone}} to reschedule.',
    pushTitle: 'Upcoming Appointment Reminder',
    defaultChannels: ['email', 'sms', 'in_app'],
    variables: ['patientName', 'providerName', 'clinicName', 'appointmentDate', 'appointmentTime', 'clinicAddress', 'clinicPhone'],
    isActive: true,
    usageCount: 47,
    createdAt: d(60),
    updatedAt: d(10)
  },
  {
    name: 'Referral Status Update',
    description: 'Notifies the patient when the status of a specialist referral has changed.',
    type: 'referral_update',
    subject: 'Update on Your Referral to {{specialistName}}',
    body: `Dear {{patientName}},

We wanted to let you know that there has been an update on your referral to {{specialistName}} at {{specialistClinic}}.

Referral Status: {{referralStatus}}
{{#if referralNotes}}Additional Notes: {{referralNotes}}{{/if}}

Next Steps:
{{nextSteps}}

If you have any questions, please contact our office at {{clinicPhone}} or reply to this message.

Thank you for choosing {{clinicName}} for your care.

Best regards,
{{sentByName}}
{{clinicName}}`,
    smsBody: 'Your referral to {{specialistName}} status: {{referralStatus}}. Questions? Call {{clinicPhone}}.',
    pushTitle: 'Referral Status Update',
    defaultChannels: ['email', 'in_app'],
    variables: ['patientName', 'specialistName', 'specialistClinic', 'referralStatus', 'referralNotes', 'nextSteps', 'clinicPhone', 'clinicName', 'sentByName'],
    isActive: true,
    usageCount: 23,
    createdAt: d(55),
    updatedAt: d(15)
  },
  {
    name: 'Prior Authorization Update',
    description: 'Informs the patient of a prior authorization approval, denial, or status change from their insurer.',
    type: 'prior_auth_update',
    subject: 'Prior Authorization Decision: {{serviceType}}',
    body: `Dear {{patientName}},

We have received a decision from {{insurancePlan}} regarding the prior authorization request for {{serviceType}}.

Authorization Status: {{authStatus}}
Service Requested: {{serviceType}}
Reference Number: {{authReferenceNumber}}
{{#if effectiveDate}}Effective Date: {{effectiveDate}}{{/if}}
{{#if expiryDate}}Authorization Valid Through: {{expiryDate}}{{/if}}

{{#if isDenied}}
If your request was denied, you have the right to appeal this decision. Please contact our office within 30 days at {{clinicPhone}} so we can assist you with the appeals process.
{{/if}}

If you have questions, please do not hesitate to reach out.

Sincerely,
{{sentByName}}
{{clinicName}}`,
    smsBody: 'PA Update: {{serviceType}} is {{authStatus}}. Ref: {{authReferenceNumber}}. Call {{clinicPhone}} for details.',
    pushTitle: 'Prior Auth Decision Received',
    defaultChannels: ['email', 'sms', 'in_app'],
    variables: ['patientName', 'insurancePlan', 'serviceType', 'authStatus', 'authReferenceNumber', 'effectiveDate', 'expiryDate', 'isDenied', 'clinicPhone', 'clinicName', 'sentByName'],
    isActive: true,
    usageCount: 18,
    createdAt: d(50),
    updatedAt: d(20)
  },
  {
    name: 'Preventive Care Reminder',
    description: 'Alerts patients who are overdue for preventive screenings, vaccinations, or wellness visits (care gap closure).',
    type: 'care_gap',
    subject: 'Action Needed: You May Be Due for {{screeningType}}',
    body: `Dear {{patientName}},

As part of our commitment to your long-term health, we review your care history to ensure you receive all recommended preventive services.

Our records indicate you may be due for:
  {{screeningType}}
  Recommended Frequency: {{screeningFrequency}}
  Last Completed: {{lastCompletedDate}}

Why this matters: {{screeningReason}}

Scheduling this service is easy — call us at {{clinicPhone}} or visit our patient portal at {{portalUrl}} to book your appointment online.

Your health is our priority.

With care,
{{clinicName}} Preventive Care Team`,
    smsBody: 'Hi {{patientName}}, you may be due for {{screeningType}}. Call {{clinicPhone}} or visit {{portalUrl}} to schedule.',
    pushTitle: 'Preventive Care Reminder',
    defaultChannels: ['email', 'sms', 'push', 'in_app'],
    variables: ['patientName', 'screeningType', 'screeningFrequency', 'lastCompletedDate', 'screeningReason', 'clinicPhone', 'portalUrl', 'clinicName'],
    isActive: true,
    usageCount: 112,
    createdAt: d(45),
    updatedAt: d(5)
  },
  {
    name: 'General Health Update',
    description: 'A flexible template for general communications, health tips, policy updates, or any outreach that does not fit a specific category.',
    type: 'general',
    subject: '{{messageSubject}} — {{clinicName}}',
    body: `Dear {{patientName}},

{{messageBody}}

If you have any questions or concerns, please contact our office at {{clinicPhone}} or send a message through the patient portal at {{portalUrl}}.

Thank you for being a valued patient of {{clinicName}}.

Sincerely,
{{sentByName}}
{{clinicName}}`,
    smsBody: '{{clinicName}}: {{smsMessage}} Questions? Call {{clinicPhone}}.',
    pushTitle: '{{messageSubject}}',
    defaultChannels: ['in_app'],
    variables: ['patientName', 'messageSubject', 'messageBody', 'smsMessage', 'clinicPhone', 'portalUrl', 'clinicName', 'sentByName'],
    isActive: true,
    usageCount: 34,
    createdAt: d(40),
    updatedAt: d(8)
  },
  {
    name: 'Prescription Ready',
    description: 'Notifies a patient that their prescription is ready for pickup at the pharmacy.',
    type: 'prescription',
    subject: 'Your Prescription is Ready for Pickup',
    body: `Dear {{patientName}},

Great news! Your prescription is ready and waiting for you at the pharmacy.

Prescription Details:
  Medication: {{medicationName}}
  Dosage: {{dosage}}
  Quantity: {{quantity}}
  Pharmacy: {{pharmacyName}}
  Address: {{pharmacyAddress}}
  Phone: {{pharmacyPhone}}
  Ready for Pickup: Now
  Prescription Expires: {{prescriptionExpiryDate}}

Please bring a valid photo ID when picking up your medication. If you have any questions about your medication, please speak with the pharmacist or contact our office at {{clinicPhone}}.

Take care,
{{clinicName}}`,
    smsBody: 'Rx Ready: {{medicationName}} is ready at {{pharmacyName}}. Pickup by {{prescriptionExpiryDate}}. ID required.',
    pushTitle: 'Prescription Ready for Pickup',
    defaultChannels: ['sms', 'push', 'in_app'],
    variables: ['patientName', 'medicationName', 'dosage', 'quantity', 'pharmacyName', 'pharmacyAddress', 'pharmacyPhone', 'prescriptionExpiryDate', 'clinicPhone', 'clinicName'],
    isActive: true,
    usageCount: 61,
    createdAt: d(35),
    updatedAt: d(3)
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT NOTIFICATIONS  (12 notifications across PT-100001 through PT-100005)
// ─────────────────────────────────────────────────────────────────────────────
const sampleNotifications = [
  // ── James Wilson (PT-100001) ──────────────────────────────────────────────
  {
    patientId: 'PT-100001',
    patientName: 'James Wilson',
    patientEmail: 'james.wilson@email.com',
    patientPhone: '+1-555-0101',
    title: 'Appointment Reminder — Cardiology Follow-Up',
    message: 'Dear James Wilson, this is a reminder that you have an upcoming appointment with Dr. Sarah Chen at Metro Heart Institute on June 28, 2026 at 10:30 AM. Please arrive 15 minutes early. Call 555-0100 to reschedule.',
    type: 'appointment_reminder',
    priority: 'normal',
    channels: ['email', 'sms', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(2), deliveredAt: d(2), messageId: 'msg-email-001' },
      sms: { sent: true, sentAt: d(2), deliveredAt: d(2), sid: 'SM-sms-001' },
      in_app: { sent: true, read: true, readAt: d(1) }
    },
    status: 'read',
    relatedType: 'appointment',
    sentByName: 'Admin User',
    sentAt: d(2),
    createdAt: d(2)
  },
  {
    patientId: 'PT-100001',
    patientName: 'James Wilson',
    patientEmail: 'james.wilson@email.com',
    patientPhone: '+1-555-0101',
    title: 'Prior Authorization Approved — MRI Brain with Contrast',
    message: 'Dear James Wilson, your prior authorization for MRI Brain with Contrast has been approved by Blue Cross Blue Shield. Authorization Reference: PA-2026-0441. Valid through September 25, 2026. Please contact our office at 555-0100 to schedule your procedure.',
    type: 'prior_auth_update',
    priority: 'high',
    channels: ['email', 'sms', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(5), deliveredAt: d(5), messageId: 'msg-email-002' },
      sms: { sent: true, sentAt: d(5), deliveredAt: d(5), sid: 'SM-sms-002' },
      in_app: { sent: true, read: true, readAt: d(4) }
    },
    status: 'read',
    relatedType: 'prior_auth',
    relatedId: 'PA-2026-0441',
    sentByName: 'Dr. John Smith',
    sentAt: d(5),
    createdAt: d(5)
  },
  // ── Emily Rodriguez (PT-100002) ───────────────────────────────────────────
  {
    patientId: 'PT-100002',
    patientName: 'Emily Rodriguez',
    patientEmail: 'emily.rodriguez@email.com',
    patientPhone: '+1-555-0102',
    title: 'Preventive Care Reminder — Annual Mammogram Screening',
    message: 'Dear Emily Rodriguez, our records indicate you may be due for your Annual Mammogram Screening. Recommended annually for women aged 40+. Last completed: June 2025. Early detection saves lives — call 555-0100 or visit our portal to schedule.',
    type: 'care_gap',
    priority: 'normal',
    channels: ['email', 'push', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(7), deliveredAt: d(7), messageId: 'msg-email-003' },
      push: { sent: true, sentAt: d(7) },
      in_app: { sent: true, read: false }
    },
    status: 'delivered',
    sentByName: 'Admin User',
    sentAt: d(7),
    createdAt: d(7)
  },
  {
    patientId: 'PT-100002',
    patientName: 'Emily Rodriguez',
    patientEmail: 'emily.rodriguez@email.com',
    patientPhone: '+1-555-0102',
    title: 'Referral to Rheumatology — Status Update',
    message: 'Dear Emily Rodriguez, your referral to Dr. Patricia Moore at Rheumatology Specialists has been approved and the office will contact you within 3 business days to schedule. Please have your insurance card ready when they call. Questions? Reach us at 555-0100.',
    type: 'referral_update',
    priority: 'normal',
    channels: ['email', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(10), deliveredAt: d(10), messageId: 'msg-email-004' },
      in_app: { sent: true, read: true, readAt: d(9) }
    },
    status: 'read',
    relatedType: 'referral',
    relatedId: 'REF-2026-0118',
    sentByName: 'Dr. John Smith',
    sentAt: d(10),
    createdAt: d(10)
  },
  // ── Thomas Brown (PT-100003) ──────────────────────────────────────────────
  {
    patientId: 'PT-100003',
    patientName: 'Thomas Brown',
    patientEmail: 'thomas.brown@email.com',
    patientPhone: '+1-555-0103',
    title: 'Prescription Ready — Metformin 500mg',
    message: 'Dear Thomas Brown, your prescription for Metformin 500mg (90 tablets) is ready for pickup at City Pharmacy, 123 Main St. Bring a valid photo ID. Prescription expires July 25, 2026. Questions? Call City Pharmacy at 555-0200 or our office at 555-0100.',
    type: 'prescription',
    priority: 'normal',
    channels: ['sms', 'push', 'in_app'],
    channelStatus: {
      sms: { sent: true, sentAt: h(18), deliveredAt: h(18), sid: 'SM-sms-005' },
      push: { sent: true, sentAt: h(18) },
      in_app: { sent: true, read: true, readAt: h(16) }
    },
    status: 'read',
    relatedType: 'prescription',
    relatedId: 'RX-2026-8834',
    sentByName: 'Dr. John Smith',
    sentAt: h(18),
    createdAt: h(18)
  },
  {
    patientId: 'PT-100003',
    patientName: 'Thomas Brown',
    patientEmail: 'thomas.brown@email.com',
    patientPhone: '+1-555-0103',
    title: 'Prior Authorization Denied — PET Scan',
    message: 'Dear Thomas Brown, UnitedHealth has denied the prior authorization request for PET Scan. Reason: Additional clinical documentation required for staging confirmation. You have the right to appeal within 30 days. Please call our office at 555-0100 so we can assist you with the appeals process.',
    type: 'prior_auth_update',
    priority: 'high',
    channels: ['email', 'sms', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(3), deliveredAt: d(3), messageId: 'msg-email-006' },
      sms: { sent: false, error: 'Carrier delivery failure', sid: 'SM-sms-006' },
      in_app: { sent: true, read: false }
    },
    status: 'delivered',
    relatedType: 'prior_auth',
    relatedId: 'PA-2026-0389',
    sentByName: 'Admin User',
    sentAt: d(3),
    createdAt: d(3)
  },
  // ── Maria Garcia (PT-100004) ──────────────────────────────────────────────
  {
    patientId: 'PT-100004',
    patientName: 'Maria Garcia',
    patientEmail: 'maria.garcia@email.com',
    patientPhone: '+1-555-0104',
    title: 'Appointment Reminder — Diabetes Management Check-In',
    message: 'Dear Maria Garcia, this is a reminder of your upcoming Diabetes Management appointment with Dr. Mike Johnson at Central Health Clinic on June 30, 2026 at 2:00 PM. Please fast for 8 hours before your appointment for lab work. Call 555-0100 with questions.',
    type: 'appointment_reminder',
    priority: 'normal',
    channels: ['email', 'sms'],
    channelStatus: {
      email: { sent: true, sentAt: d(1), deliveredAt: d(1), messageId: 'msg-email-007' },
      sms: { sent: true, sentAt: d(1), deliveredAt: d(1), sid: 'SM-sms-007' }
    },
    status: 'delivered',
    relatedType: 'appointment',
    sentByName: 'Admin User',
    sentAt: d(1),
    createdAt: d(1)
  },
  {
    patientId: 'PT-100004',
    patientName: 'Maria Garcia',
    patientEmail: 'maria.garcia@email.com',
    patientPhone: '+1-555-0104',
    title: 'Preventive Care Reminder — HbA1c Screening Overdue',
    message: 'Dear Maria Garcia, our records show you are overdue for your HbA1c (Hemoglobin A1c) screening, recommended every 3 months for patients managing Type 2 Diabetes. Last completed: February 2026. Regular monitoring helps prevent complications — schedule today at 555-0100.',
    type: 'care_gap',
    priority: 'high',
    channels: ['email', 'sms', 'push', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(14), deliveredAt: d(14), messageId: 'msg-email-008' },
      sms: { sent: true, sentAt: d(14), deliveredAt: d(14), sid: 'SM-sms-008' },
      push: { sent: true, sentAt: d(14) },
      in_app: { sent: true, read: true, readAt: d(13) }
    },
    status: 'read',
    sentByName: 'Dr. Mike Johnson',
    sentAt: d(14),
    createdAt: d(14)
  },
  // ── David Lee (PT-100005) ─────────────────────────────────────────────────
  {
    patientId: 'PT-100005',
    patientName: 'David Lee',
    patientEmail: 'david.lee@email.com',
    patientPhone: '+1-555-0105',
    title: 'General Health Update — New Patient Portal Features',
    message: 'Dear David Lee, we are excited to share that our patient portal has been updated with new features including secure messaging, online prescription refill requests, and appointment self-scheduling. Log in at portal.centralhealth.com to explore. Questions? Call 555-0100.',
    type: 'general',
    priority: 'low',
    channels: ['email', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(20), deliveredAt: d(20), messageId: 'msg-email-009' },
      in_app: { sent: true, read: false }
    },
    status: 'delivered',
    sentByName: 'Admin User',
    sentAt: d(20),
    createdAt: d(20)
  },
  {
    patientId: 'PT-100005',
    patientName: 'David Lee',
    patientEmail: 'david.lee@email.com',
    patientPhone: '+1-555-0105',
    title: 'Referral Approved — Orthopedic Surgery Consultation',
    message: 'Dear David Lee, your referral to Dr. Alan Turner at Metro Orthopedic Center has been approved by your insurance. The specialist office will contact you within 5 business days to schedule your consultation. Referral ID: REF-2026-0203. Questions? Call 555-0100.',
    type: 'referral_update',
    priority: 'normal',
    channels: ['email', 'sms', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(8), deliveredAt: d(8), messageId: 'msg-email-010' },
      sms: { sent: true, sentAt: d(8), deliveredAt: d(8), sid: 'SM-sms-010' },
      in_app: { sent: true, read: true, readAt: d(7) }
    },
    status: 'read',
    relatedType: 'referral',
    relatedId: 'REF-2026-0203',
    sentByName: 'Dr. Sarah Chen',
    sentAt: d(8),
    createdAt: d(8)
  },
  {
    patientId: 'PT-100005',
    patientName: 'David Lee',
    patientEmail: 'david.lee@email.com',
    patientPhone: '+1-555-0105',
    title: 'Prescription Ready — Lisinopril 10mg',
    message: 'Dear David Lee, your prescription for Lisinopril 10mg (30 tablets) is ready at Central Pharmacy, 456 Oak Ave. Pickup hours: Mon-Sat 9 AM – 7 PM. Bring valid ID. Refills remaining: 5. Call 555-0300 for pharmacy questions.',
    type: 'prescription',
    priority: 'normal',
    channels: ['sms', 'in_app'],
    channelStatus: {
      sms: { sent: false, error: 'Invalid phone number format', sid: null },
      in_app: { sent: true, read: false }
    },
    status: 'failed',
    relatedType: 'prescription',
    relatedId: 'RX-2026-9021',
    sentByName: 'Dr. John Smith',
    sentAt: d(4),
    createdAt: d(4)
  },
  {
    patientId: 'PT-100003',
    patientName: 'Thomas Brown',
    patientEmail: 'thomas.brown@email.com',
    patientPhone: '+1-555-0103',
    title: 'Flu Vaccination Campaign — Schedule Your Shot Today',
    message: 'Dear Thomas Brown, flu season is here and we want to make sure you are protected. We are offering flu vaccinations during all clinic hours this month — no separate appointment needed. Walk-ins welcome. Call 555-0100 or book online at portal.centralhealth.com.',
    type: 'campaign',
    priority: 'low',
    channels: ['email', 'sms', 'in_app'],
    channelStatus: {
      email: { sent: true, sentAt: d(25), deliveredAt: d(25), messageId: 'msg-email-012' },
      sms: { sent: true, sentAt: d(25), deliveredAt: d(25), sid: 'SM-sms-012' },
      in_app: { sent: true, read: true, readAt: d(24) }
    },
    status: 'read',
    sentByName: 'Admin User',
    sentAt: d(25),
    createdAt: d(25),
    metadata: { campaignName: 'Flu Season Vaccination Reminder' }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CAMPAIGNS  (3 campaigns)
// ─────────────────────────────────────────────────────────────────────────────
const sampleCampaigns = [
  // ── 1. Completed: Flu Season Vaccination Reminder ─────────────────────────
  {
    name: 'Flu Season Vaccination Reminder',
    description: 'Outreach campaign to remind all active patients to schedule their annual flu vaccination before the peak season. Sent via email and SMS to maximize reach.',
    templateName: 'General Health Update',
    customSubject: 'Get Your Flu Shot — Protect Yourself This Season',
    customMessage: 'Flu season is here and we want to help you stay healthy. Flu vaccinations are now available during all clinic hours — walk-ins welcome, no separate appointment needed. Book online or call us today.',
    targetCriteria: {
      all: true,
      patientIds: [],
      conditions: [],
      insurancePlan: ''
    },
    channels: ['email', 'sms'],
    status: 'completed',
    scheduledAt: d(27),
    startedAt: d(26),
    completedAt: d(25),
    stats: {
      totalTargeted: 1248,
      totalSent: 1242,
      totalDelivered: 1198,
      totalFailed: 44,
      totalRead: 874,
      openRate: 72.96
    },
    createdByName: 'Admin User',
    createdAt: d(30),
    updatedAt: d(25)
  },
  // ── 2. Completed: Annual Wellness Check (High-Risk Patients) ─────────────
  {
    name: 'Annual Wellness Check — High-Risk Patients',
    description: 'Targeted campaign for patients with a risk score of 60 or above who have not completed their annual wellness visit in the past 12 months. Multi-channel outreach to close the care gap.',
    templateName: 'Preventive Care Reminder',
    customSubject: 'Your Annual Wellness Visit is Overdue — Schedule Today',
    customMessage: 'As one of our high-priority patients, your annual wellness visit is an important part of managing your health. Our records show this visit may be overdue. Please call us or use the patient portal to schedule at your earliest convenience — we have flexible hours available.',
    targetCriteria: {
      all: false,
      patientIds: [],
      conditions: [],
      riskScoreMin: 60,
      insurancePlan: ''
    },
    channels: ['email', 'sms', 'push'],
    status: 'completed',
    scheduledAt: d(18),
    startedAt: d(17),
    completedAt: d(16),
    stats: {
      totalTargeted: 312,
      totalSent: 312,
      totalDelivered: 298,
      totalFailed: 14,
      totalRead: 241,
      openRate: 80.87
    },
    createdByName: 'Dr. John Smith',
    createdAt: d(22),
    updatedAt: d(16)
  },
  // ── 3. Draft: Diabetes Management Program ────────────────────────────────
  {
    name: 'Diabetes Management Program',
    description: 'Educational and engagement campaign targeting patients diagnosed with Type 2 Diabetes. Covers lifestyle tips, medication adherence reminders, and information about our dedicated diabetes management program.',
    templateName: 'Preventive Care Reminder',
    customSubject: 'Managing Type 2 Diabetes — Resources & Support From Our Team',
    customMessage: 'Living with Type 2 Diabetes can be challenging, but you do not have to do it alone. We are reaching out to share resources, answer questions, and let you know about our dedicated Diabetes Management Program — a structured support system designed to help you maintain healthy blood sugar levels, prevent complications, and improve your quality of life. Reply to this message or call us to learn more.',
    targetCriteria: {
      all: false,
      patientIds: [],
      conditions: ['Type 2 Diabetes'],
      insurancePlan: ''
    },
    channels: ['email', 'in_app'],
    status: 'draft',
    stats: {
      totalTargeted: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalRead: 0,
      openRate: 0
    },
    createdByName: 'Dr. Mike Johnson',
    createdAt: d(3),
    updatedAt: d(3)
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seedPatientEngagement() {
  try {
    const templateCount = await NotificationTemplate.countDocuments();
    if (templateCount === 0) {
      await NotificationTemplate.insertMany(sampleTemplates);
      console.log('Seeded notification templates');
    } else {
      console.log(`Notification templates already seeded (${templateCount} records) — skipping.`);
    }

    const notifCount = await PatientNotification.countDocuments();
    if (notifCount === 0) {
      await PatientNotification.insertMany(sampleNotifications);
      console.log('Seeded patient notifications');
    } else {
      console.log(`Patient notifications already seeded (${notifCount} records) — skipping.`);
    }

    const campaignCount = await NotificationCampaign.countDocuments();
    if (campaignCount === 0) {
      await NotificationCampaign.insertMany(sampleCampaigns);
      console.log('Seeded notification campaigns');
    } else {
      console.log(`Notification campaigns already seeded (${campaignCount} records) — skipping.`);
    }
  } catch (err) {
    console.error('Patient engagement seed error:', err.message);
  }
}

module.exports = { seedPatientEngagement };
