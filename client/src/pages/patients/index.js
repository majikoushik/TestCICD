/**
 * Patient Pages Index
 * 
 * This file exports all patient-related page components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import patient page components
const Patients = lazy(() => import('./Patients'));
const AddPatient = lazy(() => import('./AddPatient'));
const EditPatient = lazy(() => import('./EditPatient'));
const PatientDetail = lazy(() => import('./PatientDetail'));

// Export patient page components
export {
  Patients,
  AddPatient,
  EditPatient,
  PatientDetail
};

// Export all patient page components as a group
export const PatientPages = {
  Patients,
  AddPatient,
  EditPatient,
  PatientDetail
};
