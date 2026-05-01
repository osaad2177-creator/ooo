// src/App.jsx
// Root component — sets up routing and authentication guard

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import BookingsPage from './pages/BookingsPage';
import AccountingPage from './pages/AccountingPage';
import NotificationsPage from './pages/NotificationsPage';
import UsersPage from './pages/UsersPage';
import LogsPage from './pages/LogsPage';
import NotFoundPage from './pages/NotFoundPage';

// ─── GUARDS ──────────────────────────────────────────────────────────────────

/** Redirect to /login if not authenticated */
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loader">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
};

/** Only allow access if the user has permission for this module */
const ModuleRoute = ({ module, children }) => {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!can(module)) return <Navigate to="/dashboard" replace />;
  return children;
};

// ─── APP ──────────────────────────────────────────────────────────────────────

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    <Route
      path="/"
      element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />

      <Route path="dashboard" element={
        <ModuleRoute module="dashboard"><DashboardPage /></ModuleRoute>
      } />

      <Route path="inventory" element={
        <ModuleRoute module="inventory"><InventoryPage /></ModuleRoute>
      } />

      <Route path="bookings" element={
        <ModuleRoute module="bookings"><BookingsPage /></ModuleRoute>
      } />

      <Route path="accounting" element={
        <ModuleRoute module="accounting"><AccountingPage /></ModuleRoute>
      } />

      <Route path="notifications" element={
        <ModuleRoute module="notifications"><NotificationsPage /></ModuleRoute>
      } />

      <Route path="users" element={
        <ModuleRoute module="users"><UsersPage /></ModuleRoute>
      } />

      <Route path="logs" element={
        <ModuleRoute module="users"><LogsPage /></ModuleRoute>
      } />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    {/* HashRouter is required for GitHub Pages — it uses /#/route instead of /route
        so GitHub's static server never needs to handle client-side paths */}
    <HashRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1f2e',
            color: '#e2e8f0',
            border: '1px solid #2d3748',
          },
        }}
      />
    </HashRouter>
  </AuthProvider>
);

export default App;
