import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import patientService from '../../services/patientService';

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
  loading: false,
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
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loading = false;
        console.log('fetchPatients.fulfilled payload:', action.payload);
        
        // Handle nested response structure from mock API
        if (action.payload && action.payload.data) {
          console.log('Found nested data structure:', action.payload.data);
          if (action.payload.data.patients) {
            console.log('Found patients in nested data:', action.payload.data.patients.length);
            state.patients = action.payload.data.patients;
            state.pagination = {
              ...state.pagination,
              totalItems: action.payload.data.pagination?.total || 0,
              currentPage: action.payload.data.pagination?.page || 0,
              pageSize: action.payload.data.pagination?.limit || 10,
              totalPages: action.payload.data.pagination?.pages || 0
            };
          }
        } else if (action.payload && action.payload.patients) {
          // Handle direct response structure
          console.log('Found direct response structure with patients:', action.payload.patients.length);
          state.patients = action.payload.patients;
          state.pagination.totalItems = action.payload.totalCount || action.payload.patients.length;
          state.pagination.totalPages = Math.ceil(state.pagination.totalItems / state.pagination.pageSize);
        } else {
          // Try to handle any other structure
          console.log('No recognized structure, raw payload:', action.payload);
          if (Array.isArray(action.payload)) {
            console.log('Payload is an array, treating as patients array');
            state.patients = action.payload;
            state.pagination.totalItems = action.payload.length;
            state.pagination.totalPages = Math.ceil(action.payload.length / state.pagination.pageSize);
          } else {
            // Fallback to empty array if no patients are found
            console.warn('Could not extract patients from payload, using empty array');
            state.patients = [];
          }
        }
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch patients';
      })
      // Handle fetchPatientById
      .addCase(fetchPatientById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPatient = action.payload;
      })
      .addCase(fetchPatientById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch patient details';
      });
  },
});

// Export actions
export const { setFilters, setPagination, clearCurrentPatient } = patientsSlice.actions;

// Export selectors
export const selectAllPatients = (state) => state.patients.patients;
export const selectCurrentPatient = (state) => state.patients.currentPatient;
export const selectPatientsLoading = (state) => state.patients.loading;
export const selectPatientsError = (state) => state.patients.error;
export const selectPatientsFilters = (state) => state.patients.filters;
export const selectPatientsPagination = (state) => state.patients.pagination;

export default patientsSlice.reducer;
