import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';

export const PinModal = () => {
  const { showPinModal, handlePinSubmit } = useApp();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showPinModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter the access PIN');
      return;
    }

    setLoading(true);
    setError('');
    const success = await handlePinSubmit(pin.trim());
    setLoading(false);
    if (!success) {
      setError('Incorrect access PIN. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fade-in">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access PIN Required</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            This Placement Cell portal is protected. Enter the system access PIN to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Placement Cell PIN
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center tracking-widest text-lg font-mono"
              />
              <KeyRound className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            {error && <p className="text-xs text-rose-500 mt-1.5 text-center font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Unlock System
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
