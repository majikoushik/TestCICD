const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import middleware
const { protect, authorize } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const referralRoutes = require('./routes/referrals');
const analyticsRoutes = require('./routes/analytics');
const tokenRoutes = require('./routes/tokens');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const adminAuthRoutes = require('./routes/adminAuth');
const adminReferralRoutes = require('./routes/admin/referrals');
const adminAIManagementRoutes = require('./routes/admin/aiManagement');
const graphqlRoutes = require('./routes/graphql');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://test:GTZdy5hZvLmHrML9@clinictrustai.591yw7n.mongodb.net/clinictrustai?retryWrites=true&w=majority&appName=ClinicTrustAI', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1); // Exit with failure
});

// API Routes
app.use('/api/auth', authRoutes);

// Admin auth routes
app.use('/api/admin/auth', adminAuthRoutes);

// Protected routes with auth middleware
const protectedRouteHandler = (req, res, next) => {
  // Log auth headers for debugging
  console.log('Auth headers:', req.headers.authorization ? 
    `${req.headers.authorization.substring(0, 15)}...` : 'No authorization header');
  
  // Apply auth middleware first, then route to the appropriate handler
  return protect(req, res, next);
};

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/referrals', adminReferralRoutes);
app.use('/api/admin/ai-management', adminAIManagementRoutes);

// Admin routes
app.use('/api/admin', [protect, authorize('admin'), adminRoutes]);

// Admin referral routes
app.use('/api/admin/referrals', [protect, authorize('admin', 'superadmin'), adminReferralRoutes]);

// GraphQL API endpoint
app.use('/graphql', graphqlRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

module.exports = app;
