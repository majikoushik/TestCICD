import { get, post, put, del } from '../utils/apiUtils';
import { 
  mockProviderPerformance,
  mockReferralConversionData,
  mockTokenEconomyData,
  mockAIAnalyticsData,
  mockScheduledReports
} from './mockData';

// Get provider performance data
const getProviderPerformance = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: mockProviderPerformance };
    }
    const response = await get('/admin/analytics/provider-performance');   
    return response.data;
  } catch (error) {
    console.error('Error fetching provider performance:', error);
    return { success: false, error: error.message };
  }
};

// Get referral conversion rates
const getReferralConversionRates = async (period = 'last6months') => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: mockReferralConversionData };
    }
    const response = await get(`/admin/analytics/referral-conversion?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching referral conversion rates:', error);
    return { success: false, error: error.message };
  }
};

// Get token economy trends
const getTokenEconomyTrends = async (period = 'last6months') => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: mockTokenEconomyData };
    }
    const response = await get(`/admin/analytics/token-economy?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching token economy trends:', error);
    return { success: false, error: error.message };
  }
};

// Get AI analytics data
const getAIAnalytics = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: mockAIAnalyticsData };
    }
    const response = await get('/admin/analytics/ai-performance');
    return response.data;
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    return { success: false, error: error.message };
  }
};

// Export report as CSV or PDF
const exportReport = async (reportType, format, filters = {}) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // For mock API, we'd normally return a Blob or download URL
      // But for demo purposes, we'll just return success
      return { 
        success: true, 
        message: `${reportType} report exported as ${format} successfully`,
        // In a real implementation, this would be a download URL or Blob
        downloadUrl: `https://example.com/reports/${reportType}_${Date.now()}.${format}`
      };
    }
    const response = await post('/admin/reports/export', 
      { reportType, format, filters },
      { responseType: 'blob' } // For actual file download
    );    
    
    
    return {
      success: true,
      data: response.data,
      filename: `${reportType}_${new Date().toISOString().split('T')[0]}.${format}`
    };
  } catch (error) {
    console.error('Error exporting report:', error);
    return { success: false, error: error.message };
  }
};

// Get scheduled reports
const getScheduledReports = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: mockScheduledReports };
    }
    const response = await get('/admin/reports/scheduled');
    return response.data;
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    return { success: false, error: error.message };
  }
};

// Schedule a new report
const scheduleReport = async (reportData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      // Simulate creating a new scheduled report
      const newReport = {
        id: mockScheduledReports.length + 1,
        ...reportData,
        lastSent: null,
        nextScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
      };
      
      return { success: true, data: newReport };
    }
    const response = await post('/admin/reports/schedule', reportData);    
    return response.data;
  } catch (error) {
    console.error('Error scheduling report:', error);
    return { success: false, error: error.message };
  }
};

// Update a scheduled report
const updateScheduledReport = async (reportId, reportData) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { 
        success: true, 
        message: `Report ${reportId} updated successfully`
      };
    }
    const response = await put(`/admin/reports/schedule/${reportId}`, reportData);  
    return response.data;
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    return { success: false, error: error.message };
  }
};

// Delete a scheduled report
const deleteScheduledReport = async (reportId) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { 
        success: true, 
        message: `Report ${reportId} deleted successfully`
      };
    }
    const response = await del(`/admin/reports/schedule/${reportId}`); 
    return response.data;
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    return { success: false, error: error.message };
  }
};

export default {
  getProviderPerformance,
  getReferralConversionRates,
  getTokenEconomyTrends,
  getAIAnalytics,
  exportReport,
  getScheduledReports,
  scheduleReport,
  updateScheduledReport,
  deleteScheduledReport
};
