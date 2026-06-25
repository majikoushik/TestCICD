import { get, post, put, del } from '../utils/apiUtils';

// Using handleApiError from apiUtils

// AI Management Service
const aiManagementService = {
  // Get all AI reports with optional filters
  getReports: async (filters = {}) => {
    try {
      return await get('/admin/ai-management/reports', filters);
    } catch (error) {
      console.error('Error in getReports:', error);
      throw error;
    }
  },
  
  // Get a single AI report by ID
  getReportById: async (reportId) => {
    try {
      return await get(`/admin/ai-management/reports/${reportId}`);
    } catch (error) {
      console.error(`Error in getReportById for report ${reportId}:`, error);
      throw error;
    }
  },
  
  // Create a new AI report
  createReport: async (reportData) => {
    try {
      return await post('/admin/ai-management/reports', reportData);
    } catch (error) {
      console.error('Error in createReport:', error);
      throw error;
    }
  },
  
  // Update an existing AI report
  updateReport: async (reportId, reportData) => {
    try {
      return await put(`/admin/ai-management/reports/${reportId}`, reportData);
    } catch (error) {
      console.error(`Error in updateReport for report ${reportId}:`, error);
      throw error;
    }
  },
  
  // Delete an AI report
  deleteReport: async (reportId) => {
    try {
      return await del(`/admin/ai-management/reports/${reportId}`);
    } catch (error) {
      console.error(`Error in deleteReport for report ${reportId}:`, error);
      throw error;
    }
  },
  
  // Review an AI report (approve/reject)
  reviewReport: async (reportId, reviewData) => {
    try {
      return await put(`/admin/ai-management/reports/${reportId}/review`, reviewData);
    } catch (error) {
      console.error(`Error in reviewReport for report ${reportId}:`, error);
      throw error;
    }
  },
  
  // Add feedback to an AI report
  addFeedback: async (reportId, feedbackData) => {
    try {
      return await post(`/admin/ai-management/reports/${reportId}/feedback`, feedbackData);
    } catch (error) {
      console.error(`Error in addFeedback for report ${reportId}:`, error);
      throw error;
    }
  },
  
  // Get current AI thresholds
  getThresholds: async () => {
    try {
      return await get('/admin/ai-management/thresholds');
    } catch (error) {
      console.error('Error in getThresholds:', error);
      throw error;
    }
  },
  
  // Update AI thresholds
  updateThresholds: async (thresholdData) => {
    try {
      const response = put(`/admin/ai-management/thresholds`, thresholdData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Schedule an automated report
  scheduleReport: async (reportId, scheduleData) => {
    try {
      const response = post(`/admin/ai-management/reports/${reportId}/schedule`, scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error in scheduleReport:', error);
      throw error;
    }
  },
  
  // Get scheduled reports
  getScheduledReports: async () => {
    try {
      return await get('/admin/ai-management/scheduled-reports');
    } catch (error) {
      console.error('Error in getScheduledReports:', error);
      throw error;
    }
  },
  
  // Get aggregate AI statistics
  getAIStatistics: async () => {
    try {
      return await get('/admin/ai-management/statistics');
    } catch (error) {
      console.error('Error in getAIStatistics:', error);
      throw error;
    }
  },
  
  // AI Models Management
  
  // Get all AI models
  getAIModels: async (filters = {}) => {
    try {
      return await get('/admin/ai-management/models', filters);
    } catch (error) {
      console.error('Error in getAIModels:', error);
      throw error;
    }
  },
  
  // Get AI model by ID
  getAIModelById: async (modelId) => {
    try {
      return await get(`/admin/ai-management/models/${modelId}`);
    } catch (error) {
      console.error(`Error in getAIModelById for model ${modelId}:`, error);
      throw error;
    }
  },
  
  // Get AI model performance metrics
  getAIModelMetrics: async (modelId) => {
    try {
      return await get(`/admin/ai-management/models/${modelId}/metrics`);
    } catch (error) {
      console.error(`Error in getAIModelMetrics for model ${modelId}:`, error);
      throw error;
    }
  },
  
  // Submit feedback for AI model training
  submitModelTrainingFeedback: async (modelId, feedbackData) => {
    try {
      return await post(`/admin/ai-management/models/${modelId}/feedback`, feedbackData);
    } catch (error) {
      console.error(`Error in submitModelTrainingFeedback for model ${modelId}:`, error);
      throw error;
    }
  },
  
  // Update AI model thresholds
  updateModelThresholds: async (modelId, thresholdData) => {
    try {
      return await put(`/admin/ai-management/models/${modelId}/thresholds`, thresholdData);
    } catch (error) {
      console.error(`Error in updateModelThresholds for model ${modelId}:`, error);
      throw error;
    }
  },
  
  // Update AI model settings
  updateAIModelSettings: async (modelId, settingsData) => {
    try {
      return await put(`/admin/ai-management/models/${modelId}/settings`, settingsData);
    } catch (error) {
      console.error(`Error in updateAIModelSettings for model ${modelId}:`, error);
      throw error;
    }
  },
  
  // Get AI model training history
  getModelTrainingHistory: async (modelId) => {
    try {
      return await get(`/admin/ai-management/models/${modelId}/training-history`);
    } catch (error) {
      console.error(`Error in getModelTrainingHistory for model ${modelId}:`, error);
      throw error;
    }
  },
  
  // Get AI model feedback history
  getModelFeedbackHistory: async (modelId) => {
    try {
      return await get(`/admin/ai-management/models/${modelId}/feedback-history`);
    } catch (error) {
      console.error(`Error in getModelFeedbackHistory for model ${modelId}:`, error);
      throw error;
    }
  }
};

export default aiManagementService;
