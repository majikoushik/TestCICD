/**
 * Landing Components Index
 * 
 * This file exports all landing-related components directly
 */

// Export landing components
export { default as LandingFooter } from './LandingFooter';
export { default as LandingNavbar } from './LandingNavbar';

// Import components for the group object
import LandingFooter from './LandingFooter';
import LandingNavbar from './LandingNavbar';

// Export all landing components as a group
export const LandingComponents = {
  LandingFooter,
  LandingNavbar
};
