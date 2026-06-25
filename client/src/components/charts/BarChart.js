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
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

/**
 * BarChart Component
 * 
 * A reusable bar chart component for categorical data visualization
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - Chart data array
 * @param {Array} props.bars - Configuration for bars to display
 * @param {string} props.xAxisDataKey - Data key for X axis
 * @param {string} props.title - Chart title
 * @param {string} props.subtitle - Chart subtitle
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onRefresh - Refresh callback
 * @param {boolean} props.showLegend - Whether to show the legend
 * @param {boolean} props.showGrid - Whether to show the grid
 * @param {boolean} props.stacked - Whether to stack the bars
 * @param {Object} props.height - Chart height
 * @param {string} props.layout - Chart layout (vertical or horizontal)
 */
export default function BarChart({
  data = [],
  bars = [],
  xAxisDataKey = 'name',
  title = 'Bar Chart',
  subtitle,
  loading = false,
  onRefresh,
  showLegend = true,
  showGrid = true,
  stacked = false,
  height = 300,
  layout = 'vertical',
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
  
  // Determine if we're using a horizontal layout
  const isHorizontal = layout === 'horizontal';
  
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
            <RechartsBarChart
              data={chartData}
              layout={layout}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
              <XAxis 
                dataKey={isHorizontal ? xAxisDataKey : null}
                type={isHorizontal ? 'category' : 'number'}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
              />
              <YAxis 
                dataKey={!isHorizontal ? xAxisDataKey : null}
                type={!isHorizontal ? 'category' : 'number'}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                stroke={theme.palette.divider}
                width={120}
              />
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
              
              {bars.map((bar, index) => (
                <Bar
                  key={bar.dataKey || index}
                  dataKey={bar.dataKey}
                  name={bar.name || bar.dataKey}
                  fill={bar.color || theme.palette.primary.main}
                  stackId={stacked ? 'stack' : undefined}
                  radius={bar.radius || [0, 0, 0, 0]}
                  barSize={bar.barSize || 20}
                  isAnimationActive={bar.animation !== undefined ? bar.animation : true}
                >
                  {bar.colorByValue && chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={typeof bar.colorByValue === 'function' 
                        ? bar.colorByValue(entry[bar.dataKey], entry) 
                        : theme.palette.primary.main
                      }
                    />
                  ))}
                </Bar>
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
