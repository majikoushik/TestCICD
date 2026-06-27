import { get, post, put } from '../utils/apiUtils';

const BASE = '/admin/matching-config';

export const getMatchingConfig = async () => {
  try {
    return await get(BASE);
  } catch (error) {
    throw error;
  }
};

export const updateMatchingConfig = async (data) => {
  try {
    return await put(BASE, data);
  } catch (error) {
    throw error;
  }
};

export const resetMatchingConfig = async () => {
  try {
    return await post(BASE + '/reset', {});
  } catch (error) {
    throw error;
  }
};
