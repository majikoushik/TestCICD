import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationService } from '../../services';

// Async thunks
export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getUnreadCount();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch unread count');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { dispatch, rejectWithValue }) => {
    try {
      const response = await notificationService.markAsRead(notificationId);
      dispatch(fetchUnreadCount());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark notification as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.markAllAsRead();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark all notifications as read');
    }
  }
);

// Initial state
const initialState = {
  notification: {
    open: false,
    message: '',
    title: '',
    severity: 'info',
    autoHideDuration: 6000,
    vertical: 'bottom',
    horizontal: 'center'
  },
  unreadCount: 0,
  loading: {
    unreadCount: false,
    markAsRead: false,
    markAllAsRead: false
  },
  error: null
};

// Create slice
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    showNotification: (state, action) => {
      state.notification = {
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
      state.notification.open = false;
    },
    resetError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchUnreadCount
      .addCase(fetchUnreadCount.pending, (state) => {
        state.loading.unreadCount = true;
        state.error = null;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.loading.unreadCount = false;
        state.unreadCount = action.payload.count || 0;
      })
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.loading.unreadCount = false;
        state.error = action.payload || 'Failed to fetch unread count';
      })
      
      // markAsRead
      .addCase(markAsRead.pending, (state) => {
        state.loading.markAsRead = true;
        state.error = null;
      })
      .addCase(markAsRead.fulfilled, (state) => {
        state.loading.markAsRead = false;
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.loading.markAsRead = false;
        state.error = action.payload || 'Failed to mark notification as read';
      })
      
      // markAllAsRead
      .addCase(markAllAsRead.pending, (state) => {
        state.loading.markAllAsRead = true;
        state.error = null;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.loading.markAllAsRead = false;
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.loading.markAllAsRead = false;
        state.error = action.payload || 'Failed to mark all notifications as read';
      });
  }
});

// Export actions
export const { showNotification, closeNotification, resetError } = notificationsSlice.actions;

// Export selectors
export const selectNotification = (state) => state.notifications.notification;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state) => state.notifications.loading;
export const selectNotificationsError = (state) => state.notifications.error;

// Export reducer
export default notificationsSlice.reducer;
