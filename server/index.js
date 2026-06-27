const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const logger = require('./utils/logger');

// Fail fast if required secrets are missing
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_RESET_SECRET'];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  logger.error('FATAL: Missing required environment variables', {
    missing: missingEnvVars.join(', '),
    hint: 'Copy .env.example to .env and populate all values before starting the server.',
  });
  process.exit(1);
}

const { protect, authorize } = require('./middleware/auth');

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
const fhirRoutes = require('./routes/fhir');
const priorAuthRoutes = require('./routes/priorAuth');
const adminPriorAuthRoutes = require('./routes/adminPriorAuth');
const syntheticRouter = require('./routes/syntheticRouter');
const patientEngagementRoutes = require('./routes/patientEngagement');
const adminPatientEngagementRoutes = require('./routes/admin/patientEngagement');
const ambientSessionRoutes = require('./routes/ambientSessions');
const adminAmbientSessionRoutes = require('./routes/admin/ambientSessions');
const referralMatchingRoutes = require('./routes/referralMatching');
const appointmentRoutes = require('./routes/appointments');
const scheduleRoutes = require('./routes/schedules');
const adminAppointmentRoutes = require('./routes/admin/appointments');
const adminAnalyticsRoutes = require('./routes/admin/analytics');
const dtxRoutes = require('./routes/dtx');
const adminDtxRoutes = require('./routes/adminDtx');
const messageRoutes = require('./routes/messages');
const contactRoutes = require('./routes/contact');
const npiRoutes = require('./routes/npi');
const onboardingRoutes = require('./routes/onboarding');
const adminKycRoutes = require('./routes/admin/kyc');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & common middleware ──────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Stream Morgan HTTP request logs into Winston so they land in app.log
const morganStream = { write: (msg) => logger.http(msg.trim()) };
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// ── Centralised error handler (must be defined before startServer so the
//    reference is valid when Express registers it later) ─────────────────────
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  logger.error('Unhandled request error', {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    statusCode: status,
    error: err.message,
    stack: err.stack,
    errorType: err.name,
    code: err.code,
  });
  if (res.headersSent) return next(err);
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message,
  });
};

// ── Static files (production only) ──────────────────────────────────────────
function mountStaticFiles() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
    });
  }
}

// ── Mount real (live DB) routes ──────────────────────────────────────────────
function mountLiveRoutes() {
  // Public auth endpoints — rate-limited
  app.use('/api/auth', authLimiter, authRoutes);

  // Admin auth must come before the protected /api/admin block so the public
  // login endpoint is reachable without a token.
  app.use('/api/admin/auth', authLimiter, adminAuthRoutes);

  // User-facing routes (each route file applies protect internally)
  app.use('/api/patients', patientRoutes);
  app.use('/api/referrals', referralRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/tokens', tokenRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Protected admin routes — specific sub-paths BEFORE the generic /api/admin
  // so Express doesn't need to fall through adminRoutes for each sub-router.
  app.use('/api/admin/referrals', [protect, authorize('admin', 'superadmin'), adminReferralRoutes]);
  app.use('/api/admin/ai-management', [protect, authorize('admin', 'superadmin'), adminAIManagementRoutes]);
  app.use('/api/admin/prior-auth', [protect, authorize('admin', 'superadmin'), adminPriorAuthRoutes]);
  app.use('/api/admin/patient-engagement', [protect, authorize('admin', 'superadmin'), adminPatientEngagementRoutes]);
  app.use('/api/admin/ambient-sessions', [protect, authorize('admin', 'superadmin'), adminAmbientSessionRoutes]);
  app.use('/api/admin/appointments', [protect, authorize('admin', 'superadmin'), adminAppointmentRoutes]);
  app.use('/api/admin/analytics', [protect, authorize('admin', 'superadmin'), adminAnalyticsRoutes]);
  app.use('/api/admin/dtx', adminDtxRoutes);
  app.use('/api/admin', [protect, authorize('admin', 'superadmin'), adminRoutes]);
  app.use('/api/referral-matching', protect, referralMatchingRoutes);
  app.use('/api/appointments', protect, appointmentRoutes);
  app.use('/api/schedules', protect, scheduleRoutes);
  app.use('/api/patient-engagement', protect, patientEngagementRoutes);
  app.use('/api/ambient-sessions', protect, ambientSessionRoutes);
  app.use('/api/dtx', dtxRoutes);

  // NPI lookup (public)
  app.use('/api/npi', npiRoutes);

  // Provider onboarding
  app.use('/api/onboarding', protect, onboardingRoutes);

  // Admin KYC management
  app.use('/api/admin/kyc', [protect, authorize('admin', 'superadmin')], adminKycRoutes);

  // Contact form — POST is public, GET is admin-only
  app.use('/api/contact', contactRoutes);

  // Provider-to-provider secure messaging (tied to referral threads)
  app.use('/api/messages', protect, messageRoutes);

  // FHIR R4 API — ONC 21st Century Cures Act / CMS-0057-F compliant
  app.use('/api/fhir', fhirRoutes);

  // Prior Authorization (provider-facing)
  app.use('/api/prior-auth', priorAuthRoutes);

  // GraphQL
  app.use('/graphql', graphqlRoutes);
}

// ── Mount synthetic (in-memory) routes ──────────────────────────────────────
function mountSyntheticRoutes() {
  // Rate-limit the auth paths even in synthetic mode
  app.use('/api/auth', authLimiter);
  app.use('/api/admin/auth', authLimiter);

  // Single router covers every /api/* path
  app.use('/api', syntheticRouter);
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function startServer() {
  let dbConnected = false;

  try {
    // Give MongoDB 8 seconds to connect; fall back to synthetic data if it
    // times out (e.g. no network, wrong URI, Atlas paused).
    await Promise.race([
      mongoose.connect(process.env.MONGO_URI),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 8 s')), 8000)
      ),
    ]);
    dbConnected = true;
    logger.info('MongoDB connected — running in live database mode');
  } catch (err) {
    logger.warn('MongoDB unavailable — starting in SYNTHETIC DATA mode', {
      error: err.message,
      stack: err.stack,
      hint: 'Demo password for all accounts: Demo1234!',
    });
  }

  if (dbConnected) {
    mountLiveRoutes();
  } else {
    mountSyntheticRoutes();
  }

  mountStaticFiles();
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () =>
    logger.info(`Server running on port ${PORT} [${dbConnected ? 'LIVE DB' : 'SYNTHETIC DATA'}]`)
  );
}

startServer();

module.exports = app;
