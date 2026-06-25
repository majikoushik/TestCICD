/**
 * Referral Pages Index
 * 
 * This file exports all referral-related page components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import referral page components
const Referrals = lazy(() => import('./Referrals'));
const ReferralDetail = lazy(() => import('./ReferralDetail'));
const CreateReferral = lazy(() => import('./CreateReferral'));

// Export referral page components
export {
  Referrals,
  ReferralDetail,
  CreateReferral
};

// Export all referral page components as a group
export const ReferralPages = {
  Referrals,
  ReferralDetail,
  CreateReferral
};
