import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getStoredPin, setStoredPin, getStoredToken } from '../services/api';
import { OFFICIAL_DEPARTMENTS } from '../config/departments';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('attendrive_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Settings state (college_branding, official_departments, report_signatories, default_orientation)
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Access PIN state
  const [pinRequired, setPinRequired] = useState(false);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('attendrive_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('attendrive_theme', 'light');
    }
  }, [darkMode]);

  // Load settings from backend API
  const reloadSettings = useCallback(async () => {
    try {
      // Check if authenticated before fetching settings
      const token = getStoredToken();
      if (!token) {
        setSettingsLoading(false);
        return;
      }

      const res = await api.getSettings();
      if (res?.settings) {
        setSettings(res.settings);

        // Update document title if college name is configured
        const collegeName = res.settings?.college_branding?.collegeName;
        if (collegeName && collegeName.trim()) {
          document.title = `${collegeName} | AttenDrive`;
        }
      }
    } catch (err) {
      console.warn('[Settings] Failed to fetch settings:', err.message);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Update settings in memory immediately
  const updateSettingsInState = useCallback((newSettings) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      const collegeName = merged?.college_branding?.collegeName;
      if (collegeName && collegeName.trim()) {
        document.title = `${collegeName} | AttenDrive`;
      }
      return merged;
    });
  }, []);

  // Check auth requirement and load settings on initial load
  useEffect(() => {
    const checkAuthAndSettings = async () => {
      try {
        const status = await api.getAuthStatus();
        if (status.pinRequired) {
          setPinRequired(true);
          const stored = getStoredPin();
          if (stored) {
            try {
              await api.verifyPin(stored);
              setIsPinAuthenticated(true);
            } catch {
              setShowPinModal(true);
            }
          } else {
            setShowPinModal(true);
          }
        } else {
          setPinRequired(false);
          setIsPinAuthenticated(true);
        }
      } catch (err) {
        console.error('Failed to check auth status:', err);
      }

      // Load settings
      await reloadSettings();
    };

    checkAuthAndSettings();
  }, [reloadSettings]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handlePinSubmit = async (pin) => {
    try {
      await api.verifyPin(pin);
      setStoredPin(pin);
      setIsPinAuthenticated(true);
      setShowPinModal(false);
      addToast('Access PIN verified', 'success');
      return true;
    } catch (err) {
      addToast(err.message || 'Invalid PIN', 'error');
      return false;
    }
  };

  // Derive departments list: from database settings or fallback to OFFICIAL_DEPARTMENTS
  const departments =
    settings?.official_departments && Array.isArray(settings.official_departments) && settings.official_departments.length > 0
      ? settings.official_departments.filter((d) => d.isActive !== false)
      : OFFICIAL_DEPARTMENTS;

  const branding = settings?.college_branding || {
    headerMode: 'banner',
    collegeName: 'AttenDrive Placement Portal',
    address: '',
    logo: '',
    email: '',
    phone: '',
  };

  const signatories = settings?.report_signatories || {
    officer: '',
    coordinator: '',
    principal: '',
  };

  return (
    <AppContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        settings,
        settingsLoading,
        reloadSettings,
        updateSettingsInState,
        branding,
        departments,
        signatories,
        pinRequired,
        isPinAuthenticated,
        showPinModal,
        setShowPinModal,
        handlePinSubmit,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
