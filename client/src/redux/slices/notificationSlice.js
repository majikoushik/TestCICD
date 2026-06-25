import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationService from '../../services/notificationService';

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications(filters);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      await notificationService.markAsRead(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark notification as read');
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.markAllAsRead();
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark all notifications as read');
    }
  }
);

const initialState = {
  // Notification list data
  notifications: [],
  unreadCount: 0,
  filters: {
    type: 'all',
    status: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
  },
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
  },
  loading: false,
  error: null,
  
  // UI notification (snackbar) state
  uiNotification: {
    open: false,
    message: '',
    title: '',
    severity: 'info',
    autoHideDuration: 6000,
    vertical: 'bottom',
    horizontal: 'center'
  },
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    
    // UI notification (snackbar) actions
    showNotification: (state, action) => {
      state.uiNotification = {
        open: true,
        message: action.payload.message || '',
        title: action.payload.title || '',
        severity: action.payload.severity || 'info',
        autoHideDuration: action.payload.autoHideDuration || 6000,
        vertical: action.payload.vertical || 'bottom',
        horizontal: action.payload.horizontal || 'center'
      };
    },
    closeNotification: (state) => {
      state.uiNotification.open = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.pagination.totalItems = action.payload.totalCount || action.payload.notifications.length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch notifications';
      })
      
      // Handle markNotificationAsRead
      .addCase(markNotificationAsRead.pending, (state) => {
        state.error = null;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const notification = state.notifications.find(n => n.id === notificationId);
        if (notification && notification.status === 'unread') {
          notification.status = 'read';
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.error = action.payload || 'Failed to mark notification as read';
      })
      
      // Handle markAllNotificationsAsRead
      .addCase(markAllNotificationsAsRead.pending, (state) => {
        state.error = null;
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.status = 'read';
        });
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.error = action.payload || 'Failed to mark all notifications as read';
      });
  },
});

// Export actions
export const { 
  setFilters, 
  setPagination, 
  updateUnreadCount,
  showNotification,
  closeNotification
} = notificationSlice.actions;

// Export selectors
export const selectAllNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state) => state.notifications.loading;
export const selectNotificationsError = (state) => state.notifications.error;
export const selectNotificationsFilters = (state) => state.notifications.filters;
export const selectNotificationsPagination = (state) => state.notifications.pagination;
export const selectUiNotification = (state) => state.notifications.uiNotification;

export default notificationSlice.reducer;
