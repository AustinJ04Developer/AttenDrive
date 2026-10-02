import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { Dashboard } from './pages/Dashboard';
import { StudentListPage } from './pages/students/StudentListPage';
import { BulkImportPage } from './pages/students/BulkImportPage';
import { DriveListPage } from './pages/drives/DriveListPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { ReportHistoryPage } from './pages/reports/ReportHistoryPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Helper component that redirects already authenticated users away from login/register
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export const App = () => {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public Authentication Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected Placement App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="students" element={<StudentListPage />} />
              <Route path="students/bulk-import" element={<BulkImportPage />} />
              <Route path="drives" element={<DriveListPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/history" element={<ReportHistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  );
};

export default App;
