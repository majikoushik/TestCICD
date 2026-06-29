import React, { useState, useEffect, useMemo, useCallback, memo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTokenBalance,
  fetchTokenTransactions,
  fetchRedemptionServices,
  fetchTokenEarnSources,
  selectTokenBalance,
  selectTokenTransactions,
  selectRedemptionServices,
  selectTokenEarnSources,
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
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
  People as PeopleIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Savings as SavingsIcon,
} from '@mui/icons-material';
import { post, get, del } from '../../utils/apiUtils';

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
            <Tab icon={<SavingsIcon />} iconPosition="start" label="Staking" id="token-tab-3" aria-controls="token-tabpanel-3" />
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

        {/* Staking Tab */}
        <TabPanel value={tabValue} index={3}>
          <StakingTab tokenBalance={tokenData?.balance || 0} onBalanceChange={() => dispatch(fetchTokenBalance())} />
        </TabPanel>
      </Paper>
    </Container>
  );
}

// ── Staking Tab Component ─────────────────────────────────────────────────────

const STAKE_OPTIONS = [
  { days: 30,  multiplier: 1.10, label: '30 Days',  bonus: '10%',  color: 'info' },
  { days: 60,  multiplier: 1.25, label: '60 Days',  bonus: '25%',  color: 'success' },
  { days: 90,  multiplier: 1.50, label: '90 Days',  bonus: '50%',  color: 'warning' },
];

function StakingTab({ tokenBalance, onBalanceChange }) {
  const [stakes, setStakes]           = useState([]);
  const [summary, setSummary]         = useState({});
  const [loading, setLoading]         = useState(true);
  const [stakeDialog, setStakeDialog] = useState(false);
  const [amount, setAmount]           = useState('');
  const [period, setPeriod]           = useState(30);
  const [stakeLoading, setStakeLoading] = useState(false);
  const [msg, setMsg]                 = useState(null);

  const loadStakes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/tokens/stakes');
      if (res.success) { setStakes(res.data || []); setSummary(res.summary || {}); }
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStakes(); }, [loadStakes]);

  const handleStake = async () => {
    if (!amount || Number(amount) < 1) return setMsg({ type: 'error', text: 'Enter a valid amount' });
    setStakeLoading(true);
    try {
      const res = await post('/tokens/stake', { amount: Number(amount), periodDays: period });
      if (res.success) {
        setMsg({ type: 'success', text: `Staked ${amount} CLT for ${period} days! Expected bonus: ${res.data.expectedBonus} CLT` });
        setStakeDialog(false); setAmount('');
        loadStakes(); onBalanceChange();
      } else {
        setMsg({ type: 'error', text: res.error });
      }
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setStakeLoading(false); }
  };

  const handleUnstake = async (stakeId) => {
    try {
      const res = await del(`/tokens/stakes/${stakeId}`);
      if (res.success) {
        setMsg({ type: 'info', text: `Unstaked — principal returned (no bonus for early cancellation).` });
        loadStakes(); onBalanceChange();
      } else {
        setMsg({ type: 'error', text: res.error });
      }
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };

  const selectedOption = STAKE_OPTIONS.find(o => o.days === period);
  const expectedBonus  = Math.floor(Number(amount || 0) * (selectedOption?.multiplier - 1 || 0));

  const daysLeft = (endDate) => {
    const diff = new Date(endDate) - Date.now();
    if (diff <= 0) return 'Matured';
    return `${Math.ceil(diff / 86400000)}d left`;
  };

  const statusColor = { active: 'primary', completed: 'success', cancelled: 'default' };

  return (
    <Box>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Token Staking</strong> — Lock tokens for a fixed period and earn a bonus on completion.
        Early cancellation returns principal only (no bonus). Tokens are released automatically when the period ends.
      </Alert>

      {/* Summary row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          ['Available', `${summary.tokenBalance ?? tokenBalance} CLT`, 'success.main'],
          ['Currently Staked', `${summary.totalStaked ?? 0} CLT`, 'warning.main'],
          ['Active Positions', summary.activeCount ?? 0, 'primary.main'],
        ].map(([label, val, color]) => (
          <Grid item xs={4} key={label}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" color={color}>{val}</Typography>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Stake option cards */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Choose a staking plan</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {STAKE_OPTIONS.map(opt => (
          <Grid item xs={12} sm={4} key={opt.days}>
            <Card variant="outlined" sx={{ textAlign: 'center', p: 1, borderColor: `${opt.color}.main`, cursor: 'pointer' }}
              onClick={() => { setPeriod(opt.days); setStakeDialog(true); }}>
              <CardContent>
                <LockIcon sx={{ fontSize: 36, color: `${opt.color}.main`, mb: 1 }} />
                <Typography variant="h6">{opt.label}</Typography>
                <Chip label={`+${opt.bonus} bonus`} color={opt.color} size="small" sx={{ mt: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Stake any amount and earn {opt.bonus} on top at maturity
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button variant="contained" color={opt.color} size="small" startIcon={<SavingsIcon />}
                  disabled={tokenBalance < 1}
                  onClick={(e) => { e.stopPropagation(); setPeriod(opt.days); setStakeDialog(true); }}>
                  Stake Now
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Active / past positions */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Your Positions</Typography>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {!loading && stakes.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <SavingsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No staking positions yet</Typography>
        </Paper>
      )}
      {stakes.map(stake => (
        <Paper key={stake._id} variant="outlined" sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body1" fontWeight="bold">{stake.amount} CLT</Typography>
              <Chip label={`${stake.periodDays}-day @ ${stake.multiplier}x`} size="small" variant="outlined" />
              <Chip label={stake.status} size="small" color={statusColor[stake.status]} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {stake.status === 'active'
                ? `Matures: ${new Date(stake.endDate).toLocaleDateString()} (${daysLeft(stake.endDate)})`
                : stake.status === 'completed'
                ? `Completed — Bonus earned: ${stake.bonusAmount} CLT`
                : `Cancelled — ${stake.amount} CLT returned`}
            </Typography>
            {stake.status === 'active' && (
              <LinearProgress
                variant="determinate"
                value={Math.min(100, ((Date.now() - new Date(stake.startDate)) / (new Date(stake.endDate) - new Date(stake.startDate))) * 100)}
                sx={{ mt: 1, borderRadius: 1 }}
              />
            )}
          </Box>
          {stake.status === 'active' && (
            <Button size="small" variant="outlined" color="error" startIcon={<LockOpenIcon />}
              onClick={() => handleUnstake(stake._id)}>
              Unstake
            </Button>
          )}
        </Paper>
      ))}

      {/* Stake Dialog */}
      <Dialog open={stakeDialog} onClose={() => setStakeDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Stake Tokens — {selectedOption?.label}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Lock tokens for {selectedOption?.days} days and earn a <strong>{selectedOption?.bonus} bonus</strong> on completion.
          </Alert>
          <TextField
            label="Amount (CLT)"
            type="number"
            fullWidth
            value={amount}
            onChange={e => setAmount(e.target.value)}
            inputProps={{ min: 1, max: tokenBalance }}
            helperText={`Available: ${tokenBalance} CLT${amount ? ` · Expected bonus: ${expectedBonus} CLT · Total return: ${Number(amount) + expectedBonus} CLT` : ''}`}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Staking Period</InputLabel>
            <Select value={period} label="Staking Period" onChange={e => setPeriod(e.target.value)}>
              {STAKE_OPTIONS.map(o => (
                <MenuItem key={o.days} value={o.days}>{o.label} — {o.bonus} bonus</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStakeDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStake} disabled={stakeLoading || !amount || Number(amount) < 1}>
            {stakeLoading ? <CircularProgress size={18} /> : `Stake ${amount || '0'} CLT`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Export as memoized component to prevent unnecessary re-renders
export default memo(TokenDashboard);
