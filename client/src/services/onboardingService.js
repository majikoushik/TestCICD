import { get, post, patch } from '../utils/apiUtils';

const onboardingService = {
  lookupNpi: async (npi) => {
    const data = await get(`/npi/lookup/${npi}`);
    return data;
  },

  getStatus: async () => {
    const data = await get('/onboarding/status');
    return data;
  },

  updateProfile: async (profileData) => {
    const data = await patch('/onboarding/profile', profileData);
    return data;
  },

  uploadDocuments: async (formData) => {
    const data = await post('/onboarding/documents', formData);
    return data;
  },

  markStep: async (step) => {
    const data = await patch(`/onboarding/steps/${step}`, {});
    return data;
  },

  sendInvite: async (email) => {
    const data = await post('/onboarding/invite', { email });
    return data;
  },

  resendVerification: async () => {
    const data = await post('/auth/resend-verification', {});
    return data;
  },

  verifyEmail: async (token) => {
    const data = await get(`/auth/verify-email`, { token });
    return data;
  },
};

export default onboardingService;
