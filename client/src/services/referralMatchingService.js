import { get, post, put } from '../utils/apiUtils';

const BASE = '/referral-matching';

export const findMatches = async (criteria) => {
  try {
    return await post(BASE + '/match', criteria);
  } catch (error) {
    throw error;
  }
};

export const getProviders = async (params = {}) => {
  try {
    return await get(BASE + '/providers', params);
  } catch (error) {
    throw error;
  }
};

export const getProvider = async (id) => {
  try {
    return await get(BASE + '/providers/' + id);
  } catch (error) {
    throw error;
  }
};

export const updateProvider = async (id, data) => {
  try {
    return await put(BASE + '/providers/' + id, data);
  } catch (error) {
    throw error;
  }
};

export const getStats = async () => {
  try {
    return await get(BASE + '/stats');
  } catch (error) {
    throw error;
  }
};

export const getSessions = async (params = {}) => {
  try {
    return await get(BASE + '/sessions', params);
  } catch (error) {
    throw error;
  }
};

export const recordSelection = async (sessionId, data) => {
  try {
    return await post(BASE + '/sessions/' + sessionId + '/select', data);
  } catch (error) {
    throw error;
  }
};

const referralMatchingService = {
  findMatches,
  getProviders,
  getProvider,
  updateProvider,
  getStats,
  getSessions,
  recordSelection,
};

export default referralMatchingService;
