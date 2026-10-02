import React, { useState } from 'react';
import { X, Edit3, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { OFFICIAL_DEPARTMENTS } from '../../config/departments';

export const BulkEditModal = ({ isOpen, onClose, selectedIds = [], onSuccess }) => {
  const { addToast, departments: configuredDepartments } = useApp();
  const deptList = (configuredDepartments && configuredDepartments.length > 0) ? configuredDepartments : OFFICIAL_DEPARTMENTS;
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!department.trim() && !batch.trim()) {
      addToast('Please enter either a new Department or Batch to update', 'warning');
      return;
    }

    setLoading(true);
    try {
      const updates = {};
      if (department.trim()) updates.department = department.trim();
      if (batch.trim()) updates.batch = batch.trim();

      const res = await api.bulkEditStudents(selectedIds, updates);
      addToast(res.message || 'Students updated successfully', 'success');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update students', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Bulk Edit ({selectedIds.length} students)
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set common department or batch values for all selected records. Leave empty if you don't want to change that field.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Department (optional)
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">Do not change department</option>
              {deptList.map((dept) => (
                <option key={dept.code} value={dept.name}>
                  {dept.code} — {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Batch (optional)
            </label>
            <input
              type="text"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g. 2021-2025"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
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
                'Updating...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Apply Updates
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
