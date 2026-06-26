import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import BroadcastMessages from './messaging/BroadcastMessages';
import TargetedAlerts from './messaging/TargetedAlerts';
import EscalationWorkflows from './messaging/EscalationWorkflows';
import ProviderThreads from './messaging/ProviderThreads';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-messaging-tabpanel-${index}`}
      aria-labelledby={`admin-messaging-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

/**
 * AdminMessaging component for managing broadcast messages, targeted alerts, and escalation workflows
 */
const AdminMessaging = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Messaging & Alerts
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage broadcast messages, targeted alerts, and escalation workflows for providers and staff.
        </Typography>

        <Paper sx={{ mt: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Broadcast Messages" />
            <Tab label="Targeted Alerts" />
            <Tab label="Escalation Workflows" />
            <Tab label="Provider Threads" />
          </Tabs>
          <Divider />

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 3 }}><BroadcastMessages /></Box>
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 3 }}><TargetedAlerts /></Box>
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 3 }}><EscalationWorkflows /></Box>
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            <ProviderThreads />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminMessaging;
