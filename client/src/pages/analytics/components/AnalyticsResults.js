import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';

// Note: In a real application, we would use a charting library like Chart.js, Recharts, or D3.js
// For this demo, we'll create placeholder components for visualizations
const PieChart = ({ data, labels, colors }) => (
  <Box sx={{ 
    height: 250, 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center',
    position: 'relative'
  }}>
    <Box sx={{ 
      width: 200, 
      height: 200, 
      borderRadius: '50%', 
      background: 'conic-gradient(#ff6384 0% 6%, #ffcd56 6% 28%, #4bc0c0 28% 100%)',
      position: 'relative'
    }}>
      <Box sx={{ 
        position: 'absolute', 
        width: 80, 
        height: 80, 
        borderRadius: '50%', 
        background: 'white',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }} />
    </Box>
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      mt: 2,
      gap: 2
    }}>
      {labels.map((label, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            width: 12, 
            height: 12, 
            backgroundColor: colors[i], 
            mr: 0.5,
            borderRadius: 1
          }} />
          <Typography variant="caption">{label}: {data[i]}</Typography>
        </Box>
      ))}
    </Box>
    <Typography variant="caption" sx={{ mt: 1, fontStyle: 'italic' }}>
      Note: This is a placeholder visualization. In a real app, we would use a charting library.
    </Typography>
  </Box>
);

const BarChart = ({ data, labels }) => (
  <Box sx={{ 
    height: 250, 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'flex-end', 
    alignItems: 'center',
    position: 'relative',
    px: 2
  }}>
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'flex-end',
      height: 200,
      width: '100%',
      justifyContent: 'space-around',
      mb: 1
    }}>
      {data.map((value, i) => (
        <Box key={i} sx={{ 
          height: `${value * 100 * 2}px`, 
          width: 30, 
          backgroundColor: 'primary.main',
          borderRadius: '4px 4px 0 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}>
          {(value * 100).toFixed(0)}%
        </Box>
      ))}
    </Box>
    <Box sx={{ 
      display: 'flex', 
      width: '100%',
      justifyContent: 'space-around'
    }}>
      {labels.map((label, i) => (
        <Typography key={i} variant="caption" sx={{ maxWidth: 60, textAlign: 'center' }}>
          {label}
        </Typography>
      ))}
    </Box>
    <Typography variant="caption" sx={{ mt: 1, fontStyle: 'italic' }}>
      Note: This is a placeholder visualization. In a real app, we would use a charting library.
    </Typography>
  </Box>
);

export default function AnalyticsResults({ results }) {
  if (!results) {
    return (
      <Typography variant="body1">
        No results available for this analysis.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Analysis Results
      </Typography>
      
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="body1" paragraph>
          {results.summary}
        </Typography>
      </Paper>
      
      {/* Key Metrics */}
      <Typography variant="h6" gutterBottom>
        Key Metrics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {results.data.highRiskCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High Risk Patients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                {results.data.mediumRiskCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Medium Risk Patients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {results.data.lowRiskCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Low Risk Patients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Risk Factors Table */}
      <Typography variant="h6" gutterBottom>
        Risk Factors
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Risk Factor</TableCell>
              <TableCell align="right">Weight</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.data.riskFactors.map((factor, index) => (
              <TableRow key={index}>
                <TableCell>{factor.factor}</TableCell>
                <TableCell align="right">{(factor.weight * 100).toFixed(0)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Visualizations */}
      <Typography variant="h6" gutterBottom>
        Visualizations
      </Typography>
      <Grid container spacing={3}>
        {results.visualizations && results.visualizations.map((viz, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card>
              <CardHeader 
                title={viz.title}
                subheader={viz.description}
              />
              <CardContent>
                {viz.type === 'pieChart' && (
                  <PieChart 
                    data={viz.config.data}
                    labels={viz.config.labels}
                    colors={viz.config.colors}
                  />
                )}
                {viz.type === 'barChart' && (
                  <BarChart 
                    data={viz.config.data}
                    labels={viz.config.labels}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {(!results.visualizations || results.visualizations.length === 0) && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body1">
                No visualizations available for this analysis.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
