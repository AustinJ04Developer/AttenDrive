import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import {
  X,
  UserCheck,
  Zap,
  ClipboardList,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Filter,
  Download,
  AlertCircle,
  Square,
  CheckSquare,
  Sparkles,
  ShieldAlert,
  UserPlus,
  Check,
  Info,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { OFFICIAL_DEPARTMENTS, getDepartmentByCodeOrName } from '../../config/departments';

// Helper to evaluate student eligibility on client side against drive criteria
export const checkStudentEligibility = (student, criteria) => {
  if (!criteria) return { isEligible: true, reasons: [] };
  const reasons = [];

  // Min CGPA check
  if (criteria.minCgpa !== undefined && criteria.minCgpa > 0) {
    if (student.cgpa === null || student.cgpa === undefined || Number(student.cgpa) < Number(criteria.minCgpa)) {
      reasons.push(`CGPA ${student.cgpa ?? 'N/A'} < min ${criteria.minCgpa}`);
    }
  }

  // Max backlogs check
  if (criteria.maxBacklogs !== undefined && criteria.maxBacklogs !== null) {
    if ((student.backlogs || 0) > Number(criteria.maxBacklogs)) {
      reasons.push(`Backlogs ${student.backlogs || 0} > max ${criteria.maxBacklogs}`);
    }
  }

  // Allowed departments check
  if (criteria.allowedDepartments && criteria.allowedDepartments.length > 0) {
    const studentDept = student.department || '';
    const deptInfo = getDepartmentByCodeOrName(studentDept);
    const matches = criteria.allowedDepartments.some((allowed) => {
      const allowedLower = allowed.trim().toLowerCase();
      if (studentDept.toLowerCase() === allowedLower) return true;
      if (deptInfo && (deptInfo.code.toLowerCase() === allowedLower || deptInfo.name.toLowerCase() === allowedLower)) {
        return true;
      }
      return false;
    });
    if (!matches) {
      reasons.push(`Dept '${studentDept || 'Unknown'}' not eligible`);
    }
  }

  // Batch check
  if (criteria.batch && criteria.batch.trim() !== '') {
    if (student.batch && student.batch.trim() !== criteria.batch.trim()) {
      reasons.push(`Batch '${student.batch}' != '${criteria.batch}'`);
    }
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
};

export const DriveAssignmentModal = ({ isOpen, onClose, drive, onUpdate }) => {
  const { addToast, departments: configuredDepartments } = useApp();
  const deptList = (configuredDepartments && configuredDepartments.length > 0) ? configuredDepartments : OFFICIAL_DEPARTMENTS;

  // Active Tab: 'manual' | 'auto' | 'paste' | 'assigned'
  const [activeTab, setActiveTab] = useState('manual');

  // Set of all student IDs assigned to this drive
  const [allAssignedIds, setAllAssignedIds] = useState(new Set());

  // ---------------------------------------------
  // Tab 1: Manual Search & Select State
  // ---------------------------------------------
  const [manualSearch, setManualSearch] = useState('');
  const [manualDeptFilter, setManualDeptFilter] = useState('');
  const [manualEligibilityFilter, setManualEligibilityFilter] = useState('all'); // 'all' | 'eligible' | 'ineligible'
  const [manualAssignmentFilter, setManualAssignmentFilter] = useState('unassigned'); // 'all' | 'unassigned' | 'assigned'
  const [manualStudents, setManualStudents] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSelectedIds, setManualSelectedIds] = useState([]);
  const [assigningRowId, setAssigningRowId] = useState(null);
  const [assigningManualBulk, setAssigningManualBulk] = useState(false);

  // Ineligible Override Confirmation Modal state
  const [overrideConfirm, setOverrideConfirm] = useState({
    isOpen: false,
    student: null,
    isBulk: false,
    selectedIds: [],
    ineligibleCount: 0,
    reasons: [],
  });

  // ---------------------------------------------
  // Tab 2: Auto-assign state
  // ---------------------------------------------
  const [eligiblePreview, setEligiblePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [assigningAuto, setAssigningAuto] = useState(false);

  // ---------------------------------------------
  // Tab 3: Paste / Upload state
  // ---------------------------------------------
  const [pasteRegNos, setPasteRegNos] = useState('');
  const [allowIneligible, setAllowIneligible] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteResult, setPasteResult] = useState(null);

  // ---------------------------------------------
  // Tab 4: Assigned students table state
  // ---------------------------------------------
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedDeptFilter, setAssignedDeptFilter] = useState('');
  const [assignedSelectedIds, setAssignedSelectedIds] = useState([]);
  const [removeConfirm, setRemoveConfirm] = useState({ isOpen: false, isAll: false });
  const [removeLoading, setRemoveLoading] = useState(false);

  // Refresh all assigned IDs for this drive
  const refreshAllAssignedIds = useCallback(async () => {
    if (!drive?._id) return;
    try {
      const res = await api.getDriveAssignments(drive._id, { limit: 1000 });
      const ids = new Set((res.students || []).map((s) => String(s._id)));
      setAllAssignedIds(ids);
    } catch (err) {
      console.error('Error fetching assigned student IDs:', err);
    }
  }, [drive?._id]);

  // Fetch eligible preview for drive
  const fetchEligiblePreview = useCallback(async () => {
    if (!drive?._id) return;
    setPreviewLoading(true);
    try {
      const res = await api.getEligiblePreview(drive._id);
      setEligiblePreview(res);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  }, [drive?._id]);

  // Fetch assigned students for the Assigned tab
  const fetchAssignedStudents = useCallback(async () => {
    if (!drive?._id) return;
    setAssignedLoading(true);
    try {
      const res = await api.getDriveAssignments(drive._id, {
        search: assignedSearch,
        department: assignedDeptFilter,
        limit: 500,
      });
      setAssignedStudents(res.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAssignedLoading(false);
    }
  }, [drive?._id, assignedSearch, assignedDeptFilter]);

  // Fetch students for manual search tab
  const fetchManualStudents = useCallback(async () => {
    if (!drive?._id) return;
    setManualLoading(true);
    try {
      const res = await api.getStudents({
        search: manualSearch.trim(),
        department: manualDeptFilter,
        limit: 150,
      });
      setManualStudents(res.students || []);
    } catch (err) {
      console.error('Error fetching students for manual assignment:', err);
    } finally {
      setManualLoading(false);
    }
  }, [drive?._id, manualSearch, manualDeptFilter]);

  // Initialize on modal open
  useEffect(() => {
    if (isOpen && drive?._id) {
      fetchEligiblePreview();
      fetchAssignedStudents();
      refreshAllAssignedIds();
      setAssignedSelectedIds([]);
      setManualSelectedIds([]);
      setPasteResult(null);
    }
  }, [isOpen, drive?._id, fetchEligiblePreview, fetchAssignedStudents, refreshAllAssignedIds]);

  // Debounced search for manual students
  useEffect(() => {
    if (!isOpen || !drive?._id) return;
    const timer = setTimeout(() => {
      fetchManualStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, drive?._id, manualSearch, manualDeptFilter, fetchManualStudents]);

  if (!isOpen || !drive) return null;

  // ---------------------------------------------
  // Manual Tab Processing & Handlers
  // ---------------------------------------------

  // Evaluate candidate students with eligibility & assignment status
  const evaluatedManualStudents = manualStudents.map((student) => {
    const isAssigned = allAssignedIds.has(String(student._id));
    const eligibility = checkStudentEligibility(student, drive.eligibility);
    return {
      ...student,
      isAssigned,
      isEligible: eligibility.isEligible,
      ineligibleReasons: eligibility.reasons,
    };
  });

  // Filter students based on UI selections
  const filteredManualStudents = evaluatedManualStudents.filter((student) => {
    // Assignment status filter
    if (manualAssignmentFilter === 'unassigned' && student.isAssigned) return false;
    if (manualAssignmentFilter === 'assigned' && !student.isAssigned) return false;

    // Eligibility filter
    if (manualEligibilityFilter === 'eligible' && !student.isEligible) return false;
    if (manualEligibilityFilter === 'ineligible' && student.isEligible) return false;

    return true;
  });

  // Visible unassigned students for bulk selection
  const visibleUnassigned = filteredManualStudents.filter((s) => !s.isAssigned);
  const isAllManualSelected =
    visibleUnassigned.length > 0 &&
    visibleUnassigned.every((s) => manualSelectedIds.includes(s._id));

  const handleToggleSelectAllManual = () => {
    if (isAllManualSelected) {
      const visibleIds = new Set(visibleUnassigned.map((s) => s._id));
      setManualSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = visibleUnassigned.map((s) => s._id);
      setManualSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectManualRow = (id) => {
    setManualSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Core execution of assignment by student IDs
  const executeStudentAssignment = async (studentIds, override) => {
    if (!studentIds || studentIds.length === 0) return;

    if (studentIds.length === 1) {
      setAssigningRowId(studentIds[0]);
    } else {
      setAssigningManualBulk(true);
    }

    try {
      const res = await api.bulkAssignStudents(drive._id, {
        studentIds,
        allowIneligible: override,
      });

      addToast(
        res.message || `Successfully assigned ${studentIds.length} student(s) to ${drive.company}`,
        'success'
      );

      // Instantly mark IDs as assigned
      setAllAssignedIds((prev) => {
        const next = new Set(prev);
        studentIds.forEach((id) => next.add(String(id)));
        return next;
      });

      // Clear from selected
      setManualSelectedIds((prev) => prev.filter((id) => !studentIds.includes(id)));

      // Refresh data
      refreshAllAssignedIds();
      fetchAssignedStudents();
      fetchEligiblePreview();
      onUpdate && onUpdate();
    } catch (err) {
      addToast(err.message || 'Failed to assign student(s)', 'error');
    } finally {
      setAssigningRowId(null);
      setAssigningManualBulk(false);
      setOverrideConfirm({
        isOpen: false,
        student: null,
        isBulk: false,
        selectedIds: [],
        ineligibleCount: 0,
        reasons: [],
      });
    }
  };

  // Assign single student row
  const handleAssignSingleStudent = (student) => {
    if (drive.finalized) {
      addToast('Drive attendance is finalized and locked. Cannot assign students.', 'error');
      return;
    }

    if (!student.isEligible && !allowIneligible) {
      // Prompt confirmation for override
      setOverrideConfirm({
        isOpen: true,
        student,
        isBulk: false,
        selectedIds: [student._id],
        ineligibleCount: 1,
        reasons: student.ineligibleReasons,
      });
      return;
    }

    executeStudentAssignment([student._id], allowIneligible);
  };

  // Assign selected students in bulk
  const handleAssignManualSelected = () => {
    if (manualSelectedIds.length === 0) {
      addToast('Please select at least one student to assign', 'warning');
      return;
    }

    if (drive.finalized) {
      addToast('Drive attendance is finalized and locked.', 'error');
      return;
    }

    const selectedStudents = evaluatedManualStudents.filter((s) => manualSelectedIds.includes(s._id));
    const ineligibleSelected = selectedStudents.filter((s) => !s.isEligible);

    if (ineligibleSelected.length > 0 && !allowIneligible) {
      // Prompt confirmation for ineligible override
      setOverrideConfirm({
        isOpen: true,
        student: null,
        isBulk: true,
        selectedIds: manualSelectedIds,
        ineligibleCount: ineligibleSelected.length,
        reasons: ineligibleSelected.map(
          (s) => `${s.registerNo} (${s.name}): ${s.ineligibleReasons.join(', ')}`
        ),
      });
      return;
    }

    executeStudentAssignment(manualSelectedIds, allowIneligible);
  };

  // ---------------------------------------------
  // Auto-Assign Handler
  // ---------------------------------------------
  const handleAutoAssign = async () => {
    setAssigningAuto(true);
    try {
      const res = await api.autoAssignEligible(drive._id);
      addToast(res.message || 'Auto-assignment complete', 'success');
      fetchEligiblePreview();
      fetchAssignedStudents();
      refreshAllAssignedIds();
      onUpdate && onUpdate();
    } catch (err) {
      addToast(err.message || 'Auto-assignment failed', 'error');
    } finally {
      setAssigningAuto(false);
    }
  };

  // ---------------------------------------------
  // Paste / Upload Handler
  // ---------------------------------------------
  const handlePasteAssign = async () => {
    const numbers = pasteRegNos
      .split(/[\n,\s\t]+/)
      .map((n) => n.trim().toUpperCase())
      .filter(Boolean);

    if (numbers.length === 0) {
      addToast('Please enter at least one Register Number', 'warning');
      return;
    }

    setPasteLoading(true);
    setPasteResult(null);

    try {
      const res = await api.bulkAssignStudents(drive._id, {
        registerNos: numbers,
        allowIneligible,
      });

      setPasteResult(res);
      addToast(res.message || 'Students assigned to drive', 'success');
      setPasteRegNos('');
      fetchEligiblePreview();
      fetchAssignedStudents();
      refreshAllAssignedIds();
      onUpdate && onUpdate();
    } catch (err) {
      addToast(err.message || 'Failed to assign students', 'error');
      if (err.ineligibleCount || err.errors) {
        setPasteResult(err);
      }
    } finally {
      setPasteLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (!rows || rows.length === 0) return;

        const firstRow = rows[0];
        let colIndex = 0;
        firstRow.forEach((h, idx) => {
          if (String(h).toLowerCase().includes('reg') || String(h).toLowerCase().includes('roll')) {
            colIndex = idx;
          }
        });

        const startIndex = isNaN(Number(rows[0][colIndex])) ? 1 : 0;
        const regNos = [];
        for (let i = startIndex; i < rows.length; i++) {
          const val = rows[i][colIndex];
          if (val) regNos.push(String(val).trim().toUpperCase());
        }

        setPasteRegNos((prev) => (prev ? prev + '\n' + regNos.join('\n') : regNos.join('\n')));
        addToast(`Loaded ${regNos.length} Register Numbers from file`, 'info');
      },
    });
  };

  // ---------------------------------------------
  // Assigned Students Tab Handlers
  // ---------------------------------------------
  const handleRemoveAssigned = async () => {
    setRemoveLoading(true);
    try {
      const payload = removeConfirm.isAll
        ? { removeAll: true }
        : { studentIds: assignedSelectedIds };

      const res = await api.bulkRemoveAssignments(drive._id, payload);
      addToast(res.message || 'Removed students from drive', 'success');
      setAssignedSelectedIds([]);
      setRemoveConfirm({ isOpen: false, isAll: false });
      fetchEligiblePreview();
      fetchAssignedStudents();
      refreshAllAssignedIds();
      onUpdate && onUpdate();
    } catch (err) {
      addToast(err.message || 'Failed to remove students', 'error');
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleSelectAllAssigned = () => {
    if (assignedSelectedIds.length === assignedStudents.length && assignedStudents.length > 0) {
      setAssignedSelectedIds([]);
    } else {
      setAssignedSelectedIds(assignedStudents.map((s) => s._id));
    }
  };

  const handleToggleSelectAssigned = (id) => {
    setAssignedSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const distinctAssignedDepts = Array.from(
    new Set(assignedStudents.map((s) => s.department).filter(Boolean))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {drive.company}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300">
                {drive.role || 'Placement Drive'}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {drive.packageLpa} LPA
              </span>
              {drive.finalized && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Finalized & Locked
                </span>
              )}
            </div>

            {/* Eligibility summary badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Min CGPA: <strong>{drive.eligibility?.minCgpa || 'None'}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Max Backlogs: <strong>{drive.eligibility?.maxBacklogs ?? 'Any'}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Batch: <strong>{drive.eligibility?.batch || 'All'}</strong>
              </span>
              {drive.eligibility?.allowedDepartments?.length > 0 ? (
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {drive.eligibility.allowedDepartments.length} Departments Allowed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  All Departments Eligible
                </span>
              )}
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-5 bg-white dark:bg-slate-900 text-xs font-semibold overflow-x-auto">
          {/* Tab 1: Search & Select (Manual) */}
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'manual'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Search & Select Students
            {manualSelectedIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                {manualSelectedIds.length}
              </span>
            )}
          </button>

          {/* Tab 2: Auto-Assign */}
          <button
            onClick={() => setActiveTab('auto')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'auto'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Auto-Assign Eligible
            {eligiblePreview && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px]">
                {eligiblePreview.newToAssignCount} new
              </span>
            )}
          </button>

          {/* Tab 3: Paste / Upload */}
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'paste'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Paste / Upload Reg Nos
          </button>

          {/* Tab 4: Assigned Students */}
          <button
            onClick={() => setActiveTab('assigned')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'assigned'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Assigned Students ({allAssignedIds.size || assignedStudents.length})
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: Search & Select Students (Manual Assign) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'manual' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Input */}
                <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Search by Reg No, Name, or Email..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {manualSearch && (
                    <button
                      onClick={() => setManualSearch('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Department Filter */}
                <select
                  value={manualDeptFilter}
                  onChange={(e) => setManualDeptFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {deptList.map((dept) => (
                    <option key={dept.code} value={dept.name}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>

                {/* Assignment Status View Filter */}
                <select
                  value={manualAssignmentFilter}
                  onChange={(e) => setManualAssignmentFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="unassigned">Unassigned Only (Ready to Add)</option>
                  <option value="all">All Students</option>
                  <option value="assigned">Already Assigned</option>
                </select>

                {/* Eligibility Filter */}
                <select
                  value={manualEligibilityFilter}
                  onChange={(e) => setManualEligibilityFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="all">All Eligibility Criteria</option>
                  <option value="eligible">Eligible Only</option>
                  <option value="ineligible">Ineligible Only</option>
                </select>
              </div>

              {/* Action Toolbar & Ineligible Override */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={allowIneligible}
                      onChange={(e) => setAllowIneligible(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      Allow Ineligible Override (Admin Force Assign)
                    </span>
                  </label>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">
                    Showing <strong>{filteredManualStudents.length}</strong> student(s)
                  </span>
                </div>

                {/* Bulk assign button when students are checked */}
                <div className="flex items-center gap-2">
                  {manualSelectedIds.length > 0 && (
                    <>
                      <button
                        onClick={() => setManualSelectedIds([])}
                        className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                      >
                        Clear Selection
                      </button>
                      <button
                        onClick={handleAssignManualSelected}
                        disabled={assigningManualBulk || drive.finalized}
                        className="px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-primary-600/20 disabled:opacity-50"
                      >
                        {assigningManualBulk ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Assign Selected ({manualSelectedIds.length})
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button
                        onClick={handleToggleSelectAllManual}
                        disabled={visibleUnassigned.length === 0}
                        title={isAllManualSelected ? 'Deselect all' : 'Select all visible unassigned'}
                        className="focus:outline-none disabled:opacity-30"
                      >
                        {isAllManualSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Register No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-center">CGPA</th>
                    <th className="p-3 text-center">Backlogs</th>
                    <th className="p-3">Drive Eligibility</th>
                    <th className="p-3 text-center">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {manualLoading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                          Searching students...
                        </div>
                      </td>
                    </tr>
                  ) : filteredManualStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-slate-400">
                        {manualSearch ? (
                          <div>
                            <p className="font-medium text-slate-600 dark:text-slate-300">
                              No students found matching "{manualSearch}"
                            </p>
                            <p className="text-[11px] mt-1">
                              Try clearing filters or checking register number spelling.
                            </p>
                          </div>
                        ) : manualAssignmentFilter === 'unassigned' && allAssignedIds.size > 0 ? (
                          <div>
                            <p className="font-medium text-slate-600 dark:text-slate-300">
                              All matching students are already assigned to this drive!
                            </p>
                            <p className="text-[11px] mt-1 text-slate-400">
                              Switch the filter to "All Students" or check the "Assigned Students" tab.
                            </p>
                          </div>
                        ) : (
                          <p>No students found for the current department or criteria.</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredManualStudents.map((student) => {
                      const isSelected = manualSelectedIds.includes(student._id);
                      const isAssigningThis = assigningRowId === student._id;

                      return (
                        <tr
                          key={student._id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected
                              ? 'bg-primary-50/50 dark:bg-primary-950/20'
                              : student.isAssigned
                              ? 'bg-slate-50/40 dark:bg-slate-800/20 opacity-80'
                              : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="p-3 text-center">
                            {student.isAssigned ? (
                              <span title="Already assigned to drive">
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleSelectManualRow(student._id)}
                                className="focus:outline-none"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-primary-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                )}
                              </button>
                            )}
                          </td>

                          {/* Register Number */}
                          <td className="p-3 font-mono font-bold text-primary-600 dark:text-primary-400">
                            {student.registerNo}
                          </td>

                          {/* Name and email */}
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {student.email || (student.batch ? `Batch ${student.batch}` : '—')}
                            </div>
                          </td>

                          {/* Department */}
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                              {student.department || '—'}
                            </span>
                          </td>

                          {/* CGPA */}
                          <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {student.cgpa !== null && student.cgpa !== undefined
                              ? Number(student.cgpa).toFixed(2)
                              : '—'}
                          </td>

                          {/* Backlogs */}
                          <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                            {student.backlogs ?? 0}
                          </td>

                          {/* Eligibility Status */}
                          <td className="p-3">
                            {student.isEligible ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Eligible
                              </span>
                            ) : (
                              <div className="flex flex-col items-start gap-0.5">
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 cursor-help"
                                  title={student.ineligibleReasons.join(', ')}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  Ineligible
                                </span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400/90 font-mono truncate max-w-[200px]" title={student.ineligibleReasons.join('; ')}>
                                  {student.ineligibleReasons[0]}
                                  {student.ineligibleReasons.length > 1 && ` (+${student.ineligibleReasons.length - 1})`}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="p-3 text-center">
                            {student.isAssigned ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                Assigned
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAssignSingleStudent(student)}
                                disabled={isAssigningThis || drive.finalized}
                                className="px-3 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1 transition-all mx-auto disabled:opacity-50"
                              >
                                {isAssigningThis ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-3 h-3" />
                                    + Assign
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: Auto-Assign Eligible */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'auto' && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {previewLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                Evaluating criteria against student database...
              </div>
            ) : eligiblePreview ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Eligible in College</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                      {eligiblePreview.totalEligible}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">New to Assign</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                      {eligiblePreview.newToAssignCount}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                    <p className="text-xs text-sky-700 dark:text-sky-400 font-semibold">Already Assigned</p>
                    <p className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1 font-mono">
                      {eligiblePreview.alreadyAssignedCount}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Sample Eligible Students
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Showing up to 10 matching candidates
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5">Reg No</th>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Department</th>
                          <th className="p-2.5 text-center">CGPA</th>
                          <th className="p-2.5 text-center">Backlogs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                        {eligiblePreview.sampleEligible?.map((s) => (
                          <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-primary-600 dark:text-primary-400">
                              {s.registerNo}
                            </td>
                            <td className="p-2.5 font-sans font-medium">{s.name}</td>
                            <td className="p-2.5 font-sans text-slate-500">{s.department}</td>
                            <td className="p-2.5 text-center text-emerald-600 font-bold">{s.cgpa}</td>
                            <td className="p-2.5 text-center text-slate-400">{s.backlogs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleAutoAssign}
                    disabled={assigningAuto || eligiblePreview.newToAssignCount === 0 || drive.finalized}
                    className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {assigningAuto
                      ? 'Assigning Eligible Students...'
                      : `Auto-Assign All ${eligiblePreview.newToAssignCount} Eligible Students`}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: Paste / Upload Register Numbers */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'paste' && (
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Paste or Upload Register Numbers
                </h4>
                <p className="text-[11px] text-slate-400">
                  Accepts newline, comma, or tab separated register numbers (e.g. from scanner or sheet)
                </p>
              </div>

              <label className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors">
                <Download className="w-3.5 h-3.5 rotate-180" />
                Upload CSV / Text
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".csv, .txt"
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={6}
              value={pasteRegNos}
              onChange={(e) => setPasteRegNos(e.target.value)}
              placeholder={`21CS001\n21CS002\n21EC005`}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none uppercase"
            />

            {/* Ineligible Override Checkbox */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="allowIneligiblePaste"
                checked={allowIneligible}
                onChange={(e) => setAllowIneligible(e.target.checked)}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="allowIneligiblePaste" className="text-xs text-amber-800 dark:text-amber-300 cursor-pointer">
                <strong>Allow Ineligible Student Override (Admin Force Assign)</strong>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                  If enabled, students who don't meet minimum CGPA, backlog, or department criteria will still be assigned with an 'Overridden' badge.
                </p>
              </label>
            </div>

            {/* Results Alert Box */}
            {pasteResult && (
              <div className="p-4 rounded-xl border space-y-2 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 animate-fade-in">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-white">Assignment Report</span>
                  {pasteResult.summary && (
                    <span className="text-emerald-600 font-mono">
                      ✓ {pasteResult.summary.newlyAssigned} Added, {pasteResult.summary.alreadyAssigned} Existing
                    </span>
                  )}
                </div>

                {pasteResult.unmatchedRegisterNos?.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    <strong>Unmatched Register Numbers ({pasteResult.unmatchedRegisterNos.length}):</strong>
                    <div className="font-mono mt-1 text-[11px]">
                      {pasteResult.unmatchedRegisterNos.join(', ')}
                    </div>
                  </div>
                )}

                {pasteResult.ineligibleStudents?.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <strong>Ineligible Students ({pasteResult.ineligibleStudents.length}):</strong>
                    <div className="mt-1 text-[11px] space-y-0.5">
                      {pasteResult.ineligibleStudents.map((s, idx) => (
                        <div key={idx} className="font-mono">
                          {s.registerNo} - {s.name} (CGPA: {s.cgpa}, Backlogs: {s.backlogs})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handlePasteAssign}
                disabled={pasteLoading || !pasteRegNos.trim() || drive.finalized}
                className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                {pasteLoading ? 'Resolving & Assigning...' : 'Assign Register Numbers'}
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: Assigned Students Table */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'assigned' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Filter bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={assignedSearch}
                  onChange={(e) => setAssignedSearch(e.target.value)}
                  placeholder="Filter by Reg No or Name..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {distinctAssignedDepts.length > 0 && (
                <select
                  value={assignedDeptFilter}
                  onChange={(e) => setAssignedDeptFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {distinctAssignedDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}

              {assignedSelectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                    {assignedSelectedIds.length} Selected
                  </span>
                  <button
                    onClick={() => setRemoveConfirm({ isOpen: true, isAll: false })}
                    disabled={drive.finalized}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove Selected
                  </button>
                </div>
              )}

              {assignedStudents.length > 0 && assignedSelectedIds.length === 0 && (
                <button
                  onClick={() => setRemoveConfirm({ isOpen: true, isAll: true })}
                  disabled={drive.finalized}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
                >
                  Remove All Assigned
                </button>
              )}
            </div>

            {/* Students Table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button onClick={handleSelectAllAssigned} className="focus:outline-none">
                        {assignedSelectedIds.length === assignedStudents.length && assignedStudents.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-primary-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Reg No</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-center">CGPA</th>
                    <th className="p-3 text-center">Backlogs</th>
                    <th className="p-3 text-center">Eligibility</th>
                    <th className="p-3 text-center">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {assignedLoading ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 font-sans">
                        Loading assigned students...
                      </td>
                    </tr>
                  ) : assignedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-slate-400 font-sans">
                        No students assigned to this drive yet. Use 'Search & Select', 'Auto-Assign', or 'Paste Reg Nos'.
                      </td>
                    </tr>
                  ) : (
                    assignedStudents.map((s) => {
                      const isSelected = assignedSelectedIds.includes(s._id);
                      return (
                        <tr
                          key={s._id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            isSelected ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleSelectAssigned(s._id)}
                              className="focus:outline-none"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 font-bold text-primary-600 dark:text-primary-400">
                            {s.registerNo}
                          </td>
                          <td className="p-3 font-sans font-medium text-slate-900 dark:text-white">
                            {s.name}
                          </td>
                          <td className="p-3 font-sans text-slate-500">{s.department || '—'}</td>
                          <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {s.cgpa}
                          </td>
                          <td className="p-3 text-center text-slate-500">{s.backlogs}</td>
                          <td className="p-3 text-center font-sans">
                            {s.isEligible ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                Eligible
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                                Overridden
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-sans">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                s.attendanceStatus === 'Present'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : s.attendanceStatus === 'Absent'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                  : s.attendanceStatus === 'Late'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                              }`}
                            >
                              {s.attendanceStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-slate-500">
            Total <strong>{allAssignedIds.size || assignedStudents.length}</strong> student(s) currently assigned to this drive
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold"
          >
            Done
          </button>
        </div>
      </div>

      {/* Remove Confirm Modal */}
      <ConfirmModal
        isOpen={removeConfirm.isOpen}
        title={removeConfirm.isAll ? 'Remove All Assigned Students?' : 'Remove Selected Students?'}
        message={
          removeConfirm.isAll
            ? `Are you sure you want to unassign all ${allAssignedIds.size || assignedStudents.length} students from ${drive.company}? Any attendance marked for them in this drive will also be cleared.`
            : `Are you sure you want to unassign ${assignedSelectedIds.length} students from this drive?`
        }
        confirmText="Yes, Remove"
        isDanger={true}
        loading={removeLoading}
        onConfirm={handleRemoveAssigned}
        onCancel={() => setRemoveConfirm({ isOpen: false, isAll: false })}
      />

      {/* Ineligible Override Confirm Modal */}
      <ConfirmModal
        isOpen={overrideConfirm.isOpen}
        title={overrideConfirm.isBulk ? 'Assign Ineligible Students?' : 'Assign Ineligible Student?'}
        message={
          overrideConfirm.isBulk
            ? `${overrideConfirm.ineligibleCount} of the selected student(s) do not satisfy this drive's criteria (CGPA / backlogs / department). Would you like to grant an administrative override and assign them anyway?`
            : `${overrideConfirm.student?.name} (${overrideConfirm.student?.registerNo}) does not meet the drive criteria: ${overrideConfirm.reasons?.join(', ')}. Would you like to grant an administrative override and assign this student anyway?`
        }
        confirmText="Yes, Force Assign"
        isDanger={false}
        loading={Boolean(assigningRowId || assigningManualBulk)}
        onConfirm={() => executeStudentAssignment(overrideConfirm.selectedIds, true)}
        onCancel={() =>
          setOverrideConfirm({
            isOpen: false,
            student: null,
            isBulk: false,
            selectedIds: [],
            ineligibleCount: 0,
            reasons: [],
          })
        }
      />
    </div>
  );
};
