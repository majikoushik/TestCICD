import { get, post, put, del } from '../utils/apiUtils';
import { adminMockData } from './mockData';

// No need to define API_URL as it's handled by apiUtils

/**
 * Service for handling admin user operations
 */
const adminUserService = {
  /**
   * Get all users
   * @returns {Promise<Array>} Array of users
   */
  getAllUsers: async () => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          success: true,
          data: adminMockData.users
        };
      }

      // Make API call using apiUtils
      const response = await get('/admin/users');        
      return {
        success: true,
        data: response
      };   
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   */
  getUserById: async (userId) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Find user in mock data
        const user = adminMockData.users.find(u => (u._id || u.id) === userId);
        
        // Return mock data with a delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!user) {
          throw new Error('User not found');
        }
        
        return {
          success: true,
          data: user
        };
      }

      // Make API call using apiUtils
      const response = await get(`/admin/users/${userId}`);      
      return response.data;
    } catch (error) {
      console.error(`Error fetching user with ID ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new user
   * @param {Object} userData - The user data to create
   * @returns {Promise<Object>} - The response from the API
   */
  createUser: async (userData) => {
    try {
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate a mock ID
        const newUser = {
          _id: `mock-${Date.now()}`,
          ...userData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          data: newUser,
          message: 'User created successfully'
        };
      } else {
        // Make API call using apiUtils
        const response = await post('/admin/users', userData);        
        return response.data;
      }
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create user'
      };
    }
  },

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user object
   */
  updateUser: async (userId, userData) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Find and update user in mock data (this doesn't actually persist)
        const userIndex = adminMockData.users.findIndex(u => (u._id || u.id) === userId);
        
        if (userIndex === -1) {
          throw new Error('User not found');
        }
        
        // Create updated user object
        const updatedUser = {
          ...adminMockData.users[userIndex],
          ...userData,
          updatedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          message: 'User updated successfully',
          data: updatedUser
        };
      }

      // Make API call using apiUtils
      const response = await put(`/admin/users/${userId}`, userData);      
      return response.data;
    } catch (error) {
      console.error(`Error updating user with ID ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success message
   */
  deleteUser: async (userId) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Check if user exists in mock data
        const userExists = adminMockData.users.some(u => (u._id || u.id) === userId);
        
        if (!userExists) {
          throw new Error('User not found');
        }
        
        return {
          success: true,
          message: 'User deleted successfully'
        };
      }

      // Make API call using apiUtils
      const response = await del(`/admin/users/${userId}`);      
      return response.data;
    } catch (error) {
      console.error(`Error deleting user with ID ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Reset user password
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success message with temporary password
   */
  resetPassword: async (userId) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 700));
        
        // Check if user exists in mock data
        const userExists = adminMockData.users.some(u => (u._id || u.id) === userId);
        
        if (!userExists) {
          throw new Error('User not found');
        }
        
        // Generate a random temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        
        return {
          success: true,
          message: 'Password reset successfully',
          data: {
            tempPassword
          }
        };
      }

      // Make API call using apiUtils
      const response = await post(`/admin/users/${userId}/reset-password`, {});      
      return response.data;
    } catch (error) {
      console.error(`Error resetting password for user with ID ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Unlock user account
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success message
   */
  unlockAccount: async (userId) => {
    try {
      // Check if we should use mock data
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if user exists in mock data
        const userExists = adminMockData.users.some(u => (u._id || u.id) === userId);
        
        if (!userExists) {
          throw new Error('User not found');
        }
        
        return {
          success: true,
          message: 'Account unlocked successfully'
        };
      }

      // Make API call using apiUtils
      const response = await put(`/admin/users/${userId}/unlock`, {});      
      return response.data;
    } catch (error) {
      console.error(`Error unlocking account for user with ID ${userId}:`, error);
      throw error;
    }
  }
};

export default adminUserService;
