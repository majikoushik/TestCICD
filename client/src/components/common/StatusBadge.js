import React from 'react';
import { Chip, Box, Tooltip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  HourglassEmpty as HourglassEmptyIcon,
  VerifiedUser as VerifiedUserIcon,
  Block as BlockIcon
} from '@mui/icons-material';

/**
 * StatusBadge component
 * 
 * A reusable status badge component to display status indicators consistently
 * 
 * @param {Object} props
 * @param {string} props.status - The status to display
 * @param {string} props.type - The type of status (default, referral, consent, verification)
 * @param {string} props.size - The size of the badge (small, medium)
 * @param {boolean} props.withBorder - Whether to show a border around the badge
 * @param {boolean} props.withTooltip - Whether to show a tooltip with the status
 */
export default function StatusBadge({
  status,
  type = 'default',
  size = 'small',
  withBorder = false,
  withTooltip = false
}) {
  // Status configurations for different types
  const statusConfigs = {
    default: {
      active: { color: 'success', icon: <CheckCircleIcon fontSize="small" />, label: 'Active' },
      inactive: { color: 'default', icon: <CancelIcon fontSize="small" />, label: 'Inactive' },
      pending: { color: 'warning', icon: <ScheduleIcon fontSize="small" />, label: 'Pending' },
      error: { color: 'error', icon: <WarningIcon fontSize="small" />, label: 'Error' }
    },
    referral: {
      pending: { color: 'warning', icon: <ScheduleIcon fontSize="small" />, label: 'Pending' },
      accepted: { color: 'info', icon: <CheckCircleIcon fontSize="small" />, label: 'Accepted' },
      completed: { color: 'success', icon: <CheckCircleIcon fontSize="small" />, label: 'Completed' },
      rejected: { color: 'error', icon: <CancelIcon fontSize="small" />, label: 'Rejected' },
      cancelled: { color: 'default', icon: <CancelIcon fontSize="small" />, label: 'Cancelled' }
    },
    consent: {
      granted: { color: 'success', icon: <VerifiedUserIcon fontSize="small" />, label: 'Granted' },
      revoked: { color: 'error', icon: <BlockIcon fontSize="small" />, label: 'Revoked' },
      expired: { color: 'default', icon: <HourglassEmptyIcon fontSize="small" />, label: 'Expired' },
      pending: { color: 'warning', icon: <ScheduleIcon fontSize="small" />, label: 'Pending' }
    },
    verification: {
      verified: { color: 'success', icon: <VerifiedUserIcon fontSize="small" />, label: 'Verified' },
      unverified: { color: 'default', icon: <BlockIcon fontSize="small" />, label: 'Unverified' },
      pending: { color: 'warning', icon: <ScheduleIcon fontSize="small" />, label: 'Pending' },
      rejected: { color: 'error', icon: <CancelIcon fontSize="small" />, label: 'Rejected' }
    },
    payment: {
      paid: { color: 'success', icon: <CheckCircleIcon fontSize="small" />, label: 'Paid' },
      pending: { color: 'warning', icon: <ScheduleIcon fontSize="small" />, label: 'Pending' },
      overdue: { color: 'error', icon: <WarningIcon fontSize="small" />, label: 'Overdue' },
      refunded: { color: 'info', icon: <CancelIcon fontSize="small" />, label: 'Refunded' }
    }
  };
  
  // Get the appropriate configuration for the status
  const getStatusConfig = () => {
    // Get the config for the specified type
    const typeConfig = statusConfigs[type] || statusConfigs.default;
    
    // Get the config for the specified status
    const statusConfig = typeConfig[status.toLowerCase()] || {
      color: 'default',
      icon: null,
      label: status.charAt(0).toUpperCase() + status.slice(1)
    };
    
    return statusConfig;
  };
  
  const statusConfig = getStatusConfig();
  
  // Create the chip component
  const statusChip = (
    <Chip
      icon={statusConfig.icon}
      label={statusConfig.label}
      color={statusConfig.color}
      size={size}
      variant={withBorder ? 'outlined' : 'filled'}
    />
  );
  
  // Wrap in tooltip if needed
  return withTooltip ? (
    <Tooltip title={`Status: ${statusConfig.label}`}>
      <Box component="span">{statusChip}</Box>
    </Tooltip>
  ) : statusChip;
}
