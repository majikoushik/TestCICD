import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Flag as FlagIcon,
  Visibility as VisibilityIcon,
  History as HistoryIcon,
  GetApp as DownloadIcon,
  VerifiedUser as VerifiedUserIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { adminMockData } from '../../services/mockData';
import { ModernLoadingIndicator } from '../../components/common';

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminPatientRecords = () => {
  const [patientRecords, setPatientRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [modificationHistoryOpen, setModificationHistoryOpen] = useState(false);
  const [recordModifications, setRecordModifications] = useState([]);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentLogs, setConsentLogs] = useState([]);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [deIdentified, setDeIdentified] = useState(true);

  useEffect(() => {
    const fetchPatientRecords = async () => {
      try {
        setLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use mock data directly
        const mockRecords = adminMockData.patientRecords;
        setPatientRecords(mockRecords);
        setFilteredRecords(mockRecords);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching patient records:', err);
        setError('Failed to load patient records. Please try again later.');
        setLoading(false);
      }
    };

    fetchPatientRecords();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRecords(patientRecords);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = patientRecords.filter(record => 
        record.patientId?.toLowerCase().includes(query) || 
        record.condition?.toLowerCase().includes(query) ||
        record.status?.toLowerCase().includes(query) ||
        record.provider?.toLowerCase().includes(query)
      );
      setFilteredRecords(filtered);
    }
  }, [searchQuery, patientRecords]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (record) => {
    setCurrentRecord(record);
    setDetailDialogOpen(true);
  };

  const handleViewModificationHistory = async (record) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Filter modifications for this patient
      const modifications = adminMockData.recordModifications.filter(
        mod => mod.patientRecordId === record.id
      );
      
      setRecordModifications(modifications);
      setCurrentRecord(record);
      setModificationHistoryOpen(true);
    } catch (err) {
      console.error('Error fetching modification history:', err);
    }
  };

  const handleVerifyConsent = async (record) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Filter consent logs for this patient
      const consents = adminMockData.consentLogs.filter(
        consent => consent.patientRecordId === record.id
      );
      
      setConsentLogs(consents);
      setCurrentRecord(record);
      setConsentDialogOpen(true);
    } catch (err) {
      console.error('Error fetching consent logs:', err);
    }
  };

  const handleFlagRecord = (record) => {
    setCurrentRecord(record);
    setFlagReason(record.flagReason || '');
    setFlagDialogOpen(true);
  };

  const handleSubmitFlag = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update the record in state
      const updatedRecords = patientRecords.map(record => {
        if (record.id === currentRecord.id) {
          return {
            ...record,
            flagged: true,
            flagReason: flagReason
          };
        }
        return record;
      });
      
      setPatientRecords(updatedRecords);
      setFlagDialogOpen(false);
    } catch (err) {
      console.error('Error flagging record:', err);
    }
  };

  const handleRemoveFlag = async (record) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update the record in state
      const updatedRecords = patientRecords.map(r => {
        if (r.id === record.id) {
          return {
            ...r,
            flagged: false,
            flagReason: null
          };
        }
        return r;
      });
      
      setPatientRecords(updatedRecords);
    } catch (err) {
      console.error('Error removing flag:', err);
    }
  };

  const handleExportData = () => {
    // Create anonymized data for export
    const anonymizedData = patientRecords.map(record => {
      return {
        patientId: record.patientId,
        age: record.age,
        gender: record.gender,
        condition: record.condition,
        status: record.status,
        lastVisit: record.lastVisit,
        consentVerified: record.consentVerified
      };
    });
    
    // Create a blob and download
    const dataStr = JSON.stringify(anonymizedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `anonymized_patient_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Critical':
        return 'error';
      case 'Stable':
        return 'info';
      case 'Improving':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getFilteredRecordsByTab = (tabIndex) => {
    switch (tabIndex) {
      case 0: // All Records
        return filteredRecords;
      case 1: // Flagged Records
        return filteredRecords.filter(record => record.flagged);
      case 2: // Incomplete Records
        return filteredRecords.filter(record => record.completeness < 90);
      case 3: // Missing Consent
        return filteredRecords.filter(record => !record.consentVerified);
      default:
        return filteredRecords;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // De-identify patient data if needed
  const getPatientId = (record) => {
    return deIdentified ? `${record.patientId.substring(0, 3)}***${record.patientId.substring(record.patientId.length - 2)}` : record.patientId;
  };

  const renderPatientRecordsTable = (tabIndex) => {
    const displayRecords = getFilteredRecordsByTab(tabIndex);
    
    return (
      <TableContainer component={Paper}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Patient ID</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>Condition</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Visit</TableCell>
              <TableCell>Completeness</TableCell>
              <TableCell>Consent</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRecords
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{getPatientId(record)}</TableCell>
                  <TableCell>{record.age}</TableCell>
                  <TableCell>{record.gender}</TableCell>
                  <TableCell>{record.condition}</TableCell>
                  <TableCell>
                    <Chip 
                      label={record.status} 
                      color={getStatusColor(record.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(record.lastVisit)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={record.completeness} 
                          color={record.completeness < 80 ? "warning" : "success"}
                        />
                      </Box>
                      <Box sx={{ minWidth: 35 }}>
                        <Typography variant="body2" color="text.secondary">
                          {`${record.completeness}%`}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {record.consentVerified ? (
                      <Tooltip title="Consent verified on blockchain">
                        <Chip 
                          icon={<VerifiedUserIcon />} 
                          label="Verified" 
                          color="success" 
                          size="small"
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Consent not verified">
                        <Chip 
                          icon={<WarningIcon />} 
                          label="Missing" 
                          color="error" 
                          size="small"
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleViewDetails(record)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleViewModificationHistory(record)}
                    >
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleVerifyConsent(record)}
                    >
                      <VerifiedUserIcon fontSize="small" />
                    </IconButton>
                    {record.flagged ? (
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoveFlag(record)}
                      >
                        <FlagIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton 
                        size="small" 
                        color="default"
                        onClick={() => handleFlagRecord(record)}
                      >
                        <FlagIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            
            {displayRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No patient records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Patient Records Oversight
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            label="Search Records"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mr: 2 }}
            InputProps={{
              endAdornment: <SearchIcon color="action" />
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={deIdentified}
                onChange={(e) => setDeIdentified(e.target.checked)}
                color="primary"
              />
            }
            label="De-identified"
          />
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportData}
            sx={{ ml: 2 }}
          >
            Export Data
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
           <ModernLoadingIndicator message="Loading alerts..." />
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="patient records tabs">
              <Tab label="All Records" />
              <Tab label="Flagged Records" />
              <Tab label="Incomplete Records" />
              <Tab label="Missing Consent" />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            {renderPatientRecordsTable(0)}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderPatientRecordsTable(1)}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderPatientRecordsTable(2)}
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            {renderPatientRecordsTable(3)}
          </TabPanel>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={getFilteredRecordsByTab(tabValue).length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
      
      {/* Patient Record Details Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Patient Record Details
        </DialogTitle>
        
        <DialogContent>
          {currentRecord && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Basic Information
                    </Typography>
                    <Typography variant="body2">
                      <strong>Patient ID:</strong> {deIdentified ? getPatientId(currentRecord) : currentRecord.patientId}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Age:</strong> {currentRecord.age}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Gender:</strong> {currentRecord.gender}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Blood Type:</strong> {currentRecord.bloodType}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Condition:</strong> {currentRecord.condition}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {' '}
                      <Chip 
                        label={currentRecord.status} 
                        color={getStatusColor(currentRecord.status)}
                        size="small"
                      />
                    </Typography>
                    <Typography variant="body2">
                      <strong>Last Visit:</strong> {formatDate(currentRecord.lastVisit)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Record Information
                    </Typography>
                    <Typography variant="body2">
                      <strong>Provider:</strong> {currentRecord.provider}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Completeness:</strong>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={currentRecord.completeness} 
                            color={currentRecord.completeness < 80 ? "warning" : "success"}
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="body2" color="text.secondary">
                            {`${currentRecord.completeness}%`}
                          </Typography>
                        </Box>
                      </Box>
                    </Typography>
                    <Typography variant="body2">
                      <strong>Consent Status:</strong> {' '}
                      {currentRecord.consentVerified ? (
                        <Chip 
                          icon={<VerifiedUserIcon />} 
                          label="Verified" 
                          color="success" 
                          size="small"
                        />
                      ) : (
                        <Chip 
                          icon={<WarningIcon />} 
                          label="Missing" 
                          color="error" 
                          size="small"
                        />
                      )}
                    </Typography>
                    {currentRecord.consentVerified && (
                      <Typography variant="body2">
                        <strong>Consent Date:</strong> {formatDate(currentRecord.consentTimestamp)}
                      </Typography>
                    )}
                    {currentRecord.flagged && (
                      <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        <strong>Flagged:</strong> {currentRecord.flagReason}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Actions
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button 
                        variant="outlined" 
                        startIcon={<HistoryIcon />}
                        onClick={() => {
                          setDetailDialogOpen(false);
                          handleViewModificationHistory(currentRecord);
                        }}
                      >
                        View Modification History
                      </Button>
                      <Button 
                        variant="outlined" 
                        startIcon={<VerifiedUserIcon />}
                        onClick={() => {
                          setDetailDialogOpen(false);
                          handleVerifyConsent(currentRecord);
                        }}
                      >
                        Verify Consent
                      </Button>
                      {currentRecord.flagged ? (
                        <Button 
                          variant="outlined" 
                          color="error"
                          startIcon={<FlagIcon />}
                          onClick={() => {
                            setDetailDialogOpen(false);
                            handleRemoveFlag(currentRecord);
                          }}
                        >
                          Remove Flag
                        </Button>
                      ) : (
                        <Button 
                          variant="outlined" 
                          startIcon={<FlagIcon />}
                          onClick={() => {
                            setDetailDialogOpen(false);
                            handleFlagRecord(currentRecord);
                          }}
                        >
                          Flag Record
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modification History Dialog */}
      <Dialog 
        open={modificationHistoryOpen} 
        onClose={() => setModificationHistoryOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Record Modification History
        </DialogTitle>
        
        <DialogContent>
          {currentRecord && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Patient ID: {deIdentified ? getPatientId(currentRecord) : currentRecord.patientId}
              </Typography>
              
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Modified By</TableCell>
                      <TableCell>Field</TableCell>
                      <TableCell>Old Value</TableCell>
                      <TableCell>New Value</TableCell>
                      <TableCell>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recordModifications.length > 0 ? (
                      recordModifications.map((mod) => (
                        <TableRow key={mod.id}>
                          <TableCell>{formatDate(mod.timestamp)}</TableCell>
                          <TableCell>{mod.modifiedBy}</TableCell>
                          <TableCell>{mod.field}</TableCell>
                          <TableCell>{mod.oldValue}</TableCell>
                          <TableCell>{mod.newValue}</TableCell>
                          <TableCell>{mod.reason}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No modification history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setModificationHistoryOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Consent Verification Dialog */}
      <Dialog 
        open={consentDialogOpen} 
        onClose={() => setConsentDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Consent Verification
        </DialogTitle>
        
        <DialogContent>
          {currentRecord && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Patient ID: {deIdentified ? getPatientId(currentRecord) : currentRecord.patientId}
              </Typography>
              
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell>Verified By</TableCell>
                      <TableCell>Transaction Hash</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consentLogs.length > 0 ? (
                      consentLogs.map((consent) => (
                        <TableRow key={consent.id}>
                          <TableCell>{formatDate(consent.timestamp)}</TableCell>
                          <TableCell>{consent.action}</TableCell>
                          <TableCell>{consent.details}</TableCell>
                          <TableCell>{consent.verifiedBy}</TableCell>
                          <TableCell>
                            {consent.txHash ? (
                              <Tooltip title="View on blockchain explorer">
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => window.open(`https://etherscan.io/tx/${consent.txHash}`, '_blank')}
                                >
                                  {`${consent.txHash.substring(0, 6)}...${consent.txHash.substring(consent.txHash.length - 4)}`}
                                </Button>
                              </Tooltip>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            {consent.verified ? (
                              <Chip 
                                label="Verified" 
                                color="success" 
                                size="small"
                              />
                            ) : (
                              <Chip 
                                label="Pending" 
                                color="warning" 
                                size="small"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No consent logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setConsentDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Flag Record Dialog */}
      <Dialog 
        open={flagDialogOpen} 
        onClose={() => setFlagDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Flag Patient Record
        </DialogTitle>
        
        <DialogContent>
          {currentRecord && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Patient ID: {deIdentified ? getPatientId(currentRecord) : currentRecord.patientId}
              </Typography>
              
              <TextField
                fullWidth
                label="Reason for Flagging"
                variant="outlined"
                multiline
                rows={4}
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setFlagDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmitFlag}
            disabled={!flagReason.trim()}
          >
            Submit Flag
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPatientRecords;