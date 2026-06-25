/**
 * Analytics Components Index
 * 
 * This file exports all analytics components directly
 */

// Import components for the group object
import PatientRiskDashboard from './PatientRiskDashboard';
import TokenAnalyticsDashboard from './TokenAnalyticsDashboard';
import ReferralAnalyticsDashboard from './ReferralAnalyticsDashboard';
import PredictiveAlerts from './PredictiveAlerts';
import NaturalLanguageSummary from './NaturalLanguageSummary';
import ProviderBenchmarking from './ProviderBenchmarking';

// Export analytics dashboard components
export { default as PatientRiskDashboard } from './PatientRiskDashboard';
export { default as TokenAnalyticsDashboard } from './TokenAnalyticsDashboard';
export { default as ReferralAnalyticsDashboard } from './ReferralAnalyticsDashboard';

// Export enhanced analytics components
export { default as PredictiveAlerts } from './PredictiveAlerts';
export { default as NaturalLanguageSummary } from './NaturalLanguageSummary';
export { default as ProviderBenchmarking } from './ProviderBenchmarking';

// Export all analytics components as a group
export const AnalyticsComponents = {
  PatientRiskDashboard,
  TokenAnalyticsDashboard,
  ReferralAnalyticsDashboard,
  
  // Enhanced analytics components
  PredictiveAlerts,
  NaturalLanguageSummary,
  ProviderBenchmarking
};
