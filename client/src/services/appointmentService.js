import { get, post, put } from '../utils/apiUtils';

const BASE = '/appointments';

export async function getAvailableSlots(params = {}) {
  try {
    return await get(BASE + '/available-slots', params);
  } catch (error) {
    throw error;
  }
}

export async function getMyAppointments(params = {}) {
  try {
    return await get(BASE, params);
  } catch (error) {
    throw error;
  }
}

export async function getAppointment(id) {
  try {
    return await get(BASE + '/' + id);
  } catch (error) {
    throw error;
  }
}

export async function bookAppointment(data) {
  try {
    return await post(BASE, data);
  } catch (error) {
    throw error;
  }
}

export async function cancelAppointment(id, data) {
  try {
    return await put(BASE + '/' + id + '/cancel', data);
  } catch (error) {
    throw error;
  }
}

export async function rescheduleAppointment(id, data) {
  try {
    return await put(BASE + '/' + id + '/reschedule', data);
  } catch (error) {
    throw error;
  }
}

export async function updateAppointmentStatus(id, data) {
  try {
    return await put(BASE + '/' + id + '/status', data);
  } catch (error) {
    throw error;
  }
}

export async function checkInAppointment(id) {
  try {
    return await post(BASE + '/' + id + '/check-in', {});
  } catch (error) {
    throw error;
  }
}

export async function getMySchedule(params = {}) {
  try {
    return await get(BASE + '/my-schedule', params);
  } catch (error) {
    throw error;
  }
}

export async function getStats() {
  try {
    return await get(BASE + '/stats');
  } catch (error) {
    throw error;
  }
}

export async function sendReminder(id) {
  try {
    return await post(BASE + '/' + id + '/reminder', {});
  } catch (error) {
    throw error;
  }
}

const appointmentService = {
  getAvailableSlots,
  getMyAppointments,
  getAppointment,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  checkInAppointment,
  getMySchedule,
  getStats,
  sendReminder,
};

export default appointmentService;
