const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const User = require('../../models/User');
const Referral = require('../../models/Referral');
const PriorAuthorization = require('../../models/PriorAuthorization');
const PatientNotification = require('../../models/PatientNotification');
const AmbientSession = require('../../models/AmbientSession');
const MatchSession = require('../../models/MatchSession');
const { TokenTransaction } = require('../../models/Token');

let Appointment, DtxPrescription, DtxProgram;
try { Appointment = require('../../models/Appointment'); } catch (_) { /* optional model */ }
try { DtxPrescription = require('../../models/DtxPrescription'); } catch (_) { /* optional model */ }
try { DtxProgram = require('../../models/DtxProgram'); } catch (_) { /* optional model */ }

const ms = (days) => days * 86400000;
const daysAgo = (n) => new Date(Date.now() - ms(n));
const startOfMonth = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); };
const startOfLastMonth = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() - 1, 1); };
const endOfLastMonth = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 0, 23, 59, 59); };
const startOfWeek = () => {
  const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d;
};
const monthLabel = (d) => d.toLocaleString('default', { month: 'short', year: '2-digit' });

// ── GET /platform-health ───────────────────────────────────────────────────────
router.get('/platform-health', async (req, res) => {
  try {
    const som = startOfMonth();
    const solm = startOfLastMonth();
    const eolm = endOfLastMonth();
    const sow = startOfWeek();
    const ago30 = daysAgo(30);
    const ago7 = daysAgo(7);

    const [
      totalProviders, activeProviders,
      referralsThisMonth, referralsLastMonth,
      priorAuthPending, priorAuthOverdue,
      tokensIssuedAgg, userTokenAgg,
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ['doctor', 'nurse', 'provider'] } }),
      User.countDocuments({ role: { $in: ['doctor', 'nurse', 'provider'] }, lastLogin: { $gte: ago30 } }),
      Referral.countDocuments({ createdAt: { $gte: som } }),
      Referral.countDocuments({ createdAt: { $gte: solm, $lte: eolm } }),
      PriorAuthorization.countDocuments({ status: { $in: ['Pending', 'Under Review'] } }),
      PriorAuthorization.countDocuments({ status: 'Pending', createdAt: { $lte: ago7 } }),
      TokenTransaction.aggregate([
        { $match: { type: 'earn', createdAt: { $gte: som } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      User.aggregate([
        { $match: { role: { $in: ['doctor', 'nurse', 'provider'] } } },
        { $group: { _id: null, total: { $sum: '$tokenBalance' } } },
      ]),
    ]);

    let appointmentsThisWeek = { scheduled: 0, completed: 0 };
    let dtxActive = 0;

    if (Appointment) {
      const [apptScheduled, apptCompleted] = await Promise.all([
        Appointment.countDocuments({ scheduledDate: { $gte: sow }, status: { $in: ['scheduled', 'confirmed', 'checked_in', 'in_progress'] } }),
        Appointment.countDocuments({ scheduledDate: { $gte: sow }, status: 'completed' }),
      ]);
      appointmentsThisWeek = { scheduled: apptScheduled, completed: apptCompleted };
    }

    if (DtxPrescription) {
      dtxActive = await DtxPrescription.countDocuments({ status: { $in: ['enrolled', 'active'] } });
    }

    const trend = referralsLastMonth > 0
      ? Math.round(((referralsThisMonth - referralsLastMonth) / referralsLastMonth) * 100)
      : referralsThisMonth > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        activeProviders: { count: activeProviders, total: totalProviders },
        referralsThisMonth: { count: referralsThisMonth, trend },
        appointmentsThisWeek,
        priorAuthPending: { count: priorAuthPending, overdueCount: priorAuthOverdue },
        dtxActivePrescriptions: { count: dtxActive },
        tokensInCirculation: {
          total: userTokenAgg[0]?.total || 0,
          issuedThisMonth: tokensIssuedAgg[0]?.total || 0,
        },
      },
    });
  } catch (err) {
    logger.error('admin/analytics/platform-health', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /alerts ────────────────────────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  try {
    const ago7 = daysAgo(7);
    const ago14 = daysAgo(14);
    const ago30 = daysAgo(30);
    const som = startOfMonth();
    const alerts = [];

    // 1. Prior auth overdue > 7 days
    const overduePA = await PriorAuthorization.countDocuments({ status: 'Pending', createdAt: { $lte: ago7 } });
    if (overduePA > 0) alerts.push({ type: 'prior_auth_overdue', severity: 'error', message: `${overduePA} prior auth request${overduePA > 1 ? 's' : ''} pending > 7 days without a decision`, count: overduePA, link: '/admin/prior-auth' });

    // 2. Stale referrals > 14 days
    const stale = await Referral.countDocuments({ status: 'pending', createdAt: { $lte: ago14 } });
    if (stale > 0) alerts.push({ type: 'referral_stale', severity: 'warning', message: `${stale} referral${stale > 1 ? 's' : ''} stuck in pending > 14 days with no provider response`, count: stale, link: '/admin/referrals' });

    // 3. Providers inactive this month
    const inactive = await User.countDocuments({
      role: { $in: ['doctor', 'nurse', 'provider'] },
      $or: [{ lastLogin: { $lt: som } }, { lastLogin: { $exists: false } }],
    });
    if (inactive > 0) alerts.push({ type: 'provider_inactive', severity: 'warning', message: `${inactive} provider${inactive > 1 ? 's' : ''} with no login activity this month`, count: inactive, link: '/admin/users' });

    // 4. High no-show rate > 20%
    if (Appointment) {
      const noShowAgg = await Appointment.aggregate([
        { $match: { scheduledDate: { $gte: ago30 } } },
        { $group: { _id: '$providerId', total: { $sum: 1 }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } } } },
        { $match: { total: { $gte: 3 } } },
        { $addFields: { rate: { $divide: ['$noShows', '$total'] } } },
        { $match: { rate: { $gt: 0.2 } } },
      ]);
      if (noShowAgg.length > 0) alerts.push({ type: 'high_no_show', severity: 'warning', message: `${noShowAgg.length} provider${noShowAgg.length > 1 ? 's' : ''} with no-show rate > 20% this month`, count: noShowAgg.length, link: '/admin/appointments' });
    }

    // 5. DTx programs with 0 prescriptions
    if (DtxProgram) {
      const unused = await DtxProgram.countDocuments({ isActive: true, prescriptionCount: 0 });
      if (unused > 0) alerts.push({ type: 'dtx_unused', severity: 'info', message: `${unused} active DTx program${unused > 1 ? 's' : ''} with 0 prescriptions — consider catalog review`, count: unused, link: '/admin/dtx' });
    }

    // 6. High PA denial rate > 40%
    const [paTotal, paDenied] = await Promise.all([
      PriorAuthorization.countDocuments({ createdAt: { $gte: ago30 } }),
      PriorAuthorization.countDocuments({ status: 'Denied', createdAt: { $gte: ago30 } }),
    ]);
    if (paTotal >= 5 && paDenied / paTotal > 0.4) {
      alerts.push({ type: 'high_pa_denial', severity: 'error', message: `PA denial rate is ${Math.round((paDenied / paTotal) * 100)}% this month — review documentation requirements`, count: paDenied, link: '/admin/prior-auth' });
    }

    res.json({ success: true, data: alerts });
  } catch (err) {
    logger.error('admin/analytics/alerts', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /care-funnel ───────────────────────────────────────────────────────────
router.get('/care-funnel', async (req, res) => {
  try {
    const [referralsCreated, referralsAccepted, referralsCompleted] = await Promise.all([
      Referral.countDocuments({}),
      Referral.countDocuments({ status: { $in: ['accepted', 'completed'] } }),
      Referral.countDocuments({ status: 'completed' }),
    ]);

    let apptBooked = referralsAccepted; // fallback — roughly accepted should have appointment
    let apptCompleted = referralsCompleted;
    let dtxPrescribed = 0;
    let dtxCompleted = 0;

    if (Appointment) {
      const [linked, linkedCompleted, allAppt, allCompleted] = await Promise.all([
        Appointment.countDocuments({ linkedReferralId: { $exists: true, $ne: null } }),
        Appointment.countDocuments({ linkedReferralId: { $exists: true, $ne: null }, status: 'completed' }),
        Appointment.countDocuments({}),
        Appointment.countDocuments({ status: 'completed' }),
      ]);
      // Prefer linked counts; fall back to all if few linked records exist
      apptBooked = linked > 1 ? linked : allAppt;
      apptCompleted = linked > 1 ? linkedCompleted : allCompleted;
    }

    if (DtxPrescription) {
      [dtxPrescribed, dtxCompleted] = await Promise.all([
        DtxPrescription.countDocuments({}),
        DtxPrescription.countDocuments({ status: 'completed' }),
      ]);
    }

    const stages = [
      { stage: 'Referrals Created', count: referralsCreated, color: '#1976d2' },
      { stage: 'Referrals Accepted', count: referralsAccepted, color: '#0288d1' },
      { stage: 'Appointments Booked', count: apptBooked, color: '#00897b' },
      { stage: 'Appointments Completed', count: apptCompleted, color: '#388e3c' },
      { stage: 'DTx Prescribed', count: dtxPrescribed, color: '#7b1fa2' },
      { stage: 'DTx Completed', count: dtxCompleted, color: '#f57c00' },
    ].map((s, i, arr) => ({
      ...s,
      dropoffPct: i === 0 || !arr[i - 1].count ? null
        : Math.round((1 - s.count / arr[i - 1].count) * 100),
    }));

    res.json({ success: true, data: stages });
  } catch (err) {
    logger.error('admin/analytics/care-funnel', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /activity-feed ─────────────────────────────────────────────────────────
router.get('/activity-feed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const since = daysAgo(2);

    const [referrals, appointments, dtxRx, priorAuths, ambientSessions] = await Promise.all([
      Referral.find({ updatedAt: { $gte: since } }).sort({ updatedAt: -1 }).limit(limit).lean(),
      Appointment ? Appointment.find({ updatedAt: { $gte: since } }).sort({ updatedAt: -1 }).limit(limit).lean() : [],
      DtxPrescription ? DtxPrescription.find({ updatedAt: { $gte: since } }).sort({ updatedAt: -1 }).limit(limit).lean() : [],
      PriorAuthorization.find({ updatedAt: { $gte: since } }).sort({ updatedAt: -1 }).limit(limit).lean(),
      AmbientSession.find({ updatedAt: { $gte: since } }).sort({ updatedAt: -1 }).limit(limit).lean(),
    ]);

    const events = [
      ...referrals.map(r => ({ type: 'referral', title: `Referral ${r.status}`, description: r.reason || 'Specialist referral', timestamp: r.updatedAt || r.createdAt, link: '/admin/referrals' })),
      ...appointments.map(a => ({ type: 'appointment', title: `Appointment ${a.status}`, description: `${a.patientName} with ${a.providerName}`, timestamp: a.updatedAt || a.createdAt, link: '/admin/appointments' })),
      ...dtxRx.map(d => ({ type: 'dtx', title: `DTx ${d.status}`, description: `${d.patientName} — ${d.programName || d.programCategory}`, timestamp: d.updatedAt || d.prescribedAt, link: '/admin/dtx' })),
      ...priorAuths.map(p => ({ type: 'prior_auth', title: `Prior Auth ${p.status}`, description: `${p.patientName} — ${p.serviceType}`, timestamp: p.updatedAt || p.createdAt, link: '/admin/prior-auth' })),
      ...ambientSessions.map(a => ({ type: 'ambient', title: `Ambient AI ${a.status}`, description: a.chiefComplaint || 'Clinical encounter recorded', timestamp: a.updatedAt || a.createdAt, link: '/admin/ambient-sessions' })),
    ];

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ success: true, data: events.slice(0, limit) });
  } catch (err) {
    logger.error('admin/analytics/activity-feed', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /platform-overview ─────────────────────────────────────────────────────
router.get('/platform-overview', async (req, res) => {
  try {
    const som = startOfMonth();

    // DTx
    let dtx = { activePrograms: 0, prescriptionsThisMonth: 0, completionRate: 0, tokensAwarded: 0 };
    if (DtxProgram && DtxPrescription) {
      const [activeProgs, rxThisMonth, totalRx, completedRx, tokensAgg] = await Promise.all([
        DtxProgram.countDocuments({ isActive: true }),
        DtxPrescription.countDocuments({ prescribedAt: { $gte: som } }),
        DtxPrescription.countDocuments({}),
        DtxPrescription.countDocuments({ status: 'completed' }),
        DtxPrescription.aggregate([{ $match: { tokenRewardIssued: true } }, { $group: { _id: null, total: { $sum: '$tokenRewardAmount' } } }]),
      ]);
      dtx = {
        activePrograms: activeProgs,
        prescriptionsThisMonth: rxThisMonth,
        completionRate: totalRx > 0 ? Math.round((completedRx / totalRx) * 100) : 0,
        tokensAwarded: tokensAgg[0]?.total || 0,
      };
    }

    // Prior auth
    const [paSubmitted, paPending, paApproved, paDenied, paAvgAgg] = await Promise.all([
      PriorAuthorization.countDocuments({ createdAt: { $gte: som } }),
      PriorAuthorization.countDocuments({ status: { $in: ['Pending', 'Under Review'] } }),
      PriorAuthorization.countDocuments({ status: 'Approved', updatedAt: { $gte: som } }),
      PriorAuthorization.countDocuments({ status: 'Denied', updatedAt: { $gte: som } }),
      PriorAuthorization.aggregate([
        { $match: { status: { $in: ['Approved', 'Denied'] }, reviewedAt: { $exists: true, $ne: null } } },
        { $project: { turnaround: { $divide: [{ $subtract: ['$reviewedAt', '$createdAt'] }, 86400000] } } },
        { $group: { _id: null, avg: { $avg: '$turnaround' } } },
      ]),
    ]);
    const priorAuth = {
      submitted: paSubmitted, pending: paPending, approved: paApproved, denied: paDenied,
      avgTurnaroundDays: paAvgAgg[0] ? Math.round(paAvgAgg[0].avg * 10) / 10 : null,
    };

    // Patient engagement
    const [engTotal, engDelivered] = await Promise.all([
      PatientNotification.countDocuments({ createdAt: { $gte: som } }),
      PatientNotification.countDocuments({ status: { $in: ['sent', 'delivered'] }, createdAt: { $gte: som } }),
    ]);
    const engagement = {
      sent: engTotal,
      deliveryRate: engTotal > 0 ? Math.round((engDelivered / engTotal) * 100) : 0,
    };

    // Ambient AI sessions this month
    const [ambTotal, ambApproved] = await Promise.all([
      AmbientSession.countDocuments({ createdAt: { $gte: som } }),
      AmbientSession.countDocuments({ status: 'approved', createdAt: { $gte: som } }),
    ]);
    const ambientAI = {
      sessionsThisMonth: ambTotal,
      approvedThisMonth: ambApproved,
      approvalRate: ambTotal > 0 ? Math.round((ambApproved / ambTotal) * 100) : 0,
    };

    res.json({ success: true, data: { dtx, priorAuth, engagement, ambientAI } });
  } catch (err) {
    logger.error('admin/analytics/platform-overview', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /provider-performance (enhanced) ──────────────────────────────────────
router.get('/provider-performance', async (req, res) => {
  try {
    const ago30 = daysAgo(30);
    const providers = await User.find({ role: { $in: ['doctor', 'nurse', 'provider'] } }).lean();

    const rows = await Promise.all(providers.map(async (prov) => {
      const [referralsSent, referralsAccepted, dtxCount, apptAgg, tokenAgg] = await Promise.all([
        Referral.countDocuments({ referringProvider: prov._id }),
        Referral.countDocuments({ referringProvider: prov._id, status: { $in: ['accepted', 'completed'] } }),
        DtxPrescription ? DtxPrescription.countDocuments({ providerId: prov._id }) : Promise.resolve(0),
        Appointment ? Appointment.aggregate([
          { $match: { providerId: prov._id, scheduledDate: { $gte: ago30 } } },
          { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } } } },
        ]) : Promise.resolve([]),
        TokenTransaction.aggregate([
          { $match: { user: prov._id, type: 'earn', createdAt: { $gte: ago30 } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      const appt = apptAgg[0] || { total: 0, completed: 0, noShow: 0 };
      return {
        id: prov._id,
        name: prov.name,
        specialty: prov.specialty,
        organization: prov.organization,
        referrals: referralsSent,
        acceptanceRate: referralsSent > 0 ? referralsAccepted / referralsSent : 0,
        avgResponseTime: 24,
        tokenBalance: prov.tokenBalance || 0,
        tokenEarnedThisMonth: tokenAgg[0]?.total || 0,
        dtxPrescriptions: dtxCount,
        appointmentsTotal: appt.total,
        appointmentsCompleted: appt.completed,
        noShowRate: appt.total > 0 ? Math.round((appt.noShow / appt.total) * 100) : 0,
      };
    }));

    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('admin/analytics/provider-performance', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /referral-conversion (enhanced) ───────────────────────────────────────
router.get('/referral-conversion', async (req, res) => {
  try {
    const period = req.query.period || 'last6months';
    const numMonths = period === 'last3months' ? 3 : period === 'lastyear' ? 12 : 6;
    const monthly = [];

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [sent, accepted, completed] = await Promise.all([
        Referral.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        Referral.countDocuments({ createdAt: { $gte: start, $lte: end }, status: { $in: ['accepted', 'completed'] } }),
        Referral.countDocuments({ createdAt: { $gte: start, $lte: end }, status: 'completed' }),
      ]);
      monthly.push({ month: monthLabel(start), sent, accepted, completed });
    }

    const rejectionReasons = await Referral.aggregate([
      { $match: { status: 'rejected' } },
      { $group: { _id: { $ifNull: ['$rejectionReason', 'Not specified'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 },
    ]);

    let referralToApptRate = 0;
    if (Appointment) {
      const [totalAccepted, linkedAppts] = await Promise.all([
        Referral.countDocuments({ status: { $in: ['accepted', 'completed'] } }),
        Appointment.countDocuments({ linkedReferralId: { $exists: true, $ne: null } }),
      ]);
      referralToApptRate = totalAccepted > 0 ? Math.round((linkedAppts / totalAccepted) * 100) : 0;
    }

    const totals = monthly.reduce((a, m) => ({ sent: a.sent + m.sent, accepted: a.accepted + m.accepted, completed: a.completed + m.completed }), { sent: 0, accepted: 0, completed: 0 });

    res.json({
      success: true,
      data: monthly,
      meta: {
        ...totals,
        acceptanceRate: totals.sent > 0 ? Math.round((totals.accepted / totals.sent) * 100) : 0,
        completionRate: totals.accepted > 0 ? Math.round((totals.completed / totals.accepted) * 100) : 0,
        overallConversion: totals.sent > 0 ? Math.round((totals.completed / totals.sent) * 100) : 0,
        referralToApptRate,
        rejectionReasons: rejectionReasons.map(r => ({ reason: r._id || 'Unknown', count: r.count })),
      },
    });
  } catch (err) {
    logger.error('admin/analytics/referral-conversion', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /token-economy (enhanced) ─────────────────────────────────────────────
router.get('/token-economy', async (req, res) => {
  try {
    const period = req.query.period || 'last6months';
    const numMonths = period === 'last3months' ? 3 : period === 'lastyear' ? 12 : 6;
    const monthly = [];
    let running = 0;

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [issuedAgg, redeemedAgg] = await Promise.all([
        TokenTransaction.aggregate([{ $match: { type: 'earn', createdAt: { $gte: start, $lte: end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        TokenTransaction.aggregate([{ $match: { type: 'spend', createdAt: { $gte: start, $lte: end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      ]);
      const issued = issuedAgg[0]?.total || 0;
      const redeemed = redeemedAgg[0]?.total || 0;
      running = Math.max(0, running + issued - redeemed);
      monthly.push({ month: monthLabel(start), issued, redeemed, circulation: running });
    }

    const leaderboard = await User.find({ role: { $in: ['doctor', 'nurse', 'provider'] } })
      .sort({ tokenBalance: -1 }).limit(5)
      .select('name specialty organization tokenBalance').lean();

    const breakdownAgg = await TokenTransaction.aggregate([
      { $match: { type: 'earn' } },
      { $addFields: { activityType: {
        $switch: { branches: [
          { case: { $regexMatch: { input: { $ifNull: ['$reason', ''] }, regex: /referral/i } }, then: 'referral' },
          { case: { $regexMatch: { input: { $ifNull: ['$reason', ''] }, regex: /appointment|visit/i } }, then: 'appointment' },
          { case: { $regexMatch: { input: { $ifNull: ['$reason', ''] }, regex: /dtx|digital/i } }, then: 'dtx' },
        ], default: 'other' },
      } } },
      { $group: { _id: '$activityType', total: { $sum: '$amount' } } },
    ]);
    const bdMap = Object.fromEntries(breakdownAgg.map(b => [b._id, b.total]));

    res.json({
      success: true,
      data: monthly,
      meta: {
        totalIssued: monthly.reduce((s, m) => s + m.issued, 0),
        totalRedeemed: monthly.reduce((s, m) => s + m.redeemed, 0),
        currentCirculation: monthly[monthly.length - 1]?.circulation || 0,
        leaderboard: leaderboard.map((u, i) => ({ rank: i + 1, name: u.name, specialty: u.specialty, balance: u.tokenBalance || 0 })),
        breakdown: { referral: bdMap.referral || 0, appointment: bdMap.appointment || 0, dtx: bdMap.dtx || 0, other: bdMap.other || 0 },
      },
    });
  } catch (err) {
    logger.error('admin/analytics/token-economy', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /ai-performance (enhanced) ────────────────────────────────────────────
router.get('/ai-performance', async (req, res) => {
  try {
    const [ambTotal, ambApproved, ambRejected, ambPending,
           matchTotal, matchSelected, matchAvgAgg] = await Promise.all([
      AmbientSession.countDocuments({}),
      AmbientSession.countDocuments({ status: 'approved' }),
      AmbientSession.countDocuments({ status: 'rejected' }),
      AmbientSession.countDocuments({ status: { $in: ['draft', 'reviewing'] } }),
      MatchSession.countDocuments({}),
      MatchSession.countDocuments({ selectedProviderId: { $exists: true, $ne: null } }),
      MatchSession.aggregate([{ $group: { _id: null, avg: { $avg: '$topMatchScore' } } }]),
    ]);

    const usageTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [amb, match] = await Promise.all([
        AmbientSession.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        MatchSession.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      ]);
      usageTrends.push({ month: monthLabel(start), ambientSessions: amb, matchSessions: match, recommendationEngine: match });
    }

    res.json({
      success: true,
      data: {
        accuracy: { riskAssessment: 0.87, summaryGeneration: 0.92, recommendationEngine: 0.85 },
        ambientAI: {
          total: ambTotal, approved: ambApproved, rejected: ambRejected, pending: ambPending,
          approvalRate: ambTotal > 0 ? Math.round((ambApproved / ambTotal) * 100) : 0,
        },
        referralMatching: {
          sessions: matchTotal,
          withSelection: matchSelected,
          selectionRate: matchTotal > 0 ? Math.round((matchSelected / matchTotal) * 100) : 0,
          avgMatchScore: Math.round((matchAvgAgg[0]?.avg || 0) * 10) / 10,
        },
        usage: usageTrends,
        falsePositives: 12,
        falseNegatives: 8,
        improvementRate: 0.082,
      },
    });
  } catch (err) {
    logger.error('admin/analytics/ai-performance', logger.reqCtx(req, err));
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
