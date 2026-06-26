import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getHeaders = () => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

const contactAdminService = {
  getAll: async (status = 'all', page = 1) => {
    try {
      const params = { page, limit: 50 };
      if (status && status !== 'all') params.status = status;
      const { data } = await axios.get(`${API_BASE}/api/contact`, { params, headers: getHeaders() });
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to load enquiries.' };
    }
  },

  updateStatus: async (id, status) => {
    try {
      const { data } = await axios.patch(
        `${API_BASE}/api/contact/${id}/status`,
        { status },
        { headers: getHeaders() }
      );
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to update status.' };
    }
  },

  delete: async (id) => {
    try {
      const { data } = await axios.delete(`${API_BASE}/api/contact/${id}`, { headers: getHeaders() });
      return data;
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to delete enquiry.' };
    }
  },
};

export default contactAdminService;
