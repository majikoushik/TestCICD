import { get, post, put } from '../utils/apiUtils';

const BASE = '/prior-auth';
const ADMIN_BASE = '/admin/prior-auth';

// ── Provider-facing ──────────────────────────────────────────────────────────

export const getPriorAuths = async (params = {}) => {
  try {
    return await get(BASE, params);
  } catch (err) {
    console.error('getPriorAuths error:', err);
    throw err;
  }
};

export const getPriorAuth = async (id) => {
  try {
    return await get(`${BASE}/${id}`);
  } catch (err) {
    console.error('getPriorAuth error:', err);
    throw err;
  }
};

export const createPriorAuth = async (data) => {
  try {
    return await post(BASE, data);
  } catch (err) {
    console.error('createPriorAuth error:', err);
    throw err;
  }
};

export const submitAppeal = async (id, appealNotes) => {
  try {
    return await post(`${BASE}/${id}/appeal`, { appealNotes });
  } catch (err) {
    console.error('submitAppeal error:', err);
    throw err;
  }
};

export const getAppealDraft = async (id) => {
  try {
    return await post(`${BASE}/${id}/appeal-draft`, {});
  } catch (err) {
    console.error('getAppealDraft error:', err);
    throw err;
  }
};

export const renewPriorAuth = async (id, overrides = {}) => {
  try {
    return await post(`${BASE}/${id}/renew`, overrides);
  } catch (err) {
    console.error('renewPriorAuth error:', err);
    throw err;
  }
};

export const addPANote = async (id, message) => {
  try {
    return await post(`${BASE}/${id}/notes`, { message });
  } catch (err) {
    console.error('addPANote error:', err);
    throw err;
  }
};

export const getPAHistory = async (id) => {
  try {
    return await get(`${BASE}/${id}/history`);
  } catch (err) {
    console.error('getPAHistory error:', err);
    throw err;
  }
};

export const triggerAIAnalysis = async (id) => {
  try {
    return await post(`${BASE}/${id}/analyze`, {});
  } catch (err) {
    console.error('triggerAIAnalysis error:', err);
    throw err;
  }
};

// ── Admin-facing ─────────────────────────────────────────────────────────────

export const adminGetPriorAuths = async (params = {}) => {
  try {
    return await get(ADMIN_BASE, params);
  } catch (err) {
    console.error('adminGetPriorAuths error:', err);
    throw err;
  }
};

export const adminGetPriorAuth = async (id) => {
  try {
    return await get(`${ADMIN_BASE}/${id}`);
  } catch (err) {
    console.error('adminGetPriorAuth error:', err);
    throw err;
  }
};

/**
 * @param {string} id
 * @param {string} decision  'Approved' | 'Denied'
 * @param {string} reviewerNotes
 * @param {object} extra  { denialReasonCode?, approvalDurationDays? }
 */
export const adminReviewPriorAuth = async (id, decision, reviewerNotes, extra = {}) => {
  try {
    return await put(`${ADMIN_BASE}/${id}/review`, { decision, reviewerNotes, ...extra });
  } catch (err) {
    console.error('adminReviewPriorAuth error:', err);
    throw err;
  }
};

export const adminReviewAppeal = async (id, outcome, reviewerNotes) => {
  try {
    return await put(`${ADMIN_BASE}/${id}/appeal-review`, { outcome, reviewerNotes });
  } catch (err) {
    console.error('adminReviewAppeal error:', err);
    throw err;
  }
};

export const adminTriggerAI = async (id) => {
  try {
    return await post(`${ADMIN_BASE}/${id}/analyze`, {});
  } catch (err) {
    console.error('adminTriggerAI error:', err);
    throw err;
  }
};

export const adminAddPANote = async (id, message) => {
  try {
    return await post(`${ADMIN_BASE}/${id}/notes`, { message });
  } catch (err) {
    console.error('adminAddPANote error:', err);
    throw err;
  }
};

export const adminBulkReview = async (ids, decision, reviewerNotes, extra = {}) => {
  try {
    return await post(`${ADMIN_BASE}/bulk-review`, { ids, decision, reviewerNotes, ...extra });
  } catch (err) {
    console.error('adminBulkReview error:', err);
    throw err;
  }
};

export const adminGetPAHistory = async (id) => {
  try {
    return await get(`${ADMIN_BASE}/${id}/history`);
  } catch (err) {
    console.error('adminGetPAHistory error:', err);
    throw err;
  }
};

export const getAdminPAAnalytics = async () => {
  try {
    return await get(`${ADMIN_BASE}/analytics`);
  } catch (err) {
    console.error('getAdminPAAnalytics error:', err);
    throw err;
  }
};

const priorAuthService = {
  getPriorAuths, getPriorAuth, createPriorAuth, submitAppeal, getAppealDraft,
  renewPriorAuth, addPANote, getPAHistory, triggerAIAnalysis,
  adminGetPriorAuths, adminGetPriorAuth, adminReviewPriorAuth, adminReviewAppeal,
  adminTriggerAI, adminAddPANote, adminBulkReview, adminGetPAHistory, getAdminPAAnalytics,
};

export default priorAuthService;
