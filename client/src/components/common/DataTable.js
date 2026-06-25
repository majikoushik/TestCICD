import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  TableSortLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Toolbar,
  alpha
} from '@mui/material';
import {
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import CustomPagination from './CustomPagination';

/**
 * DataTable component
 * 
 * A reusable data table component with sorting, pagination, and selection
 * 
 * @param {Object} props
 * @param {Array} props.columns - Array of column definitions
 * @param {Array} props.data - Array of data rows
 * @param {boolean} props.loading - Whether data is loading
 * @param {string} props.emptyStateTitle - Title for empty state
 * @param {string} props.emptyStateMessage - Message for empty state
 * @param {Function} props.emptyStateAction - Function to call for empty state action
 * @param {string} props.emptyStateActionLabel - Label for empty state action button
 * @param {boolean} props.sortable - Whether table is sortable
 * @param {string} props.defaultSortColumn - Default column to sort by
 * @param {string} props.defaultSortDirection - Default sort direction (asc, desc)
 * @param {boolean} props.selectable - Whether rows are selectable
 * @param {Function} props.onRowClick - Function to call when a row is clicked
 * @param {boolean} props.pagination - Whether to show pagination
 * @param {number} props.rowsPerPage - Number of rows per page
 * @param {Array} props.rowsPerPageOptions - Options for rows per page
 * @param {Function} props.onPageChange - Function to call when page changes
 * @param {Function} props.onRowsPerPageChange - Function to call when rows per page changes
 * @param {number} props.page - Current page (0-indexed)
 * @param {number} props.totalCount - Total number of rows (for server-side pagination)
 * @param {boolean} props.dense - Whether to use dense padding
 * @param {boolean} props.stickyHeader - Whether to use sticky header
 * @param {string} props.size - Size of the table (small, medium)
 * @param {boolean} props.showToolbar - Whether to show the toolbar
 * @param {string} props.title - Title for the toolbar
 * @param {Array} props.actions - Array of action buttons for the toolbar
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyStateTitle = 'No Data',
  emptyStateMessage = 'No data available.',
  emptyStateAction = null,
  emptyStateActionLabel = 'Add New',
  sortable = true,
  defaultSortColumn = '',
  defaultSortDirection = 'asc',
  selectable = false,
  onRowClick = null,
  pagination = true,
  rowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  onPageChange = null,
  onRowsPerPageChange = null,
  page = 0,
  totalCount = 0,
  dense = false,
  stickyHeader = false,
  size = 'medium',
  showToolbar = false,
  title = '',
  actions = []
}) {
  // State for sorting
  const [order, setOrder] = useState(defaultSortDirection);
  const [orderBy, setOrderBy] = useState(defaultSortColumn);
  
  // State for selection
  const [selected, setSelected] = useState([]);
  
  // Handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Handle select all click
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = data.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };
  
  // Handle row click
  const handleRowClick = (event, id) => {
    if (selectable) {
      const selectedIndex = selected.indexOf(id);
      let newSelected = [];
      
      if (selectedIndex === -1) {
        newSelected = newSelected.concat(selected, id);
      } else if (selectedIndex === 0) {
        newSelected = newSelected.concat(selected.slice(1));
      } else if (selectedIndex === selected.length - 1) {
        newSelected = newSelected.concat(selected.slice(0, -1));
      } else if (selectedIndex > 0) {
        newSelected = newSelected.concat(
          selected.slice(0, selectedIndex),
          selected.slice(selectedIndex + 1)
        );
      }
      
      setSelected(newSelected);
    } else if (onRowClick) {
      onRowClick(id);
    }
  };
  
  // Check if row is selected
  const isSelected = (id) => selected.indexOf(id) !== -1;
  
  // Sort function
  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };
  
  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };
  
  // Sort data
  const sortedData = sortable && orderBy
    ? [...data].sort(getComparator(order, orderBy))
    : data;
  
  // Calculate total count for pagination
  const effectiveTotalCount = totalCount > 0 ? totalCount : data.length;
  
  // Render table toolbar
  const renderTableToolbar = () => {
    const numSelected = selected.length;
    
    return (
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          ...(numSelected > 0 && {
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
          }),
        }}
      >
        {numSelected > 0 ? (
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {numSelected} selected
          </Typography>
        ) : (
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            {title}
          </Typography>
        )}
        
        {numSelected > 0 ? (
          <Tooltip title="Delete">
            <IconButton>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Box sx={{ display: 'flex' }}>
            {actions.map((action, index) => (
              <Box key={index} sx={{ ml: 1 }}>
                {action}
              </Box>
            ))}
            <Tooltip title="Filter list">
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Toolbar>
    );
  };
  
  // If loading, show loading spinner
  if (loading) {
    return <LoadingSpinner message="Loading data..." />;
  }
  
  // If no data, show empty state
  if (!loading && data.length === 0) {
    return (
      <EmptyState
        title={emptyStateTitle}
        message={emptyStateMessage}
        actionCallback={emptyStateAction}
        actionLabel={emptyStateActionLabel}
      />
    );
  }
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        {showToolbar && renderTableToolbar()}
        
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size={dense ? 'small' : 'medium'}
            stickyHeader={stickyHeader}
          >
            <TableHead>
              <TableRow>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={selected.length > 0 && selected.length < data.length}
                      checked={data.length > 0 && selected.length === data.length}
                      onChange={handleSelectAllClick}
                      inputProps={{
                        'aria-label': 'select all',
                      }}
                    />
                  </TableCell>
                )}
                
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    padding={column.disablePadding ? 'none' : 'normal'}
                    sortDirection={orderBy === column.id ? order : false}
                    sx={{ 
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                      width: column.width
                    }}
                  >
                    {sortable && column.sortable !== false ? (
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => handleRequestSort(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
                
                {onRowClick && !selectable && (
                  <TableCell padding="checkbox" />
                )}
              </TableRow>
            </TableHead>
            
            <TableBody>
              {sortedData.map((row, index) => {
                const isItemSelected = selectable && isSelected(row.id);
                const labelId = `enhanced-table-checkbox-${index}`;
                
                return (
                  <TableRow
                    hover
                    onClick={(event) => handleRowClick(event, row.id)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={row.id || index}
                    selected={isItemSelected}
                    sx={{ cursor: (onRowClick || selectable) ? 'pointer' : 'default' }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          inputProps={{
                            'aria-labelledby': labelId,
                          }}
                        />
                      </TableCell>
                    )}
                    
                    {columns.map((column) => {
                      const value = row[column.id];
                      
                      return (
                        <TableCell
                          key={column.id}
                          align={column.align || 'left'}
                          padding={column.disablePadding ? 'none' : 'normal'}
                        >
                          {column.render ? column.render(row) : value}
                        </TableCell>
                      );
                    })}
                    
                    {onRowClick && !selectable && (
                      <TableCell padding="checkbox">
                        <IconButton size="small">
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {pagination && (
          <Box sx={{ p: 2 }}>
            <CustomPagination
              count={effectiveTotalCount}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={onPageChange}
              onRowsPerPageChange={onRowsPerPageChange}
              rowsPerPageOptions={rowsPerPageOptions}
              variant="table"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
