import React from 'react';
import {
  Box,
  Pagination,
  TablePagination,
  FormControl,
  Select,
  MenuItem,
  Typography
} from '@mui/material';

/**
 * CustomPagination component
 * 
 * A reusable pagination component with options for different styles
 * 
 * @param {Object} props
 * @param {number} props.count - Total number of items
 * @param {number} props.page - Current page (0-indexed for table, 1-indexed for standard)
 * @param {number} props.rowsPerPage - Number of items per page
 * @param {Function} props.onPageChange - Function to call when page changes
 * @param {Function} props.onRowsPerPageChange - Function to call when rows per page changes
 * @param {string} props.variant - Pagination variant (standard, table)
 * @param {boolean} props.showRowsPerPage - Whether to show rows per page selector
 * @param {Array} props.rowsPerPageOptions - Options for rows per page
 * @param {string} props.size - Size of pagination (small, medium)
 * @param {boolean} props.showFirstButton - Whether to show first page button
 * @param {boolean} props.showLastButton - Whether to show last page button
 * @param {string} props.labelRowsPerPage - Label for rows per page
 */
export default function CustomPagination({
  count = 0,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  variant = 'standard',
  showRowsPerPage = true,
  rowsPerPageOptions = [5, 10, 25, 50],
  size = 'medium',
  showFirstButton = true,
  showLastButton = true,
  labelRowsPerPage = 'Items per page:'
}) {
  // Handle standard pagination page change (1-indexed)
  const handleStandardPageChange = (event, newPage) => {
    onPageChange(event, newPage - 1);
  };
  
  // For standard pagination, convert 0-indexed to 1-indexed
  const standardPage = page + 1;
  
  // Calculate total pages
  const totalPages = Math.ceil(count / rowsPerPage);
  
  // Table pagination
  if (variant === 'table') {
    return (
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={showRowsPerPage ? rowsPerPageOptions : []}
        showFirstButton={showFirstButton}
        showLastButton={showLastButton}
        labelRowsPerPage={labelRowsPerPage}
        size={size}
      />
    );
  }
  
  // Standard pagination
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 2
    }}>
      {showRowsPerPage && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            {labelRowsPerPage}
          </Typography>
          <FormControl size="small" variant="outlined">
            <Select
              value={rowsPerPage}
              onChange={onRowsPerPageChange}
              displayEmpty
              inputProps={{ 'aria-label': 'rows per page' }}
            >
              {rowsPerPageOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      
      <Pagination
        count={totalPages}
        page={standardPage}
        onChange={handleStandardPageChange}
        color="primary"
        size={size}
        showFirstButton={showFirstButton}
        showLastButton={showLastButton}
      />
      
      <Typography variant="body2" color="text.secondary">
        {count > 0 ? (
          <>
            {(page * rowsPerPage) + 1}-{Math.min((page + 1) * rowsPerPage, count)} of {count} items
          </>
        ) : (
          'No items'
        )}
      </Typography>
    </Box>
  );
}
