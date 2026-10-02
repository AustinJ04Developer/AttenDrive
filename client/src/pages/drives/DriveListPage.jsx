import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { AddEditDriveModal } from './AddEditDriveModal';
import { BulkUploadDrivesModal } from './BulkUploadDrivesModal';
import { DriveAssignmentModal } from './DriveAssignmentModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const DriveListPage = () => {
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & View
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [assigningDrive, setAssigningDrive] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, drive: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDrives = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDrives({
        search,
        status: statusFilter,
      });
      setDrives(res.drives || []);
    } catch (err) {
      addToast(err.message || 'Failed to load placement drives', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, addToast]);

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const handleDeleteDrive = async () => {
    if (!deleteConfirm.drive?._id) return;
    setDeleteLoading(true);
    try {
      const res = await api.deleteDrive(deleteConfirm.drive._id);
      addToast(res.message || 'Drive deleted successfully', 'success');
      setDeleteConfirm({ isOpen: false, drive: null });
      fetchDrives();
    } catch (err) {
      addToast(err.message || 'Failed to delete drive', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Status counts
  const statusCounts = {
    All: drives.length,
    Upcoming: drives.filter((d) => d.status === 'Upcoming').length,
    Ongoing: drives.filter((d) => d.status === 'Ongoing').length,
    Completed: drives.filter((d) => d.status === 'Completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Placement Drives
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage company drives, eligibility rules, and bulk student assignments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingDrive(null);
              setIsAddEditOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Create Drive
          </button>

          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary-500" />
            Bulk Upload Drives
          </button>

          <button
            onClick={() => api.downloadTemplate('drives')}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Download Drives CSV Template"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar & View Toggle */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, role, coordinator..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['All', 'Upcoming', 'Ongoing', 'Completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === status
                  ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {status === 'Upcoming' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
              {status === 'Ongoing' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
              {status === 'Completed' && <span className="w-2 h-2 rounded-full bg-slate-400"></span>}
              <span>{status}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {statusCounts[status] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Grid vs Table View Switcher */}
        <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          Loading placement drives...
        </div>
      ) : drives.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No placement drives found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create your first drive or adjust your search filters to view drives.
          </p>
          <button
            onClick={() => {
              setEditingDrive(null);
              setIsAddEditOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md inline-flex items-center gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Drive
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW OF DRIVE CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drives.map((drive) => {
            const hasAssignments = drive.assignedCount > 0;
            return (
              <div
                key={drive._id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  {/* Top row: Company, Role & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {drive.company}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{drive.role}</p>
                    </div>

                    <div className="text-right">
                      {drive.packageLpa > 0 && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {drive.packageLpa} LPA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Schedule row */}
                  <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {drive.driveDate
                          ? new Date(drive.driveDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'TBD'}{' '}
                        {drive.driveTime && `• ${drive.driveTime}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{drive.venueMode || 'Campus'}</span>
                    </div>
                  </div>

                  {/* Eligibility criteria pills */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Eligibility Rules
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        CGPA ≥ {drive.eligibility?.minCgpa || 0}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Backlogs ≤ {drive.eligibility?.maxBacklogs ?? 0}
                      </span>
                      {drive.eligibility?.batch && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {drive.eligibility.batch}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Students Count & Attendance metric */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary-500" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {drive.assignedCount} Assigned
                      </span>
                    </div>

                    {drive.assignedCount > 0 && (
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {drive.attendanceStats?.attendancePct}% Present
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setAssigningDrive(drive)}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Assign Students
                  </button>

                  <button
                    onClick={() => navigate(`/attendance?driveId=${drive._id}`)}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1 transition-colors"
                    title="Mark Attendance"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingDrive(drive);
                      setIsAddEditOpen(true);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Drive"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, drive })}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Drive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW OF DRIVES */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Company & Role</th>
                  <th className="p-3.5">Date & Venue</th>
                  <th className="p-3.5 text-center">Package</th>
                  <th className="p-3.5">Eligibility</th>
                  <th className="p-3.5 text-center">Assigned</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
                {drives.map((drive) => (
                  <tr key={drive._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{drive.company}</div>
                      <div className="text-slate-500 text-[11px]">{drive.role}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div>
                        {drive.driveDate ? new Date(drive.driveDate).toLocaleDateString() : 'TBD'}
                      </div>
                      <div className="text-[11px] text-slate-400">{drive.venueMode}</div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-600">
                      {drive.packageLpa} LPA
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-500">
                      CGPA ≥ {drive.eligibility?.minCgpa || 0} • Backlogs ≤ {drive.eligibility?.maxBacklogs ?? 0}
                    </td>
                    <td className="p-3.5 text-center font-mono font-semibold">
                      <span className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                        {drive.assignedCount}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {drive.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAssigningDrive(drive)}
                          className="px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          Assign
                        </button>
                        <button
                          onClick={() => {
                            setEditingDrive(drive);
                            setIsAddEditOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, drive })}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Drive Modal */}
      <AddEditDriveModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        drive={editingDrive}
        onSuccess={fetchDrives}
      />

      {/* Bulk Upload Drives Modal */}
      <BulkUploadDrivesModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={fetchDrives}
      />

      {/* Drive Assignment Modal */}
      {assigningDrive && (
        <DriveAssignmentModal
          isOpen={Boolean(assigningDrive)}
          onClose={() => setAssigningDrive(null)}
          drive={assigningDrive}
          onUpdate={fetchDrives}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={`Delete Drive: ${deleteConfirm.drive?.company}?`}
        message={`Are you sure you want to delete this placement drive? All associated student assignments and attendance records will be permanently removed.`}
        confirmText="Yes, Delete Drive"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={handleDeleteDrive}
        onCancel={() => setDeleteConfirm({ isOpen: false, drive: null })}
      />
    </div>
  );
};
