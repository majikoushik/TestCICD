'use strict';

const ProviderMatchProfile = require('../models/ProviderMatchProfile');
const MatchSession = require('../models/MatchSession');
const MatchingConfig = require('../models/MatchingConfig');

// ── Config cache (1-minute TTL) ───────────────────────────────────────────────
let _configCache = null;
let _configCacheTime = 0;
const CONFIG_CACHE_TTL = 60 * 1000;

function invalidateConfigCache() {
  _configCache = null;
  _configCacheTime = 0;
}

async function getConfig() {
  const now = Date.now();
  if (_configCache && (now - _configCacheTime) < CONFIG_CACHE_TTL) return _configCache;
  _configCache = await MatchingConfig.getSingleton();
  _configCacheTime = now;
  return _configCache;
}

// ── Scoring functions ─────────────────────────────────────────────────────────

function calcSpecialtyScore(profile, requestedSpecialty, config) {
  if (!requestedSpecialty) return { score: 0, matched: false };

  const reqLower = requestedSpecialty.toLowerCase().trim();
  const provSpecialty = (profile.specialty || '').toLowerCase().trim();

  // Build synonym lookup from config (DB-driven, editable by admin)
  const synonymGroups = config.synonymGroups || [];
  let synonymGroup = null;
  for (const group of synonymGroups) {
    const lowerTerms = (group.terms || []).map(t => t.toLowerCase().trim());
    if (lowerTerms.includes(reqLower)) {
      synonymGroup = lowerTerms;
      break;
    }
  }

  // 1. Exact case-insensitive match
  if (provSpecialty === reqLower) {
    return { score: config.scoreWeights?.specialty ?? 30, matched: true };
  }

  // 2. Provider specialty is in the same synonym group as the requested specialty
  if (synonymGroup && synonymGroup.includes(provSpecialty)) {
    return { score: Math.round((config.scoreWeights?.specialty ?? 30) * 0.73), matched: true };
  }

  // 3. Provider's subSpecialties contains the requested specialty
  const subSpecialties = (profile.subSpecialties || []).map(s => s.toLowerCase().trim());
  if (subSpecialties.includes(reqLower)) {
    return { score: Math.round((config.scoreWeights?.specialty ?? 30) * 0.6), matched: true };
  }

  // 4. Partial / prefix matching (admin-configurable flag)
  //    e.g. "Derma" → "Dermatology", "Cardio" → "Cardiology"
  if (config.partialMatchEnabled) {
    const partialScore = config.partialMatchScore ?? 12;

    // Provider specialty starts with the search term (most useful case)
    if (provSpecialty.startsWith(reqLower)) {
      return { score: partialScore, matched: true };
    }
    // Search term starts with provider specialty
    if (reqLower.startsWith(provSpecialty) && provSpecialty.length >= 4) {
      return { score: partialScore, matched: true };
    }
    // Provider specialty contains the search term anywhere (min 4 chars to avoid noise)
    if (reqLower.length >= 4 && provSpecialty.includes(reqLower)) {
      return { score: Math.max(partialScore - 3, 1), matched: true };
    }
    // Check subSpecialties with partial match
    for (const sub of subSpecialties) {
      if (sub.startsWith(reqLower) || (reqLower.length >= 4 && sub.includes(reqLower))) {
        return { score: Math.max(partialScore - 4, 1), matched: true };
      }
    }
    // Check if provider specialty matches a synonym that starts with the search term
    if (synonymGroup) {
      for (const syn of synonymGroup) {
        if (syn.startsWith(reqLower) && provSpecialty === syn) {
          return { score: partialScore, matched: true };
        }
      }
    }
  }

  return { score: 0, matched: false };
}

function calcInsuranceScore(profile, patientInsurance, config) {
  const maxScore = config.scoreWeights?.insurance ?? 25;
  const accepted = profile.acceptedInsurance;

  if (!accepted || accepted.length === 0) return Math.round(maxScore * 0.48);
  if (!patientInsurance || patientInsurance.trim() === '') return Math.round(maxScore * 0.48);

  const patientLower  = patientInsurance.toLowerCase();
  const acceptedLower = accepted.map(ins => ins.toLowerCase());

  for (const ins of acceptedLower) {
    if (ins.includes(patientLower) || patientLower.includes(ins)) return maxScore;
  }

  const patientWords = patientLower.split(/\s+/).filter(w => w.length > 2);
  for (const ins of acceptedLower) {
    for (const word of patientWords) {
      if (ins.includes(word)) return Math.round(maxScore * 0.72);
    }
  }

  return Math.round(maxScore * 0.08);
}

function calcAcceptanceRateScore(profile, config) {
  const maxScore = config.scoreWeights?.acceptanceRate ?? 20;
  const rate = typeof profile.acceptanceRate === 'number' ? profile.acceptanceRate : 0;
  return Math.round(rate * maxScore);
}

function calcAvailabilityScore(profile, config) {
  if (!profile.isAcceptingReferrals) return 0;
  const maxScore = config.scoreWeights?.availability ?? 15;
  const avail = typeof profile.availabilityScore === 'number' ? profile.availabilityScore : 0;
  return Math.round((avail / 100) * maxScore);
}

function calcTokenStandingScore(profile, config) {
  const maxScore = config.scoreWeights?.tokenStanding ?? 10;
  const tokens = typeof profile.tokenEarned === 'number' ? profile.tokenEarned : 0;
  if (tokens >= 1000) return maxScore;
  if (tokens >= 500)  return Math.round(maxScore * 0.8);
  if (tokens >= 200)  return Math.round(maxScore * 0.6);
  if (tokens >= 50)   return Math.round(maxScore * 0.4);
  if (tokens > 0)     return Math.round(maxScore * 0.2);
  return 1;
}

function calcBonuses(profile, urgency) {
  let bonuses = 0;
  if (profile.networkParticipation) bonuses += 3;
  if (profile.boardCertified) bonuses += 2;
  if (profile.telehealth && (urgency === 'urgent' || urgency === 'emergency')) bonuses += 2;
  const responseDays = typeof profile.avgResponseTimeDays === 'number' ? profile.avgResponseTimeDays : null;
  if (responseDays !== null) {
    if (responseDays <= 1)      bonuses += 3;
    else if (responseDays <= 2) bonuses += 2;
    else if (responseDays <= 3) bonuses += 1;
  }
  return bonuses;
}

// Bypass mode: flat text-match bonus so text-relevant providers rank above others.
function calcBypassTextBonus(profile, searchTerm) {
  if (!searchTerm) return 0;
  const term = searchTerm.toLowerCase().trim();
  if (term.length < 2) return 0;
  const fields = [
    profile.providerName || '',
    profile.specialty || '',
    ...(profile.subSpecialties || []),
  ].map(f => f.toLowerCase());
  for (const f of fields) {
    if (f.includes(term)) return 15;
  }
  return 0;
}

function scoreProvider(profile, criteria, config) {
  const { specialty, patientInsurance, urgency } = criteria || {};

  const specialtyResult   = calcSpecialtyScore(profile, specialty, config);
  const insuranceScore    = calcInsuranceScore(profile, patientInsurance, config);
  const acceptanceScore   = calcAcceptanceRateScore(profile, config);
  const availabilityScore = calcAvailabilityScore(profile, config);
  const tokenScore        = calcTokenStandingScore(profile, config);
  const bonuses           = calcBonuses(profile, urgency);

  const raw = specialtyResult.score + insuranceScore + acceptanceScore + availabilityScore + tokenScore + bonuses;

  return {
    ...profile,
    matchScore: Math.min(100, raw),
    _specialtyMatched: specialtyResult.matched,
    scoreBreakdown: {
      specialty:      specialtyResult.score,
      insurance:      insuranceScore,
      acceptanceRate: acceptanceScore,
      availability:   availabilityScore,
      tokenStanding:  tokenScore,
      bonuses,
    },
  };
}

// ── findMatches ───────────────────────────────────────────────────────────────

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
      requestedBy,
      requestedByName,
    } = options;

    const config   = await getConfig();
    const minScore = options.minScore ?? config.minScoreThreshold ?? 0;

    // Fetch all profiles where the provider has not explicitly opted out.
    // $ne:false includes documents where the field is missing (insertMany bypass).
    const profiles = await ProviderMatchProfile.find({ isAcceptingReferrals: { $ne: false } }).lean();

    let scored = profiles
      .filter(p => !excludeProviderIds.includes(String(p._id)))
      .map(p => scoreProvider(p, criteria, config));

    if (config.bypassSpecialtyFilter) {
      // Bypass: return all providers; text-match bonus lifts relevant ones higher.
      if (specialty) {
        scored = scored.map(p => ({
          ...p,
          matchScore: Math.min(100, p.matchScore + calcBypassTextBonus(p, specialty)),
        }));
      }
    } else if (specialty) {
      // Normal: hard specialty gate — drop providers with no specialty match.
      scored = scored.filter(p => p._specialtyMatched);
    }

    scored = scored.filter(p => p.matchScore >= minScore);
    scored.sort((a, b) => b.matchScore - a.matchScore);

    const allScored  = scored;
    const topResults = scored.slice(0, limit);

    topResults.forEach(p => { delete p._specialtyMatched; });
    allScored.forEach(p => { delete p._specialtyMatched; });

    MatchSession.create({
      requestedBy,
      requestedByName,
      specialty,
      patientInsurance,
      patientCity,
      patientState,
      urgency,
      resultsCount:  topResults.length,
      topMatchScore: topResults.length > 0 ? topResults[0].matchScore : 0,
      suggestions:   topResults.map(p => ({
        providerId:     p._id,
        providerName:   p.providerName || p.name,
        specialty:      p.specialty,
        matchScore:     p.matchScore,
        scoreBreakdown: p.scoreBreakdown,
      })),
    }).catch(() => {});

    return { success: true, matches: topResults, criteria, total: allScored.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Supporting functions ──────────────────────────────────────────────────────

async function recordSelection(matchSessionId, selectedProviderId, selectedProviderName, selectedMatchScore, linkedReferralId) {
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
            avgTopMatchScore: { $avg: { $arrayElemAt: ['$topMatches.matchScore', 0] } },
            selectedCount: { $sum: { $cond: [{ $ifNull: ['$selectedProviderId', false] }, 1, 0] } },
          },
        },
      ]),
      MatchSession.aggregate([
        { $match: filters },
        { $group: { _id: '$criteria.specialty', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, specialty: '$_id', count: 1 } },
      ]),
      MatchSession.aggregate([
        { $match: { ...filters, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } },
      ]),
    ]);

    const overall = overallStats[0] || { total: 0, avgTopMatchScore: 0, selectedCount: 0 };
    const total   = overall.total || 0;

    return {
      success: true,
      data: {
        total,
        avgTopMatchScore: overall.avgTopMatchScore || 0,
        selectionRate:    total > 0 ? overall.selectedCount / total : 0,
        topSpecialties,
        recentSessions,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { findMatches, scoreProvider, recordSelection, getMatchingStats, invalidateConfigCache };
