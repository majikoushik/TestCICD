import React, { useState, useEffect } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Box,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

/**
 * SearchBar component
 * 
 * A reusable search bar component with debounce functionality
 * 
 * @param {Object} props
 * @param {string} props.placeholder - Placeholder text for the search field
 * @param {Function} props.onSearch - Function to call when search query changes
 * @param {string} props.initialValue - Initial search query value
 * @param {number} props.debounceTime - Debounce time in milliseconds
 * @param {string} props.size - Size of the search field (small, medium)
 * @param {boolean} props.fullWidth - Whether the search field should take full width
 * @param {boolean} props.elevated - Whether to show the search field with elevation
 * @param {string} props.variant - Variant of the search field (outlined, filled, standard)
 * @param {boolean} props.autoFocus - Whether to autofocus the search field
 */
export default function SearchBar({
  placeholder = 'Search...',
  onSearch,
  initialValue = '',
  debounceTime = 300,
  size = 'medium',
  fullWidth = false,
  elevated = false,
  variant = 'outlined',
  autoFocus = false
}) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);
  
  // Handle input change
  const handleChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Handle clear button click
  const handleClear = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    if (onSearch) {
      onSearch('');
    }
  };
  
  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceTime);
    
    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm, debounceTime]);
  
  // Call onSearch when debounced search term changes
  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);
  
  // Create the search field
  const searchField = (
    <TextField
      placeholder={placeholder}
      value={searchTerm}
      onChange={handleChange}
      size={size}
      fullWidth={fullWidth}
      variant={variant}
      autoFocus={autoFocus}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: searchTerm ? (
          <InputAdornment position="end">
            <Tooltip title="Clear search">
              <IconButton
                aria-label="clear search"
                onClick={handleClear}
                edge="end"
                size="small"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ) : null
      }}
    />
  );
  
  // If elevated, wrap in Paper
  if (elevated) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 0.5,
          display: 'flex',
          alignItems: 'center',
          width: fullWidth ? '100%' : 'auto'
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          {searchField}
        </Box>
      </Paper>
    );
  }
  
  // Otherwise, return the search field directly
  return searchField;
}
