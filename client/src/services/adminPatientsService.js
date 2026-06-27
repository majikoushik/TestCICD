import { get } from '../utils/apiUtils';

const BASE = '/admin/patients';

export const getAdminPatients = async (params = {}) => {
  try {
    return await get(BASE, params);
  } catch (error) {
    throw error;
  }
};

export const getAdminPatientById = async (id) => {
  try {
    return await get(`${BASE}/${id}`);
  } catch (error) {
    throw error;
  }
};
