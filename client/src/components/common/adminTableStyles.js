/**
 * Shared sx fragments for the "professional grid" look adopted across every
 * admin data table (see AdminProviders.js for the original reference
 * implementation). Importing these instead of copy-pasting keeps every admin
 * page visually consistent and makes future tweaks a one-file change.
 *
 * Usage:
 *   <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
 *     <Table size="small" sx={tableSx}>
 *       <TableHead>
 *         <TableRow sx={tableHeadRowSx}>...</TableRow>
 *       </TableHead>
 *       <TableBody>
 *         <TableRow hover sx={tableBodyRowSx}>...</TableRow>
 *       </TableBody>
 *     </Table>
 *   </TableContainer>
 *
 * For the table itself, pair with `tableLayout: 'fixed'` and explicit
 * percentage `width` on every TableCell (head and body) so the grid always
 * fits the container on any screen size — no horizontal scroll, no columns
 * silently clipped off-screen. Percentages across all columns must sum to
 * 100% (reserve a small fixed px width, e.g. 48px, for an actions/kebab
 * column since icon buttons don't need to scale with viewport width).
 */

export const tableContainerSx = {
  borderRadius: 2,
  overflow: 'hidden',
};

export const tableSx = {
  tableLayout: 'fixed',
  width: '100%',
  '& .MuiTableCell-root': {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    py: 1.25,
  },
};

export const tableHeadRowSx = {
  bgcolor: 'grey.50',
  '& .MuiTableCell-root': {
    fontWeight: 700,
    fontSize: '0.75rem',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'text.secondary',
    borderBottom: '2px solid',
    borderBottomColor: 'divider',
  },
};

export const tableBodyRowSx = {
  '&:last-child td': { borderBottom: 0 },
};

/** Compact, non-clipping chip style for short status/verification labels. */
export const compactChipSx = {
  fontWeight: 600,
  fontSize: '0.7rem',
  maxWidth: '100%',
};

/** Page header block: title + subtitle + optional right-aligned control (search, button). */
export const pageHeaderBoxSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  mb: 3,
};

/** Wraps tabs + table + pagination in one rounded card, matching AdminProviders.js. */
export const pageCardSx = {
  borderRadius: 2,
  p: 2,
};
