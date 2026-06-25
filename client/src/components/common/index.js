/**
 * Common Components Index
 * 
 * This file exports all common components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamic imports for common components
// Note: LoadingSpinner, ModernLoadingIndicator and ErrorDisplay are kept as regular imports since they're used as fallbacks
import LoadingSpinner from './LoadingSpinner';
import ModernLoadingIndicator from './ModernLoadingIndicator';
import ErrorDisplay from './ErrorDisplay';

// Dynamically import other components
const EmptyState = lazy(() => import('./EmptyState'));
const ConfirmationDialog = lazy(() => import('./ConfirmationDialog'));
const StatusBadge = lazy(() => import('./StatusBadge'));
const BlockchainBadge = lazy(() => import('./BlockchainBadge'));
const ThemeToggle = lazy(() => import('./ThemeToggle'));
const DataTable = lazy(() => import('./DataTable'));
const CustomPagination = lazy(() => import('./CustomPagination'));
const SearchBar = lazy(() => import('./SearchBar'));

// Export individual components
export {
  // Loading and Error Components
  LoadingSpinner,
  ModernLoadingIndicator,
  ErrorDisplay,
  EmptyState,
  
  // Dialog Components
  ConfirmationDialog,
  
  // Status Components
  StatusBadge,
  BlockchainBadge,
  
  // Theme Components
  ThemeToggle,
  
  // Data Display Components
  DataTable,
  CustomPagination,
  SearchBar
};

// Export all components as a group
export const CommonComponents = {
  LoadingSpinner,
  ModernLoadingIndicator,
  ErrorDisplay,
  EmptyState,
  ConfirmationDialog,
  StatusBadge,
  BlockchainBadge,
  ThemeToggle,
  DataTable,
  CustomPagination,
  SearchBar
};
