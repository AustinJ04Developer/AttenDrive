import React, { useState, useEffect } from 'react';
import { X, Briefcase, Check, AlertTriangle, Building2 } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

export const AssignStudentDrivesModal = ({ isOpen, onClose, student, onSuccess }) => {
  const { addToast } = useApp();
  const [drives, setDrives] = useState([]);
  const [selectedDriveIds, setSelectedDriveIds] = useState([]);
  const [allowIneligible, setAllowIneligible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (isOpen && student) {
      const fetchDrives = async () => {
        setFetching(true);
        try {
          const res = await api.getDrives({ limit: 100 });
          setDrives(res.drives || []);
          setSelectedDriveIds([]);
        } catch (err) {
          console.error(err);
        } finally {
          setFetching(false);
        }
      };
      fetchDrives();
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  // Check student eligibility for a drive
  const checkEligibility = (drive) => {
    const crit = drive.eligibility;
    if (!crit) return { eligible: true };

    if (crit.minCgpa && (student.cgpa === null || student.cgpa < crit.minCgpa)) {
      return { eligible: false, reason: `CGPA ${student.cgpa || 0} < ${crit.minCgpa}` };
    }
    if (crit.maxBacklogs !== undefined && (student.backlogs || 0) > crit.maxBacklogs) {
      return { eligible: false, reason: `Backlogs ${student.backlogs} > ${crit.maxBacklogs}` };
    }
    if (crit.allowedDepartments?.length > 0 && !crit.allowedDepartments.includes(student.department)) {
      return { eligible: false, reason: 'Department not permitted' };
    }
    if (crit.batch && student.batch !== crit.batch) {
      return { eligible: false, reason: `Batch ${student.batch} != ${crit.batch}` };
    }

    return { eligible: true };
  };

  const handleToggleDrive = (driveId) => {
    setSelectedDriveIds((prev) =>
      prev.includes(driveId) ? prev.filter((id) => id !== driveId) : [...prev, driveId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedDriveIds.length === 0) {
      addToast('Please select at least one drive', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.assignStudentToMultipleDrives(student._id, selectedDriveIds, allowIneligible);
      addToast(res.message || 'Assigned to drives', 'success');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to assign drives', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Assign to Drives
            </h2>
            <p className="text-xs text-slate-500">
              {student.name} ({student.registerNo}) • {student.department} • CGPA: {student.cgpa}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {fetching ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading drives...</div>
            ) : drives.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No active drives available.</div>
            ) : (
              drives.map((d) => {
                const { eligible, reason } = checkEligibility(d);
                const isSelected = selectedDriveIds.includes(d._id);
                return (
                  <div
                    key={d._id}
                    onClick={() => handleToggleDrive(d._id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{d.company}</span>
                          <span className="text-[10px] font-mono font-medium text-emerald-600">
                            {d.packageLpa} LPA
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{d.role}</div>
                      </div>
                    </div>

                    <div>
                      {eligible ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          Eligible
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                          title={reason}
                        >
                          {reason}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <input
              type="checkbox"
              id="allowIneligibleStudent"
              checked={allowIneligible}
              onChange={(e) => setAllowIneligible(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="allowIneligibleStudent" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              Allow override for ineligible drives
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedDriveIds.length === 0}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Assigning...' : `Assign to ${selectedDriveIds.length} Drive(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
