import React, { useState, useEffect } from 'react';
import { X, Briefcase, Check, Building2, Calendar, MapPin, User, GraduationCap } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

import { OFFICIAL_DEPARTMENTS } from '../../config/departments';

export const AddEditDriveModal = ({ isOpen, onClose, drive = null, onSuccess }) => {
  const { addToast, departments: configuredDepartments } = useApp();
  const deptList = (configuredDepartments && configuredDepartments.length > 0) ? configuredDepartments : OFFICIAL_DEPARTMENTS;
  const isEdit = Boolean(drive && drive._id);

  const [formData, setFormData] = useState({
    company: '',
    role: '',
    packageLpa: '',
    driveDate: '',
    driveTime: '',
    venueMode: 'Campus Auditorium (Offline)',
    coordinator: '',
    status: 'Upcoming',
    minCgpa: '0',
    maxBacklogs: '0',
    allowedDepartments: [],
    batch: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (drive) {
      let formattedDate = '';
      if (drive.driveDate) {
        formattedDate = new Date(drive.driveDate).toISOString().split('T')[0];
      }
      setFormData({
        company: drive.company || '',
        role: drive.role || '',
        packageLpa: drive.packageLpa !== undefined ? String(drive.packageLpa) : '',
        driveDate: formattedDate,
        driveTime: drive.driveTime || '',
        venueMode: drive.venueMode || 'Offline',
        coordinator: drive.coordinator || '',
        status: drive.status || 'Upcoming',
        minCgpa: drive.eligibility?.minCgpa !== undefined ? String(drive.eligibility.minCgpa) : '0',
        maxBacklogs: drive.eligibility?.maxBacklogs !== undefined ? String(drive.eligibility.maxBacklogs) : '0',
        allowedDepartments: drive.eligibility?.allowedDepartments || [],
        batch: drive.eligibility?.batch || '',
      });
    } else {
      setFormData({
        company: '',
        role: '',
        packageLpa: '',
        driveDate: '',
        driveTime: '09:30 AM',
        venueMode: 'Offline',
        coordinator: '',
        status: 'Upcoming',
        minCgpa: '6.5',
        maxBacklogs: '0',
        allowedDepartments: ['Computer Science and Engineering', 'Artificial Intelligence and Data Science'],
        batch: '2021-2025',
      });
    }
    setErrors({});
  }, [drive, isOpen]);

  if (!isOpen) return null;

  const toggleDepartment = (dept) => {
    setFormData((prev) => {
      const current = prev.allowedDepartments;
      if (current.includes(dept)) {
        return { ...prev, allowedDepartments: current.filter((d) => d !== dept) };
      } else {
        return { ...prev, allowedDepartments: [...current, dept] };
      }
    });
  };

  const handleSelectAllDepts = () => {
    if (formData.allowedDepartments.length === deptList.length) {
      setFormData({ ...formData, allowedDepartments: [] });
    } else {
      setFormData({ ...formData, allowedDepartments: deptList.map((d) => d.name) });
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.company.trim()) errs.company = 'Company name is required';
    if (!formData.role.trim()) errs.role = 'Role / Designation is required';

    if (formData.packageLpa !== '') {
      const num = Number(formData.packageLpa);
      if (isNaN(num) || num < 0) errs.packageLpa = 'Package must be a positive number';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        company: formData.company.trim(),
        role: formData.role.trim(),
        packageLpa: formData.packageLpa !== '' ? Number(formData.packageLpa) : 0,
        driveDate: formData.driveDate ? new Date(formData.driveDate) : null,
        driveTime: formData.driveTime.trim(),
        venueMode: formData.venueMode.trim(),
        coordinator: formData.coordinator.trim(),
        status: formData.status,
        eligibility: {
          minCgpa: formData.minCgpa !== '' ? Number(formData.minCgpa) : 0,
          maxBacklogs: formData.maxBacklogs !== '' ? Number(formData.maxBacklogs) : 0,
          allowedDepartments: formData.allowedDepartments,
          batch: formData.batch.trim(),
        },
      };

      if (isEdit) {
        await api.updateDrive(drive._id, payload);
        addToast(`Placement drive for ${payload.company} updated`, 'success');
      } else {
        await api.createDrive(payload);
        addToast(`Placement drive for ${payload.company} created`, 'success');
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to save drive', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? `Edit Drive: ${drive.company}` : 'Create Placement Drive'}
              </h2>
              <p className="text-xs text-slate-500">
                Define company details, schedule, and automatic eligibility criteria
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Section 1: Company & Schedule Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Company & Drive Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Google, Microsoft"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                {errors.company && <p className="text-xs text-rose-500 mt-1">{errors.company}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Role / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Software Development Engineer"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                {errors.role && <p className="text-xs text-rose-500 mt-1">{errors.role}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Package (LPA)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.packageLpa}
                  onChange={(e) => setFormData({ ...formData, packageLpa: e.target.value })}
                  placeholder="e.g. 18.5"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Drive Date
                </label>
                <input
                  type="date"
                  value={formData.driveDate}
                  onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Drive Time
                </label>
                <input
                  type="text"
                  value={formData.driveTime}
                  onChange={(e) => setFormData({ ...formData, driveTime: e.target.value })}
                  placeholder="e.g. 09:30 AM"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Venue / Mode
                </label>
                <input
                  type="text"
                  value={formData.venueMode}
                  onChange={(e) => setFormData({ ...formData, venueMode: e.target.value })}
                  placeholder="e.g. Auditorium (Offline)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Coordinator
                </label>
                <input
                  type="text"
                  value={formData.coordinator}
                  onChange={(e) => setFormData({ ...formData, coordinator: e.target.value })}
                  placeholder="e.g. Prof. Alan Turing"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Drive Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Student Eligibility Criteria */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              Eligibility Criteria (Used for Automatic Student Assignment)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Minimum CGPA (0 - 10)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  value={formData.minCgpa}
                  onChange={(e) => setFormData({ ...formData, minCgpa: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maximum Backlogs Allowed
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxBacklogs}
                  onChange={(e) => setFormData({ ...formData, maxBacklogs: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Batch (optional)
                </label>
                <input
                  type="text"
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  placeholder="e.g. 2021-2025"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Allowed Departments Multi-select chips */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Allowed Departments ({formData.allowedDepartments.length} selected)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllDepts}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  {formData.allowedDepartments.length === deptList.length ? 'Deselect All' : 'Select All Departments'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {deptList.map((dept) => {
                  const isSelected = formData.allowedDepartments.includes(dept.name);
                  return (
                    <button
                      type="button"
                      key={dept.code}
                      onClick={() => toggleDepartment(dept.name)}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-700 dark:text-primary-300 font-semibold shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-mono font-bold text-[10px] px-1 py-0.2 rounded bg-black/5 dark:bg-white/10">
                        {dept.code}
                      </span>
                      <span>{dept.name}</span>
                      {isSelected && <span className="text-primary-600 font-bold ml-0.5">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEdit ? 'Save Changes' : 'Create Drive'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
