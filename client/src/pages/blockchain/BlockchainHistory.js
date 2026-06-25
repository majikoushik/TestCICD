import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Link,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material';
import { blockchainService } from '../../services';
import { ModernLoadingIndicator } from '../../components/common';

const BlockchainHistory = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [copiedHash, setCopiedHash] = useState(null);
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null);
  const [filters, setFilters] = useState({
    event: 'all', // 'all', 'ReferralCreated', 'ReferralAccepted', etc.
    status: 'all' // 'all', 'Confirmed', 'Pending'
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await blockchainService.getTransactionHistory();
        setTransactions(data);
        setFilteredTransactions(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching blockchain transactions:', err);
        setError('Failed to load blockchain transactions. Please try again later.');
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    // Start with all transactions
    let filtered = [...transactions];
    
    // Apply search filter if there is a search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.hash?.toLowerCase().includes(query) || 
        tx.event?.toLowerCase().includes(query) ||
        tx.from?.toLowerCase().includes(query) ||
        tx.to?.toLowerCase().includes(query) ||
        tx.blockNumber?.toString().includes(query)
      );
    }
    
    // Apply event filter
    if (filters.event !== 'all') {
      filtered = filtered.filter(tx => tx.event === filters.event);
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }
    
    setFilteredTransactions(filtered);
  }, [searchQuery, transactions, filters]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };
  
  const handleViewDetails = (transaction) => {
    navigate(`/app/blockchain/transaction/${transaction.hash}`);
  };

  const getEventColor = (event) => {
    switch (event) {
      case 'ReferralCreated':
        return 'primary';
      case 'ReferralAccepted':
        return 'success';
      case 'ReferralRejected':
        return 'error';
      case 'TokenTransfer':
        return 'secondary';
      case 'TokenReward':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getExplorerUrl = (hash) => {
    // Replace with actual blockchain explorer URL (e.g., Etherscan for Ethereum)
    return `https://sepolia.etherscan.io/tx/${hash}`;
  };
  
  const handleFilterClick = (event) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterMenuAnchorEl(null);
  };
  
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    handleFilterClose();
  };
  
  const clearFilters = () => {
    setFilters({
      event: 'all',
      status: 'all'
    });
    handleFilterClose();
  };
  
  // Get unique event types for filter menu
  const eventTypes = transactions.length > 0 
    ? [...new Set(transactions.map(tx => tx.event))]
    : [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Blockchain Transaction History
      </Typography>
      
      {/* Blockchain Insights Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Transaction Volume Metric */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'primary.light', 
                color: 'primary.dark',
                p: 1.5,
                borderRadius: 2,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CompareArrowsIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'primary.main', mr: 0.5, fontSize: '0.9em' }} />
                  +53% transaction volume
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Increased network activity
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Network Security */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'success.light', 
                color: 'success.dark',
                p: 1.5,
                borderRadius: 2,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SecurityIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  99.9% network uptime
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Robust security protocols
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Transaction Speed */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'info.light', 
                color: 'info.dark',
                p: 1.5,
                borderRadius: 2,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SpeedIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  3.2s avg confirmation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fast transaction processing
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Smart Contract Usage */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                bgcolor: 'warning.light', 
                color: 'warning.dark',
                p: 1.5,
                borderRadius: 2,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircleIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'warning.main', mr: 0.5, fontSize: '0.9em' }} />
                  +42% smart contracts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Growing ecosystem adoption
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Typography variant="subtitle1" color="textSecondary" paragraph>
        View all blockchain transactions related to referrals and token transfers on the network.
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <TextField
          sx={{ flexGrow: 1, mr: 2 }}
          variant="outlined"
          placeholder="Search by transaction hash, event type, address, or block number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="Filter">
          <IconButton onClick={handleFilterClick}>
            <FilterListIcon />
            {(filters.event !== 'all' || filters.status !== 'all') && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  bgcolor: 'primary.main',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 8,
                  right: 8
                }}
              />
            )}
          </IconButton>
        </Tooltip>
        
        {/* Filter Menu */}
        <Menu
          anchorEl={filterMenuAnchorEl}
          open={Boolean(filterMenuAnchorEl)}
          onClose={handleFilterClose}
          sx={{ mt: 1 }}
        >
          <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
            Event Type
          </Typography>
          <MenuItem 
            selected={filters.event === 'all'}
            onClick={() => handleFilterChange('event', 'all')}
          >
            <ListItemText>All Events</ListItemText>
            {filters.event === 'all' && (
              <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                <CheckCircleIcon fontSize="small" color="primary" />
              </ListItemIcon>
            )}
          </MenuItem>
          {eventTypes.map(event => (
            <MenuItem 
              key={event}
              selected={filters.event === event}
              onClick={() => handleFilterChange('event', event)}
            >
              <ListItemText>{event}</ListItemText>
              {filters.event === event && (
                <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                  <CheckCircleIcon fontSize="small" color="primary" />
                </ListItemIcon>
              )}
            </MenuItem>
          ))}
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
            Status
          </Typography>
          <MenuItem 
            selected={filters.status === 'all'}
            onClick={() => handleFilterChange('status', 'all')}
          >
            <ListItemText>All Statuses</ListItemText>
            {filters.status === 'all' && (
              <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                <CheckCircleIcon fontSize="small" color="primary" />
              </ListItemIcon>
            )}
          </MenuItem>
          <MenuItem 
            selected={filters.status === 'Confirmed'}
            onClick={() => handleFilterChange('status', 'Confirmed')}
          >
            <ListItemText>Confirmed</ListItemText>
            {filters.status === 'Confirmed' && (
              <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                <CheckCircleIcon fontSize="small" color="primary" />
              </ListItemIcon>
            )}
          </MenuItem>
          <MenuItem 
            selected={filters.status === 'Pending'}
            onClick={() => handleFilterChange('status', 'Pending')}
          >
            <ListItemText>Pending</ListItemText>
            {filters.status === 'Pending' && (
              <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                <CheckCircleIcon fontSize="small" color="primary" />
              </ListItemIcon>
            )}
          </MenuItem>
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <Button
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              size="small"
            >
              Clear Filters
            </Button>
          </Box>
        </Menu>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <ModernLoadingIndicator variant="dots" message="Loading blockchain transactions..." />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Transaction Hash</TableCell>
                  <TableCell>Block</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((tx) => (
                    <TableRow hover key={tx.hash}>
                      <TableCell>
                        <Chip 
                          label={tx.event} 
                          color={getEventColor(tx.event)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {formatAddress(tx.hash)}
                          </Typography>
                          <Tooltip title={copiedHash === tx.hash ? "Copied!" : "Copy hash"}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopyHash(tx.hash)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View on explorer">
                            <IconButton 
                              size="small"
                              component={Link}
                              href={getExplorerUrl(tx.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View details">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewDetails(tx)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>{tx.blockNumber}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {formatAddress(tx.from)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {formatAddress(tx.to)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(tx.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={tx.status} 
                          color={tx.status === 'Confirmed' ? 'success' : 'warning'} 
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredTransactions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

    </Container>
  );
};

export default BlockchainHistory;
