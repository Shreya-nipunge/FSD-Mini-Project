// frontend/src/App.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
const RoleSelection = lazy(() => import('./pages/RoleSelection.jsx'));
const UserLogin = lazy(() => import('./pages/UserLogin.jsx'));
const UserRegister = lazy(() => import('./pages/UserRegister.jsx'));
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'));
const AdminRegister = lazy(() => import('./pages/AdminRegister.jsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));

// Core Dashboard Structure
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// User Views
const MapPage = lazy(() => import('./pages/dashboard/MapPage.jsx'));
const ReportPage = lazy(() => import('./pages/dashboard/ReportPage.jsx'));
const NewsPage = lazy(() => import('./pages/dashboard/NewsPage.jsx'));
const MyComplaintsPage = lazy(() => import('./pages/dashboard/MyComplaintsPage.jsx'));

// Admin Views
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage.jsx'));
const AdminComplaintsPage = lazy(() => import('./pages/admin/AdminComplaintsPage.jsx'));
const AdminUpload = lazy(() => import('./pages/AdminUpload.jsx'));

export default function App() {
  return (
    <Suspense fallback={<main role="status" aria-live="polite" className="min-h-screen bg-[#0A1628] p-6 text-sm text-slate-300">Loading CrimeMap...</main>}>
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/get-started" element={<RoleSelection />} />
        <Route path="/login-user" element={<UserLogin />} />
        <Route path="/register-user" element={<UserRegister />} />
        <Route path="/login-admin" element={<AdminLogin />} />
        <Route path="/register-admin" element={<AdminRegister />} />
        
        {/* Legacy redirect */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/map" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/analytics" replace />} />

        {/* Dashboard Layout - User Space */}
        <Route path="/dashboard" element={<ProtectedRoute requiredRole="user"><DashboardLayout /></ProtectedRoute>}>
          <Route path="map" element={<MapPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="my-reports" element={<MyComplaintsPage />} />
        </Route>

        {/* Dashboard Layout - Admin Space */}
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><DashboardLayout /></ProtectedRoute>}>
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
          <Route path="upload" element={<AdminUpload />} />
        </Route>
    </Routes>
    </Suspense>
  );
}
