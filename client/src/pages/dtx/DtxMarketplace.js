import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Grid, TextField, FormControl, InputLabel,
  Select, MenuItem, Tabs, Tab, Alert, CircularProgress, Chip,
  InputAdornment, Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { getDtxPrograms } from '../../services/dtxService';
import DtxProgramCard from '../../components/dtx/DtxProgramCard';
import PrescribeDtxModal from '../../components/dtx/PrescribeDtxModal';

const CATEGORIES = [
  { value: 'all', label: 'All Programs' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'metabolic', label: 'Metabolic' },
  { value: 'musculoskeletal', label: 'Musculoskeletal' },
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'neurology', label: 'Neurology' },
];

const EVIDENCE_OPTIONS = [
  { value: 'all', label: 'All Evidence Levels' },
  { value: 'fda_cleared', label: 'FDA Cleared' },
  { value: 'fda_authorized', label: 'FDA Authorized' },
  { value: 'peer_reviewed', label: 'Peer Reviewed' },
  { value: 'evidence_based', label: 'Evidence Based' },
  { value: 'clinical_study', label: 'Clinical Study' },
];

export default function DtxMarketplace() {
  const [programs, setPrograms] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [categoryTab, setCategoryTab] = useState(0);
  const [evidenceFilter, setEvidenceFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [prescribeTarget, setPrescribeTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const activeCategory = CATEGORIES[categoryTab]?.value || 'all';

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (evidenceFilter !== 'all') params.evidenceLevel = evidenceFilter;
      if (appliedSearch) params.search = appliedSearch;
      const res = await getDtxPrograms(params);
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setPrograms(inner.programs || (Array.isArray(inner) ? inner : []));
      setTotal(inner.total || (inner.programs?.length ?? 0));
    } catch (err) {
      setError(err?.message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, evidenceFilter, appliedSearch]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const handleSearch = () => setAppliedSearch(searchInput);
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const handlePrescribeSuccess = () => {
    setSuccessMsg(`Program prescribed successfully! The patient will be notified and you will earn tokens upon completion.`);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <StorefrontIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>DTx Marketplace</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Browse and prescribe clinically-validated digital therapeutic programs for your patients.
      </Typography>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filter Row */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by program, vendor, or condition…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Evidence Level</InputLabel>
              <Select
                value={evidenceFilter}
                label="Evidence Level"
                onChange={(e) => setEvidenceFilter(e.target.value)}
              >
                {EVIDENCE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2} md={1}>
            <Box>
              <Chip
                label={`${total} program${total !== 1 ? 's' : ''}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Category Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={categoryTab}
          onChange={(_, v) => setCategoryTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {CATEGORIES.map((cat) => (
            <Tab key={cat.value} label={cat.label} />
          ))}
        </Tabs>
      </Box>

      {/* Programs Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : programs.length === 0 ? (
        <Box textAlign="center" py={8}>
          <StorefrontIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">No programs found</Typography>
          <Typography variant="body2" color="text.disabled">
            Try adjusting your filters or search term
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {programs.map((program) => (
            <Grid key={program._id} item xs={12} sm={6} md={4} lg={3}>
              <DtxProgramCard
                program={program}
                onPrescribe={setPrescribeTarget}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Prescribe Modal */}
      <PrescribeDtxModal
        open={!!prescribeTarget}
        program={prescribeTarget}
        onClose={() => setPrescribeTarget(null)}
        onSuccess={handlePrescribeSuccess}
      />
    </Container>
  );
}
