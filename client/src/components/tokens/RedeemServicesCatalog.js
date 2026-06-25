import React, { memo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  Chip,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  CheckCircle as CheckCircleIcon,
  Token as TokenIcon
} from '@mui/icons-material';

/**
 * RedeemServicesCatalog Component
 * 
 * Displays a catalog of services that can be redeemed with tokens
 */
const RedeemServicesCatalog = ({ 
  services = [], 
  tokenBalance = 0, 
  onRedeemService = () => {},
  compact = false
}) => {
  // Get service category icon - memoized with useCallback
  const getCategoryIcon = useCallback((category) => {
    return <TokenIcon color="primary" />;
  }, []);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Redeem Services Catalog
        </Typography>
        <Tooltip title="Your current token balance">
          <Chip 
            icon={<TokenIcon />} 
            label={`${tokenBalance} Tokens`} 
            color="primary" 
            variant="outlined"
          />
        </Tooltip>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {!Array.isArray(services) || services.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
          No services available for redemption
        </Typography>
      ) : compact ? (
        <List disablePadding>
          {Array.isArray(services) && services.slice(0, 5).map((service, index) => (
            <React.Fragment key={service.id || index}>
              <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                <ListItemIcon>
                  {getCategoryIcon(service.category)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1">
                        {service.name}
                      </Typography>
                      <Tooltip title="Token cost">
                        <Chip 
                          label={`${service.tokenCost || service.price} Tokens`} 
                          color={tokenBalance >= (service.tokenCost || service.price) ? "primary" : "default"}
                          size="small" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Tooltip>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {service.description}
                    </Typography>
                  }
                />
              </ListItem>
              {index < Math.min(services.length, 5) - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
          {Array.isArray(services) && services.length > 5 && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => onRedeemService('view-all')}
              >
                View All Services
              </Button>
            </Box>
          )}
        </List>
      ) : (
        <Grid container spacing={2}>
          {Array.isArray(services) && services.map((service) => (
            <Grid item xs={12} sm={6} md={4} key={service.id}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3">
                      {service.name}
                    </Typography>
                    <Chip 
                      label={`${service.tokenCost || service.price} Tokens`}
                      color={tokenBalance >= (service.tokenCost || service.price) ? "primary" : "default"}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {service.description}
                  </Typography>
                  {service.benefits && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Benefits:
                      </Typography>
                      <List dense disablePadding>
                        {service.benefits.slice(0, 3).map((benefit, index) => (
                          <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <CheckCircleIcon fontSize="small" color="success" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={benefit} 
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
                <Box sx={{ flexGrow: 1 }} />
                <Divider />
                <CardActions>
                  <Button 
                    size="small" 
                    variant="contained"
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => onRedeemService(service)}
                    disabled={tokenBalance < (service.tokenCost || service.price)}
                    fullWidth
                  >
                    Redeem
                  </Button>
                </CardActions>
                {tokenBalance < (service.tokenCost || service.price) && (
                  <Box sx={{ p: 1, bgcolor: 'error.light', textAlign: 'center' }}>
                    <Typography variant="caption" color="error.dark">
                      Insufficient tokens
                    </Typography>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

// Export as memoized component to prevent unnecessary re-renders
export default memo(RedeemServicesCatalog);
