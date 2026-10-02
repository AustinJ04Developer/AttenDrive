import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { OFFICIAL_DEPARTMENTS } from '../../config/departments';
import {
  User,
  Mail,
  Lock,
  Building,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { darkMode, toggleDarkMode, addToast } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Placement Cell',
    role: 'coordinator',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Full name is required');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Official email is required');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        department: formData.department,
        role: formData.role,
        password: formData.password,
      });

      addToast(`Account created successfully! Welcome, ${user.name}!`, 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordLengthOk = formData.password.length >= 6;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 overflow-hidden selection:bg-primary-500 selection:text-white">
      {/* Background ambient decorative glows */}
      <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-lg my-8">
        {/* Brand identity header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-sky-400 text-white font-extrabold text-2xl shadow-lg shadow-primary-500/30 mb-3">
            AD
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Join AttenDrive
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Register as a placement coordinator or staff member
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Create New Account
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fill in your details to set up your placement portal account
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Prof. John Doe"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 dark:focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Official College Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@college.edu"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 dark:focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Department and Role Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Department Selection */}
              <div>
                <label
                  htmlFor="department"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Department
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 dark:focus:border-primary-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Placement Cell">Placement Cell (Central)</option>
                    {OFFICIAL_DEPARTMENTS.map((dept) => (
                      <option key={dept.code} value={dept.name}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label
                  htmlFor="role"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  System Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 dark:focus:border-primary-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="coordinator">Placement Coordinator</option>
                    <option value="admin">Placement Officer (Admin)</option>
                    <option value="staff">Department Staff</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                {formData.password && (
                  <span
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      passwordLengthOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {passwordLengthOk ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Min 6 chars
                      </>
                    ) : (
                      'Must be >= 6 chars'
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 dark:focus:border-primary-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Confirm Password
                </label>
                {formData.confirmPassword && (
                  <span
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </>
                    ) : (
                      'Passwords do not match'
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 dark:focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-primary-500/25"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer switch to login */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors inline-flex items-center gap-0.5"
              >
                Sign in &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
