/**
 * Contexts Index
 * 
 * This file exports all contexts for easier imports throughout the application
 */

// Import all providers
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { NotificationProvider, useNotification } from './NotificationContext';
import { ThemeProvider, useTheme as useThemeContext } from './ThemeContext';
import { TokenProvider, useToken } from './TokenContext';
import { PatientProvider, usePatient } from './PatientContext';
import { ReferralProvider, useReferral } from './ReferralContext';
import { AnalyticsProvider, useAnalytics } from './AnalyticsContext';

// Export all hooks and providers
export {
  // Auth and User
  AuthProvider,
  useAuth,
  NotificationProvider,
  useNotification,
  ThemeProvider,
  useThemeContext,
  
  // Data
  TokenProvider,
  useToken,
  PatientProvider,
  usePatient,
  ReferralProvider,
  useReferral,
  AnalyticsProvider,
  useAnalytics
};

/**
 * Combined provider component that wraps all contexts
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const AppProviders = ({ children }) => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <TokenProvider>
            <PatientProvider>
              <ReferralProvider>
                <AnalyticsProvider>
                  {children}
                </AnalyticsProvider>
              </ReferralProvider>
            </PatientProvider>
          </TokenProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};
