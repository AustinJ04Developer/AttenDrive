import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Briefcase,
  UserCheck,
  FileText,
  History,
  Settings,
  X,
  LogOut,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Students', path: '/students', icon: Users, exact: true },
  { name: 'Bulk Import', path: '/students/bulk-import', icon: FileSpreadsheet },
  { name: 'Drives', path: '/drives', icon: Briefcase },
  { name: 'Attendance', path: '/attendance', icon: UserCheck },
  { name: 'Reports', path: '/reports', icon: FileText, exact: true },
  { name: 'Report History', path: '/reports/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden no-print"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen no-print ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
              AD
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              AttenDrive
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Placement Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 ${
                        isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer user profile card */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {user && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.role} • {user.department || 'Placement'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  if (onClose) onClose();
                }}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="rounded-xl bg-slate-50/70 dark:bg-slate-900/60 p-2.5 border border-slate-200/50 dark:border-slate-800/80 text-center">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Bulk-First Attendance System
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
