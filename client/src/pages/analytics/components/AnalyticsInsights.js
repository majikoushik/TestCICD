import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import {
  Insights as InsightsIcon,
  Lightbulb as LightbulbIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export default function AnalyticsInsights({ insights }) {
  if (!insights || insights.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">
          No insights available for this analysis.
        </Typography>
      </Paper>
    );
  }

  // Get severity icon and color
  const getSeverityProps = (severity) => {
    switch (severity) {
      case 'high':
        return { 
          icon: <WarningIcon />, 
          color: 'error',
          label: 'High Priority'
        };
      case 'medium':
        return { 
          icon: <WarningIcon />, 
          color: 'warning',
          label: 'Medium Priority'
        };
      case 'low':
        return { 
          icon: <InfoIcon />, 
          color: 'success',
          label: 'Low Priority'
        };
      default:
        return { 
          icon: <InfoIcon />, 
          color: 'default',
          label: severity
        };
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Key Insights
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        The following insights were generated from the analysis results. These insights highlight important findings and actionable recommendations.
      </Typography>
      
      <Grid container spacing={3}>
        {insights.map((insight, index) => {
          const severityProps = getSeverityProps(insight.severity);
          
          return (
            <Grid item xs={12} key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LightbulbIcon sx={{ color: `${severityProps.color}.main`, mr: 1 }} />
                      <Typography variant="h6">
                        {insight.title}
                      </Typography>
                    </Box>
                    <Chip 
                      icon={severityProps.icon} 
                      label={severityProps.label} 
                      color={severityProps.color} 
                      size="small" 
                    />
                  </Box>
                  
                  <Typography variant="body1" paragraph>
                    {insight.description}
                  </Typography>
                  
                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Recommendations:
                      </Typography>
                      <List dense>
                        {insight.recommendations.map((recommendation, recIndex) => (
                          <ListItem key={recIndex}>
                            <ListItemIcon>
                              <InsightsIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText primary={recommendation} />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                  
                  {insight.actionable && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                      <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                      <Typography variant="body2" color="success.main">
                        Actionable Insight
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
