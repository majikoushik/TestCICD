import React, { createContext, useContext, useState, useCallback } from 'react';
import { analyticsService } from '../services';
import { useNotification } from './NotificationContext';

// Create analytics context
const AnalyticsContext = createContext({
  reports: [],
  currentReport: null,
  patientRiskData: null,
  referralData: null,
  tokenData: null,
  loading: false,
  error: null,
  getAnalyticsReports: () => {},
  getAnalyticsReportById: () => {},
  createAnalyticsReport: () => {},
  getPatientRiskAnalytics: () => {},
  getReferralAnalytics: () => {},
  getTokenAnalytics: () => {}
});

/**
 * Custom hook to use the analytics context
 * 
 * @returns {Object} Analytics context
 */
export const useAnalytics = () => useContext(AnalyticsContext);

/**
 * Analytics provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const AnalyticsProvider = ({ children }) => {
  // State
  const [reports, setReports] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [patientRiskData, setPatientRiskData] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [tokenData, setTokenData] = useState(null);
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
  
  /**
   * Get all analytics reports
   * 
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Page size
   * @param {string} options.type - Filter by report type
   * @param {string} options.status - Filter by status
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort order (asc, desc)
   * @returns {Promise} Promise that resolves with the analytics reports list
   */
  const getAnalyticsReports = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      const response = await analyticsService.getAnalyticsReports(options);
      setReports(response.reports);
      setPagination(response.pagination);
      return response;
    } catch (err) {
      console.error('Error getting analytics reports:', err);
      setError('Failed to get analytics reports');
      notifyError('Failed to get analytics reports');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Get an analytics report by ID
   * 
   * @param {string} reportId - Report ID
   * @returns {Promise} Promise that resolves with the report data
   */
  const getAnalyticsReportById = useCallback(async (reportId) => {
    try {
      setLoading(true);
      const report = await analyticsService.getAnalyticsReportById(reportId);
      setCurrentReport(report);
      return report;
    } catch (err) {
      console.error('Error getting analytics report:', err);
      setError('Failed to get analytics report details');
      notifyError('Failed to get analytics report details');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Create a new analytics report
   * 
   * @param {Object} reportData - Report data
   * @returns {Promise} Promise that resolves with the created report
   */
  const createAnalyticsReport = useCallback(async (reportData) => {
    try {
      setLoading(true);
      const report = await analyticsService.createAnalyticsReport(reportData);
      
      // Update reports list if it exists
      if (reports.length > 0) {
        setReports(prevReports => [report, ...prevReports]);
      }
      
      notifySuccess('Analytics report created successfully');
      return report;
    } catch (err) {
      console.error('Error creating analytics report:', err);
      setError('Failed to create analytics report');
      notifyError('Failed to create analytics report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reports, notifySuccess, notifyError]);
  
  /**
   * Get patient risk analytics
   * 
   * @param {Object} options - Query options
   * @param {string} options.dateRange - Date range (e.g., '7d', '30d', '90d', 'custom')
   * @param {string} options.startDate - Start date (for custom date range)
   * @param {string} options.endDate - End date (for custom date range)
   * @param {Array} options.departments - Departments to include
   * @returns {Promise} Promise that resolves with the patient risk analytics
   */
  const getPatientRiskAnalytics = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      const data = await analyticsService.getPatientRiskAnalytics(options);
      setPatientRiskData(data);
      return data;
    } catch (err) {
      console.error('Error getting patient risk analytics:', err);
      setError('Failed to get patient risk analytics');
      notifyError('Failed to get patient risk analytics');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Get referral analytics
   * 
   * @param {Object} options - Query options
   * @param {string} options.dateRange - Date range (e.g., '7d', '30d', '90d', 'custom')
   * @param {string} options.startDate - Start date (for custom date range)
   * @param {string} options.endDate - End date (for custom date range)
   * @param {Array} options.specialties - Specialties to include
   * @returns {Promise} Promise that resolves with the referral analytics
   */
  const getReferralAnalytics = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      const data = await analyticsService.getReferralAnalytics(options);
      setReferralData(data);
      return data;
    } catch (err) {
      console.error('Error getting referral analytics:', err);
      setError('Failed to get referral analytics');
      notifyError('Failed to get referral analytics');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  /**
   * Get token analytics
   * 
   * @param {Object} options - Query options
   * @param {string} options.dateRange - Date range (e.g., '7d', '30d', '90d', 'custom')
   * @param {string} options.startDate - Start date (for custom date range)
   * @param {string} options.endDate - End date (for custom date range)
   * @returns {Promise} Promise that resolves with the token analytics
   */
  const getTokenAnalytics = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      const data = await analyticsService.getTokenAnalytics(options);
      setTokenData(data);
      return data;
    } catch (err) {
      console.error('Error getting token analytics:', err);
      setError('Failed to get token analytics');
      notifyError('Failed to get token analytics');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);
  
  // Context value
  const value = {
    reports,
    currentReport,
    patientRiskData,
    referralData,
    tokenData,
    loading,
    error,
    pagination,
    getAnalyticsReports,
    getAnalyticsReportById,
    createAnalyticsReport,
    getPatientRiskAnalytics,
    getReferralAnalytics,
    getTokenAnalytics
  };
  
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};
