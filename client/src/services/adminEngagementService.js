import { get, post, put, del } from '../utils/apiUtils';

const BASE_PATH = '/admin/patient-engagement';

// NOTIFICATION FUNCTIONS

export const getNotifications = async (params = {}) => {
  try {
    return await get(BASE_PATH, params);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const getNotificationStats = async () => {
  try {
    return await get(`${BASE_PATH}/stats`);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    throw error;
  }
};

export const getNotification = async (id) => {
  try {
    return await get(`${BASE_PATH}/${id}`);
  } catch (error) {
    console.error(`Error fetching notification ${id}:`, error);
    throw error;
  }
};

export const sendNotification = async (data) => {
  try {
    return await post(BASE_PATH, data);
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

export const resendNotification = async (id) => {
  try {
    return await post(`${BASE_PATH}/${id}/resend`);
  } catch (error) {
    console.error(`Error resending notification ${id}:`, error);
    throw error;
  }
};

export const deleteNotification = async (id) => {
  try {
    return await del(`${BASE_PATH}/${id}`);
  } catch (error) {
    console.error(`Error deleting notification ${id}:`, error);
    throw error;
  }
};

// TEMPLATE FUNCTIONS

export const getTemplates = async (params = {}) => {
  try {
    return await get(`${BASE_PATH}/templates`, params);
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

export const getTemplate = async (id) => {
  try {
    return await get(`${BASE_PATH}/templates/${id}`);
  } catch (error) {
    console.error(`Error fetching template ${id}:`, error);
    throw error;
  }
};

export const createTemplate = async (data) => {
  try {
    return await post(`${BASE_PATH}/templates`, data);
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

export const updateTemplate = async (id, data) => {
  try {
    return await put(`${BASE_PATH}/templates/${id}`, data);
  } catch (error) {
    console.error(`Error updating template ${id}:`, error);
    throw error;
  }
};

export const deleteTemplate = async (id) => {
  try {
    return await del(`${BASE_PATH}/templates/${id}`);
  } catch (error) {
    console.error(`Error deleting template ${id}:`, error);
    throw error;
  }
};

export const previewTemplate = async (id, variables) => {
  try {
    return await post(`${BASE_PATH}/templates/${id}/preview`, variables);
  } catch (error) {
    console.error(`Error previewing template ${id}:`, error);
    throw error;
  }
};

// CAMPAIGN FUNCTIONS

export const getCampaigns = async (params = {}) => {
  try {
    return await get(`${BASE_PATH}/campaigns`, params);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
};

export const getCampaign = async (id) => {
  try {
    return await get(`${BASE_PATH}/campaigns/${id}`);
  } catch (error) {
    console.error(`Error fetching campaign ${id}:`, error);
    throw error;
  }
};

export const createCampaign = async (data) => {
  try {
    return await post(`${BASE_PATH}/campaigns`, data);
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
};

export const updateCampaign = async (id, data) => {
  try {
    return await put(`${BASE_PATH}/campaigns/${id}`, data);
  } catch (error) {
    console.error(`Error updating campaign ${id}:`, error);
    throw error;
  }
};

export const launchCampaign = async (id) => {
  try {
    return await post(`${BASE_PATH}/campaigns/${id}/launch`);
  } catch (error) {
    console.error(`Error launching campaign ${id}:`, error);
    throw error;
  }
};

export const cancelCampaign = async (id) => {
  try {
    return await post(`${BASE_PATH}/campaigns/${id}/cancel`);
  } catch (error) {
    console.error(`Error cancelling campaign ${id}:`, error);
    throw error;
  }
};

export const deleteCampaign = async (id) => {
  try {
    return await del(`${BASE_PATH}/campaigns/${id}`);
  } catch (error) {
    console.error(`Error deleting campaign ${id}:`, error);
    throw error;
  }
};

const adminEngagementService = {
  // Notifications
  getNotifications,
  getNotificationStats,
  getNotification,
  sendNotification,
  resendNotification,
  deleteNotification,
  // Templates
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  // Campaigns
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  launchCampaign,
  cancelCampaign,
  deleteCampaign,
};

export default adminEngagementService;
