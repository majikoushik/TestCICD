import React, { useState, useRef, useCallback } from 'react';
import {
  Autocomplete, TextField, Box, Typography, Chip,
  CircularProgress, InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon, Person as PersonIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { get } from '../../utils/apiUtils';
import { formatDate } from '../../utils/dateFormatter';

function formatDOB(dateStr) {
  if (!dateStr) return 'N/A';
  return formatDate(dateStr) || dateStr;
}

function calcAge(dateStr) {
  if (!dateStr) return '';
  try {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' yrs';
  } catch { return ''; }
}

/**
 * Reusable patient search-as-you-type Autocomplete.
 *
 * Props:
 *   value        — the currently selected patient object (or null)
 *   onChange     — (event, patient | null) => void  — called when selection changes
 *   required     — bool
 *   label        — string (default: "Patient Name")
 *   helperText   — string (shown when no patient selected; overrides default)
 */
export default function PatientSearchAutocomplete({
  value,
  onChange,
  required = false,
  label = 'Patient Name',
  helperText,
  ...rest
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef(null);

  const fetchPatients = useCallback(async (query) => {
    if (!query || query.trim().length < 2) { setOptions([]); return; }
    setLoading(true);
    try {
      const res = await get('/patients', { search: query.trim(), limit: 10 });
      setOptions(res?.patients || []);
    } catch (err) {
      console.error('Patient search error:', err);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (_, newInputValue) => {
    setInputValue(newInputValue);
    // If user edits the text after a selection, clear the selection
    if (value && newInputValue !== (value.name || `${value.firstName || ''} ${value.lastName || ''}`.trim())) {
      onChange(null, null);
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPatients(newInputValue), 350);
  };

  const defaultHelper = value
    ? `${value.patientId} · ${value.insuranceInfo?.provider || 'No insurance on file'}`
    : 'Search by patient name, ID, or email';

  return (
    <Autocomplete
      {...rest}
      fullWidth
      options={options}
      loading={loading}
      value={value || null}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={onChange}
      filterOptions={(x) => x}
      getOptionLabel={(option) =>
        option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim()
      }
      isOptionEqualToValue={(option, val) => option._id === val._id}
      noOptionsText={
        inputValue.trim().length < 2
          ? 'Type at least 2 characters to search'
          : loading
          ? 'Searching...'
          : 'No patients found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          label={label}
          placeholder="Search by name, patient ID, or email..."
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start">
                  {value
                    ? <CheckCircleIcon color="success" fontSize="small" />
                    : <SearchIcon color="action" fontSize="small" />}
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          helperText={helperText ?? defaultHelper}
          FormHelperTextProps={{
            sx: { color: value ? 'success.main' : 'text.secondary' },
          }}
        />
      )}
      renderOption={(props, option) => {
        const name = option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim();
        const dob = option.dateOfBirth || option.birthDate;
        const age = calcAge(dob);
        const dobStr = formatDOB(dob);
        const insurance = option.insuranceInfo?.provider || 'No insurance on file';
        const policyNo = option.insuranceInfo?.policyNumber;
        const phone = option.contactInfo?.phone || option.phone;
        const email = option.contactInfo?.email || option.email;

        return (
          <Box
            component="li"
            {...props}
            key={option._id}
            sx={{ alignItems: 'flex-start !important', py: '10px !important' }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, width: '100%', alignItems: 'flex-start' }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%', bgcolor: 'primary.main',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25
              }}>
                <PersonIcon fontSize="small" sx={{ color: '#fff' }} />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight={700}>{name}</Typography>
                  <Chip label={option.patientId} size="small" variant="outlined"
                    sx={{ height: 18, fontSize: '0.65rem', borderRadius: '4px' }} />
                  {option.gender && (
                    <Chip label={option.gender} size="small"
                      sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'grey.100', borderRadius: '4px' }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, mt: 0.3 }}>
                  <Typography variant="caption" color="text.secondary">
                    DOB: {dobStr}{age ? ` (${age})` : ''}
                  </Typography>
                  {phone && (
                    <Typography variant="caption" color="text.secondary">📞 {phone}</Typography>
                  )}
                  {email && (
                    <Typography variant="caption" color="text.secondary" noWrap>✉ {email}</Typography>
                  )}
                </Box>
                <Typography variant="caption"
                  sx={{ color: insurance !== 'No insurance on file' ? 'primary.main' : 'text.disabled', fontWeight: 500 }}>
                  🏥 {insurance}{policyNo ? ` · ${policyNo}` : ''}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      }}
    />
  );
}
