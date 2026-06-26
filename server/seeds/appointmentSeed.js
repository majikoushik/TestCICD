const Appointment = require('../models/Appointment');
const ProviderSchedule = require('../models/ProviderSchedule');
const ScheduleException = require('../models/ScheduleException');
const WaitlistEntry = require('../models/WaitlistEntry');
const AppointmentType = require('../models/AppointmentType');
const User = require('../models/User');
const Patient = require('../models/Patient');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const daysFromNow = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const daysAgo = (days) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * Return a Date with the time portion set to HH:MM (24-hour).
 * @param {Date} base  - the date whose calendar day is used
 * @param {string} hhmm - e.g. '09:30'
 */
const withTime = (base, hhmm) => {
  const d = new Date(base);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Add minutes to an HH:MM string, returns a new HH:MM string. */
const addMinutes = (hhmm, mins) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT TYPES  (5)
// ─────────────────────────────────────────────────────────────────────────────
const appointmentTypes = [
  {
    code: 'new_patient',
    name: 'New Patient Consultation',
    description: 'First visit for new patients',
    defaultDurationMinutes: 60,
    color: '#2196F3',
    requiresPriorAuth: false,
    requiresReferral: false,
    telehealthEligible: true,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 10,
    sortOrder: 0
  },
  {
    code: 'follow_up',
    name: 'Follow-Up Visit',
    description: 'Return visit for established patients',
    defaultDurationMinutes: 30,
    color: '#4CAF50',
    requiresPriorAuth: false,
    requiresReferral: false,
    telehealthEligible: true,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    sortOrder: 1
  },
  {
    code: 'telehealth',
    name: 'Telehealth Visit',
    description: 'Virtual appointment via video',
    defaultDurationMinutes: 30,
    color: '#9C27B0',
    requiresPriorAuth: false,
    requiresReferral: false,
    telehealthEligible: true,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    sortOrder: 2
  },
  {
    code: 'urgent',
    name: 'Urgent Care Visit',
    description: 'Same-day urgent appointment',
    defaultDurationMinutes: 45,
    color: '#F44336',
    requiresPriorAuth: false,
    requiresReferral: false,
    telehealthEligible: false,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 10,
    sortOrder: 3
  },
  {
    code: 'procedure',
    name: 'Procedure / Treatment',
    description: 'In-office procedure or treatment',
    defaultDurationMinutes: 60,
    color: '#FF9800',
    requiresPriorAuth: true,
    requiresReferral: true,
    telehealthEligible: false,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    sortOrder: 4
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER SCHEDULES  (Monday-Friday for first 4 providers,
//                     Saturday half-day for first 2 providers)
// ─────────────────────────────────────────────────────────────────────────────
function buildProviderSchedules(providers) {
  const schedules = [];
  const allTypeCodes = ['new_patient', 'follow_up', 'telehealth', 'urgent', 'procedure'];

  providers.slice(0, 4).forEach((provider, providerIdx) => {
    // Monday – Friday
    for (let day = 1; day <= 5; day++) {
      schedules.push({
        providerId: provider._id,
        providerName: provider.name,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        bufferMinutes: 5,
        maxDailyAppointments: 16,
        appointmentTypes: allTypeCodes,
        isActive: true
      });
    }

    // Saturday half-day for first 2 providers only
    if (providerIdx < 2) {
      schedules.push({
        providerId: provider._id,
        providerName: provider.name,
        dayOfWeek: 6,
        startTime: '09:00',
        endTime: '13:00',
        slotDurationMinutes: 30,
        bufferMinutes: 5,
        maxDailyAppointments: 8,
        appointmentTypes: allTypeCodes,
        isActive: true
      });
    }
  });

  return schedules;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE EXCEPTIONS  (3 — based on first provider)
// ─────────────────────────────────────────────────────────────────────────────
function buildExceptions(provider) {
  return [
    {
      providerId: provider._id,
      providerName: provider.name,
      type: 'unavailable',
      reason: 'vacation',
      date: daysFromNow(7),
      notes: 'Annual leave'
    },
    {
      providerId: provider._id,
      providerName: provider.name,
      type: 'unavailable',
      reason: 'conference',
      date: daysFromNow(14),
      notes: 'Medical conference'
    },
    {
      providerId: provider._id,
      providerName: provider.name,
      type: 'extra_hours',
      date: daysFromNow(3),
      startTime: '07:00',
      endTime: '19:00',
      reason: 'other',
      notes: 'Extended hours'
    }
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS  (20)
// ─────────────────────────────────────────────────────────────────────────────
function buildAppointments(providers, patients) {
  const p0 = providers[0];
  const p1 = providers[1] || providers[0];
  const pt0 = patients[0];
  const pt1 = patients[1] || patients[0];
  const pt2 = patients[2] || patients[0];

  // Slot counter per (provider, date) to avoid time conflicts.
  // Times run 09:00 → 16:00 in 30-min increments.
  const slotMap = {};
  const getNextSlot = (providerId, dateKey) => {
    const key = `${providerId}_${dateKey}`;
    const slots = [
      '09:00','09:30','10:00','10:30','11:00','11:30',
      '12:00','12:30','13:00','13:30','14:00','14:30',
      '15:00','15:30','16:00'
    ];
    if (slotMap[key] === undefined) slotMap[key] = 0;
    const slot = slots[slotMap[key] % slots.length];
    slotMap[key]++;
    return slot;
  };

  const makeAppt = (opts) => {
    const {
      provider, patient, date, status, apptType,
      chiefComplaint, reasonForVisit, tokenRewardIssued,
      isTelehealth
    } = opts;

    const dateKey = date.toISOString().slice(0, 10);
    const startTime = getNextSlot(provider._id, dateKey);
    const endTime = addMinutes(startTime, 30);

    const appt = {
      providerId: provider._id,
      providerName: provider.name,
      patientId: patient.patientId || patient._id,
      patientName: patient.name,
      appointmentType: apptType,
      scheduledDate: date,
      startTime,
      endTime,
      durationMinutes: 30,
      status,
      chiefComplaint,
      reasonForVisit,
      createdBy: 'patient',
      tokenRewardIssued: tokenRewardIssued || false
    };

    if (isTelehealth) {
      appt.telehealthLink = `https://telehealth.example.com/room/${Math.random().toString(36).slice(2, 10)}`;
    }

    return appt;
  };

  return [
    // ── 5 PAST completed (7-30 days ago) ─────────────────────────────────────
    makeAppt({
      provider: p0, patient: pt0, date: daysAgo(7),
      status: 'completed', apptType: 'follow_up',
      chiefComplaint: 'Follow-up for hypertension management',
      reasonForVisit: 'Patient returns for blood pressure reassessment and medication adjustment.',
      tokenRewardIssued: true
    }),
    makeAppt({
      provider: p0, patient: pt1, date: daysAgo(10),
      status: 'completed', apptType: 'new_patient',
      chiefComplaint: 'Chest pain and shortness of breath',
      reasonForVisit: 'New patient presenting with exertional chest discomfort for the past two weeks.',
      tokenRewardIssued: true
    }),
    makeAppt({
      provider: p1, patient: pt2, date: daysAgo(15),
      status: 'completed', apptType: 'procedure',
      chiefComplaint: 'Skin lesion removal on left forearm',
      reasonForVisit: 'Patient scheduled for excision of a suspicious skin lesion identified at prior visit.',
      tokenRewardIssued: true
    }),
    makeAppt({
      provider: p1, patient: pt0, date: daysAgo(22),
      status: 'completed', apptType: 'urgent',
      chiefComplaint: 'Severe sore throat and fever of 102F',
      reasonForVisit: 'Patient presents with acute onset sore throat, fever, and difficulty swallowing.',
      tokenRewardIssued: true
    }),
    makeAppt({
      provider: p0, patient: pt2, date: daysAgo(30),
      status: 'completed', apptType: 'telehealth',
      chiefComplaint: 'Annual wellness check and lab review',
      reasonForVisit: 'Patient requests telehealth visit to review recent lab results and annual wellness assessment.',
      tokenRewardIssued: true
    }),

    // ── 3 PAST no_show (10-20 days ago) ──────────────────────────────────────
    makeAppt({
      provider: p0, patient: pt1, date: daysAgo(11),
      status: 'no_show', apptType: 'follow_up',
      chiefComplaint: 'Diabetes management follow-up',
      reasonForVisit: 'Scheduled follow-up for blood glucose monitoring and insulin regimen review.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p1, patient: pt2, date: daysAgo(16),
      status: 'no_show', apptType: 'follow_up',
      chiefComplaint: 'Post-surgery wound check',
      reasonForVisit: 'Two-week post-operative wound inspection after minor outpatient procedure.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p0, patient: pt0, date: daysAgo(19),
      status: 'no_show', apptType: 'new_patient',
      chiefComplaint: 'Chronic lower back pain',
      reasonForVisit: 'New patient consultation for evaluation of persistent lower back pain lasting three months.',
      tokenRewardIssued: false
    }),

    // ── 2 PAST cancelled (5-15 days ago) ─────────────────────────────────────
    makeAppt({
      provider: p1, patient: pt1, date: daysAgo(6),
      status: 'cancelled', apptType: 'procedure',
      chiefComplaint: 'Joint injection — right knee',
      reasonForVisit: 'Corticosteroid injection for osteoarthritis pain relief in the right knee joint.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p0, patient: pt2, date: daysAgo(13),
      status: 'cancelled', apptType: 'urgent',
      chiefComplaint: 'Rash and itching on both arms',
      reasonForVisit: 'Patient reports sudden onset pruritic rash on bilateral upper extremities.',
      tokenRewardIssued: false
    }),

    // ── 4 FUTURE scheduled (2-10 days from now) ───────────────────────────────
    makeAppt({
      provider: p0, patient: pt0, date: daysFromNow(2),
      status: 'scheduled', apptType: 'follow_up',
      chiefComplaint: 'Cholesterol medication follow-up',
      reasonForVisit: 'Routine follow-up to assess response to statin therapy and review lipid panel results.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p1, patient: pt1, date: daysFromNow(4),
      status: 'scheduled', apptType: 'new_patient',
      chiefComplaint: 'Persistent fatigue and weight gain',
      reasonForVisit: 'New patient presenting for evaluation of unexplained fatigue and weight gain over six months.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p0, patient: pt2, date: daysFromNow(7),
      status: 'scheduled', apptType: 'procedure',
      chiefComplaint: 'Allergy skin testing',
      reasonForVisit: 'Patient referred for comprehensive allergy panel skin testing to identify environmental triggers.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p1, patient: pt0, date: daysFromNow(10),
      status: 'scheduled', apptType: 'urgent',
      chiefComplaint: 'Ear pain and decreased hearing',
      reasonForVisit: 'Patient reports progressive right ear pain and muffled hearing over the past three days.',
      tokenRewardIssued: false
    }),

    // ── 3 FUTURE confirmed (1-5 days from now) ────────────────────────────────
    makeAppt({
      provider: p0, patient: pt1, date: daysFromNow(1),
      status: 'confirmed', apptType: 'follow_up',
      chiefComplaint: 'Asthma control check',
      reasonForVisit: 'Confirmed follow-up to evaluate asthma symptom control and inhaler technique.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p1, patient: pt2, date: daysFromNow(3),
      status: 'confirmed', apptType: 'new_patient',
      chiefComplaint: 'Recurring migraines',
      reasonForVisit: 'New patient referral for neurological evaluation of frequent debilitating migraine headaches.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p0, patient: pt0, date: daysFromNow(5),
      status: 'confirmed', apptType: 'telehealth',
      chiefComplaint: 'Medication refill and symptom review',
      reasonForVisit: 'Telehealth visit for chronic condition medication renewal and symptom status update.',
      tokenRewardIssued: false,
      isTelehealth: true
    }),

    // ── 2 FUTURE checked_in (today) ───────────────────────────────────────────
    makeAppt({
      provider: p0, patient: pt2, date: new Date(),
      status: 'checked_in', apptType: 'follow_up',
      chiefComplaint: 'Thyroid function review',
      reasonForVisit: 'Patient checked in for thyroid hormone level assessment and dose titration discussion.',
      tokenRewardIssued: false
    }),
    makeAppt({
      provider: p1, patient: pt1, date: new Date(),
      status: 'checked_in', apptType: 'urgent',
      chiefComplaint: 'Acute abdominal pain',
      reasonForVisit: 'Patient checked in reporting sudden onset periumbilical abdominal cramping since this morning.',
      tokenRewardIssued: false
    })
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// WAITLIST ENTRIES  (3)
// ─────────────────────────────────────────────────────────────────────────────
function buildWaitlistEntries(providers, patients) {
  const p0 = providers[0];
  const p1 = providers[1] || providers[0];
  const pt0 = patients[0];
  const pt1 = patients[1] || patients[0];
  const pt2 = patients[2] || patients[0];

  return [
    {
      patientId: pt0.patientId || pt0._id,
      patientName: pt0.name,
      providerId: p0._id,
      providerName: p0.name,
      appointmentType: 'new_patient',
      requestedDate: daysFromNow(5),
      flexibleDates: true,
      status: 'waiting',
      priority: 'normal',
      notes: 'Patient prefers morning appointments, Monday or Wednesday.',
      createdAt: daysAgo(2)
    },
    {
      patientId: pt1.patientId || pt1._id,
      patientName: pt1.name,
      providerId: p0._id,
      providerName: p0.name,
      appointmentType: 'follow_up',
      requestedDate: daysFromNow(3),
      flexibleDates: false,
      status: 'waiting',
      priority: 'high',
      notes: 'Post-discharge follow-up — needs earliest available slot.',
      createdAt: daysAgo(1)
    },
    {
      patientId: pt2.patientId || pt2._id,
      patientName: pt2.name,
      providerId: p1._id,
      providerName: p1.name,
      appointmentType: 'procedure',
      requestedDate: daysFromNow(7),
      flexibleDates: true,
      status: 'waiting',
      priority: 'normal',
      notes: 'Procedure requires prior authorization — patient has been notified to expect a 1-2 week wait.',
      createdAt: daysAgo(3)
    }
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seedAppointments() {
  try {
    const apptCount = await Appointment.countDocuments();
    if (apptCount > 0) {
      console.log(`Appointments already seeded (${apptCount} records) — skipping.`);
      return;
    }

    // ── Seed appointment types ─────────────────────────────────────────────
    const typeCount = await AppointmentType.countDocuments();
    if (typeCount === 0) {
      await AppointmentType.insertMany(appointmentTypes);
      console.log(`Seeded ${appointmentTypes.length} appointment types`);
    } else {
      console.log(`Appointment types already seeded (${typeCount} records) — skipping.`);
    }

    // ── Fetch providers and patients from DB ──────────────────────────────
    const providers = await User.find({ role: { $in: ['doctor', 'provider'] } }).limit(4).lean();
    if (providers.length === 0) {
      console.warn('No providers (doctor/provider role) found in User collection — skipping appointment seed.');
      return;
    }

    const patients = await Patient.find({}).limit(3).lean();
    if (patients.length === 0) {
      console.warn('No patients found in Patient collection — skipping appointment seed.');
      return;
    }

    // ── Provider schedules ─────────────────────────────────────────────────
    const scheduleCount = await ProviderSchedule.countDocuments();
    let seededSchedules = 0;
    if (scheduleCount === 0) {
      const schedules = buildProviderSchedules(providers);
      await ProviderSchedule.insertMany(schedules);
      seededSchedules = schedules.length;
    } else {
      console.log(`Provider schedules already seeded (${scheduleCount} records) — skipping.`);
      seededSchedules = scheduleCount;
    }

    // ── Schedule exceptions ───────────────────────────────────────────────
    const exceptionCount = await ScheduleException.countDocuments();
    let seededExceptions = 0;
    if (exceptionCount === 0) {
      const exceptions = buildExceptions(providers[0]);
      await ScheduleException.insertMany(exceptions);
      seededExceptions = exceptions.length;
    } else {
      console.log(`Schedule exceptions already seeded (${exceptionCount} records) — skipping.`);
      seededExceptions = exceptionCount;
    }

    // ── Appointments ───────────────────────────────────────────────────────
    const appointments = buildAppointments(providers, patients);
    await Appointment.insertMany(appointments);

    // ── Waitlist entries ───────────────────────────────────────────────────
    const waitlistCount = await WaitlistEntry.countDocuments();
    if (waitlistCount === 0) {
      const waitlist = buildWaitlistEntries(providers, patients);
      await WaitlistEntry.insertMany(waitlist);
    } else {
      console.log(`Waitlist entries already seeded (${waitlistCount} records) — skipping.`);
    }

    console.log(
      `Seeded ${appointments.length} appointments, ${seededSchedules} provider schedules, ${seededExceptions} exceptions`
    );
  } catch (err) {
    console.error('Appointment seed error:', err.message);
    throw err;
  }
}

module.exports = { seedAppointments };
