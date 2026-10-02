import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { OFFICIAL_DEPARTMENTS } from '../../config/departments';

export const AddEditStudentModal = ({ isOpen, onClose, student = null, onSuccess }) => {
  const { addToast, departments: configuredDepartments } = useApp();
  const deptList = (configuredDepartments && configuredDepartments.length > 0) ? configuredDepartments : OFFICIAL_DEPARTMENTS;
  const isEdit = Boolean(student && student._id);

  const [formData, setFormData] = useState({
    registerNo: '',
    name: '',
    department: '',
    batch: '',
    email: '',
    phone: '',
    cgpa: '',
    backlogs: '0',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (student) {
      setFormData({
        registerNo: student.registerNo || '',
        name: student.name || '',
        department: student.department || '',
        batch: student.batch || '',
        email: student.email || '',
        phone: student.phone || '',
        cgpa: student.cgpa !== null && student.cgpa !== undefined ? String(student.cgpa) : '',
        backlogs: student.backlogs !== undefined ? String(student.backlogs) : '0',
      });
    } else {
      setFormData({
        registerNo: '',
        name: '',
        department: '',
        batch: '',
        email: '',
        phone: '',
        cgpa: '',
        backlogs: '0',
      });
    }
    setErrors({});
  }, [student, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.registerNo.trim()) errs.registerNo = 'Register number is required';
    if (!formData.name.trim()) errs.name = 'Student name is required';

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Invalid email address format';
      }
    }

    if (formData.cgpa !== '') {
      const num = Number(formData.cgpa);
      if (isNaN(num) || num < 0 || num > 10) {
        errs.cgpa = 'CGPA must be between 0.0 and 10.0';
      }
    }

    if (formData.backlogs !== '') {
      const num = Number(formData.backlogs);
      if (isNaN(num) || num < 0) {
        errs.backlogs = 'Backlogs cannot be negative';
      }
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
        registerNo: formData.registerNo.trim().toUpperCase(),
        name: formData.name.trim(),
        department: formData.department.trim(),
        batch: formData.batch.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        cgpa: formData.cgpa !== '' ? Number(formData.cgpa) : null,
        backlogs: formData.backlogs !== '' ? Number(formData.backlogs) : 0,
      };

      if (isEdit) {
        await api.updateStudent(student._id, payload);
        addToast(`Student ${payload.registerNo} updated successfully`, 'success');
      } else {
        await api.createStudent(payload);
        addToast(`Student ${payload.registerNo} added successfully`, 'success');
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to save student', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isEdit ? 'Edit Student Details' : 'Add Single Student (Fallback)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Register Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.registerNo}
                onChange={(e) => setFormData({ ...formData, registerNo: e.target.value })}
                placeholder="e.g. 21CS042"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              {errors.registerNo && (
                <p className="text-xs text-rose-500 mt-1">{errors.registerNo}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="">Select Department</option>
                {deptList.map((dept) => (
                  <option key={dept.code} value={dept.name}>
                    {dept.code} — {dept.name}
                  </option>
                ))}
                {formData.department && !deptList.some(d => d.name === formData.department || d.code === formData.department) && (
                  <option value={formData.department}>{formData.department}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@college.edu"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="9876543210"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CGPA (0 - 10)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={formData.cgpa}
                onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                placeholder="e.g. 8.45"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              {errors.cgpa && <p className="text-xs text-rose-500 mt-1">{errors.cgpa}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Standing Backlogs
              </label>
              <input
                type="number"
                min="0"
                value={formData.backlogs}
                onChange={(e) => setFormData({ ...formData, backlogs: e.target.value })}
                placeholder="0"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              {errors.backlogs && <p className="text-xs text-rose-500 mt-1">{errors.backlogs}</p>}
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
                  {isEdit ? 'Save Changes' : 'Add Student'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
