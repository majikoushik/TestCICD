/**
 * Auth Pages Index
 * 
 * This file exports all authentication-related page components
 */

// Export auth page components
export { default as Login } from './Login';
export { default as Register } from './Register';
export { default as ForgotPassword } from './ForgotPassword';

// Import components for the group object
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';

// Export all auth page components as a group
export const AuthPages = {
  Login,
  Register,
  ForgotPassword
};
