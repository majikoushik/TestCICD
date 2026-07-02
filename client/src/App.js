import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts';
import { ModernLoadingIndicator } from './components/common';

// Layouts - Keep these as regular imports since they're critical for the app structure
import { MainLayout, AuthLayout, LandingLayout, AdminLayout } from './layouts';

// Auth pages are eagerly imported — they're the entry point for every user and
// lazy-loading them triggers the React Suspense "synchronous input" warning.
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AdminLogin from './pages/admin/AdminLogin';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Landing Page
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const ContactPage = lazy(() => import('./pages/contact/ContactPage'));

// Dashboard Pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));

// Patient Pages
const Patients = lazy(() => import('./pages/patients/Patients'));
const PatientDetail = lazy(() => import('./pages/patients/PatientDetail'));
const AddPatient = lazy(() => import('./pages/patients/AddPatient'));
const EditPatient = lazy(() => import('./pages/patients/EditPatient'));

// Referral Pages
const Referrals = lazy(() => import('./pages/referrals/Referrals'));
const ReferralDetail = lazy(() => import('./pages/referrals/ReferralDetail'));
const CreateReferral = lazy(() => import('./pages/referrals/CreateReferral'));

// Analytics Pages
const AnalyticsDashboard = lazy(() => import('./pages/analytics/AnalyticsDashboard'));
const AnalyticsDetail = lazy(() => import('./pages/analytics/AnalyticsDetail'));
const CreateAnalytics = lazy(() => import('./pages/analytics/CreateAnalytics'));

// Token Pages
const TokenDashboard = lazy(() => import('./pages/tokens/TokenDashboard'));
const TokenTransfer = lazy(() => import('./pages/tokens/TokenTransfer'));
const TokenRedeem = lazy(() => import('./pages/tokens/TokenRedeem'));

// Blockchain Pages
const BlockchainHistory = lazy(() => import('./pages/blockchain/BlockchainHistory'));
const BlockchainTransactionDetails = lazy(() => import('./pages/blockchain/BlockchainTransactionDetails'));

// Settings and Profile
const Profile = lazy(() => import('./pages/profile/Profile'));
const Settings = lazy(() => import('./pages/settings/Settings'));

// Notifications
const Notifications = lazy(() => import('./pages/notifications/Notifications'));


// Error Pages
const NotFound = lazy(() => import('./pages/errors/NotFound'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminProviders = lazy(() => import('./pages/admin/AdminProviders'));
const AdminLoginAudit = lazy(() => import('./pages/admin/AdminLoginAudit'));
const AdminPatientRecords = lazy(() => import('./pages/admin/AdminPatientRecords'));
const AdminReferrals = lazy(() => import('./pages/admin/AdminReferrals'));
const AdminAIManagement = lazy(() => import('./pages/admin/AdminAIManagement'));
const AdminTokenManagement = lazy(() => import('./pages/admin/AdminTokenManagement'));
const AdminMessaging = lazy(() => import('./pages/admin/AdminMessaging'));
const AdminAuditEHI = lazy(() => import('./pages/admin/AdminAuditEHI'));
const AdminFHIR = lazy(() => import('./pages/admin/AdminFHIR'));
const AdminPriorAuth = lazy(() => import('./pages/admin/AdminPriorAuth'));
const AdminPatientEngagement = lazy(() => import('./pages/admin/AdminPatientEngagement'));
const AdminAmbientSessions = lazy(() => import('./pages/admin/AdminAmbientSessions'));
const AdminReferralMatching = lazy(() => import('./pages/admin/AdminReferralMatching'));
const AdminMatchingConfig = lazy(() => import('./pages/admin/AdminMatchingConfig'));
const AdminAppointments = lazy(() => import('./pages/admin/AdminAppointments'));
const AdminBlockchain = lazy(() => import('./pages/admin/AdminBlockchain'));

// Appointments
const BookAppointment = lazy(() => import('./pages/appointments/BookAppointment'));

// Provider Schedule
const ProviderSchedulePage = lazy(() => import('./pages/schedule/ProviderSchedule'));

// Provider Secure Messaging
const ProviderInbox = lazy(() => import('./pages/app/ProviderInbox'));

// DTx Marketplace
const DtxMarketplace = lazy(() => import('./pages/dtx/DtxMarketplace'));
const DtxPrescriptions = lazy(() => import('./pages/dtx/DtxPrescriptions'));
const AdminDtxManagement = lazy(() => import('./pages/admin/AdminDtxManagement'));
const AdminContacts = lazy(() => import('./pages/admin/AdminContacts'));
const AdminKYC = lazy(() => import('./pages/admin/AdminKYC'));

// Ambient Clinical Intelligence (provider)
const AmbientRecorder = lazy(() => import('./pages/ambient/AmbientRecorder'));

// Onboarding Pages
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const OnboardingWall = lazy(() => import('./pages/onboarding/OnboardingWall'));
const OnboardingProfileSetup = lazy(() => import('./pages/onboarding/OnboardingProfileSetup'));

// FHIR Pages
const FHIRExplorer = lazy(() => import('./pages/fhir/FHIRExplorer'));
const PriorAuth = lazy(() => import('./pages/prior-auth/PriorAuth'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading, error } = useAuth();

  if (loading) {
    return <ModernLoadingIndicator fullPage message="Loading your profile..." variant="pulse" color="primary" />;
  }
  if (error || !currentUser) {
    return <Navigate to="/login" />;
  }

  // Admin/superadmin bypass account status checks
  const isAdmin = ['admin', 'superadmin'].includes(currentUser.role);
  if (!isAdmin && (currentUser.accountStatus !== 'approved' || currentUser.onboardingStatus !== 'verified')) {
    return <Navigate to="/onboarding" />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { currentUser, loading, error } = useAuth();

  if (loading) {
    return <ModernLoadingIndicator fullPage message="Loading your profile..." variant="pulse" color="primary" />;
  }

  if (error) {
    return <Navigate to="/admin/login" />;
  }

  if (!currentUser) {
    return <Navigate to="/admin/login" />;
  }

  // Check if user has admin role — must match the server's admin auth check
  // (server/routes/adminAuth.js allows both 'admin' and 'superadmin')
  if (!['admin', 'superadmin'].includes(currentUser.role)) {
    return <Navigate to="/admin/login" />;
  }

  return children;
};

// Loading fallback component for Suspense
const PageLoadingFallback = () => (
  <div className="page-loading-fallback">
    <ModernLoadingIndicator message="Loading page..." variant="dots" color="primary" />
  </div>
);

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* Landing Routes */}
      <Route path="/" element={<LandingLayout />}>
        <Route index element={
          <Suspense fallback={<PageLoadingFallback />}>
            <LandingPage />
          </Suspense>
        } />
        <Route path="contact" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ContactPage />
          </Suspense>
        } />
        <Route path="verify-email" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <VerifyEmail />
          </Suspense>
        } />
        <Route path="onboarding" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <OnboardingWall />
          </Suspense>
        } />
        <Route path="onboarding/profile" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <OnboardingProfileSetup />
          </Suspense>
        } />
      </Route>
      
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Route>
      
      {/* Protected Routes - Use specific path instead of empty string */}
      <Route path="/app" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        {/* Dashboard route is the default for authenticated users */}
        <Route path="dashboard" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Dashboard />
          </Suspense>
        } />
        
        {/* Patient Routes */}
        <Route path="patients" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Patients />
          </Suspense>
        } />
        <Route path="patients/add" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AddPatient />
          </Suspense>
        } />
        <Route path="patients/edit/:id" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <EditPatient />
          </Suspense>
        } />
        <Route path="patients/:id" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <PatientDetail />
          </Suspense>
        } />
        
        {/* Referral Routes */}
        <Route path="referrals" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Referrals />
          </Suspense>
        } />
        <Route path="referrals/create" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreateReferral />
          </Suspense>
        } />
        <Route path="referrals/:id" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ReferralDetail />
          </Suspense>
        } />
        
        {/* Analytics Routes */}
        <Route path="analytics" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AnalyticsDashboard />
          </Suspense>
        } />
        <Route path="analytics/create" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreateAnalytics />
          </Suspense>
        } />
        <Route path="analytics/:id" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AnalyticsDetail />
          </Suspense>
        } />
        
        {/* Token Routes */}
        <Route path="tokens" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <TokenDashboard />
          </Suspense>
        } />
        <Route path="tokens/transfer" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <TokenTransfer />
          </Suspense>
        } />
        <Route path="tokens/redeem" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <TokenRedeem />
          </Suspense>
        } />
        
        {/* Blockchain Routes */}
        <Route path="blockchain/history" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <BlockchainHistory />
          </Suspense>
        } />
        <Route path="blockchain/transaction/:transactionId" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <BlockchainTransactionDetails />
          </Suspense>
        } />
        
        {/* Settings and Profile */}
        <Route path="profile" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Profile />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Settings />
          </Suspense>
        } />
        
        {/* Notifications */}
        <Route path="notifications" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Notifications />
          </Suspense>
        } />
        
        {/* Legacy appointment routes — redirect to unified schedule page */}
        <Route path="appointments/schedule" element={<Navigate to="/app/appointments/book" replace />} />

        {/* FHIR R4 Explorer */}
        <Route path="fhir" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <FHIRExplorer />
          </Suspense>
        } />

        {/* Prior Auth */}
        <Route path="prior-auth" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <PriorAuth />
          </Suspense>
        } />

        {/* Ambient Clinical Intelligence */}
        <Route path="ambient" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AmbientRecorder />
          </Suspense>
        } />

        {/* /app/appointments → unified schedule page, All Appointments tab */}
        <Route path="appointments" element={<Navigate to="/app/schedule?tab=appointments" replace />} />
        <Route path="appointments/book" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <BookAppointment />
          </Suspense>
        } />

        {/* Provider Schedule Management */}
        <Route path="schedule" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ProviderSchedulePage />
          </Suspense>
        } />

        {/* Provider Secure Messaging */}
        <Route path="messaging" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ProviderInbox />
          </Suspense>
        } />

        {/* DTx Marketplace */}
        <Route path="dtx/marketplace" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <DtxMarketplace />
          </Suspense>
        } />
        <Route path="dtx/prescriptions" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <DtxPrescriptions />
          </Suspense>
        } />
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminDashboard />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminSettings />
          </Suspense>
        } />
        <Route path="settings/:category" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminSettings />
          </Suspense>
        } />
        <Route path="users" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminUsers />
          </Suspense>
        } />
        <Route path="providers" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminProviders />
          </Suspense>
        } />
        <Route path="audit/login" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminLoginAudit />
          </Suspense>
        } />
        <Route path="audit/ehi" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminAuditEHI />
          </Suspense>
        } />
        <Route path="fhir" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminFHIR />
          </Suspense>
        } />
        <Route path="prior-auth" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminPriorAuth />
          </Suspense>
        } />
        <Route path="patient-engagement" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminPatientEngagement />
          </Suspense>
        } />
        <Route path="ambient-sessions" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminAmbientSessions />
          </Suspense>
        } />
        <Route path="referral-matching" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminReferralMatching />
          </Suspense>
        } />
        <Route path="matching-config" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminMatchingConfig />
          </Suspense>
        } />
        <Route path="appointments" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminAppointments />
          </Suspense>
        } />
        <Route path="patient-records" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminPatientRecords />
          </Suspense>
        } />
        <Route path="referrals" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminReferrals />
          </Suspense>
        } />
        <Route path="ai-management" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminAIManagement />
          </Suspense>
        } />
        <Route path="token-management" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminTokenManagement />
          </Suspense>
        } />
        <Route path="messaging" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminMessaging />
          </Suspense>
        } />
        <Route path="dtx" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminDtxManagement />
          </Suspense>
        } />
        <Route path="contacts" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminContacts />
          </Suspense>
        } />
        <Route path="kyc" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminKYC />
          </Suspense>
        } />
        <Route path="blockchain" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminBlockchain />
          </Suspense>
        } />
      </Route>
      
      {/* 404 Route */}
      <Route path="*" element={
        <Suspense fallback={<PageLoadingFallback />}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
    </>
  );
}

export default App;
