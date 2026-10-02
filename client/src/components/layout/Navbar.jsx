import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Sun, Moon, Shield, ShieldCheck, Menu, LogOut, User } from 'lucide-react';

export const Navbar = ({ onMenuToggle }) => {
  const { darkMode, toggleDarkMode, pinRequired, isPinAuthenticated, setShowPinModal, addToast } = useApp();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    addToast('You have been logged out successfully.', 'info');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-4 sm:px-6 backdrop-blur-md no-print">
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none flex-shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-sky-400 flex items-center justify-center text-white font-bold shadow-md shadow-primary-500/20 flex-shrink-0">
            AD
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
              AttenDrive
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">
              Placement Drive Attendance System
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {pinRequired && (
          <button
            onClick={() => setShowPinModal(true)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              isPinAuthenticated
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 animate-pulse'
            }`}
          >
            {isPinAuthenticated ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                PIN Verified
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                PIN Locked
              </>
            )}
          </button>
        )}

        {/* User Profile Badge */}
        {user && (
          <div className="hidden md:flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <div className="w-7 h-7 rounded-lg bg-primary-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {getInitials(user.name)}
            </div>
            <div className="text-left leading-tight">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                {user.name}
              </div>
              <div className="text-[10px] font-medium text-primary-600 dark:text-primary-400 capitalize">
                {user.role}
              </div>
            </div>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Logout Button */}
        {user && (
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-xs font-semibold shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
};
