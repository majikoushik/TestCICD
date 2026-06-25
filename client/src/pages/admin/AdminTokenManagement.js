import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Popover,
  Badge,
  Checkbox,
  FormGroup,
  FormControlLabel
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Refresh as RefreshIcon,
  LocalAtm as TokenIcon,
  MonetizationOn as MintIcon,
  RemoveCircle as BurnIcon,
  CardGiftcard as BonusIcon,
  Store as CatalogIcon,
  SwapHoriz as ConversionIcon,
  History as HistoryIcon,
  Redeem as RedeemIcon,
  Loyalty as LoyaltyIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import adminTokenService from '../../services/adminTokenService';
import { ModernLoadingIndicator } from '../../components/common';
import { 
  mockProviders, 
  mockCatalogItems, 
  mockConversionRules 
} from '../../services/mockData';

const AdminTokenManagement = () => {
  // State variables
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [tokenHistory, setTokenHistory] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [catalogItems, setCatalogItems] = useState([]);
  const [conversionRules, setConversionRules] = useState([]);
  
  // Filter states
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    organization: [],
    specialty: [],
    status: [],
    tokenActivity: []
  });
  const [activeFilters, setActiveFilters] = useState(0);
  const [availableFilters, setAvailableFilters] = useState({
    organization: [],
    specialty: [],
    status: [],
    tokenActivity: []
  });
  
  // Dialog states
  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const [burnDialogOpen, setBurnDialogOpen] = useState(false);
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [conversionRulesDialogOpen, setConversionRulesDialogOpen] = useState(false);
  
  // Form states
  const [mintForm, setMintForm] = useState({ providerId: '', amount: 0, reason: '' });
  const [burnForm, setBurnForm] = useState({ providerId: '', amount: 0, reason: '' });
  const [bonusForm, setBonusForm] = useState({ providerId: '', amount: 0, reason: '' });
  
  // Catalog and conversion rules states
  
  const [newCatalogItem, setNewCatalogItem] = useState({ name: '', description: '', tokenCost: 0, category: 'report' });
  const [newConversionRule, setNewConversionRule] = useState({ service: '', tokenAmount: 0, description: '' });

    // Provider token balance columns
  // Provider token balance columns
  const providerColumns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Provider Name', width: 200 },
    { field: 'organization', headerName: 'Organization', width: 200 },
    { 
      field: 'tokenBalance', 
      headerName: 'Token Balance', 
      width: 150, 
      valueFormatter: (params) => params.value ? params.value.toLocaleString() : '0' 
    },
    { 
      field: 'lastTransaction', 
      headerName: 'Last Transaction', 
      width: 200,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : 'N/A' 
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 300,
      renderCell: (params) => (
        <Box>
          <Button 
            size="small" 
            variant="outlined" 
            color="primary" 
            onClick={() => handleViewHistory(params.row)}
            sx={{ mr: 1 }}
          >
            History
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            color="success" 
            onClick={() => handleOpenMintDialog(params.row)}
            sx={{ mr: 1 }}
          >
            Mint
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            color="error" 
            onClick={() => handleOpenBurnDialog(params.row)}
          >
            Burn
          </Button>
        </Box>
      )
    }
  ];
      
  // Token history columns
  const historyColumns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'type', headerName: 'Type', width: 100 },
    { 
      field: 'amount', 
      headerName: 'Amount', 
      width: 100,
      valueFormatter: (params) => {
        const value = Number(params.value);
        return value > 0 ? `+${value}` : value;
      },
      cellClassName: (params) => {
        const value = Number(params.value);
        return value > 0 ? 'positive-amount' : 'negative-amount';
      }
    },
    { field: 'reason', headerName: 'Reason', width: 200 },
    { 
      field: 'timestamp', 
      headerName: 'Timestamp', 
      width: 200,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : 'N/A' 
    },
    { field: 'status', headerName: 'Status', width: 120 }
  ];
      
  // Fetch providers and token data on component mount
  useEffect(() => {
    // Initialize with mock data first to prevent errors
    setProviders(mockProviders);
    setCatalogItems(mockCatalogItems);
    setConversionRules(mockConversionRules);
    setLoading(false);
    
    // Then fetch from API
    fetchProviders();
    fetchCatalogItems();
    fetchConversionRules();
  }, []);

  // Effect to initialize filtered providers when providers change
  useEffect(() => {
    setFilteredProviders(providers);
  }, [providers]);

  // Fetch providers with token balances
  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminTokenService.getProviderTokenBalances();
      // Ensure providers is always an array
      let providersData = [];
      if (response && response.data) {
        providersData = Array.isArray(response.data) ? response.data : [];        
        setProviders(providersData);
        setFilteredProviders(providersData);
        
        // Extract available filter options
        const organizations = [...new Set(providersData.map(p => p.organization))];
        const specialties = [...new Set(providersData.map(p => p.specialty).filter(Boolean))];
        const statuses = [...new Set(providersData.map(p => p.status).filter(Boolean))];
        const tokenActivities = [...new Set(providersData.map(p => p.tokenActivity).filter(Boolean))];
        
        setAvailableFilters({
          organization: organizations,
          specialty: specialties,
          status: statuses,
          tokenActivity: tokenActivities
        });
      } else {
        setProviders([]);
        setFilteredProviders([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching provider token balances:', err);
      setError('Failed to load provider token balances. Please try again later.');
      setLoading(false);
      // Set providers to empty array on error
      setProviders([]);
      setFilteredProviders([]);
    }
  };
  
  // Handle filter menu open
  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };
  
  // Handle filter menu close
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  
  // Handle search term change
  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    applyFilters(term, filters);
  };
  
  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    const updatedFilters = { ...filters };
    
    // Toggle the filter value
    const index = updatedFilters[filterType].indexOf(value);
    if (index === -1) {
      updatedFilters[filterType].push(value);
    } else {
      updatedFilters[filterType].splice(index, 1);
    }
    
    setFilters(updatedFilters);
    applyFilters(searchTerm, updatedFilters);
  };
  
  // Apply filters to providers
  const applyFilters = (term, currentFilters) => {
    let filtered = [...providers];
    
    // Apply search term filter
    if (term) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(provider => 
        provider.name.toLowerCase().includes(lowerTerm) || 
        provider.organization.toLowerCase().includes(lowerTerm) ||
        (provider.specialty && provider.specialty.toLowerCase().includes(lowerTerm))
      );
    }
    
    // Apply category filters
    Object.keys(currentFilters).forEach(filterType => {
      if (currentFilters[filterType].length > 0) {
        filtered = filtered.filter(provider => 
          currentFilters[filterType].includes(provider[filterType])
        );
      }
    });
    
    // Count active filters
    const activeCount = Object.values(currentFilters).reduce(
      (count, filterValues) => count + filterValues.length, 0
    );
    setActiveFilters(activeCount);
    
    setFilteredProviders(filtered);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      organization: [],
      specialty: [],
      status: [],
      tokenActivity: []
    });
    setFilteredProviders(providers);
    setActiveFilters(0);
  };
  
  // Fetch token history for a specific provider
  const fetchProviderTokenHistory = async (providerId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminTokenService.getProviderTokenHistory(providerId);
      setTokenHistory(response.data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching provider token history:', err);
      setError('Failed to load provider token history. Please try again later.');
      setLoading(false);
    }
  };
  
  // Fetch token catalog items
  const fetchCatalogItems = async () => {
    try {
      const response = await adminTokenService.getTokenCatalog();
      // Ensure catalogItems is always an array
      if (response && response.data) {
        setCatalogItems(Array.isArray(response.data) ? response.data : []);
      } else {
        setCatalogItems([]);
      }
    } catch (err) {
      console.error('Error fetching token catalog:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load token catalog items',
        severity: 'error'
      });
      // Set catalogItems to empty array on error
      setCatalogItems([]);
    }
  };
  
  // Fetch token conversion rules
  const fetchConversionRules = async () => {
    try {
      const response = await adminTokenService.getTokenConversionRules();
      // Ensure conversionRules is always an array
      if (response && response.data) {
        setConversionRules(Array.isArray(response.data) ? response.data : []);
      } else {
        setConversionRules([]);
      }
    } catch (err) {
      console.error('Error fetching token conversion rules:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load token conversion rules',
        severity: 'error'
      });
      // Set conversionRules to empty array on error
      setConversionRules([]);
    }
  };
    // Handle tab change
  const handleTabChange = (event, newValue) => {
      setTabValue(newValue);
    };
    
  // Handle viewing provider token history
  const handleViewHistory = (provider) => {
    setSelectedProvider(provider);
    fetchProviderTokenHistory(provider.id);
  };
  
  // Handle opening mint dialog
  const handleOpenMintDialog = (provider) => {
    setMintForm({ providerId: provider.id, amount: 0, reason: '' });
    setMintDialogOpen(true);
  };
  
  // Handle opening burn dialog
  const handleOpenBurnDialog = (provider) => {
    setBurnForm({ providerId: provider.id, amount: 0, reason: '' });
    setBurnDialogOpen(true);
  };
  
  // Handle opening bonus dialog
  const handleOpenBonusDialog = () => {
    setBonusForm({ providerId: '', amount: 0, reason: 'Performance bonus' });
    setBonusDialogOpen(true);
  };
      
  // Handle minting tokens
  const handleMintTokens = async () => {
    try {
      setLoading(true);
      
      if (mintForm.amount <= 0) {
        setSnackbar({
          open: true,
          message: 'Amount must be greater than zero',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      await adminTokenService.mintTokens(mintForm);
      
      setSnackbar({
        open: true,
        message: `Successfully minted ${mintForm.amount} tokens`,
        severity: 'success'
      });
      
      setMintDialogOpen(false);
      fetchProviders(); // Refresh provider list
      
      setLoading(false);
    } catch (err) {
      console.error('Error minting tokens:', err);
      setSnackbar({
        open: true,
        message: 'Failed to mint tokens',
        severity: 'error'
      });
      setLoading(false);
    }
  };
  
  // Handle burning tokens
  const handleBurnTokens = async () => {
    try {
      setLoading(true);
      
      if (burnForm.amount <= 0) {
        setSnackbar({
          open: true,
          message: 'Amount must be greater than zero',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      await adminTokenService.burnTokens(burnForm);
      
      setSnackbar({
        open: true,
        message: `Successfully burned ${burnForm.amount} tokens`,
        severity: 'success'
      });
      
      setBurnDialogOpen(false);
      fetchProviders(); // Refresh provider list
      
      setLoading(false);
    } catch (err) {
      console.error('Error burning tokens:', err);
      setSnackbar({
        open: true,
        message: 'Failed to burn tokens',
        severity: 'error'
      });
      setLoading(false);
    }
  };
        // Handle approving bonus tokens
  const handleApproveBonus = async () => {
    try {
      setLoading(true);
      
      if (bonusForm.amount <= 0 || !bonusForm.providerId) {
        setSnackbar({
          open: true,
          message: 'Please select a provider and enter a valid amount',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      await adminTokenService.approveBonus(bonusForm);
      
      setSnackbar({
        open: true,
        message: `Successfully approved ${bonusForm.amount} bonus tokens`,
        severity: 'success'
      });
      
      setBonusDialogOpen(false);
      fetchProviders(); // Refresh provider list
      
      setLoading(false);
    } catch (err) {
      console.error('Error approving bonus tokens:', err);
      setSnackbar({
        open: true,
        message: 'Failed to approve bonus tokens',
        severity: 'error'
      });
      setLoading(false);
    }
  };
  
  // Handle adding catalog item
  const handleAddCatalogItem = async () => {
    try {
      if (!newCatalogItem.name || !newCatalogItem.description || newCatalogItem.tokenCost <= 0) {
        setSnackbar({
          open: true,
          message: 'Please fill all required fields with valid values',
          severity: 'error'
        });
        return;
      }
      
      await adminTokenService.addCatalogItem(newCatalogItem);
      
      setSnackbar({
        open: true,
        message: 'Successfully added new catalog item',
        severity: 'success'
      });
      
      setNewCatalogItem({ name: '', description: '', tokenCost: 0, category: 'report' });
      fetchCatalogItems(); // Refresh catalog items
    } catch (err) {
      console.error('Error adding catalog item:', err);
      setSnackbar({
        open: true,
        message: 'Failed to add catalog item',
        severity: 'error'
      });
    }
  };
  
  // Handle removing catalog item
  const handleRemoveCatalogItem = async (itemId) => {
    try {
      await adminTokenService.removeCatalogItem(itemId);
      
      setSnackbar({
        open: true,
        message: 'Successfully removed catalog item',
        severity: 'success'
      });
      
      fetchCatalogItems(); // Refresh catalog items
    } catch (err) {
      console.error('Error removing catalog item:', err);
      setSnackbar({
        open: true,
        message: 'Failed to remove catalog item',
        severity: 'error'
      });
    }
  };
    // Handle adding conversion rule
  const handleAddConversionRule = async () => {
      try {
        if (!newConversionRule.service || !newConversionRule.description || newConversionRule.tokenAmount <= 0) {
          setSnackbar({
            open: true,
            message: 'Please fill all required fields with valid values',
            severity: 'error'
          });
          return;
        }
        
        await adminTokenService.addConversionRule(newConversionRule);
        
        setSnackbar({
          open: true,
          message: 'Successfully added new conversion rule',
          severity: 'success'
        });
        
        setNewConversionRule({ service: '', tokenAmount: 0, description: '' });
        fetchConversionRules(); // Refresh conversion rules
      } catch (err) {
        console.error('Error adding conversion rule:', err);
        setSnackbar({
          open: true,
          message: 'Failed to add conversion rule',
          severity: 'error'
        });
      }
    };
      
      // Handle removing conversion rule
      const handleRemoveConversionRule = async (ruleId) => {
        try {
          await adminTokenService.removeConversionRule(ruleId);
          
          setSnackbar({
            open: true,
            message: 'Successfully removed conversion rule',
            severity: 'success'
          });
          
          fetchConversionRules(); // Refresh conversion rules
        } catch (err) {
          console.error('Error removing conversion rule:', err);
          setSnackbar({
            open: true,
            message: 'Failed to remove conversion rule',
            severity: 'error'
          });
        }
      };
      
      // Handle closing snackbar
    const handleCloseSnackbar = () => {
      setSnackbar({ ...snackbar, open: false });
    };
    
    // Handle page change for tables
    const handleChangePage = (event, newPage) => {
      setPage(newPage);
    };
    
    // Handle rows per page change for tables
    const handleChangeRowsPerPage = (event) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    };
  // Render function
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Token Management
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage provider tokens, bonus distributions, redemption catalog, and conversion rules.
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<TokenIcon />} label="Provider Balances" />
          <Tab icon={<BonusIcon />} label="Bonus Distribution" />
          <Tab icon={<RedeemIcon />} label="Redemption Catalog" />
          <Tab icon={<SettingsIcon />} label="Conversion Rules" />
        </Tabs>
      </Paper>
      
      {/* Provider Balances Tab */}
      {tabValue === 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Provider Token Balances
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                startIcon={<RefreshIcon />}
                onClick={fetchProviders}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={
                  <Badge badgeContent={activeFilters} color="error">
                    <FilterIcon />
                  </Badge>
                }
                onClick={handleFilterClick}
              >
                Filter
              </Button>
            </Box>
          </Box>
          
          {/* Search and Filter Bar */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <TextField
              placeholder="Search providers..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ mr: 2 }}
            />
            {activeFilters > 0 && (
              <Button 
                size="small" 
                onClick={clearFilters}
                startIcon={<CloseIcon />}
              >
                Clear Filters
              </Button>
            )}
          </Box>
          
          {/* Filter Popover */}
          <Popover
            open={Boolean(filterAnchorEl)}
            anchorEl={filterAnchorEl}
            onClose={handleFilterClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: { width: 300, p: 2, maxHeight: 500, overflow: 'auto' }
            }}
          >
            <Typography variant="h6" gutterBottom>Filter Providers</Typography>
            
            {/* Organization Filter */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Organization</Typography>
              <FormGroup>
                {availableFilters.organization.map((org) => (
                  <FormControlLabel
                    key={org}
                    control={
                      <Checkbox
                        checked={filters.organization.includes(org)}
                        onChange={() => handleFilterChange('organization', org)}
                        size="small"
                      />
                    }
                    label={org}
                  />
                ))}
              </FormGroup>
            </Box>
            
            {/* Specialty Filter */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Specialty</Typography>
              <FormGroup>
                {availableFilters.specialty.map((specialty) => (
                  <FormControlLabel
                    key={specialty}
                    control={
                      <Checkbox
                        checked={filters.specialty.includes(specialty)}
                        onChange={() => handleFilterChange('specialty', specialty)}
                        size="small"
                      />
                    }
                    label={specialty}
                  />
                ))}
              </FormGroup>
            </Box>
            
            {/* Status Filter */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Status</Typography>
              <FormGroup>
                {availableFilters.status.map((status) => (
                  <FormControlLabel
                    key={status}
                    control={
                      <Checkbox
                        checked={filters.status.includes(status)}
                        onChange={() => handleFilterChange('status', status)}
                        size="small"
                      />
                    }
                    label={status.charAt(0).toUpperCase() + status.slice(1)}
                  />
                ))}
              </FormGroup>
            </Box>
            
            {/* Token Activity Filter */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Token Activity</Typography>
              <FormGroup>
                {availableFilters.tokenActivity.map((activity) => (
                  <FormControlLabel
                    key={activity}
                    control={
                      <Checkbox
                        checked={filters.tokenActivity.includes(activity)}
                        onChange={() => handleFilterChange('tokenActivity', activity)}
                        size="small"
                      />
                    }
                    label={activity.charAt(0).toUpperCase() + activity.slice(1)}
                  />
                ))}
              </FormGroup>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={clearFilters} sx={{ mr: 1 }}>Clear All</Button>
              <Button variant="contained" onClick={handleFilterClose}>Apply</Button>
            </Box>
          </Popover>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
               <ModernLoadingIndicator message="Loading alerts..." />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              {selectedProvider ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => setSelectedProvider(null)}
                      startIcon={<CloseIcon />}
                    >
                      Back to Provider List
                    </Button>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {selectedProvider.name} - Token History
                  </Typography>
                  <DataGrid
                    rows={tokenHistory}
                    columns={historyColumns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    autoHeight
                    disableSelectionOnClick
                    sx={{
                      '& .positive-amount': { color: 'success.main' },
                      '& .negative-amount': { color: 'error.main' },
                    }}
                  />
                </>
              ) : (
                <DataGrid
                  rows={filteredProviders}
                  columns={providerColumns}
                  pageSize={10}
                  rowsPerPageOptions={[5, 10, 25]}
                  autoHeight
                  disableSelectionOnClick
                />
              )}
            </>
          )}
        </Paper>
      )}
      
      {/* Bonus Distribution Tab */}
      {tabValue === 1 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Bonus Token Distribution
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<BonusIcon />}
              onClick={handleOpenBonusDialog}
            >
              Approve Bonus
            </Button>
          </Box>
          
          <Typography variant="body1" paragraph>
            Approve bonus token distributions for top contributors and high-performing providers.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Contributors This Month
                  </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Provider</TableCell>
                              <TableCell>Contributions</TableCell>
                              <TableCell>Suggested Bonus</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Dr. Sarah Johnson</TableCell>
                              <TableCell>42 referrals</TableCell>
                              <TableCell>50 tokens</TableCell>
                              <TableCell>
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  color="primary"
                                  onClick={() => {
                                    setBonusForm({
                                      providerId: 'provider-1',
                                      amount: 50,
                                      reason: 'Top referral contributor'
                                    });
                                    setBonusDialogOpen(true);
                                  }}
                                >
                                  Approve
                                </Button>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Dr. Michael Chen</TableCell>
                              <TableCell>38 referrals</TableCell>
                              <TableCell>40 tokens</TableCell>
                              <TableCell>
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  color="primary"
                                  onClick={() => {
                                    setBonusForm({
                                      providerId: 'provider-2',
                                      amount: 40,
                                      reason: 'Top referral contributor'
                                    });
                                    setBonusDialogOpen(true);
                                  }}
                                >
                                  Approve
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Quality Metrics Leaders
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Provider</TableCell>
                              <TableCell>Quality Score</TableCell>
                              <TableCell>Suggested Bonus</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Dr. Emily Rodriguez</TableCell>
                              <TableCell>98%</TableCell>
                              <TableCell>75 tokens</TableCell>
                              <TableCell>
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  color="primary"
                                  onClick={() => {
                                    setBonusForm({
                                      providerId: 'provider-3',
                                      amount: 75,
                                      reason: 'Top quality metrics'
                                    });
                                    setBonusDialogOpen(true);
                                  }}
                                >
                                  Approve
                                </Button>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Dr. James Wilson</TableCell>
                              <TableCell>95%</TableCell>
                              <TableCell>60 tokens</TableCell>
                              <TableCell>
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  color="primary"
                                  onClick={() => {
                                    setBonusForm({
                                      providerId: 'provider-4',
                                      amount: 60,
                                      reason: 'Top quality metrics'
                                    });
                                    setBonusDialogOpen(true);
                                  }}
                                >
                                  Approve
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
          </Paper>
        )}
        
        {/* Redemption Catalog Tab */}
      {tabValue === 2 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Token Redemption Catalog
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => setCatalogDialogOpen(true)}
            >
              Add Item
            </Button>
          </Box>
          
          <Typography variant="body1" paragraph>
            Manage the catalog of services and items that providers can redeem tokens for.
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Token Cost</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {catalogItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.tokenCost}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => {
                          setNewCatalogItem(item);
                          setCatalogDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoveCatalogItem(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
           
      {tabValue === 3 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Token-to-Service Conversion Rules
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => setConversionRulesDialogOpen(true)}
            >
              Add Rule
            </Button>
          </Box>
          
          <Typography variant="body1" paragraph>
            Set and manage rules for converting tokens to services.
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Token Amount</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conversionRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.service}</TableCell>
                    <TableCell>{rule.tokenAmount}</TableCell>
                    <TableCell>{rule.description}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => {
                          setNewConversionRule(rule);
                          setConversionRulesDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoveConversionRule(rule.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
            {/* Mint Tokens Dialog */}
            <Dialog 
            open={mintDialogOpen} 
            onClose={() => setMintDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Mint Tokens</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  value={mintForm.amount}
                  onChange={(e) => setMintForm({ ...mintForm, amount: parseInt(e.target.value) || 0 })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Reason"
                  fullWidth
                  value={mintForm.reason}
                  onChange={(e) => setMintForm({ ...mintForm, reason: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMintDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleMintTokens}
                disabled={loading}
              >
                {loading ? <ModernLoadingIndicator size={24} /> : 'Mint Tokens'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Burn Tokens Dialog */}
          <Dialog 
            open={burnDialogOpen} 
            onClose={() => setBurnDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Burn Tokens</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  value={burnForm.amount}
                  onChange={(e) => setBurnForm({ ...burnForm, amount: parseInt(e.target.value) || 0 })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Reason"
                  fullWidth
                  value={burnForm.reason}
                  onChange={(e) => setBurnForm({ ...burnForm, reason: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBurnDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                color="error" 
                onClick={handleBurnTokens}
                disabled={loading}
              >
                {loading ? <ModernLoadingIndicator size={24} /> : 'Burn Tokens'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Bonus Tokens Dialog */}
          <Dialog 
            open={bonusDialogOpen} 
            onClose={() => setBonusDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Approve Bonus Tokens</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Provider</InputLabel>
                  <Select
                    value={bonusForm.providerId}
                    onChange={(e) => setBonusForm({ ...bonusForm, providerId: e.target.value })}
                    label="Provider"
                  >
                    {providers.map((provider) => (
                      <MenuItem key={provider.id} value={provider.id}>
                        {provider.name} - {provider.organization}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  value={bonusForm.amount}
                  onChange={(e) => setBonusForm({ ...bonusForm, amount: parseInt(e.target.value) || 0 })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Reason"
                  fullWidth
                  value={bonusForm.reason}
                  onChange={(e) => setBonusForm({ ...bonusForm, reason: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBonusDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleApproveBonus}
                disabled={loading}
              >
                {loading ? <ModernLoadingIndicator size={24} /> : 'Approve Bonus'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Catalog Item Dialog */}
          <Dialog 
            open={catalogDialogOpen} 
            onClose={() => setCatalogDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {newCatalogItem.id ? 'Edit Catalog Item' : 'Add Catalog Item'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Name"
                  fullWidth
                  value={newCatalogItem.name}
                  onChange={(e) => setNewCatalogItem({ ...newCatalogItem, name: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={newCatalogItem.description}
                  onChange={(e) => setNewCatalogItem({ ...newCatalogItem, description: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newCatalogItem.category}
                    onChange={(e) => setNewCatalogItem({ ...newCatalogItem, category: e.target.value })}
                    label="Category"
                  >
                    <MenuItem value="report">Report</MenuItem>
                    <MenuItem value="service">Service</MenuItem>
                    <MenuItem value="data">Data</MenuItem>
                    <MenuItem value="tool">Tool</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Token Cost"
                  type="number"
                  fullWidth
                  value={newCatalogItem.tokenCost}
                  onChange={(e) => setNewCatalogItem({ ...newCatalogItem, tokenCost: parseInt(e.target.value) || 0 })}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCatalogDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleAddCatalogItem}
              >
                {newCatalogItem.id ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Conversion Rule Dialog */}
          <Dialog 
            open={conversionRulesDialogOpen} 
            onClose={() => setConversionRulesDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {newConversionRule.id ? 'Edit Conversion Rule' : 'Add Conversion Rule'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Service"
                  fullWidth
                  value={newConversionRule.service}
                  onChange={(e) => setNewConversionRule({ ...newConversionRule, service: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Token Amount"
                  type="number"
                  fullWidth
                  value={newConversionRule.tokenAmount}
                  onChange={(e) => setNewConversionRule({ ...newConversionRule, tokenAmount: parseInt(e.target.value) || 0 })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={newConversionRule.description}
                  onChange={(e) => setNewConversionRule({ ...newConversionRule, description: e.target.value })}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConversionRulesDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleAddConversionRule}
              >
                {newConversionRule.id ? 'Update Rule' : 'Add Rule'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert 
              onClose={handleCloseSnackbar} 
              severity={snackbar.severity} 
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      );
};

export default AdminTokenManagement;