import { get, post, del } from '../utils/apiUtils';

const BASE = '/schedules';

export async function getAvailability(providerId) {
  try {
    return await get(BASE + '/' + providerId + '/availability');
  } catch (error) {
    throw error;
  }
}

export async function saveAvailability(providerId, schedules) {
  try {
    return await post(BASE + '/' + providerId + '/availability', schedules);
  } catch (error) {
    throw error;
  }
}

export async function deleteAvailabilityDay(providerId, dayOfWeek) {
  try {
    return await del(BASE + '/' + providerId + '/availability/' + dayOfWeek);
  } catch (error) {
    throw error;
  }
}

export async function getExceptions(providerId, params = {}) {
  try {
    return await get(BASE + '/' + providerId + '/exceptions', params);
  } catch (error) {
    throw error;
  }
}

export async function addException(providerId, data) {
  try {
    return await post(BASE + '/' + providerId + '/exceptions', data);
  } catch (error) {
    throw error;
  }
}

export async function deleteException(providerId, exceptionId) {
  try {
    return await del(BASE + '/' + providerId + '/exceptions/' + exceptionId);
  } catch (error) {
    throw error;
  }
}

export async function getSlots(providerId, params = {}) {
  try {
    return await get(BASE + '/' + providerId + '/slots', params);
  } catch (error) {
    throw error;
  }
}

const scheduleService = {
  getAvailability,
  saveAvailability,
  deleteAvailabilityDay,
  getExceptions,
  addException,
  deleteException,
  getSlots,
};

export default scheduleService;
