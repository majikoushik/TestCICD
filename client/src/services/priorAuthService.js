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

export const adminReviewPriorAuth = async (id, decision, reviewerNotes) => {
  try {
    return await put(`${ADMIN_BASE}/${id}/review`, { decision, reviewerNotes });
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

const priorAuthService = {
  getPriorAuths, getPriorAuth, createPriorAuth, submitAppeal, triggerAIAnalysis,
  adminGetPriorAuths, adminGetPriorAuth, adminReviewPriorAuth, adminReviewAppeal, adminTriggerAI
};

export default priorAuthService;
