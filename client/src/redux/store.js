import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// Import reducers
import patientsReducer from './slices/patientsSlice';
import authReducer from './slices/authSlice';
import tokenReducer from './slices/tokenSlice';
import notificationReducer from './slices/notificationSlice';
import adminReducer from './slices/adminSlice';
import referralsReducer from './slices/referralsSlice';

export const store = configureStore({
  reducer: {
    patients: patientsReducer,
    auth: authReducer,
    tokens: tokenReducer,
    notifications: notificationReducer,
    admin: adminReducer,
    referrals: referralsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['your/non-serializable/action'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

export default store;
