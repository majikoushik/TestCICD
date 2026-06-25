import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const AdminMetricCard = ({ title, value, subtitle, trend, trendValue, icon, color }) => {
  const isTrendPositive = trend === 'up';
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          </Box>
          
          <Box 
            sx={{ 
              backgroundColor: color || '#f0f4f8', 
              borderRadius: '50%', 
              width: 40, 
              height: 40, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            {icon}
          </Box>
        </Box>
        
        {trend && trendValue && (
          <Box display="flex" alignItems="center" mt={2}>
            {isTrendPositive ? (
              <TrendingUp fontSize="small" color="success" />
            ) : (
              <TrendingDown fontSize="small" color="error" />
            )}
            <Typography 
              variant="body2" 
              sx={{ 
                ml: 0.5, 
                color: isTrendPositive ? 'success.main' : 'error.main'
              }}
            >
              {trendValue}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMetricCard;
