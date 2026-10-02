import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit,
  ArrowUpDown,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  RefreshCw,
  Briefcase,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { AddEditStudentModal } from './AddEditStudentModal';
import { BulkEditModal } from './BulkEditModal';
import { AssignStudentDrivesModal } from './AssignStudentDrivesModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const StudentListPage = () => {
  const navigate = useNavigate();
  const { addToast, departments: configuredDepartments } = useApp();

  // Data states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  // Merge configured departments from Settings with current student departments
  const deptOptions = Array.from(new Set([
    ...(configuredDepartments || []).map((d) => d.name),
    ...(departments || []),
  ])).filter(Boolean).sort();

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [sortBy, setSortBy] = useState('registerNo');
  const [sortOrder, setSortOrder] = useState('asc');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [modalStudent, setModalStudent] = useState(null);
  const [driveAssignStudent, setDriveAssignStudent] = useState(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, studentId: null, isBulk: false });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getStudents({
        page: pagination.page,
        limit: pagination.limit,
        search,
        department,
        batch,
        sortBy,
        sortOrder,
      });

      setStudents(res.students || []);
      setPagination(res.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      if (res.filters) {
        setDepartments(res.filters.departments || []);
        setBatches(res.filters.batches || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch students', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, department, batch, sortBy, sortOrder, addToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle multi-select
  const handleSelectAll = () => {
    if (selectedIds.length === students.length && students.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s._id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Sort toggle
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      addToast('Preparing CSV export...', 'info');
      const res = await api.getStudents({
        exportAll: 'true',
        search,
        department,
        batch,
        sortBy,
        sortOrder,
      });

      if (!res.students || res.students.length === 0) {
        addToast('No students to export', 'warning');
        return;
      }

      const headers = ['Register No', 'Name', 'Department', 'Batch', 'Email', 'Phone', 'CGPA', 'Backlogs'];
      const rows = res.students.map((s) => [
        `"${s.registerNo || ''}"`,
        `"${s.name || ''}"`,
        `"${s.department || ''}"`,
        `"${s.batch || ''}"`,
        `"${s.email || ''}"`,
        `"${s.phone || ''}"`,
        s.cgpa !== null && s.cgpa !== undefined ? s.cgpa : '',
        s.backlogs !== undefined ? s.backlogs : 0,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Students_${department || 'All'}_${batch || 'All'}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Students exported successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Export failed', 'error');
    }
  };

  // Delete Handlers
  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      if (deleteConfirm.isBulk) {
        const res = await api.bulkDeleteStudents({ studentIds: selectedIds });
        addToast(res.message || 'Selected students deleted', 'success');
        setSelectedIds([]);
      } else {
        await api.deleteStudent(deleteConfirm.studentId);
        addToast('Student deleted successfully', 'success');
        setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirm.studentId));
      }
      setDeleteConfirm({ isOpen: false, studentId: null, isBulk: false });
      fetchStudents();
    } catch (err) {
      addToast(err.message || 'Failed to delete student(s)', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total of {pagination.total} registered students eligible for placement drives
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/students/bulk-import')}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Add Students
          </button>

          <button
            onClick={() => {
              setModalStudent(null);
              setIsAddEditOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Single
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm flex items-center gap-2 transition-colors"
            title="Export filtered students as CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Search by Register No, Name, or Email..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {deptOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <select
              value={batch}
              onChange={(e) => {
                setBatch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-primary-600 text-white shadow-xl animate-fade-in">
          <div className="flex items-center gap-3 text-sm font-semibold pl-2">
            <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <span>Students Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkEditOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Dept / Batch
            </button>

            <button
              onClick={() =>
                setDeleteConfirm({
                  isOpen: true,
                  studentId: null,
                  isBulk: true,
                })
              }
              className="px-3 py-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-xl hover:bg-white/20 text-xs font-medium text-white/80 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Students Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-12 text-center">
                  <button
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-primary-600 transition-colors focus:outline-none"
                    aria-label="Select all rows on current page"
                  >
                    {selectedIds.length === students.length && students.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-primary-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('registerNo')}
                  className="p-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Reg No</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="p-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Batch</th>
                <th
                  onClick={() => handleSort('cgpa')}
                  className="p-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>CGPA</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('backlogs')}
                  className="p-3.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Backlogs</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
                      <span>Loading students...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                      <p className="font-medium text-slate-600 dark:text-slate-300">
                        No students found
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Try adjusting your search filters or import students in bulk from your Excel/CSV files.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isSelected = selectedIds.includes(student._id);
                  return (
                    <tr
                      key={student._id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleSelect(student._id)}
                          className="text-slate-400 hover:text-primary-600 focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-primary-700 dark:text-primary-400">
                        {student.registerNo}
                      </td>
                      <td className="p-3.5 font-medium text-slate-900 dark:text-white">
                        <div>{student.name}</div>
                        {student.email && (
                          <div className="text-xs text-slate-400">{student.email}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {student.department || '—'}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {student.batch || '—'}
                      </td>
                      <td className="p-3.5 text-center font-mono font-medium">
                        {student.cgpa !== null && student.cgpa !== undefined ? (
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                              student.cgpa >= 7.5
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : student.cgpa >= 6.0
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {Number(student.cgpa).toFixed(2)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        {student.backlogs > 0 ? (
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                            {student.backlogs}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDriveAssignStudent(student)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Assign to Drives"
                          >
                            <Briefcase className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setModalStudent(student);
                              setIsAddEditOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Student"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                studentId: student._id,
                                isBulk: false,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pagination.limit}
              onChange={(e) => {
                setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }));
              }}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>
              Showing {students.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
              students
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))
              }
              disabled={pagination.page >= pagination.totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Single Student Modal */}
      <AddEditStudentModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        student={modalStudent}
        onSuccess={fetchStudents}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([]);
          fetchStudents();
        }}
      />

      {/* Assign Student to Drives Modal */}
      {driveAssignStudent && (
        <AssignStudentDrivesModal
          isOpen={Boolean(driveAssignStudent)}
          onClose={() => setDriveAssignStudent(null)}
          student={driveAssignStudent}
          onSuccess={fetchStudents}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.isBulk ? 'Delete Selected Students?' : 'Delete Student Record?'}
        message={
          deleteConfirm.isBulk
            ? `Are you sure you want to delete ${selectedIds.length} selected students? This will also remove any drive assignments and attendance marked for them.`
            : 'Are you sure you want to delete this student? All their drive assignments and attendance records will be permanently removed.'
        }
        confirmText="Yes, Delete"
        isDanger={true}
        loading={actionLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, studentId: null, isBulk: false })}
      />
    </div>
  );
};
