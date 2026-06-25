'use strict';

const ProviderMatchProfile = require('../models/ProviderMatchProfile');
const MatchSession = require('../models/MatchSession');

const SPECIALTY_SYNONYMS = {
  'Cardiology': ['Cardiology', 'Cardiovascular', 'Cardiac Surgery', 'Interventional Cardiology', 'Electrophysiology'],
  'Orthopedics': ['Orthopedics', 'Orthopedic Surgery', 'Sports Medicine', 'Joint Replacement', 'Spine Surgery'],
  'Neurology': ['Neurology', 'Neurosurgery', 'Neurological Surgery', 'Epilepsy', 'Movement Disorders'],
  'Gastroenterology': ['Gastroenterology', 'GI', 'Hepatology', 'Endoscopy', 'Colorectal Surgery'],
  'Oncology': ['Oncology', 'Hematology', 'Medical Oncology', 'Radiation Oncology', 'Surgical Oncology'],
  'Pulmonology': ['Pulmonology', 'Pulmonary Medicine', 'Critical Care', 'Sleep Medicine', 'Thoracic Surgery'],
  'Rheumatology': ['Rheumatology', 'Immunology', 'Autoimmune'],
  'Endocrinology': ['Endocrinology', 'Diabetes Management', 'Metabolism', 'Thyroid'],
  'Ophthalmology': ['Ophthalmology', 'Eye Care', 'Retina', 'Glaucoma', 'Cornea'],
  'Dermatology': ['Dermatology', 'Skin', 'Mohs Surgery'],
  'Nephrology': ['Nephrology', 'Renal', 'Kidney', 'Dialysis'],
  'Urology': ['Urology', 'Urological Surgery'],
  'Psychiatry': ['Psychiatry', 'Mental Health', 'Psychology'],
  'ENT': ['ENT', 'Otolaryngology', 'Head and Neck Surgery'],
  'Allergy': ['Allergy', 'Allergy & Immunology', 'Immunology'],
};

function calcSpecialtyScore(profile, requestedSpecialty) {
  if (!requestedSpecialty) return { score: 0, matched: false };

  const reqLower = requestedSpecialty.toLowerCase();
  const provSpecialty = (profile.specialty || '').toLowerCase();

  // Find the synonym group that contains the requested specialty
  let synonymGroup = null;
  for (const [, synonyms] of Object.entries(SPECIALTY_SYNONYMS)) {
    const lowerSynonyms = synonyms.map(s => s.toLowerCase());
    if (lowerSynonyms.includes(reqLower)) {
      synonymGroup = lowerSynonyms;
      break;
    }
  }

  // Exact case-insensitive match on provider specialty
  if (provSpecialty === reqLower) {
    return { score: 30, matched: true };
  }

  // Provider specialty appears in the same synonym group as the requested specialty
  if (synonymGroup && synonymGroup.includes(provSpecialty)) {
    return { score: 22, matched: true };
  }

  // Provider's subSpecialties contains the requested specialty
  const subSpecialties = (profile.subSpecialties || []).map(s => s.toLowerCase());
  if (subSpecialties.includes(reqLower)) {
    return { score: 18, matched: true };
  }

  return { score: 0, matched: false };
}

function calcInsuranceScore(profile, patientInsurance) {
  const accepted = profile.acceptedInsurance;

  // Provider has no insurance data
  if (!accepted || accepted.length === 0) return 12;

  // Patient insurance unknown
  if (!patientInsurance || patientInsurance.trim() === '') return 12;

  const patientLower = patientInsurance.toLowerCase();
  const acceptedLower = accepted.map(ins => ins.toLowerCase());

  // Exact / partial match
  for (const ins of acceptedLower) {
    if (ins.includes(patientLower) || patientLower.includes(ins)) {
      return 25;
    }
  }

  // Common plan family match — check if first meaningful word overlaps
  const patientWords = patientLower.split(/\s+/).filter(w => w.length > 2);
  for (const ins of acceptedLower) {
    for (const word of patientWords) {
      if (ins.includes(word)) {
        return 18;
      }
    }
  }

  // Out-of-network still possible via exception
  return 2;
}

function calcAcceptanceRateScore(profile) {
  const rate = typeof profile.acceptanceRate === 'number' ? profile.acceptanceRate : 0;
  return Math.round(rate * 20);
}

function calcAvailabilityScore(profile) {
  if (!profile.isAcceptingReferrals) return 0;
  const avail = typeof profile.availabilityScore === 'number' ? profile.availabilityScore : 0;
  return Math.round((avail / 100) * 15);
}

function calcTokenStandingScore(profile) {
  const tokens = typeof profile.tokenEarned === 'number' ? profile.tokenEarned : 0;
  if (tokens >= 1000) return 10;
  if (tokens >= 500) return 8;
  if (tokens >= 200) return 6;
  if (tokens >= 50) return 4;
  if (tokens > 0) return 2;
  return 1;
}

function calcBonuses(profile, urgency) {
  let bonuses = 0;

  if (profile.networkParticipation) bonuses += 3;
  if (profile.boardCertified) bonuses += 2;

  if (
    profile.telehealth &&
    (urgency === 'urgent' || urgency === 'emergency')
  ) {
    bonuses += 2;
  }

  const responseDays = typeof profile.avgResponseTimeDays === 'number'
    ? profile.avgResponseTimeDays
    : null;

  if (responseDays !== null) {
    if (responseDays <= 1) bonuses += 3;
    else if (responseDays <= 2) bonuses += 2;
    else if (responseDays <= 3) bonuses += 1;
  }

  return bonuses;
}

function scoreProvider(profile, criteria) {
  const { specialty, patientInsurance, urgency } = criteria || {};

  const specialtyResult = calcSpecialtyScore(profile, specialty);
  const specialtyScore = specialtyResult.score;
  const specialtyMatched = specialtyResult.matched;

  const insuranceScore = calcInsuranceScore(profile, patientInsurance);
  const acceptanceRateScore = calcAcceptanceRateScore(profile);
  const availabilityScore = calcAvailabilityScore(profile);
  const tokenStandingScore = calcTokenStandingScore(profile);
  const bonuses = calcBonuses(profile, urgency);

  const raw =
    specialtyScore +
    insuranceScore +
    acceptanceRateScore +
    availabilityScore +
    tokenStandingScore +
    bonuses;

  const matchScore = Math.min(100, raw);

  return {
    ...profile,
    matchScore,
    _specialtyMatched: specialtyMatched,
    scoreBreakdown: {
      specialty: specialtyScore,
      insurance: insuranceScore,
      acceptanceRate: acceptanceRateScore,
      availability: availabilityScore,
      tokenStanding: tokenStandingScore,
      bonuses,
    },
  };
}

async function findMatches(criteria, options = {}) {
  try {
    const {
      specialty,
      patientInsurance,
      patientCity,
      patientState,
      urgency,
      excludeProviderIds = [],
    } = criteria || {};

    const {
      limit = 10,
      minScore = 0,
      requestedBy,
      requestedByName,
    } = options;

    // Fetch all active profiles
    const profiles = await ProviderMatchProfile.find({ isAcceptingReferrals: true }).lean();

    // Score each provider
    let scored = profiles
      .filter(p => !excludeProviderIds.includes(String(p._id)))
      .map(p => scoreProvider(p, criteria));

    // Filter: must have specialty match if specialty was requested
    if (specialty) {
      scored = scored.filter(p => p._specialtyMatched);
    }

    // Apply minScore filter
    scored = scored.filter(p => p.matchScore >= minScore);

    // Sort descending by matchScore
    scored.sort((a, b) => b.matchScore - a.matchScore);

    const allScored = scored;
    const topResults = scored.slice(0, limit);

    // Remove internal helper field
    topResults.forEach(p => { delete p._specialtyMatched; });
    allScored.forEach(p => { delete p._specialtyMatched; });

    // Save MatchSession fire-and-forget
    MatchSession.create({
      requestedBy,
      requestedByName,
      specialty,
      patientInsurance,
      patientCity,
      patientState,
      urgency,
      resultsCount: topResults.length,
      topMatchScore: topResults.length > 0 ? topResults[0].matchScore : 0,
      suggestions: topResults.map(p => ({
        providerId: p._id,
        providerName: p.providerName || p.name,
        specialty: p.specialty,
        matchScore: p.matchScore,
        scoreBreakdown: p.scoreBreakdown,
      })),
    }).catch(() => {});  // fire-and-forget

    return {
      success: true,
      matches: topResults,
      criteria,
      total: allScored.length,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function recordSelection(
  matchSessionId,
  selectedProviderId,
  selectedProviderName,
  selectedMatchScore,
  linkedReferralId
) {
  try {
    await MatchSession.findByIdAndUpdate(matchSessionId, {
      selectedProviderId,
      selectedProviderName,
      selectedMatchScore,
      linkedReferralId,
      selectedAt: new Date(),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getMatchingStats(filters = {}) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [overallStats, topSpecialties, recentSessions] = await Promise.all([
      MatchSession.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgTopMatchScore: {
              $avg: {
                $arrayElemAt: ['$topMatches.matchScore', 0],
              },
            },
            selectedCount: {
              $sum: {
                $cond: [{ $ifNull: ['$selectedProviderId', false] }, 1, 0],
              },
            },
          },
        },
      ]),

      MatchSession.aggregate([
        { $match: filters },
        {
          $group: {
            _id: '$criteria.specialty',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            specialty: '$_id',
            count: 1,
          },
        },
      ]),

      MatchSession.aggregate([
        {
          $match: {
            ...filters,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            count: 1,
          },
        },
      ]),
    ]);

    const overall = overallStats[0] || { total: 0, avgTopMatchScore: 0, selectedCount: 0 };
    const total = overall.total || 0;
    const selectionRate = total > 0 ? overall.selectedCount / total : 0;

    const stats = {
      total,
      avgTopMatchScore: overall.avgTopMatchScore || 0,
      selectionRate,
      topSpecialties,
      recentSessions,
    };

    return { success: true, data: stats };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { findMatches, scoreProvider, recordSelection, getMatchingStats };
