import axios from 'axios';

const _RAW = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_BASE = _RAW.replace(/\/api$/, '');
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('adminToken')}`,
});

const onboardingService = {
  lookupNpi: async (npi) => {
    const { data } = await axios.get(`${API_BASE}/api/npi/lookup/${npi}`);
    return data;
  },

  getStatus: async () => {
    const { data } = await axios.get(`${API_BASE}/api/onboarding/status`, { headers: getHeaders() });
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await axios.patch(`${API_BASE}/api/onboarding/profile`, profileData, { headers: getHeaders() });
    return data;
  },

  uploadDocuments: async (formData) => {
    const { data } = await axios.post(`${API_BASE}/api/onboarding/documents`, formData, {
      headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  markStep: async (step) => {
    const { data } = await axios.patch(`${API_BASE}/api/onboarding/steps/${step}`, {}, { headers: getHeaders() });
    return data;
  },

  sendInvite: async (email) => {
    const { data } = await axios.post(`${API_BASE}/api/onboarding/invite`, { email }, { headers: getHeaders() });
    return data;
  },

  resendVerification: async () => {
    const { data } = await axios.post(`${API_BASE}/api/auth/resend-verification`, {}, { headers: getHeaders() });
    return data;
  },

  verifyEmail: async (token) => {
    const { data } = await axios.get(`${API_BASE}/api/auth/verify-email?token=${token}`);
    return data;
  },
};

export default onboardingService;
