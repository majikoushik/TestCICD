import React, { useRef, useState } from 'react';
import { exportDialogToPDF } from '../../utils/pdfExport';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Grid,
  Typography,
  Box,
  Paper,
  Divider
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AIStatisticsDialog = ({ open, onClose, statistics }) => {
  const contentRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      await exportDialogToPDF(contentRef.current, 'ai-performance-statistics.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // If no statistics are provided, show placeholder message
  if (!statistics) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>AI Performance Statistics</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6">No statistics data available</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h5">AI Performance Statistics</Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Aggregate data across all AI models and reports
        </Typography>
      </DialogTitle>
      <DialogContent ref={contentRef}>
        <Grid container spacing={3}>
          {/* Overview Cards */}
          <Grid item xs={12}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Overview</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary">Total Reports</Typography>
                    <Typography variant="h4">{statistics.totalReports}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary">Average Confidence</Typography>
                    <Typography variant="h4">{statistics.averageConfidence != null ? (statistics.averageConfidence * 100).toFixed(1) + '%' : 'N/A'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary">Approval Rate</Typography>
                    <Typography variant="h4">{statistics.approvalRate != null ? (statistics.approvalRate * 100).toFixed(1) + '%' : 'N/A'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary">Feedback Count</Typography>
                    <Typography variant="h4">{statistics.totalFeedback}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Report Types Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Report Types Distribution</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statistics.reportTypeDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(statistics.reportTypeDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} reports`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Status Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Report Status Distribution</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statistics.statusDistribution || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Reports" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Confidence Score Trends */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Confidence Score Trends (Last 6 Months)</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={statistics.confidenceTrends || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 1]} tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} />
                    <Tooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="readmission" 
                      stroke="#8884d8" 
                      name="Readmission Risk" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="diagnosis" 
                      stroke="#82ca9d" 
                      name="Diagnosis" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="treatment" 
                      stroke="#ffc658" 
                      name="Treatment" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Feedback Analysis */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Feedback Analysis</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statistics.feedbackDistribution || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#FF8042" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Top AI Insights */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Top AI Insights</Typography>
              <Box sx={{ height: 300, overflowY: 'auto' }}>
                {(statistics.topInsights || []).map((insight, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">{insight.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{insight.description}</Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      Confidence: {(insight.confidence * 100).toFixed(1)}% | Impact: {insight.impact}
                    </Typography>
                    {index < statistics.topInsights.length - 1 && <Divider sx={{ mt: 1 }} />}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExportPDF}
          disabled={exporting}
          startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {exporting ? 'Generating PDF…' : 'Export Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIStatisticsDialog;
