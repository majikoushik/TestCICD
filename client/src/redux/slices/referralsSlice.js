import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as referralService from '../../services/referralService';

// Async thunks
export const fetchReferrals = createAsyncThunk(
  'referrals/fetchReferrals',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await referralService.getReferrals(filters);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch referrals');
    }
  }
);

export const fetchReferralById = createAsyncThunk(
  'referrals/fetchReferralById',
  async (referralId, { rejectWithValue }) => {
    try {
      const response = await referralService.getReferralById(referralId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch referral details');
    }
  }
);

const initialState = {
  referrals: [],
  currentReferral: null,
  filters: {
    searchTerm: '',
    status: 'all',
    urgency: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
  },
  loading: false,
  error: null,
};

const referralsSlice = createSlice({
  name: 'referrals',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearCurrentReferral: (state) => {
      state.currentReferral = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchReferrals
      .addCase(fetchReferrals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReferrals.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        if (!payload) { state.referrals = []; return; }

        // Backend returns { success: true, count: N, data: [...] }
        if (Array.isArray(payload.data)) {
          state.referrals = payload.data;
          state.pagination.totalItems = payload.count || payload.data.length;
        } else if (payload.data?.referrals) {
          // mock API / paginated structure
          state.referrals = payload.data.referrals;
          state.pagination.totalItems = payload.data.pagination?.total || payload.data.referrals.length;
        } else if (Array.isArray(payload)) {
          state.referrals = payload;
          state.pagination.totalItems = payload.length;
        } else {
          state.referrals = [];
          state.pagination.totalItems = 0;
        }
        state.pagination.totalPages = Math.ceil(state.pagination.totalItems / state.pagination.pageSize);
      })
      .addCase(fetchReferrals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch referrals';
      })
      // Handle fetchReferralById
      .addCase(fetchReferralById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReferralById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReferral = action.payload;
      })
      .addCase(fetchReferralById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch referral details';
      });
  },
});

// Export actions
export const { setFilters, setPagination, clearCurrentReferral } = referralsSlice.actions;

// Export selectors
export const selectAllReferrals = (state) => state.referrals.referrals;
export const selectCurrentReferral = (state) => state.referrals.currentReferral;
export const selectReferralsLoading = (state) => state.referrals.loading;
export const selectReferralsError = (state) => state.referrals.error;
export const selectReferralsFilters = (state) => state.referrals.filters;
export const selectReferralsPagination = (state) => state.referrals.pagination;
export const selectTotalReferrals = (state) => state.referrals.pagination.totalItems;

export default referralsSlice.reducer;
