import React from 'react';
import { TableCell, Tooltip } from '@mui/material';

/**
 * Table header cell that shows its own label in a tooltip on hover. Header
 * text gets the same overflow:hidden/ellipsis treatment as body cells (see
 * adminTableStyles.tableSx, which applies it to every .MuiTableCell-root),
 * so a narrow column can clip the label — this makes the full label
 * available on hover, same as EllipsisCell does for body content.
 */
export default function EllipsisHeaderCell({ label, sx = {}, align }) {
  return (
    <TableCell sx={sx} align={align}>
      <Tooltip title={label} placement="top" enterDelay={400}>
        <span>{label}</span>
      </Tooltip>
    </TableCell>
  );
}
