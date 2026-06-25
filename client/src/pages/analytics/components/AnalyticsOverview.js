import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Token as TokenIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';

export default function AnalyticsOverview({ analytics }) {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Analysis Summary
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="body1" paragraph>
              {analytics.results.summary}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip 
                icon={<PersonIcon />} 
                label={`${analytics.results.data.highRiskCount} High Risk Patients`} 
                color="error" 
                variant="outlined" 
              />
              <Chip 
                icon={<PersonIcon />} 
                label={`${analytics.results.data.mediumRiskCount} Medium Risk Patients`} 
                color="warning" 
                variant="outlined" 
              />
              <Chip 
                icon={<PersonIcon />} 
                label={`${analytics.results.data.lowRiskCount} Low Risk Patients`} 
                color="success" 
                variant="outlined" 
              />
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Key Risk Factors:
            </Typography>
            <List dense>
              {analytics.results.data.riskFactors.map((factor, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemText 
                    primary={factor.factor} 
                    secondary={`Weight: ${(factor.weight * 100).toFixed(0)}%`} 
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
          
          <Typography variant="h6" gutterBottom>
            Parameters
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <List dense>
              {Object.entries(analytics.parameters).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} 
                    secondary={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value} 
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Token Reward
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            {analytics.tokenReward ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TokenIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                  <Typography variant="h4">
                    {analytics.tokenReward.amount}
                  </Typography>
                </Box>
                <Typography variant="body2" gutterBottom>
                  Status: {analytics.tokenReward.status.charAt(0).toUpperCase() + analytics.tokenReward.status.slice(1)}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  Transaction ID: {analytics.tokenReward.transactionId}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1">
                No token reward information available.
              </Typography>
            )}
          </Paper>
          
          <Typography variant="h6" gutterBottom>
            Shared With
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            {analytics.sharedWith && analytics.sharedWith.length > 0 ? (
              <List dense>
                {analytics.sharedWith.map((share, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <GroupIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={share.user.name} 
                      secondary={
                        <>
                          {share.user.organization} | Access: {share.accessLevel.charAt(0).toUpperCase() + share.accessLevel.slice(1)}
                          <br />
                          Shared on: {formatDate(share.sharedAt)}
                        </>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1">
                This report has not been shared with anyone.
              </Typography>
            )}
          </Paper>
          
          <Typography variant="h6" gutterBottom>
            Blockchain Reference
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {analytics.blockchainReference ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <VerifiedIcon sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="body1">
                    Verified on Blockchain
                  </Typography>
                </Box>
                <Typography variant="body2" gutterBottom>
                  Timestamp: {formatDate(analytics.blockchainReference.timestamp)}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                  Transaction ID: {analytics.blockchainReference.transactionId}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                  Hash: {analytics.blockchainReference.hash}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1">
                No blockchain reference available.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
