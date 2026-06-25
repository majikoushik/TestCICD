/**
 * Appointments Pages Index
 * 
 * This file exports all appointment-related page components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import appointment page component
const ScheduleAppointment = lazy(() => import('./ScheduleAppointment'));

// Export appointment page component
export { ScheduleAppointment };

// Export appointment page component as a group
export const AppointmentPages = {
  ScheduleAppointment
};
