'use strict';

/**
 * Analytics Calculation Service
 *
 * All metric formulas live here. Keeping calculations in one service means:
 *   - The admin job, the provider summary API, and any future cron share the same logic.
 *   - Adding a new metric only requires updating this file + the snapshot schema.
 *
 * Design intent:
 *   - `runAnalyticsJob`  → writes AnalyticsSnapshot + bulk-updates Patient.riskScore
 *   - `getLatestSnapshot` → reads the most-recent snapshot from DB (clients use this)
 *   - Pure calc functions are exported for unit-testing without DB
 */

const Patient          = require('../models/Patient');
const Referral         = require('../models/Referral');
const User             = require('../models/User');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const logger           = require('../utils/logger');

// ── Constants ────────────────────────────────────────────────────────────────

// Conditions that significantly increase patient risk
const HIGH_RISK_TERMS = [
  'cancer', 'carcinoma', 'lymphoma', 'leukemia', 'tumor',
  'heart failure', 'congestive heart failure', 'chf',
  'copd', 'chronic obstructive pulmonary',
  'stroke', 'cerebrovascular',
  'chronic kidney disease', 'renal failure', 'esrd',
  'cirrhosis', 'liver failure',
  'dementia', "alzheimer's",
  'sepsis',
];

const MEDIUM_RISK_TERMS = [
  'diabetes', 'type 2 diabetes', 'type 1 diabetes',
  'hypertension', 'high blood pressure',
  'atrial fibrillation', 'arrhythmia',
  'asthma', 'emphysema',
  'depression', 'anxiety disorder',
  'obesity',
  'hypothyroidism', 'hyperthyroidism', 'thyroid',
  'coronary artery disease', 'angina',
  'peripheral artery disease', 'pad',
  'sleep apnea',
];

// Days thresholds
const ENGAGEMENT_WINDOW_DAYS   = 90;
const ADHERENCE_WINDOW_DAYS    = 120;
const MISSED_APPT_WINDOW_DAYS  = 90;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return 0;
  const now  = new Date();
  const dob  = new Date(dateOfBirth);
  let   age  = now.getFullYear() - dob.getFullYear();
  const m    = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return Math.max(0, age);
}

function daysSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function matchesTerm(text, terms) {
  const lower = (text || '').toLowerCase();
  return terms.some(t => lower.includes(t));
}

// ── Risk Score (0–100) ────────────────────────────────────────────────────────
//
// Formula breakdown:
//   Age                 0–25 pts
//   Conditions          up to ~40 pts (high-risk +18, medium +12, other +6 each)
//   Polypharmacy        0–20 pts (active meds × 4, capped)
//   Severe allergies    +8 per allergy
//   Gap in care         0–20 pts (months since last visit)
//   Recent visit bonus  −5 if seen within 30 days
//
function calcRiskScore(patient) {
  let score = 0;

  // Age factor
  const age = calcAge(patient.dateOfBirth);
  if      (age >= 75) score += 25;
  else if (age >= 65) score += 20;
  else if (age >= 55) score += 12;
  else if (age >= 45) score += 6;
  else if (age >= 35) score += 2;

  // Conditions
  for (const h of (patient.medicalHistory || [])) {
    const cond = h.condition || '';
    if      (matchesTerm(cond, HIGH_RISK_TERMS))   score += 18;
    else if (matchesTerm(cond, MEDIUM_RISK_TERMS)) score += 12;
    else                                           score +=  6;
  }

  // Polypharmacy (active medications only)
  const now = new Date();
  const activeMeds = (patient.medications || []).filter(
    m => !m.endDate || new Date(m.endDate) > now
  );
  score += Math.min(activeMeds.length * 4, 20);

  // Severe allergies
  for (const a of (patient.allergies || [])) {
    if ((a.severity || '').toLowerCase() === 'severe') score += 8;
  }

  // Care-gap factor (uses recentVisits array)
  const visits   = (patient.recentVisits || []).filter(v => v.date);
  if (visits.length === 0) {
    score += 18; // no care history = high gap risk
  } else {
    const latestVisit = visits.reduce((best, v) =>
      new Date(v.date) > new Date(best.date) ? v : best
    );
    const gapDays = daysSince(latestVisit.date);

    if      (gapDays > 365) score += 20;
    else if (gapDays > 180) score += 12;
    else if (gapDays >  90) score +=  5;
    else if (gapDays <  30) score -=  5; // very recently seen = lower risk
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Patient Engagement (%) ────────────────────────────────────────────────────
// % of patients who had at least one visit in the last ENGAGEMENT_WINDOW_DAYS.
// Trend = comparison against the previous equal-length window.
function calcEngagement(patients) {
  if (!patients.length) return { value: 0, trend: 0, unit: 'percent', label: 'No patients' };

  const windowMs = ENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const now      = Date.now();

  let current = 0, prev = 0;
  for (const p of patients) {
    const visits = (p.recentVisits || []).filter(v => v.date);
    const hasRecent = visits.some(v => now - new Date(v.date).getTime() < windowMs);
    const hasPrev   = visits.some(v => {
      const ago = now - new Date(v.date).getTime();
      return ago >= windowMs && ago < windowMs * 2;
    });
    if (hasRecent) current++;
    if (hasPrev)   prev++;
  }

  const value      = Math.round((current / patients.length) * 100);
  const prevValue  = Math.round((prev    / patients.length) * 100);
  const trend      = prevValue > 0
    ? Math.round(((value - prevValue) / prevValue) * 100)
    : 0;

  return {
    value,
    trend,
    unit:  'percent',
    label: `${current} of ${patients.length} patients visited in last ${ENGAGEMENT_WINDOW_DAYS} days`,
  };
}

// ── Treatment Adherence (%) ───────────────────────────────────────────────────
// % of patients WITH active medications who had a follow-up within ADHERENCE_WINDOW_DAYS.
// Patients with no active medications are excluded (not relevant to adherence).
function calcAdherence(patients) {
  const now = new Date();
  const windowMs = ADHERENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const onMeds = patients.filter(p => {
    const active = (p.medications || []).filter(
      m => !m.endDate || new Date(m.endDate) > now
    );
    return active.length > 0;
  });

  if (!onMeds.length) {
    return { value: 0, trend: 0, unit: 'percent', label: 'No patients on active medications' };
  }

  let adherent = 0;
  for (const p of onMeds) {
    const visits     = (p.recentVisits || []).filter(v => v.date);
    const hasFollowUp = visits.some(
      v => Date.now() - new Date(v.date).getTime() < windowMs
    );
    if (hasFollowUp) adherent++;
  }

  const value = Math.round((adherent / onMeds.length) * 100);
  return {
    value,
    trend:  0, // requires a prior snapshot to compute — populated on second run
    unit:   'percent',
    label:  `${adherent} of ${onMeds.length} medicated patients have had follow-up in ${ADHERENCE_WINDOW_DAYS} days`,
  };
}

// ── Missed Appointments (count) ───────────────────────────────────────────────
// Proxy metric: patients with chronic conditions (medicalHistory entries) who
// have NOT had a visit in the last MISSED_APPT_WINDOW_DAYS.  These are patients
// overdue for follow-up.  As the platform integrates a scheduling module the
// formula can be replaced with actual scheduled-vs-attended data.
function calcMissedAppointments(patients) {
  if (!patients.length) return { value: 0, trend: 0, unit: 'count', label: 'No patients' };

  const windowMs = MISSED_APPT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const now      = Date.now();

  let missed = 0;
  for (const p of patients) {
    const hasChronic = (p.medicalHistory || []).length > 0;
    if (!hasChronic) continue;
    const visits      = (p.recentVisits || []).filter(v => v.date);
    const recentVisit = visits.some(v => now - new Date(v.date).getTime() < windowMs);
    if (!recentVisit) missed++;
  }

  const rate = Math.round((missed / patients.length) * 100);
  return {
    value: missed,
    trend: 0,
    unit:  'count',
    label: `${missed} patients with chronic conditions overdue for follow-up (${rate}% of total)`,
  };
}

// ── Patient Demographics (age groups) ────────────────────────────────────────
function calcPatientDemographics(patients) {
  const groups = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
  for (const p of patients) {
    const age = calcAge(p.dateOfBirth);
    if      (age <= 18) groups['0-18']++;
    else if (age <= 35) groups['19-35']++;
    else if (age <= 50) groups['36-50']++;
    else if (age <= 65) groups['51-65']++;
    else                groups['65+']++;
  }
  const total = patients.length || 1;
  return Object.entries(groups).map(([ageGroup, count]) => ({
    ageGroup,
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

// ── Top Conditions (most common diagnoses) ────────────────────────────────────
function calcTopConditions(patients, limit = 10) {
  const condMap = {};
  for (const p of patients) {
    for (const h of (p.medicalHistory || [])) {
      const cond = (h.condition || '').trim();
      if (cond) condMap[cond] = (condMap[cond] || 0) + 1;
    }
  }
  return Object.entries(condMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

// ── Patient Monthly Trends (new patients per month, last 6 months) ────────────
function calcPatientMonthlyTrends(patients) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const base  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end   = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
    const label = base.toLocaleString('default', { month: 'short', year: '2-digit' });
    const newPatients = patients.filter(p => {
      const created = new Date(p.createdAt || 0);
      return created >= start && created <= end;
    }).length;
    months.push({ month: label, newPatients });
  }
  return months;
}

// ── Referrals by Specialty ────────────────────────────────────────────────────
// Joins referrals → User.specialty via receivingProvider ID
async function calcReferralsBySpecialty(referrals) {
  const providerIds = [...new Set(referrals.map(r => r.receivingProvider).filter(Boolean))];
  const providerMap = {};
  if (providerIds.length > 0) {
    const users = await User.find({ _id: { $in: providerIds } }).select('specialty').lean();
    for (const u of users) providerMap[String(u._id)] = u.specialty || 'Other';
  }

  const specMap = {};
  for (const r of referrals) {
    const spec = providerMap[String(r.receivingProvider)] || 'Other';
    specMap[spec] = (specMap[spec] || 0) + 1;
  }

  const total = referrals.length || 1;
  return Object.entries(specMap)
    .sort((a, b) => b[1] - a[1])
    .map(([specialty, count]) => ({
      specialty,
      count,
      percentage: Math.round((count / total) * 100),
    }));
}

// ── Referral Status Distribution ──────────────────────────────────────────────
function calcReferralStatusDistribution(referrals) {
  const statusMap = {};
  for (const r of referrals) {
    const s = r.status || 'unknown';
    statusMap[s] = (statusMap[s] || 0) + 1;
  }
  return Object.entries(statusMap)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count }));
}

// ── Referral Monthly Trends (last 6 months) ───────────────────────────────────
function calcReferralMonthlyTrends(referrals) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const base  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end   = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
    const label = base.toLocaleString('default', { month: 'short', year: '2-digit' });
    const inMonth = referrals.filter(r => {
      const created = new Date(r.createdAt || 0);
      return created >= start && created <= end;
    });
    months.push({
      month: label,
      sent:      inMonth.length,
      accepted:  inMonth.filter(r => r.status === 'accepted' || r.status === 'completed').length,
      completed: inMonth.filter(r => r.status === 'completed').length,
    });
  }
  return months;
}

// ── Referral Provider Conversion ──────────────────────────────────────────────
// Per-provider sent / accepted / completed / conversion rate (top 10 by volume)
async function calcReferralProviderConversion(referrals) {
  const provMap = {};
  for (const r of referrals) {
    const pid = String(r.referringProvider || 'unknown');
    if (pid === 'unknown') continue;
    if (!provMap[pid]) provMap[pid] = { sent: 0, accepted: 0, completed: 0 };
    provMap[pid].sent++;
    if (r.status === 'accepted' || r.status === 'completed') provMap[pid].accepted++;
    if (r.status === 'completed') provMap[pid].completed++;
  }

  const providerIds = Object.keys(provMap);
  const userMap = {};
  if (providerIds.length > 0) {
    const users = await User.find({ _id: { $in: providerIds } }).select('name specialty').lean();
    for (const u of users) userMap[String(u._id)] = u;
  }

  return Object.entries(provMap)
    .map(([id, stats]) => {
      const user = userMap[id] || {};
      return {
        provider:  user.name     || id,
        specialty: user.specialty || 'Unknown',
        sent:      stats.sent,
        accepted:  stats.accepted,
        completed: stats.completed,
        rate:      stats.sent > 0 ? Math.round((stats.completed / stats.sent) * 100) : 0,
      };
    })
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 10);
}

// ── Enrich trend from prior snapshot ─────────────────────────────────────────
// If a previous global snapshot exists, back-fill the trend on adherence
// and missed appointments by comparing against that snapshot's values.
function enrichTrends(metrics, priorSnapshot) {
  if (!priorSnapshot) return metrics;
  const prior = priorSnapshot.metrics || {};

  if (prior.treatmentAdherence && prior.treatmentAdherence.value > 0) {
    const diff = metrics.treatmentAdherence.value - prior.treatmentAdherence.value;
    metrics.treatmentAdherence.trend = Math.round(
      (diff / prior.treatmentAdherence.value) * 100
    );
  }

  if (prior.missedAppointments && prior.missedAppointments.value > 0) {
    const diff = metrics.missedAppointments.value - prior.missedAppointments.value;
    // For missed appointments negative trend = improvement
    metrics.missedAppointments.trend = Math.round(
      (diff / prior.missedAppointments.value) * 100
    );
  }

  return metrics;
}

// ── Main Job Runner ───────────────────────────────────────────────────────────

async function runAnalyticsJob(triggeredBy = 'job', providerId = null) {
  const started    = Date.now();
  const snapshotId = `snap-${started}-${Math.random().toString(36).slice(2, 8)}`;
  const scope      = providerId ? 'provider' : 'global';
  const errors     = [];

  logger.info('[Analytics] Job started', { snapshotId, triggeredBy, providerId, scope });

  try {
    // ── Load patients ────────────────────────────────────────────────────
    const patientFilter = providerId ? { primaryProvider: providerId } : {};
    const patients      = await Patient.find(patientFilter).lean();

    // ── Risk scores — calculate and bulk-update ──────────────────────────
    let riskHigh = 0, riskMedium = 0, riskLow = 0;
    const bulkOps = patients.map(p => {
      const newScore = calcRiskScore(p);
      if      (newScore >= 70) riskHigh++;
      else if (newScore >= 30) riskMedium++;
      else                     riskLow++;

      return {
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { riskScore: newScore } },
        },
      };
    });

    if (bulkOps.length > 0) {
      await Patient.bulkWrite(bulkOps, { ordered: false });
      logger.info('[Analytics] Risk scores updated', { count: bulkOps.length });
    }

    // ── Aggregate metrics ────────────────────────────────────────────────
    const patientEngagement  = calcEngagement(patients);
    const treatmentAdherence = calcAdherence(patients);
    const missedAppointments = calcMissedAppointments(patients);

    // ── Referral metrics ─────────────────────────────────────────────────
    const referralFilter = providerId ? { referringProvider: providerId } : {};
    const referrals      = await Referral.find(referralFilter).lean();
    const accepted       = referrals.filter(
      r => r.status === 'accepted' || r.status === 'completed'
    );
    const pendingCount = referrals.filter(r => r.status === 'pending').length;
    const referralAcceptanceRate = referrals.length
      ? Math.round((accepted.length / referrals.length) * 100)
      : 0;

    // ── Active providers (global only) ───────────────────────────────────
    let activeProviderCount = 0;
    if (!providerId) {
      activeProviderCount = await User.countDocuments({
        role:          { $in: ['doctor', 'clinic', 'hospital'] },
        isActive:      true,
        accountStatus: 'approved',
      });
    }

    // ── Extended patient analytics ────────────────────────────────────────
    const patientDemographics   = calcPatientDemographics(patients);
    const topConditions         = calcTopConditions(patients);
    const patientMonthlyTrends  = calcPatientMonthlyTrends(patients);

    // ── Extended referral analytics ───────────────────────────────────────
    const [
      referralsBySpecialty,
      referralProviderConversion,
    ] = await Promise.all([
      calcReferralsBySpecialty(referrals),
      calcReferralProviderConversion(referrals),
    ]);
    const referralStatusDistribution = calcReferralStatusDistribution(referrals);
    const referralMonthlyTrends      = calcReferralMonthlyTrends(referrals);

    // ── Enrich trends from prior snapshot ────────────────────────────────
    const priorSnapshot = await AnalyticsSnapshot.findOne(
      { scope, scopeId: providerId || null },
      null,
      { sort: { computedAt: -1 } }
    ).lean();

    const enrichedMetrics = enrichTrends(
      { patientEngagement, treatmentAdherence, missedAppointments },
      priorSnapshot
    );

    // ── Save snapshot ─────────────────────────────────────────────────────
    const snapshot = await AnalyticsSnapshot.create({
      snapshotId,
      scope,
      scopeId:    providerId || null,
      period:     {
        from: new Date(Date.now() - ENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000),
        to:   new Date(),
      },
      computedBy:  String(triggeredBy),
      durationMs:  Date.now() - started,
      metrics: {
        patientEngagement:  enrichedMetrics.patientEngagement,
        treatmentAdherence: enrichedMetrics.treatmentAdherence,
        missedAppointments: enrichedMetrics.missedAppointments,
        riskDistribution: {
          high:   riskHigh,
          medium: riskMedium,
          low:    riskLow,
          total:  patients.length,
        },
        referralVolume: {
          value: referrals.length,
          trend: 0,
          unit:  'count',
          label: `${referrals.length} total referrals`,
        },
        referralAcceptanceRate: {
          value: referralAcceptanceRate,
          trend: 0,
          unit:  'percent',
          label: `${accepted.length} of ${referrals.length} referrals accepted`,
        },
        activeProviders: {
          value: activeProviderCount,
          unit:  'count',
          label: `${activeProviderCount} active approved providers`,
        },
        totalPatients: {
          value: patients.length,
          unit:  'count',
          label: `${patients.length} patients in scope`,
        },
        pendingReferrals: {
          value: pendingCount,
          unit:  'count',
          label: `${pendingCount} referrals awaiting response`,
        },
        // Patient analytics
        patientDemographics,
        topConditions,
        patientMonthlyTrends,
        // Referral analytics
        referralsBySpecialty,
        referralStatusDistribution,
        referralMonthlyTrends,
        referralProviderConversion,
      },
      errors,
    });

    logger.info('[Analytics] Job completed', {
      snapshotId,
      durationMs:       snapshot.durationMs,
      patientsUpdated:  patients.length,
    });

    return { success: true, snapshot, patientsUpdated: patients.length };

  } catch (err) {
    logger.error('[Analytics] Job failed', { snapshotId, error: err.message, stack: err.stack });
    throw err;
  }
}

// ── Read Latest Snapshot ──────────────────────────────────────────────────────

async function getLatestSnapshot(scope = 'global', scopeId = null) {
  return AnalyticsSnapshot.findOne(
    { scope, scopeId: scopeId || null },
    null,
    { sort: { computedAt: -1 } }
  ).lean();
}

// ── Live provider summary (real-time, no snapshot required) ──────────────────
// Used by the provider-facing Patients page.  Loads only the current provider's
// patients and computes metrics in-request.  Fast enough for ≤500 patients.
// At scale, replace with a provider-scoped snapshot read.
async function getLiveProviderSummary(providerId) {
  const patients = await Patient.find({ primaryProvider: providerId }).lean();
  return {
    patientEngagement:  calcEngagement(patients),
    treatmentAdherence: calcAdherence(patients),
    missedAppointments: calcMissedAppointments(patients),
    riskDistribution: patients.reduce(
      (acc, p) => {
        const s = p.riskScore ?? calcRiskScore(p);
        if      (s >= 70) acc.high++;
        else if (s >= 30) acc.medium++;
        else              acc.low++;
        acc.total++;
        return acc;
      },
      { high: 0, medium: 0, low: 0, total: 0 }
    ),
    totalPatients: patients.length,
    computedAt:    new Date(),
    isLive:        true,
  };
}

module.exports = {
  runAnalyticsJob,
  getLatestSnapshot,
  getLiveProviderSummary,
  // Exported for unit tests
  calcRiskScore,
  calcEngagement,
  calcAdherence,
  calcMissedAppointments,
  calcPatientDemographics,
  calcTopConditions,
  calcPatientMonthlyTrends,
  calcReferralsBySpecialty,
  calcReferralStatusDistribution,
  calcReferralMonthlyTrends,
  calcReferralProviderConversion,
};
