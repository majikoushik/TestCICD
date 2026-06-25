/**
 * Chart Components Index
 * 
 * This file exports all chart components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import chart components
const LineChart = lazy(() => import('./LineChart'));
const BarChart = lazy(() => import('./BarChart'));
const PieChart = lazy(() => import('./PieChart'));
const RadarChart = lazy(() => import('./RadarChart'));

// Export chart components
export {
  LineChart,
  BarChart,
  PieChart,
  RadarChart
};

// Export all chart components as a group
export const ChartComponents = {
  LineChart,
  BarChart,
  PieChart,
  RadarChart
};
