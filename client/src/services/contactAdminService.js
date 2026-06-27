import { get, patch, del } from '../utils/apiUtils';

const contactAdminService = {
  getAll: async (status = 'all', page = 1) => {
    try {
      const params = { page, limit: 50 };
      if (status && status !== 'all') params.status = status;
      const data = await get('/contact', params);
      return data;
    } catch (err) {
      return { success: false, error: err.message || 'Failed to load enquiries.' };
    }
  },

  updateStatus: async (id, status) => {
    try {
      const data = await patch(`/contact/${id}/status`, { status });
      return data;
    } catch (err) {
      return { success: false, error: err.message || 'Failed to update status.' };
    }
  },

  delete: async (id) => {
    try {
      const data = await del(`/contact/${id}`);
      return data;
    } catch (err) {
      return { success: false, error: err.message || 'Failed to delete enquiry.' };
    }
  },
};

export default contactAdminService;
