import React, { useState, useEffect, useMemo, useCallback, memo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchTokenBalance,
  fetchTokenTransactions,
  fetchRedemptionServices,
  fetchTokenEarnSources,
  selectTokenBalance,
  selectTokenTransactions,
  selectRedemptionServices,
  selectTokenEarnSources,
  selectTokenLoading,
  selectTokenError
} from '../../redux/slices/tokenSlice';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Token as TokenIcon,
  SwapHoriz as SwapHorizIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  DataUsage as DataUsageIcon,
  VerifiedUser as VerifiedUserIcon,
  People as PeopleIcon
} from '@mui/icons-material';

// Import token components with dynamic imports
import { TokenEarnSources, RedeemServicesCatalog } from '../../components/tokens';

// Memoize TabPanel component to prevent unnecessary re-renders
const TabPanel = memo(function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`token-tabpanel-${index}`}
      aria-labelledby={`token-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
});

function TokenDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tabValue, setTabValue] = useState(0);
  
  // Get state from Redux
  const balance = useSelector(selectTokenBalance);
  const transactions = useSelector(selectTokenTransactions);
  const services = useSelector(selectRedemptionServices);
  const earnSources = useSelector(selectTokenEarnSources);
  const loading = useSelector(state => 
    state.tokens.loading.balance || 
    state.tokens.loading.transactions || 
    state.tokens.loading.services ||
    state.tokens.loading.sources
  );
  const error = useSelector(selectTokenError);
  
  // Create memoized tokenData object from Redux state to prevent recalculations on every render
  const tokenData = useMemo(() => ({
    balance: balance || 0,
    lifetimeEarned: Array.isArray(transactions) ? transactions.reduce((sum, tx) => sum + (tx.type === 'earned' ? tx.amount : 0), 0) : 0,
    lifetimeSpent: Array.isArray(transactions) ? transactions.reduce((sum, tx) => sum + (tx.type === 'spent' ? tx.amount : 0), 0) : 0,
    walletAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // Placeholder
    blockchainNetwork: 'Ethereum' // Placeholder
  }), [balance, transactions]);

  useEffect(() => {
    // Fetch data from Redux
    dispatch(fetchTokenBalance());
    dispatch(fetchTokenTransactions());
    dispatch(fetchRedemptionServices());
    dispatch(fetchTokenEarnSources());
  }, [dispatch]);

  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, []);

  const handleTransferTokens = useCallback(() => {
    navigate('/app/tokens/transfer');
  }, [navigate]);

  const handleRedeemTokens = useCallback(() => {
    navigate('/app/tokens/redeem');
  }, [navigate]);

  // Format date for display - memoized with useCallback
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Get transaction icon based on type - memoized with useCallback
  const getTransactionIcon = useCallback((type) => {
    switch (type) {
      case 'earned':
        return <ArrowUpwardIcon sx={{ color: 'success.main' }} />;
      case 'spent':
        return <ArrowDownwardIcon sx={{ color: 'error.main' }} />;
      case 'transfer':
        return <SwapHorizIcon sx={{ color: 'info.main' }} />;
      default:
        return <TokenIcon />;
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="dots" message="Loading token data..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Typography variant="h4" component="h1" gutterBottom>
        Token Dashboard
      </Typography>
      
      {/* Token Balance Card */}
      <Paper sx={{ p: 3, mb: 3, position: 'relative', overflow: 'hidden' }}>
            
        <Grid container spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TokenIcon sx={{ fontSize: 48, mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                  {tokenData ? tokenData.balance : 0}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Available Tokens
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<SwapHorizIcon />}
              onClick={handleTransferTokens}
              sx={{ mr: 2 }}
            >
              Transfer
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShoppingCartIcon />}
              onClick={handleRedeemTokens}
            >
              Redeem
            </Button>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" component="div">
                {tokenData ? tokenData.lifetimeEarned : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lifetime Earned
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" component="div">
                {tokenData ? tokenData.lifetimeSpent : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lifetime Spent
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" component="div">
                {tokenData ? (tokenData.lifetimeEarned - tokenData.lifetimeSpent) : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Net Balance
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Performance Summary Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Performance Summary
        </Typography>
        <Grid container spacing={3}>
          {/* Section 1 */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DataUsageIcon sx={{ color: 'success.main', fontSize: 28, mr: 1 }} />
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                    Improved Contribution by 25%
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Sharing and collaboration is incentivized
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Section 2 */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ color: 'info.main', fontSize: 28, mr: 1 }} />
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                    Total utilization up 30%
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  More tokens are being spent on premium AI services
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Section 3 */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PeopleIcon sx={{ color: 'warning.main', fontSize: 28, mr: 1 }} />
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                    User engagement up 35%
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Doctors are more active on the platform
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Token Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="token tabs">
            <Tab label="Transactions" id="token-tab-0" aria-controls="token-tabpanel-0" />
            <Tab label="Available Services" id="token-tab-1" aria-controls="token-tabpanel-1" />
            <Tab label="Wallet Info" id="token-tab-2" aria-controls="token-tabpanel-2" />
          </Tabs>
        </Box>
        
        {/* Transactions Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Recent Transactions
          </Typography>
          <Paper variant="outlined">
            <List>
              {Array.isArray(transactions) && transactions.map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getTransactionIcon(transaction.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1">
                            {transaction.description}
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: transaction.type === 'earned' ? 'success.main' : 
                                     transaction.type === 'spent' ? 'error.main' : 
                                     'info.main'
                            }}
                          >
                            {transaction.type === 'earned' ? '+' : '-'}{transaction.amount} Tokens
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(transaction.timestamp)}
                          </Typography>
                          <Chip
                            label={transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            size="small"
                            color={
                              transaction.type === 'earned' ? 'success' : 
                              transaction.type === 'spent' ? 'error' : 
                              'info'
                            }
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < transactions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {(!Array.isArray(transactions) || transactions.length === 0) && (
                <ListItem>
                  <ListItemText
                    primary="No transactions found"
                    secondary="Your transaction history will appear here"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </TabPanel>
        
        {/* Available Services Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Services Available for Token Redemption
          </Typography>
          <Grid container spacing={3}>
            {Array.isArray(services) && services.map((service) => (
              <Grid item xs={12} md={6} key={service.id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" component="div">
                        {service.name}
                      </Typography>
                      <Chip
                        label={`${service.tokenCost} Tokens`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {service.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => navigate('/app/tokens/redeem')}
                      disabled={!tokenData || tokenData.balance < service.tokenCost}
                    >
                      Redeem
                    </Button>
                    {tokenData && tokenData.balance < service.tokenCost && (
                      <Typography variant="caption" color="error">
                        Insufficient tokens
                      </Typography>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {(!Array.isArray(services) || services.length === 0) && (
              <Grid item xs={12}>
                <Alert severity="info">
                  No services available for redemption.
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>
        
        {/* Wallet Info Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Blockchain Wallet Information
          </Typography>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <VerifiedUserIcon sx={{ fontSize: 40, mr: 2, color: 'success.main' }} />
                  <Typography variant="h6">
                    Verified Blockchain Wallet
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Wallet Address
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {tokenData ? tokenData.walletAddress : 'Not connected'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Blockchain Network
                </Typography>
                <Typography variant="body1">
                  {tokenData ? tokenData.blockchainNetwork : 'Not connected'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Your tokens are securely stored on the blockchain. All transactions are immutable and transparent.
                    Token rewards are automatically processed when you contribute data or complete certain actions in the platform.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Paper>
          
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Token Economy
          </Typography>
          <Grid container spacing={3}>
            {/* Token Earn Sources */}
            <Grid item xs={12} md={6}>
              <Suspense fallback={<Paper sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><ModernLoadingIndicator variant="circular" size="small" /></Paper>}>
                <TokenEarnSources earnSources={earnSources} />
              </Suspense>
            </Grid>
            
            {/* Redeem Services Catalog */}
            <Grid item xs={12} md={6}>
              <Suspense fallback={<Paper sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><ModernLoadingIndicator variant="circular" size="small" /></Paper>}>
                <RedeemServicesCatalog 
                  services={services} 
                  tokenBalance={tokenData?.balance || 0} 
                  onRedeemService={handleRedeemTokens}
                  compact={true}
                />
              </Suspense>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Container>
  );
}

// Export as memoized component to prevent unnecessary re-renders
export default memo(TokenDashboard);
