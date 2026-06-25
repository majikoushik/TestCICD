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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';

/**
 * PieChart Component
 * 
 * A reusable pie chart component for part-to-whole relationships
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - Chart data array
 * @param {string} props.dataKey - Data key for values
 * @param {string} props.nameKey - Data key for names
 * @param {string} props.title - Chart title
 * @param {string} props.subtitle - Chart subtitle
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onRefresh - Refresh callback
 * @param {boolean} props.showLegend - Whether to show the legend
 * @param {Array} props.colors - Custom colors for pie slices
 * @param {boolean} props.donut - Whether to display as a donut chart
 * @param {number} props.innerRadius - Inner radius for donut chart
 * @param {number} props.outerRadius - Outer radius for pie chart
 * @param {Object} props.height - Chart height
 */
export default function PieChart({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  title = 'Pie Chart',
  subtitle,
  loading = false,
  onRefresh,
  showLegend = true,
  colors,
  donut = false,
  innerRadius = '60%',
  outerRadius = '80%',
  height = 300,
  ...props
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [chartData, setChartData] = useState([]);
  
  // Default colors based on theme
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.primary.light,
    theme.palette.secondary.light,
    theme.palette.success.light,
    theme.palette.error.light
  ];
  
  // Use custom colors or default colors
  const chartColors = colors || defaultColors;
  
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
  
  // Custom tooltip formatter
  const renderCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 1.5,
            boxShadow: theme.shadows[3]
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {data[nameKey]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {typeof data[dataKey] === 'number' 
              ? data[dataKey].toLocaleString() 
              : data[dataKey]}
          </Typography>
          {data.percentage && (
            <Typography variant="body2" fontWeight="bold" color="primary">
              {(data.percentage * 100).toFixed(1)}%
            </Typography>
          )}
        </Box>
      );
    }
    return null;
  };
  
  // Process data when it changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Calculate total for percentages
      const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
      
      // Add percentage to each item
      const processedData = data.map(item => ({
        ...item,
        percentage: total > 0 ? item[dataKey] / total : 0
      }));
      
      setChartData(processedData);
    } else {
      setChartData([]);
    }
  }, [data, dataKey]);
  
  // Custom legend
  const renderCustomLegend = (props) => {
    const { payload } = props;
    
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          gap: 2,
          mt: 2
        }}
      >
        {payload.map((entry, index) => {
          const item = chartData.find(d => d[nameKey] === entry.value);
          const percentage = item?.percentage 
            ? (item.percentage * 100).toFixed(1) + '%'
            : '';
            
          return (
            <Box 
              key={`legend-item-${index}`}
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                mr: 2
              }}
            >
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  backgroundColor: entry.color,
                  borderRadius: '50%',
                  mr: 1
                }} 
              />
              <Typography variant="body2" color="text.secondary">
                {entry.value} {percentage && `(${percentage})`}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };
  
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
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                innerRadius={donut ? innerRadius : 0}
                outerRadius={outerRadius}
                dataKey={dataKey}
                nameKey={nameKey}
                paddingAngle={2}
                isAnimationActive={true}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chartColors[index % chartColors.length]} 
                  />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
              {showLegend && (
                <Legend 
                  content={renderCustomLegend}
                  verticalAlign="bottom"
                  align="center"
                />
              )}
            </RechartsPieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
