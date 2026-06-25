import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  IconButton, 
  Divider 
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

const SettingCard = ({ setting, value, onEdit }) => {
  const getCategoryColor = (category) => {
    switch (category) {
      case 'security':
        return 'error';
      case 'ai':
        return 'info';
      case 'blockchain':
        return 'warning';
      case 'notifications':
        return 'secondary';
      case 'general':
        return 'primary';
      case 'billing':
        return 'success';
      default:
        return 'default';
    }
  };
  
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h6" component="div">
                {setting.key.split('.').pop()}
              </Typography>
              <Chip 
                label={setting.category} 
                color={getCategoryColor(setting.category)} 
                size="small" 
                sx={{ ml: 2 }}
              />
              {setting.isActive === false && (
                <Chip 
                  label="Inactive" 
                  color="default" 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            
            <Typography variant="body2" color="textSecondary" paragraph>
              {setting.description}
            </Typography>
            
            <Divider sx={{ my: 1 }} />
            
            <Box display="flex" alignItems="center">
              <Typography variant="subtitle2" color="textSecondary" sx={{ mr: 1 }}>
                Value:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: typeof setting.value === 'object' ? 'monospace' : 'inherit',
                  backgroundColor: typeof setting.value === 'object' ? '#f5f5f5' : 'transparent',
                  padding: typeof setting.value === 'object' ? '4px 8px' : 0,
                  borderRadius: typeof setting.value === 'object' ? '4px' : 0,
                  maxWidth: '400px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {value}
              </Typography>
            </Box>
          </Box>
          
          <IconButton 
            color="primary" 
            onClick={onEdit}
            sx={{ mt: -1, mr: -1 }}
          >
            <EditIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SettingCard;
