import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-sky-400 flex items-center justify-center text-white font-extrabold text-xl shadow-xl shadow-primary-500/25 animate-pulse">
            AD
          </div>
          <div className="absolute -inset-2 rounded-2xl border-2 border-primary-500/30 animate-spin border-t-primary-600"></div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading AttenDrive...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};
