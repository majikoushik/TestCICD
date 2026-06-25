const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

// Fail fast if required secrets are missing
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_RESET_SECRET'];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Copy .env.example to .env and populate all values before starting the server.');
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
const { seedPriorAuths } = require('./seeds/priorAuthSeed');
const { seedPatientEngagement } = require('./seeds/patientEngagementSeed');

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

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

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
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Server Error' });
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
  app.use('/api/admin', [protect, authorize('admin', 'superadmin'), adminRoutes]);
  app.use('/api/patient-engagement', protect, patientEngagementRoutes);

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
    console.log('✅  MongoDB connected — running in live database mode');
  } catch (err) {
    console.warn(`⚠️  MongoDB unavailable (${err.message})`);
    console.warn('🔄  Starting in SYNTHETIC DATA mode — all data is in-memory.');
    console.warn('    Demo accounts: admin@clinictrustai.com / john.smith@clinictrustai.com / etc.');
    console.warn('    Demo password for all accounts: Demo1234!');
  }

  if (dbConnected) {
    mountLiveRoutes();
    await seedPriorAuths();
    await seedPatientEngagement();
  } else {
    mountSyntheticRoutes();
  }

  mountStaticFiles();
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () =>
    console.log(`🚀  Server running on port ${PORT} [${dbConnected ? 'LIVE DB' : 'SYNTHETIC DATA'}]`)
  );
}

startServer();

module.exports = app;
