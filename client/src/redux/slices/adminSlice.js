import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminService from '../../services/adminService';

// Async thunks
export const fetchProviderMetrics = createAsyncThunk(
  'admin/fetchProviderMetrics',
  async (period = '3months', { rejectWithValue }) => {
    try {
      const response = await adminService.getProviderMetrics(period);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch provider metrics');
    }
  }
);

export const fetchReferralConversionRates = createAsyncThunk(
  'admin/fetchReferralConversionRates',
  async (period = '3months', { rejectWithValue }) => {
    try {
      const response = await adminService.getReferralConversionRates(period);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch referral conversion rates');
    }
  }
);

export const fetchTokenEconomyTrends = createAsyncThunk(
  'admin/fetchTokenEconomyTrends',
  async (period = '3months', { rejectWithValue }) => {
    try {
      const response = await adminService.getTokenEconomyTrends(period);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch token economy trends');
    }
  }
);

export const fetchAIAnalytics = createAsyncThunk(
  'admin/fetchAIAnalytics',
  async (period = '3months', { rejectWithValue }) => {
    try {
      const response = await adminService.getAIAnalytics(period);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch AI analytics');
    }
  }
);

export const fetchScheduledReports = createAsyncThunk(
  'admin/fetchScheduledReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminService.getScheduledReports();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch scheduled reports');
    }
  }
);

export const createScheduledReport = createAsyncThunk(
  'admin/createScheduledReport',
  async (reportData, { rejectWithValue }) => {
    try {
      const response = await adminService.createScheduledReport(reportData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to create scheduled report');
    }
  }
);

export const updateScheduledReport = createAsyncThunk(
  'admin/updateScheduledReport',
  async ({ reportId, reportData }, { rejectWithValue }) => {
    try {
      const response = await adminService.updateScheduledReport(reportId, reportData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to update scheduled report');
    }
  }
);

export const deleteScheduledReport = createAsyncThunk(
  'admin/deleteScheduledReport',
  async (reportId, { rejectWithValue }) => {
    try {
      await adminService.deleteScheduledReport(reportId);
      return reportId;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to delete scheduled report');
    }
  }
);

export const exportReport = createAsyncThunk(
  'admin/exportReport',
  async ({ reportType, period, format = 'pdf' }, { rejectWithValue }) => {
    try {
      const response = await adminService.exportReport(reportType, period, format);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to export report');
    }
  }
);

const initialState = {
  providerMetrics: {
    data: null,
    period: '3months',
  },
  referralConversionRates: {
    data: null,
    period: '3months',
  },
  tokenEconomyTrends: {
    data: null,
    period: '3months',
  },
  aiAnalytics: {
    data: null,
    period: '3months',
  },
  scheduledReports: [],
  loading: {
    providerMetrics: false,
    referralConversionRates: false,
    tokenEconomyTrends: false,
    aiAnalytics: false,
    scheduledReports: false,
    exportReport: false,
  },
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setSelectedPeriod: (state, action) => {
      const { metricType, period } = action.payload;
      if (state[metricType]) {
        state[metricType].period = period;
      }
    },
    clearAdminError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchProviderMetrics
      .addCase(fetchProviderMetrics.pending, (state) => {
        state.loading.providerMetrics = true;
        state.error = null;
      })
      .addCase(fetchProviderMetrics.fulfilled, (state, action) => {
        state.loading.providerMetrics = false;
        state.providerMetrics.data = action.payload;
      })
      .addCase(fetchProviderMetrics.rejected, (state, action) => {
        state.loading.providerMetrics = false;
        state.error = action.payload || 'Failed to fetch provider metrics';
      })
      
      // Handle fetchReferralConversionRates
      .addCase(fetchReferralConversionRates.pending, (state) => {
        state.loading.referralConversionRates = true;
        state.error = null;
      })
      .addCase(fetchReferralConversionRates.fulfilled, (state, action) => {
        state.loading.referralConversionRates = false;
        state.referralConversionRates.data = action.payload;
      })
      .addCase(fetchReferralConversionRates.rejected, (state, action) => {
        state.loading.referralConversionRates = false;
        state.error = action.payload || 'Failed to fetch referral conversion rates';
      })
      
      // Handle fetchTokenEconomyTrends
      .addCase(fetchTokenEconomyTrends.pending, (state) => {
        state.loading.tokenEconomyTrends = true;
        state.error = null;
      })
      .addCase(fetchTokenEconomyTrends.fulfilled, (state, action) => {
        state.loading.tokenEconomyTrends = false;
        state.tokenEconomyTrends.data = action.payload;
      })
      .addCase(fetchTokenEconomyTrends.rejected, (state, action) => {
        state.loading.tokenEconomyTrends = false;
        state.error = action.payload || 'Failed to fetch token economy trends';
      })
      
      // Handle fetchAIAnalytics
      .addCase(fetchAIAnalytics.pending, (state) => {
        state.loading.aiAnalytics = true;
        state.error = null;
      })
      .addCase(fetchAIAnalytics.fulfilled, (state, action) => {
        state.loading.aiAnalytics = false;
        state.aiAnalytics.data = action.payload;
      })
      .addCase(fetchAIAnalytics.rejected, (state, action) => {
        state.loading.aiAnalytics = false;
        state.error = action.payload || 'Failed to fetch AI analytics';
      })
      
      // Handle fetchScheduledReports
      .addCase(fetchScheduledReports.pending, (state) => {
        state.loading.scheduledReports = true;
        state.error = null;
      })
      .addCase(fetchScheduledReports.fulfilled, (state, action) => {
        state.loading.scheduledReports = false;
        state.scheduledReports = action.payload;
      })
      .addCase(fetchScheduledReports.rejected, (state, action) => {
        state.loading.scheduledReports = false;
        state.error = action.payload || 'Failed to fetch scheduled reports';
      })
      
      // Handle createScheduledReport
      .addCase(createScheduledReport.fulfilled, (state, action) => {
        state.scheduledReports.push(action.payload);
      })
      
      // Handle updateScheduledReport
      .addCase(updateScheduledReport.fulfilled, (state, action) => {
        const index = state.scheduledReports.findIndex(report => report.id === action.payload.id);
        if (index !== -1) {
          state.scheduledReports[index] = action.payload;
        }
      })
      
      // Handle deleteScheduledReport
      .addCase(deleteScheduledReport.fulfilled, (state, action) => {
        state.scheduledReports = state.scheduledReports.filter(report => report.id !== action.payload);
      })
      
      // Handle exportReport
      .addCase(exportReport.pending, (state) => {
        state.loading.exportReport = true;
        state.error = null;
      })
      .addCase(exportReport.fulfilled, (state) => {
        state.loading.exportReport = false;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.loading.exportReport = false;
        state.error = action.payload || 'Failed to export report';
      });
  },
});

// Export actions
export const { setSelectedPeriod, clearAdminError } = adminSlice.actions;

// Export selectors
export const selectProviderMetrics = (state) => state.admin.providerMetrics;
export const selectReferralConversionRates = (state) => state.admin.referralConversionRates;
export const selectTokenEconomyTrends = (state) => state.admin.tokenEconomyTrends;
export const selectAIAnalytics = (state) => state.admin.aiAnalytics;
export const selectScheduledReports = (state) => state.admin.scheduledReports;
export const selectAdminLoading = (state) => state.admin.loading;
export const selectAdminError = (state) => state.admin.error;

export default adminSlice.reducer;
