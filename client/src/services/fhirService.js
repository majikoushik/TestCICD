/**
 * FHIR R4 API service
 * Calls /api/fhir/* endpoints — works in both live DB and synthetic data modes.
 */
import { get } from '../utils/apiUtils';

export const getCapabilityStatement = () =>
  get('/fhir/metadata');

export const getFHIRPatients = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return get(`/fhir/Patient${query ? `?${query}` : ''}`);
};

export const getFHIRPatient = (id) =>
  get(`/fhir/Patient/${id}`);

export const getFHIRPractitioner = (id) =>
  get(`/fhir/Practitioner/${id}`);

export const getFHIRConditions = (patientId) =>
  get(`/fhir/Condition?patient=${patientId}`);

export const getFHIRMedications = (patientId) =>
  get(`/fhir/MedicationRequest?patient=${patientId}`);

export const getFHIRAllergies = (patientId) =>
  get(`/fhir/AllergyIntolerance?patient=${patientId}`);

export const getFHIRCoverage = (patientId) =>
  get(`/fhir/Coverage?patient=${patientId}`);

export const getFHIRServiceRequests = (patientId) =>
  get(`/fhir/ServiceRequest?patient=${patientId}`);

/**
 * Fetch all FHIR resources for a patient in parallel.
 * Returns { patient, conditions, medications, allergies, coverage, serviceRequests }
 */
export const getPatientFHIRBundle = async (patientId) => {
  const [patient, conditions, medications, allergies, coverage, serviceRequests] =
    await Promise.all([
      getFHIRPatient(patientId),
      getFHIRConditions(patientId),
      getFHIRMedications(patientId),
      getFHIRAllergies(patientId),
      getFHIRCoverage(patientId),
      getFHIRServiceRequests(patientId),
    ]);
  return { patient, conditions, medications, allergies, coverage, serviceRequests };
};

const fhirService = {
  getCapabilityStatement,
  getFHIRPatients,
  getFHIRPatient,
  getFHIRPractitioner,
  getFHIRConditions,
  getFHIRMedications,
  getFHIRAllergies,
  getFHIRCoverage,
  getFHIRServiceRequests,
  getPatientFHIRBundle,
};

export default fhirService;
