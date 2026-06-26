import { get, post, put } from '../utils/apiUtils';

const BASE = '/dtx';
const ADMIN_BASE = '/admin/dtx';

// ── Provider: Programs ─────────────────────────────────────────────────────

export async function getDtxPrograms(params = {}) {
  return await get(BASE + '/programs', params);
}

export async function getDtxProgram(id) {
  return await get(BASE + '/programs/' + id);
}

// ── Provider: Prescriptions ────────────────────────────────────────────────

export async function prescribeProgram(data) {
  return await post(BASE + '/prescriptions', data);
}

export async function getMyPrescriptions(params = {}) {
  return await get(BASE + '/prescriptions', params);
}

export async function updatePrescriptionStatus(id, data) {
  return await put(BASE + '/prescriptions/' + id + '/status', data);
}

// ── Admin: Programs ────────────────────────────────────────────────────────

export async function adminGetPrograms(params = {}) {
  return await get(ADMIN_BASE + '/programs', params);
}

export async function adminCreateProgram(data) {
  return await post(ADMIN_BASE + '/programs', data);
}

export async function adminUpdateProgram(id, data) {
  return await put(ADMIN_BASE + '/programs/' + id, data);
}

// ── Admin: Stats & Prescriptions ──────────────────────────────────────────

export async function adminGetStats() {
  return await get(ADMIN_BASE + '/stats');
}

export async function adminGetPrescriptions(params = {}) {
  return await get(ADMIN_BASE + '/prescriptions', params);
}

const dtxService = {
  getDtxPrograms,
  getDtxProgram,
  prescribeProgram,
  getMyPrescriptions,
  updatePrescriptionStatus,
  adminGetPrograms,
  adminCreateProgram,
  adminUpdateProgram,
  adminGetStats,
  adminGetPrescriptions,
};

export default dtxService;
