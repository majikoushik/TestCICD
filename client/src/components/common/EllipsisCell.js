import React from 'react';
import { Tooltip, Typography } from '@mui/material';

/**
 * Single-line table cell content for long free-text values (email,
 * organization, specialty, notes, etc.). Truncates with an ellipsis instead
 * of wrapping to a second line, and shows the full value in a tooltip on
 * hover. Fills whatever width the table's fixed column layout gives it, so
 * it adapts to any screen size without ever forcing a row to wrap or the
 * table to scroll horizontally.
 *
 * Used across all admin grid pages for consistent look and feel — see
 * client/src/pages/admin/AdminProviders.js for the reference table layout
 * this pairs with (tableLayout: 'fixed' + percentage column widths).
 */
export default function EllipsisCell({ value, emptyText = '—', variant = 'body2', sx = {} }) {
  return (
    <Tooltip title={value || ''} placement="top" enterDelay={400}>
      <Typography
        variant={variant}
        noWrap
        sx={{ display: 'block', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', ...sx }}
      >
        {value || emptyText}
      </Typography>
    </Tooltip>
  );
}
