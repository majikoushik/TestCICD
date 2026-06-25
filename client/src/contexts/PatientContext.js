import React, { createContext, useContext, useState, useCallback } from 'react';
import { patientService } from '../services';
import { useNotification } from './NotificationContext';
import { useConfirmation } from '../hooks';

// Create patient context
const PatientContext = createContext({
  patients: [],
  currentPatient: null,
  loading: false,
  error: null,
  getPatients: () => {},
  getPatientById: () => {},
  createPatient: () => {},
  updatePatient: () => {},
  deletePatient: () => {},
  getPatientMedicalRecords: () => {},
  getPatientConsentRecords: () => {},
  createConsentRecord: () => {},
  revokeConsentRecord: () => {}
});

/**
 * Custom hook to use the patient context
 * 
 * @returns {Object} Patient context
 */
export const usePatient = () => useContext(PatientContext);

/**
 * Patient provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const PatientProvider = ({ children }) => {
  // State
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [consentRecords, setConsentRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Get notification context
  const { notifySuccess, notifyError } = useNotification();
  
  // Get confirmation hook
  const { confirmDelete } = useConfirmation();
  
  /**
   * Get all patients
   * 
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Page size
   * @param {string} options.search - Search term
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort order (asc, desc)
   * @param {string} options.riskLevel - Filter by risk level
   * @returns {Promise} Promise that resolves with the patients list
   */
  const getPatients = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      const response = await patientService.getPatients(options);
      setPatients(response.patients);
      setPagination(response.pagination);
      return response;
    } catch (err) {
      console.error('Error getting patients:', err);
      setError('Failed to get patients');
      notifyError('Failed to get patients');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Get a patient by ID
   * 
   * @param {string} patientId - Patient ID
   * @returns {Promise} Promise that resolves with the patient data
   */
  const getPatientById = useCallback(async (patientId) => {
    try {
      setLoading(true);
      const patient = await patientService.getPatientById(patientId);
      setCurrentPatient(patient);
      return patient;
    } catch (err) {
      console.error('Error getting patient:', err);
      setError('Failed to get patient details');
      notifyError('Failed to get patient details');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Create a new patient
   * 
   * @param {Object} patientData - Patient data
   * @returns {Promise} Promise that resolves with the created patient
   */
  const createPatient = useCallback(async (patientData) => {
    try {
      setLoading(true);
      const patient = await patientService.createPatient(patientData);
      
      // Update patients list if it exists
      if (patients.length > 0) {
        setPatients(prevPatients => [patient, ...prevPatients]);
      }
      
      notifySuccess('Patient created successfully');
      return patient;
    } catch (err) {
      console.error('Error creating patient:', err);
      setError('Failed to create patient');
      notifyError('Failed to create patient');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [patients, notifySuccess, notifyError]);
  
  /**
   * Update a patient
   * 
   * @param {string} patientId - Patient ID
   * @param {Object} patientData - Updated patient data
   * @returns {Promise} Promise that resolves with the updated patient
   */
  const updatePatient = useCallback(async (patientId, patientData) => {
    try {
      setLoading(true);
      const updatedPatient = await patientService.updatePatient(patientId, patientData);
      
      // Update current patient if it's the same
      if (currentPatient && currentPatient.id === patientId) {
        setCurrentPatient(updatedPatient);
      }
      
      // Update patients list if it exists
      if (patients.length > 0) {
        setPatients(prevPatients => 
          prevPatients.map(patient => 
            patient.id === patientId ? updatedPatient : patient
          )
        );
      }
      
      notifySuccess('Patient updated successfully');
      return updatedPatient;
    } catch (err) {
      console.error('Error updating patient:', err);
      setError('Failed to update patient');
      notifyError('Failed to update patient');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentPatient, patients, notifySuccess, notifyError]);
  
  /**
   * Delete a patient
   * 
   * @param {string} patientId - Patient ID
   * @returns {Promise} Promise that resolves when the patient is deleted
   */
  const deletePatient = useCallback(async (patientId) => {
    // Confirm deletion
    const confirmed = await confirmDelete({
      title: 'Delete Patient',
      message: 'Are you sure you want to delete this patient? This action cannot be undone.'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      await patientService.deletePatient(patientId);
      
      // Update patients list if it exists
      if (patients.length > 0) {
        setPatients(prevPatients => 
          prevPatients.filter(patient => patient.id !== patientId)
        );
      }
      
      // Clear current patient if it's the same
      if (currentPatient && currentPatient.id === patientId) {
        setCurrentPatient(null);
      }
      
      notifySuccess('Patient deleted successfully');
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError('Failed to delete patient');
      notifyError('Failed to delete patient');
    } finally {
      setLoading(false);
    }
  }, [currentPatient, patients, confirmDelete, notifySuccess, notifyError]);
  
  /**
   * Get a patient's medical records
   * 
   * @param {string} patientId - Patient ID
   * @param {Object} options - Query options
   * @returns {Promise} Promise that resolves with the medical records
   */
  const getPatientMedicalRecords = useCallback(async (patientId, options = {}) => {
    try {
      setLoading(true);
      const response = await patientService.getPatientMedicalRecords(patientId, options);
      setMedicalRecords(response.records);
      return response;
    } catch (err) {
      console.error('Error getting medical records:', err);
      setError('Failed to get medical records');
      notifyError('Failed to get medical records');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Get a patient's consent records
   * 
   * @param {string} patientId - Patient ID
   * @param {Object} options - Query options
   * @returns {Promise} Promise that resolves with the consent records
   */
  const getPatientConsentRecords = useCallback(async (patientId, options = {}) => {
    try {
      setLoading(true);
      const response = await patientService.getPatientConsentRecords(patientId, options);
      setConsentRecords(response.records);
      return response;
    } catch (err) {
      console.error('Error getting consent records:', err);
      setError('Failed to get consent records');
      notifyError('Failed to get consent records');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Create a consent record for a patient
   * 
   * @param {string} patientId - Patient ID
   * @param {Object} consentData - Consent data
   * @returns {Promise} Promise that resolves with the created consent record
   */
  const createConsentRecord = useCallback(async (patientId, consentData) => {
    try {
      setLoading(true);
      const record = await patientService.createConsentRecord(patientId, consentData);
      
      // Update consent records list if it exists
      if (consentRecords.length > 0) {
        setConsentRecords(prevRecords => [record, ...prevRecords]);
      }
      
      notifySuccess('Consent record created successfully');
      return record;
    } catch (err) {
      console.error('Error creating consent record:', err);
      setError('Failed to create consent record');
      notifyError('Failed to create consent record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [consentRecords, notifySuccess, notifyError]);
  
  /**
   * Revoke a consent record
   * 
   * @param {string} patientId - Patient ID
   * @param {string} consentId - Consent record ID
   * @returns {Promise} Promise that resolves with the updated consent record
   */
  const revokeConsentRecord = useCallback(async (patientId, consentId) => {
    // Confirm revocation
    const confirmed = await confirmDelete({
      title: 'Revoke Consent',
      message: 'Are you sure you want to revoke this consent? This action cannot be undone.',
      confirmLabel: 'Revoke',
      type: 'warning'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      const record = await patientService.revokeConsentRecord(patientId, consentId);
      
      // Update consent records list if it exists
      if (consentRecords.length > 0) {
        setConsentRecords(prevRecords => 
          prevRecords.map(r => r.id === consentId ? record : r)
        );
      }
      
      notifySuccess('Consent revoked successfully');
      return record;
    } catch (err) {
      console.error('Error revoking consent:', err);
      setError('Failed to revoke consent');
      notifyError('Failed to revoke consent');
    } finally {
      setLoading(false);
    }
  }, [consentRecords, confirmDelete, notifySuccess, notifyError]);
  
  // Context value
  const value = {
    patients,
    currentPatient,
    medicalRecords,
    consentRecords,
    loading,
    error,
    pagination,
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    getPatientMedicalRecords,
    getPatientConsentRecords,
    createConsentRecord,
    revokeConsentRecord
  };
  
  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};
