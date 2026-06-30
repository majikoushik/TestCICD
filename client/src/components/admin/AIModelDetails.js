import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Box,
  Divider,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Mock data for model performance
const performanceData = [
  { month: 'Jan', accuracy: 0.82, precision: 0.78, recall: 0.85 },
  { month: 'Feb', accuracy: 0.83, precision: 0.79, recall: 0.86 },
  { month: 'Mar', accuracy: 0.85, precision: 0.81, recall: 0.87 },
  { month: 'Apr', accuracy: 0.86, precision: 0.83, recall: 0.88 },
  { month: 'May', accuracy: 0.88, precision: 0.85, recall: 0.89 },
  { month: 'Jun', accuracy: 0.89, precision: 0.86, recall: 0.91 }
];

// Mock data for confusion matrix
const confusionMatrix = {
  truePositives: 856,
  falsePositives: 67,
  trueNegatives: 423,
  falseNegatives: 34
};

const AIModelDetails = ({ modelId, modelName, modelType, model }) => {
  const [loading, setLoading] = useState(true);
  const [modelDetails, setModelDetails] = useState(null);

  useEffect(() => {
    // If we already have the complete model data, use it directly
    if (model && Object.keys(model).length > 0) {
      // Merge the passed model data with additional details
      const enhancedModel = {
        ...model,
        // Add any missing fields with defaults
        description: model.description || `${model.type.charAt(0).toUpperCase() + model.type.slice(1)} model for healthcare predictions and analytics.`,
        precision: model.precision || (model.accuracy ? model.accuracy * 0.97 : 0.85),
        recall: model.recall || (model.accuracy ? model.accuracy * 1.02 : 0.88),
        f1Score: model.f1Score || (model.accuracy ? model.accuracy * 0.99 : 0.87),
        auc: model.auc || (model.accuracy ? model.accuracy * 1.03 : 0.90),
        trainingDataSize: model.dataPoints || 45000,
        validationDataSize: model.validationDataSize || Math.floor((model.dataPoints || 45000) * 0.2),
        features: model.features || [
          { name: 'Age', importance: 0.12 },
          { name: 'Length of Stay', importance: 0.15 },
          { name: 'Number of Previous Admissions', importance: 0.18 },
          { name: 'Comorbidity Count', importance: 0.21 },
          { name: 'Medication Count', importance: 0.09 },
          { name: 'Lab Results', importance: 0.14 },
          { name: 'Discharge Disposition', importance: 0.11 }
        ],
        performanceHistory: model.performanceHistory || performanceData,
        confusionMatrix: model.confusionMatrix || confusionMatrix,
        deploymentStatus: model.status || 'active',
        inferenceTime: model.inferenceTime || '120ms',
        thresholds: model.thresholds || {
          default: 0.7,
          highSensitivity: 0.5,
          highSpecificity: 0.85
        }
      };
      
      setModelDetails(enhancedModel);
      setLoading(false);
    } else {
      // Fallback to fetching model details if complete model is not provided
      const fetchModelDetails = async () => {
        setLoading(true);
        try {
          // Simulate API call
          setTimeout(() => {
            setModelDetails({
              id: modelId || 'model-1',
              name: modelName || 'Readmission Risk Predictor',
              type: modelType || 'classification',
              version: '2.3.1',
              lastUpdated: new Date().toISOString(),
              description: 'This model predicts patient readmission risk within 30 days of discharge based on clinical and demographic factors.',
              accuracy: 0.89,
              precision: 0.86,
              recall: 0.91,
              f1Score: 0.88,
              auc: 0.92,
              trainingDataSize: 45678,
              validationDataSize: 5678,
              features: [
                { name: 'Age', importance: 0.12 },
                { name: 'Length of Stay', importance: 0.15 },
                { name: 'Number of Previous Admissions', importance: 0.18 },
                { name: 'Comorbidity Count', importance: 0.21 },
                { name: 'Medication Count', importance: 0.09 },
                { name: 'Lab Results', importance: 0.14 },
                { name: 'Discharge Disposition', importance: 0.11 }
              ],
              performanceHistory: performanceData,
              confusionMatrix: confusionMatrix,
              deploymentStatus: 'active',
              inferenceTime: '120ms',
              thresholds: {
                default: 0.7,
                highSensitivity: 0.5,
                highSpecificity: 0.85
              }
            });
            setLoading(false);
          }, 1000);
        } catch (error) {
          console.error('Error fetching model details:', error);
          setLoading(false);
        }
      };

      fetchModelDetails();
    }
  }, [modelId, modelName, modelType, model]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          Loading model details...
        </Typography>
      </Box>
    );
  }

  if (!modelDetails) {
    return (
      <Box sx={{ width: '100%', mt: 4, textAlign: 'center' }}>
        <Typography variant="body1">
          No model details available.
        </Typography>
      </Box>
    );
  }

  // Calculate metrics for confusion matrix
  const totalPredictions = confusionMatrix.truePositives + confusionMatrix.falsePositives + 
                          confusionMatrix.trueNegatives + confusionMatrix.falseNegatives;
  
  const accuracy = ((confusionMatrix.truePositives + confusionMatrix.trueNegatives) / totalPredictions).toFixed(4);
  
  const precision = (confusionMatrix.truePositives / 
                    (confusionMatrix.truePositives + confusionMatrix.falsePositives)).toFixed(4);
  
  const recall = (confusionMatrix.truePositives / 
                 (confusionMatrix.truePositives + confusionMatrix.falseNegatives)).toFixed(4);
  
  const f1Score = (2 * (parseFloat(precision) * parseFloat(recall)) / 
                  (parseFloat(precision) + parseFloat(recall))).toFixed(4);

  return (
    <Box sx={{ mt: 2 }}>
      <Card>
        <CardHeader 
          title={modelDetails.name}
          subheader={`Version ${modelDetails.version} | Last Updated: ${new Date(modelDetails.lastUpdated).toLocaleDateString()}`}
          action={
            <Chip 
              label={modelDetails.deploymentStatus.toUpperCase()}
              color={modelDetails.deploymentStatus === 'active' ? 'success' : 'default'}
            />
          }
        />
        <Divider />
        <CardContent>
          <Typography variant="body1" paragraph>
            {modelDetails.description}
          </Typography>
          
          <Grid container spacing={3}>
            {/* Model Performance Metrics */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Accuracy</TableCell>
                      <TableCell align="right">{(modelDetails.accuracy * 100).toFixed(2)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Precision</TableCell>
                      <TableCell align="right">{(modelDetails.precision * 100).toFixed(2)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Recall</TableCell>
                      <TableCell align="right">{(modelDetails.recall * 100).toFixed(2)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>F1 Score</TableCell>
                      <TableCell align="right">{(modelDetails.f1Score * 100).toFixed(2)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>AUC</TableCell>
                      <TableCell align="right">{(modelDetails.auc * 100).toFixed(2)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Inference Time</TableCell>
                      <TableCell align="right">{modelDetails.inferenceTime}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            {/* Thresholds */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Model Thresholds</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Setting</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Use Case</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Default</TableCell>
                      <TableCell align="right">{(modelDetails.thresholds.default * 100).toFixed(0)}%</TableCell>
                      <TableCell align="right">General use</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>High Sensitivity</TableCell>
                      <TableCell align="right">{(modelDetails.thresholds.highSensitivity * 100).toFixed(0)}%</TableCell>
                      <TableCell align="right">Screening</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>High Specificity</TableCell>
                      <TableCell align="right">{(modelDetails.thresholds.highSpecificity * 100).toFixed(0)}%</TableCell>
                      <TableCell align="right">Confirmation</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            {/* Feature Importance */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Feature Importance</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...modelDetails.features].sort((a, b) => b.importance - a.importance)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, Math.max(...modelDetails.features.map(f => f.importance)) * 1.1]} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => (value * 100).toFixed(1) + '%'} />
                    <Legend />
                    <Bar dataKey="importance" name="Importance" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
            
            {/* Performance History */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Performance History</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={modelDetails.performanceHistory}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0.7, 1]} tickFormatter={(tick) => (tick * 100).toFixed(0) + '%'} />
                    <Tooltip formatter={(value) => (value * 100).toFixed(2) + '%'} />
                    <Legend />
                    <Line type="monotone" dataKey="accuracy" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="precision" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="recall" stroke="#ffc658" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
            
            {/* Confusion Matrix */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Confusion Matrix</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell align="center">Predicted Positive</TableCell>
                      <TableCell align="center">Predicted Negative</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Actual Positive</strong></TableCell>
                      <TableCell align="center" sx={{ bgcolor: 'success.light' }}>
                        {confusionMatrix.truePositives} (True Positives)
                      </TableCell>
                      <TableCell align="center" sx={{ bgcolor: 'error.light' }}>
                        {confusionMatrix.falseNegatives} (False Negatives)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Actual Negative</strong></TableCell>
                      <TableCell align="center" sx={{ bgcolor: 'error.light' }}>
                        {confusionMatrix.falsePositives} (False Positives)
                      </TableCell>
                      <TableCell align="center" sx={{ bgcolor: 'success.light' }}>
                        {confusionMatrix.trueNegatives} (True Negatives)
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Derived Metrics:</Typography>
                <Typography variant="body2">
                  • Accuracy: {(accuracy * 100).toFixed(2)}% <br />
                  • Precision: {(precision * 100).toFixed(2)}% <br />
                  • Recall: {(recall * 100).toFixed(2)}% <br />
                  • F1 Score: {(f1Score * 100).toFixed(2)}%
                </Typography>
              </Box>
            </Grid>
            
            {/* Training Data Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Training Information</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Training Data Size</TableCell>
                      <TableCell align="right">{modelDetails.trainingDataSize.toLocaleString()} records</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Validation Data Size</TableCell>
                      <TableCell align="right">{modelDetails.validationDataSize.toLocaleString()} records</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Model Type</TableCell>
                      <TableCell align="right">{modelDetails.type}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="outlined" color="primary">
                  Download Model Report
                </Button>
                <Button variant="contained" color="secondary">
                  Request Retraining
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AIModelDetails;
