import React, { useState, useEffect } from 'react';
import { 
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  useTheme,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon,
  FileDownload as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend
} from 'recharts';

/**
 * RadarChart Component
 * 
 * A reusable radar chart component for comparing multiple variables across categories
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - Chart data array
 * @param {Array} props.variables - Configuration for variables to display
 * @param {string} props.categoryKey - Data key for categories
 * @param {string} props.title - Chart title
 * @param {string} props.subtitle - Chart subtitle
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onRefresh - Refresh callback
 * @param {boolean} props.showLegend - Whether to show the legend
 * @param {boolean} props.showGrid - Whether to show the grid
 * @param {Object} props.height - Chart height
 */
export default function RadarChart({
  data = [],
  variables = [],
  categoryKey = 'category',
  title = 'Radar Chart',
  subtitle,
  loading = false,
  onRefresh,
  showLegend = true,
  showGrid = true,
  height = 400,
  ...props
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [chartData, setChartData] = useState([]);
  
  // Menu open state
  const open = Boolean(anchorEl);
  
  // Handle menu open
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
    handleMenuClose();
  };
  
  // Handle download as CSV
  const handleDownloadCSV = () => {
    if (data && data.length > 0) {
      // Get headers
      const headers = Object.keys(data[0]).join(',');
      
      // Get rows
      const rows = data.map(item => 
        Object.values(item).map(value => 
          typeof value === 'string' ? `"${value}"` : value
        ).join(',')
      ).join('\n');
      
      // Create CSV content
      const csvContent = `${headers}\n${rows}`;
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    handleMenuClose();
  };
  
  // Process data when it changes
  useEffect(() => {
    if (data && data.length > 0) {
      setChartData(data);
    } else {
      setChartData([]);
    }
  }, [data]);
  
  return (
    <Card elevation={1} sx={{ height: '100%', ...props.sx }}>
      <CardHeader
        title={
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        }
        subheader={subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        action={
          <>
            <IconButton 
              aria-label="chart options"
              aria-controls={open ? 'chart-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleMenuClick}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              id="chart-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              MenuListProps={{
                'aria-labelledby': 'chart-options-button',
              }}
            >
              {onRefresh && (
                <MenuItem onClick={handleRefresh}>
                  <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
                  Refresh
                </MenuItem>
              )}
              <MenuItem onClick={handleDownloadCSV}>
                <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
                Download CSV
              </MenuItem>
            </Menu>
          </>
        }
      />
      <CardContent sx={{ height: `calc(100% - 72px)`, minHeight: height }}>
        {loading ? (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Loading chart data...
            </Typography>
          </Box>
        ) : chartData.length === 0 ? (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No data available
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart 
              cx="50%" 
              cy="50%" 
              outerRadius="80%" 
              data={chartData}
            >
              {showGrid && (
                <PolarGrid 
                  stroke={theme.palette.divider} 
                  gridType="polygon"
                />
              )}
              <PolarAngleAxis 
                dataKey={categoryKey} 
                tick={{ 
                  fill: theme.palette.text.secondary, 
                  fontSize: 12 
                }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 'auto']} 
                tick={{ 
                  fill: theme.palette.text.secondary, 
                  fontSize: 12 
                }}
                stroke={theme.palette.divider}
              />
              
              {variables.map((variable, index) => (
                <Radar
                  key={variable.dataKey || index}
                  name={variable.name || variable.dataKey}
                  dataKey={variable.dataKey}
                  stroke={variable.color || theme.palette.primary.main}
                  fill={variable.color || theme.palette.primary.main}
                  fillOpacity={0.6}
                  dot={variable.dot !== undefined ? variable.dot : true}
                  isAnimationActive={variable.animation !== undefined ? variable.animation : true}
                />
              ))}
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                  boxShadow: theme.shadows[3]
                }}
                labelStyle={{ color: theme.palette.text.primary }}
                itemStyle={{ color: theme.palette.text.primary }}
              />
              
              {showLegend && (
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: 20,
                    fontSize: 12,
                    color: theme.palette.text.secondary
                  }} 
                />
              )}
            </RechartsRadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
