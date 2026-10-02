import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api,
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearAuth,
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication on app launch
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await api.getMe();
        if (isMounted && response?.user) {
          setUser(response.user);
          setStoredUser(response.user);
        }
      } catch (err) {
        console.warn('[Auth] Session validation failed:', err.message);
        if (isMounted) {
          clearAuth();
          setToken('');
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Login handler
  const login = useCallback(async (email, password, rememberMe = true) => {
    const response = await api.login({ email, password });
    if (response?.token && response?.user) {
      setStoredToken(response.token, rememberMe);
      setStoredUser(response.user, rememberMe);
      setToken(response.token);
      setUser(response.user);
      return response.user;
    }
    throw new Error(response?.message || 'Login failed');
  }, []);

  // Register handler
  const register = useCallback(async (userData) => {
    const response = await api.register(userData);
    if (response?.token && response?.user) {
      setStoredToken(response.token);
      setStoredUser(response.user);
      setToken(response.token);
      setUser(response.user);
      return response.user;
    }
    throw new Error(response?.message || 'Registration failed');
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    clearAuth();
    setToken('');
    setUser(null);
  }, []);

  // Profile update handler
  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updatedUserData };
      setStoredUser(nextUser);
      return nextUser;
    });
  }, []);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
