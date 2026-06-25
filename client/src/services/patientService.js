/**
 * Patient Service
 * 
 * This service handles patient-related API calls
 */

import { get, post, put, del, mockResponse } from '../utils/apiUtils';
import { generatePatients, generateMedicalRecords, generateConsentRecords } from './mockData';

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
export const getPatients = async (options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      page: 0,
      limit: 10,
      search: '',
      sortBy: 'lastName',
      sortOrder: 'asc',
      riskLevel: ''
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    console.log('Patient service getPatients called with options:', queryOptions);
    
    // Always use mock data for testing
    if (process.env.REACT_APP_MOCK_API === 'true') { 
      // Generate mock patients
      const mockPatients = generatePatients(50);
      
      // Filter by search term
      let filteredPatients = mockPatients;
      if (queryOptions.search) {
        const searchTerm = queryOptions.search.toLowerCase();
        filteredPatients = mockPatients.filter(patient => 
          patient.firstName.toLowerCase().includes(searchTerm) ||
          patient.lastName.toLowerCase().includes(searchTerm) ||
          patient.email.toLowerCase().includes(searchTerm) ||
          (patient.phoneNumber && patient.phoneNumber.includes(searchTerm))
        );
      }
      
      // Filter by risk level
      if (queryOptions.riskLevel && queryOptions.riskLevel !== 'all') {
        filteredPatients = filteredPatients.filter(
          patient => patient.riskLevel.toLowerCase() === queryOptions.riskLevel.toLowerCase()
        );
      }
      // Filter by gender
      if (queryOptions.gender && queryOptions.gender !== 'all') {
        filteredPatients = filteredPatients.filter(
          patient => patient.gender.toLowerCase() === queryOptions.gender.toLowerCase()
        );
      }
      // Sort patients
      filteredPatients.sort((a, b) => {
        const field = queryOptions.sortBy;
        const order = queryOptions.sortOrder === 'asc' ? 1 : -1;
        
        if (a[field] < b[field]) return -1 * order;
        if (a[field] > b[field]) return 1 * order;
        return 0;
      });
      
      // Paginate patients
      const startIndex = queryOptions.page * queryOptions.limit;
      const endIndex = startIndex + queryOptions.limit;
      const paginatedPatients = filteredPatients;
      
      // Create response
      const mockResponseObj = {
        patients: paginatedPatients,
        pagination: {
          total: filteredPatients.length,
          page: queryOptions.page,
          limit: queryOptions.limit,
          pages: Math.ceil(filteredPatients.length / queryOptions.limit)
        }
      };
      
      console.log('Generated mock patients:', paginatedPatients.length, 'of', filteredPatients.length, 'total');
      
      // Return the response directly without wrapping it in another data object
      // This matches what the Redux slice expects
      return mockResponseObj;
    }
    
    // Real API call
    return await get('/patients', queryOptions);
  } catch (error) {
    console.error('Get patients error:', error);
    throw error;
  }
};

/**
 * Get a patient by ID
 * 
 * @param {string} patientId - Patient ID
 * @returns {Promise} Promise that resolves with the patient data
 */
export const getPatientById = async (patientId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate a mock patient
      const mockPatient = generatePatients(1)[0];
      mockPatient.id = patientId;
      return mockPatient;
    }
    
    // Real API call
    return await get(`/patients/${patientId}`);
  } catch (error) {
    console.error('Get patient by ID error:', error);
    throw error;
  }
};

/**
 * Create a new patient
 * 
 * @param {Object} patientData - Patient data
 * @returns {Promise} Promise that resolves with the created patient
 */
export const createPatient = async (patientData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate a mock patient
      const mockPatient = {
        ...patientData,
        id: Math.random().toString(36).substring(2, 15),
        registeredDate: new Date().toISOString(),
        riskLevel: 'low',
        blockchainId: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      };
      
      return await mockResponse(mockPatient, 1500);
    }
    
    // Real API call
    return await post('/patients', patientData);
  } catch (error) {
    console.error('Create patient error:', error);
    throw error;
  }
};

/**
 * Update a patient
 * 
 * @param {string} patientId - Patient ID
 * @param {Object} patientData - Updated patient data
 * @returns {Promise} Promise that resolves with the updated patient
 */
export const updatePatient = async (patientId, patientData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock updated patient
      const mockPatient = {
        ...patientData,
        id: patientId
      };
      
      return await mockResponse(mockPatient, 1000);
    }
    
    // Real API call
    return await put(`/patients/${patientId}`, patientData);
  } catch (error) {
    console.error('Update patient error:', error);
    throw error;
  }
};

/**
 * Delete a patient
 * 
 * @param {string} patientId - Patient ID
 * @returns {Promise} Promise that resolves when the patient is deleted
 */
export const deletePatient = async (patientId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return await mockResponse({ success: true }, 1000);
    }
    
    // Real API call
    return await del(`/patients/${patientId}`);
  } catch (error) {
    console.error('Delete patient error:', error);
    throw error;
  }
};

/**
 * Get a patient's medical records
 * 
 * @param {string} patientId - Patient ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Page size
 * @param {string} options.type - Record type
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order (asc, desc)
 * @returns {Promise} Promise that resolves with the medical records
 */
export const getPatientMedicalRecords = async (patientId, options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      page: 0,
      limit: 10,
      type: '',
      sortBy: 'date',
      sortOrder: 'desc'
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock medical records
      const mockRecords = generateMedicalRecords(30);
      
      // Filter by patient ID
      let filteredRecords = mockRecords.filter(record => record.patientId === patientId);
      
      // Filter by type
      if (queryOptions.type) {
        filteredRecords = filteredRecords.filter(
          record => record.type === queryOptions.type
        );
      }
      
      // Sort records
      filteredRecords.sort((a, b) => {
        const field = queryOptions.sortBy;
        const order = queryOptions.sortOrder === 'asc' ? 1 : -1;
        
        if (a[field] < b[field]) return -1 * order;
        if (a[field] > b[field]) return 1 * order;
        return 0;
      });
      
      // Paginate records
      const startIndex = queryOptions.page * queryOptions.limit;
      const endIndex = startIndex + queryOptions.limit;
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
      
      // Create response
      const mockResponse = {
        records: paginatedRecords,
        pagination: {
          total: filteredRecords.length,
          page: queryOptions.page,
          limit: queryOptions.limit,
          pages: Math.ceil(filteredRecords.length / queryOptions.limit)
        }
      };
      
      return await mockResponse(mockResponse, 800);
    }
    
    // Real API call
    return await get(`/patients/${patientId}/medical-records`, queryOptions);
  } catch (error) {
    console.error('Get patient medical records error:', error);
    throw error;
  }
};

/**
 * Get a patient's consent records
 * 
 * @param {string} patientId - Patient ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Page size
 * @param {string} options.status - Consent status
 * @returns {Promise} Promise that resolves with the consent records
 */
export const getPatientConsentRecords = async (patientId, options = {}) => {
  try {
    // Default options
    const defaultOptions = {
      page: 0,
      limit: 10,
      status: ''
    };
    
    // Merge options
    const queryOptions = { ...defaultOptions, ...options };
    
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate mock consent records
      const mockRecords = generateConsentRecords(15);
      
      // Filter by patient ID
      let filteredRecords = mockRecords.filter(record => record.patientId === patientId);
      
      // Filter by status
      if (queryOptions.status) {
        filteredRecords = filteredRecords.filter(
          record => record.status === queryOptions.status
        );
      }
      
      // Sort records by granted date
      filteredRecords.sort((a, b) => {
        if (!a.grantedAt) return 1;
        if (!b.grantedAt) return -1;
        return new Date(b.grantedAt) - new Date(a.grantedAt);
      });
      
      // Paginate records
      const startIndex = queryOptions.page * queryOptions.limit;
      const endIndex = startIndex + queryOptions.limit;
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
      
      // Create response
      const mockResponse = {
        records: paginatedRecords,
        pagination: {
          total: filteredRecords.length,
          page: queryOptions.page,
          limit: queryOptions.limit,
          pages: Math.ceil(filteredRecords.length / queryOptions.limit)
        }
      };
      
      return await mockResponse(mockResponse, 800);
    }
    
    // Real API call
    return await get(`/patients/${patientId}/consent-records`, queryOptions);
  } catch (error) {
    console.error('Get patient consent records error:', error);
    throw error;
  }
};

/**
 * Create a consent record for a patient
 * 
 * @param {string} patientId - Patient ID
 * @param {Object} consentData - Consent data
 * @param {string} consentData.providerId - Provider ID
 * @param {string} consentData.accessLevel - Access level (full, partial, limited)
 * @param {Array} consentData.dataElements - Data elements to grant access to
 * @param {Date} consentData.expiryDate - Expiry date
 * @returns {Promise} Promise that resolves with the created consent record
 */
export const createConsentRecord = async (patientId, consentData) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Generate a mock consent record
      const mockConsent = {
        id: `consent-${Math.random().toString(36).substring(2, 15)}`,
        patientId,
        providerId: consentData.providerId || `provider-${Math.random().toString(36).substring(2, 10)}`,
        providerName: 'Dr. Jane Smith', // Mock provider name
        accessLevel: consentData.accessLevel || 'limited',
        dataElements: consentData.dataElements || ['demographics'],
        grantedAt: new Date().toISOString(),
        expiresAt: consentData.expiryDate ? new Date(consentData.expiryDate).toISOString() : null,
        status: 'active',
        blockchainTransactionId: `tx_${Math.random().toString(36).substring(2, 15)}`
      };
      
      return await mockResponse(mockConsent, 1000);
    }
    
    // Real API call
    return await post(`/patients/${patientId}/consent`, consentData);
  } catch (error) {
    console.error('Create consent record error:', error);
    throw error;
  }
};



/**
 * Revoke a consent record
 * 
 * @param {string} patientId - Patient ID
 * @param {string} consentId - Consent record ID
 * @returns {Promise} Promise that resolves with the updated consent record
 */
export const revokeConsentRecord = async (patientId, consentId) => {
  try {
    // Check if mock API is enabled
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Create mock revoked consent record
      const mockRecord = {
        id: consentId,
        patientId,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        blockchainId: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      };
      
      return await mockResponse(mockRecord, 1000);
    }
    
    // Real API call
    return await put(`/patients/${patientId}/consent-records/${consentId}/revoke`);
  } catch (error) {
    console.error('Revoke consent record error:', error);
    throw error;
  }
};

// Export all patient service functions
export default {
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
