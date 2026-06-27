import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import patientService from '../../services/patientService';
import { logout } from './authSlice';

// Async thunks
export const fetchPatients = createAsyncThunk(
  'patients/fetchPatients',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await patientService.getPatients(filters);
      console.log(response);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch patients');
    }
  }
);

export const fetchPatientById = createAsyncThunk(
  'patients/fetchPatientById',
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await patientService.getPatientById(patientId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch patient details');
    }
  }
);

const initialState = {
  patients: [],
  currentPatient: null,
  filters: {
    searchTerm: '',
    status: 'all',
    gender: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  },
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
  },
  listLoading: true,    // true so Patients page shows spinner immediately (no empty-state flash)
  detailLoading: false,
  error: null,
};

const patientsSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearCurrentPatient: (state) => {
      state.currentPatient = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchPatients
      .addCase(fetchPatients.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.listLoading = false;
        // API returns { success, patients, pagination } directly
        const payload = action.payload;
        const patients = payload?.patients ?? (Array.isArray(payload) ? payload : []);
        const pag = payload?.pagination;
        state.patients = patients;
        state.pagination = {
          ...state.pagination,
          totalItems: pag?.total ?? patients.length,
          pageSize: pag?.limit ?? state.pagination.pageSize,
          totalPages: pag?.pages ?? Math.ceil((pag?.total ?? patients.length) / state.pagination.pageSize),
        };
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload || 'Failed to fetch patients';
        state.patients = [];
        state.pagination = { ...state.pagination, totalItems: 0 };
      })
      // Handle fetchPatientById
      .addCase(fetchPatientById.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchPatientById.fulfilled, (state, action) => {
        state.detailLoading = false;
        // API returns { success, data: patient } — unwrap the patient object
        state.currentPatient = action.payload?.data || action.payload;
      })
      .addCase(fetchPatientById.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload || 'Failed to fetch patient details';
      })
      // Clear all patient data when user logs out
      .addCase(logout, () => initialState);
  },
});

// Export actions
export const { setFilters, setPagination, clearCurrentPatient } = patientsSlice.actions;

// Export selectors
export const selectAllPatients = (state) => state.patients.patients;
export const selectCurrentPatient = (state) => state.patients.currentPatient;
export const selectPatientsLoading = (state) => state.patients.listLoading;
export const selectPatientDetailLoading = (state) => state.patients.detailLoading;
export const selectPatientsError = (state) => state.patients.error;
export const selectPatientsFilters = (state) => state.patients.filters;
export const selectPatientsPagination = (state) => state.patients.pagination;

export default patientsSlice.reducer;
