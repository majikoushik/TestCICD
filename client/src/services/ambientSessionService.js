import { get, post, put, del } from '../utils/apiUtils';

const BASE_PATH = '/ambient-sessions';
const ADMIN_BASE = '/admin/ambient-sessions';

// Provider functions

export async function getSessions(params = {}) {
  try {
    return await get(BASE_PATH, params);
  } catch (error) {
    throw error;
  }
}

export async function getSessionStats() {
  try {
    return await get(BASE_PATH + '/stats');
  } catch (error) {
    throw error;
  }
}

export async function getSession(id) {
  try {
    return await get(BASE_PATH + '/' + id);
  } catch (error) {
    throw error;
  }
}

export async function createSession(data) {
  try {
    return await post(BASE_PATH, data);
  } catch (error) {
    throw error;
  }
}

export async function updateSession(id, data) {
  try {
    return await put(BASE_PATH + '/' + id, data);
  } catch (error) {
    throw error;
  }
}

export async function reviewSession(id, data) {
  try {
    return await put(BASE_PATH + '/' + id + '/review', data);
  } catch (error) {
    throw error;
  }
}

// Uploads a recorded audio clip for server-side (Azure Speech) transcription.
// Safe to call even when Azure Speech isn't configured server-side — the
// endpoint always returns { success, stub, transcript } rather than erroring,
// so callers should treat `stub: true` as "keep whatever transcript you already have".
export async function transcribeAudio(audioBlob, filename = 'recording.webm') {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);
    // apiUtils.post detects FormData and lets the browser set the multipart boundary itself.
    return await post(BASE_PATH + '/transcribe', formData);
  } catch (error) {
    throw error;
  }
}

export async function reprocessSession(id) {
  try {
    return await post(BASE_PATH + '/' + id + '/reprocess');
  } catch (error) {
    throw error;
  }
}

export async function deleteSession(id) {
  try {
    return await del(BASE_PATH + '/' + id);
  } catch (error) {
    throw error;
  }
}

// Admin functions

export async function adminGetSessions(params = {}) {
  try {
    return await get(ADMIN_BASE, params);
  } catch (error) {
    throw error;
  }
}

export async function adminGetStats() {
  try {
    return await get(ADMIN_BASE + '/stats');
  } catch (error) {
    throw error;
  }
}

export async function adminGetSession(id) {
  try {
    return await get(ADMIN_BASE + '/' + id);
  } catch (error) {
    throw error;
  }
}

export async function adminUpdateSession(id, data) {
  try {
    return await put(ADMIN_BASE + '/' + id, data);
  } catch (error) {
    throw error;
  }
}

export async function adminDeleteSession(id) {
  try {
    return await del(ADMIN_BASE + '/' + id);
  } catch (error) {
    throw error;
  }
}

const ambientSessionService = {
  getSessions,
  getSessionStats,
  getSession,
  createSession,
  updateSession,
  reviewSession,
  transcribeAudio,
  reprocessSession,
  deleteSession,
  adminGetSessions,
  adminGetStats,
  adminGetSession,
  adminUpdateSession,
  adminDeleteSession,
};

export default ambientSessionService;
