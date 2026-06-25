import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts';
import { ModernLoadingIndicator } from './components/common';

// Layouts - Keep these as regular imports since they're critical for the app structure
import { MainLayout, AuthLayout, LandingLayout, AdminLayout } from './layouts';

// Direct imports for all page components
// Landing Page
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const ContactPage = lazy(() => import('./pages/contact/ContactPage'));

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

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

// Appointments
const ScheduleAppointment = lazy(() => import('./pages/appointments/ScheduleAppointment'));

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

// FHIR Pages
const FHIRExplorer = lazy(() => import('./pages/fhir/FHIRExplorer'));
const PriorAuth = lazy(() => import('./pages/prior-auth/PriorAuth'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading, error } = useAuth();
  
  if (loading) {
    return <ModernLoadingIndicator fullPage message="Loading your profile..." variant="pulse" color="primary" />;
  }
  
  if (error) {
    return <Navigate to="/login" />;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
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

  // Check if user has admin role
  if (currentUser.role !== 'admin') {
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
      </Route>
      
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Login />
          </Suspense>
        } />
        <Route path="/register" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Register />
          </Suspense>
        } />
        <Route path="/forgot-password" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ForgotPassword />
          </Suspense>
        } />
        <Route path="/admin/login" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminLogin />
          </Suspense>
        } />
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
        
        {/* Appointments */}
        <Route path="appointments/schedule" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ScheduleAppointment />
          </Suspense>
        } />

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
      </Route>
      
      {/* 404 Route */}
      <Route path="*" element={
        <Suspense fallback={<PageLoadingFallback />}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
  );
}

export default App;
