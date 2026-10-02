import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Scan,
  Zap,
  Lock,
  Unlock,
  ClipboardList,
  Search,
  Filter,
  Download,
  Upload,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Square,
  CheckSquare,
  FileText,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

// Web Audio synthesizer for scanner sound feedback
const playFeedbackSound = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'duplicate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // error
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Audio might be blocked without user interaction
  }
};

export const AttendancePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useApp();

  // Drives list & active drive selection
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState(searchParams.get('driveId') || '');
  const [drivesLoading, setDrivesLoading] = useState(true);

  // Attendance sheet data
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Rapid Scanner Box
  const [scanInput, setScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const scanInputRef = useRef(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Multi-select for bulk status change
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [bulkRemark, setBulkRemark] = useState('');

  // Paste Present Modal
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pastePreview, setPastePreview] = useState(null);
  const [pasteProcessing, setPasteProcessing] = useState(false);

  // Finalize Confirm Modal
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  // Load all drives for selector
  useEffect(() => {
    const fetchDrives = async () => {
      setDrivesLoading(true);
      try {
        const res = await api.getDrives({ limit: 100 });
        setDrives(res.drives || []);

        // Default to first drive or query param
        const paramId = searchParams.get('driveId');
        if (paramId) {
          setSelectedDriveId(paramId);
        } else if (res.drives?.length > 0) {
          setSelectedDriveId(res.drives[0]._id);
        }
      } catch (err) {
        addToast('Failed to load placement drives', 'error');
      } finally {
        setDrivesLoading(false);
      }
    };
    fetchDrives();
  }, [searchParams, addToast]);

  // Load attendance sheet when selectedDriveId or filters change
  const fetchAttendanceSheet = useCallback(async () => {
    if (!selectedDriveId) return;
    setLoading(true);
    try {
      const res = await api.getDriveAttendance(selectedDriveId, {
        search,
        status: statusFilter,
        department: departmentFilter,
      });
      setAttendanceData(res);
    } catch (err) {
      addToast(err.message || 'Failed to load attendance sheet', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDriveId, search, statusFilter, departmentFilter, addToast]);

  useEffect(() => {
    fetchAttendanceSheet();
  }, [fetchAttendanceSheet]);

  const handleDriveChange = (id) => {
    setSelectedDriveId(id);
    setSearchParams({ driveId: id });
    setSelectedStudentIds([]);
    setScanFeedback(null);
  };

  // --- Rapid Entry Box: Type Reg No + Enter ---
  const handleRapidScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanInput.trim() || !selectedDriveId) return;

    const regNo = scanInput.trim().toUpperCase();
    setScanInput('');

    try {
      const res = await api.rapidScanAttendance(selectedDriveId, {
        registerNo: regNo,
        status: 'Present',
      });

      if (res.isDuplicateScan) {
        if (soundEnabled) playFeedbackSound('duplicate');
        setScanFeedback({
          type: 'warning',
          message: res.message,
          student: res.student,
        });
      } else {
        if (soundEnabled) playFeedbackSound('success');
        setScanFeedback({
          type: 'success',
          message: res.message,
          student: res.student,
        });
      }

      fetchAttendanceSheet();
    } catch (err) {
      if (soundEnabled) playFeedbackSound('error');
      setScanFeedback({
        type: 'error',
        message: err.message || `Error scanning ${regNo}`,
      });
    }

    // Keep focus on rapid scanner
    scanInputRef.current?.focus();
  };

  // --- Single Student Status Toggle ---
  const handleSetStudentStatus = async (studentId, status, remark = '') => {
    if (attendanceData?.finalized) {
      addToast('Drive attendance is finalized and locked.', 'warning');
      return;
    }

    try {
      await api.bulkUpdateAttendance(selectedDriveId, {
        studentIds: [studentId],
        status,
        remark,
      });

      // Optimistic UI update
      setAttendanceData((prev) => {
        if (!prev) return prev;
        const updated = prev.students.map((s) =>
          s.studentId === studentId ? { ...s, status, remark } : s
        );

        // Recalculate stats
        let p = 0, a = 0, l = 0, u = 0;
        updated.forEach((r) => {
          if (r.status === 'Present') p++;
          else if (r.status === 'Absent') a++;
          else if (r.status === 'Late') l++;
          else u++;
        });

        return {
          ...prev,
          students: updated,
          stats: {
            ...prev.stats,
            presentCount: p,
            absentCount: a,
            lateCount: l,
            unmarkedCount: u,
            attendancePct: prev.stats.totalAssigned > 0 ? Math.round(((p + l) / prev.stats.totalAssigned) * 100) : 0,
          },
        };
      });
    } catch (err) {
      addToast(err.message || 'Failed to update attendance', 'error');
    }
  };

  // --- Mark All Present / Absent ---
  const handleMarkAll = async (status) => {
    if (attendanceData?.finalized) return;
    try {
      const res = await api.markAllAttendance(selectedDriveId, status);
      addToast(res.message || `All assigned students marked as ${status}`, 'success');
      fetchAttendanceSheet();
    } catch (err) {
      addToast(err.message || 'Failed to update attendance', 'error');
    }
  };

  // --- Bulk Status Change for Selected Rows ---
  const handleApplyBulkStatus = async () => {
    if (selectedStudentIds.length === 0) return;
    try {
      await api.bulkUpdateAttendance(selectedDriveId, {
        studentIds: selectedStudentIds,
        status: bulkStatus,
        remark: bulkRemark,
      });
      addToast(`Updated ${selectedStudentIds.length} students to ${bulkStatus}`, 'success');
      setSelectedStudentIds([]);
      setBulkRemark('');
      fetchAttendanceSheet();
    } catch (err) {
      addToast(err.message || 'Bulk update failed', 'error');
    }
  };

  // --- Paste Present Register Numbers Flow ---
  const handlePreviewPaste = async () => {
    const numbers = pasteInput
      .split(/[\n,\s\t]+/)
      .map((n) => n.trim().toUpperCase())
      .filter(Boolean);

    if (numbers.length === 0) {
      addToast('Please enter at least one register number', 'warning');
      return;
    }

    setPasteProcessing(true);
    try {
      const res = await api.pastePresentRegisterNos(selectedDriveId, numbers, false); // preview only
      setPastePreview(res.preview);
    } catch (err) {
      addToast(err.message || 'Failed to evaluate pasted numbers', 'error');
    } finally {
      setPasteProcessing(false);
    }
  };

  const handleCommitPaste = async () => {
    const numbers = pasteInput
      .split(/[\n,\s\t]+/)
      .map((n) => n.trim().toUpperCase())
      .filter(Boolean);

    setPasteProcessing(true);
    try {
      const res = await api.pastePresentRegisterNos(selectedDriveId, numbers, true); // commit
      addToast(res.message || 'Attendance updated from pasted list', 'success');
      setShowPasteModal(false);
      setPasteInput('');
      setPastePreview(null);
      fetchAttendanceSheet();
    } catch (err) {
      addToast(err.message || 'Failed to save attendance', 'error');
    } finally {
      setPasteProcessing(false);
    }
  };

  // --- Finalize Attendance & Open Report Preview ---
  const handleFinalizeAttendance = async () => {
    setFinalizeLoading(true);
    try {
      const res = await api.finalizeAttendance(selectedDriveId);
      addToast(res.message || 'Attendance finalized & locked', 'success');
      setShowFinalizeModal(false);
      fetchAttendanceSheet();
      // Navigate to reports preview
      navigate(`/reports?driveId=${selectedDriveId}`);
    } catch (err) {
      addToast(err.message || 'Failed to finalize attendance', 'error');
    } finally {
      setFinalizeLoading(false);
    }
  };

  // --- Unlock Attendance (Admin) ---
  const handleUnlockAttendance = async () => {
    try {
      const res = await api.unlockAttendance(selectedDriveId);
      addToast(res.message || 'Attendance unlocked for editing', 'info');
      fetchAttendanceSheet();
    } catch (err) {
      addToast(err.message || 'Failed to unlock attendance', 'error');
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (!attendanceData?.students) return;
    if (selectedStudentIds.length === attendanceData.students.length && attendanceData.students.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(attendanceData.students.map((s) => s.studentId));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const currentDrive = drives.find((d) => d._id === selectedDriveId);
  const isFinalized = Boolean(attendanceData?.finalized);
  const stats = attendanceData?.stats || {
    totalAssigned: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    unmarkedCount: 0,
    attendancePct: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Active Drive Selector & Status Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Session Attendance
              </h1>
              <p className="text-xs text-slate-500">
                Mark checklist, rapid scan barcode, or bulk import attendance for placement drives
              </p>
            </div>
          </div>

          {/* Drive Selector Dropdown */}
          <div className="flex items-center gap-3">
            <div className="w-full sm:w-72">
              <select
                value={selectedDriveId}
                onChange={(e) => handleDriveChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                {drives.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.company} - {d.role} ({d.packageLpa} LPA) {d.finalized ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>

            {isFinalized ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Finalized & Locked
                </span>
                <button
                  onClick={handleUnlockAttendance}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                  title="Unlock Attendance"
                >
                  <Unlock className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowFinalizeModal(true)}
                disabled={stats.totalAssigned === 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                Finalize & Generate Report
              </button>
            )}
          </div>
        </div>

        {/* 5 Real-Time Attendance Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Assigned
            </span>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">
              {stats.totalAssigned}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Present
            </span>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
              {stats.presentCount}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Absent
            </span>
            <p className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5 font-mono">
              {stats.absentCount}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Late
            </span>
            <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
              {stats.lateCount}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Unmarked
            </span>
            <p className="text-xl font-black text-slate-400 mt-0.5 font-mono">
              {stats.unmarkedCount}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800">
            <span className="text-[11px] font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wider">
              Attendance %
            </span>
            <p className="text-xl font-black text-primary-700 dark:text-primary-300 mt-0.5 font-mono">
              {stats.attendancePct}%
            </p>
          </div>
        </div>
      </div>

      {/* RAPID SCANNER BAR & BULK ACTION BAR */}
      {!isFinalized && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1 & 2: Rapid Scanner Box */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-primary-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Rapid Barcode / Scanner Entry Box
                </h3>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1 rounded-lg text-xs flex items-center gap-1 ${
                  soundEnabled
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title={soundEnabled ? 'Mute Scanner Chime' : 'Enable Scanner Chime'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{soundEnabled ? 'Audio Chime ON' : 'Muted'}</span>
              </button>
            </div>

            <form onSubmit={handleRapidScanSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan barcode or type Reg No & press ENTER (e.g. 21CS001)..."
                  className="w-full px-4 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none uppercase"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                Mark Present
              </button>
            </form>

            {/* Live Scan Visual Feedback Banner */}
            {scanFeedback && (
              <div
                className={`mt-3 p-2.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
                  scanFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : scanFeedback.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {scanFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {scanFeedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  {scanFeedback.type === 'error' && <XCircle className="w-4 h-4 text-rose-500" />}
                  <span>{scanFeedback.message}</span>
                </div>
                <button
                  onClick={() => setScanFeedback(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Column 3: Bulk Actions (Mark All, Paste Sheet) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Bulk Attendance Shortcuts
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleMarkAll('Present')}
                className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark All Present
              </button>

              <button
                onClick={() => handleMarkAll('Absent')}
                className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Mark All Absent
              </button>
            </div>

            <button
              onClick={() => {
                setShowPasteModal(true);
                setPasteInput('');
                setPastePreview(null);
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5 text-primary-500" />
              Paste / Upload Scanner Sheet
            </button>
          </div>
        </div>
      )}

      {/* Floating Multi-Select Toolbar */}
      {selectedStudentIds.length > 0 && !isFinalized && (
        <div className="sticky top-20 z-20 p-3.5 rounded-2xl bg-primary-600 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold pl-2">
            <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              {selectedStudentIds.length}
            </span>
            <span>Students Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-white text-slate-900 font-semibold focus:outline-none"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>

            <input
              type="text"
              value={bulkRemark}
              onChange={(e) => setBulkRemark(e.target.value)}
              placeholder="Optional remark (e.g. excused)..."
              className="px-3 py-1.5 text-xs rounded-xl bg-white/20 placeholder-white/70 text-white focus:outline-none w-48"
            />

            <button
              onClick={handleApplyBulkStatus}
              className="px-3 py-1.5 rounded-xl bg-white text-primary-700 font-bold text-xs hover:bg-white/90 transition-colors"
            >
              Apply Status
            </button>

            <button
              onClick={() => setSelectedStudentIds([])}
              className="px-2 py-1 text-xs text-white/80 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ATTENDANCE CHECKLIST TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Reg No or Name in sheet..."
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Unmarked">Unmarked</option>
            </select>

            {/* Department Filter */}
            <input
              type="text"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              placeholder="Filter Department..."
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none w-36"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button onClick={handleSelectAll} className="focus:outline-none">
                    {attendanceData?.students?.length > 0 &&
                    selectedStudentIds.length === attendanceData.students.length ? (
                      <CheckSquare className="w-4 h-4 text-primary-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-3">Reg No</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Department</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Remark</th>
                <th className="p-3 text-right">Instant Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 font-sans">
                    Loading attendance records...
                  </td>
                </tr>
              ) : !attendanceData?.students || attendanceData.students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400 font-sans">
                    No assigned students found for this drive. Please assign students in 'Drives' tab first.
                  </td>
                </tr>
              ) : (
                attendanceData.students.map((row) => {
                  const isSelected = selectedStudentIds.includes(row.studentId);
                  return (
                    <tr
                      key={row.studentId}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleSelect(row.studentId)}
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
                        {row.registerNo}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-900 dark:text-white">
                        {row.name}
                      </td>
                      <td className="p-3 font-sans text-slate-500">{row.department || '—'}</td>
                      <td className="p-3 text-center font-sans">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : row.status === 'Absent'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : row.status === 'Late'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-slate-400 text-[11px] truncate max-w-xs">
                        {row.remark || '—'}
                      </td>
                      <td className="p-3 text-right font-sans">
                        {!isFinalized ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSetStudentStatus(row.studentId, 'Present')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                row.status === 'Present'
                                  ? 'bg-emerald-600 text-white'
                                  : 'border border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600'
                              }`}
                            >
                              P
                            </button>
                            <button
                              onClick={() => handleSetStudentStatus(row.studentId, 'Absent')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                row.status === 'Absent'
                                  ? 'bg-rose-600 text-white'
                                  : 'border border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600'
                              }`}
                            >
                              A
                            </button>
                            <button
                              onClick={() => handleSetStudentStatus(row.studentId, 'Late')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                row.status === 'Late'
                                  ? 'bg-amber-600 text-white'
                                  : 'border border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600'
                              }`}
                            >
                              L
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Locked</span>
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

      {/* PASTE / SCANNER SHEET MODAL */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Paste Present Register Numbers
                </h3>
              </div>
              <button onClick={() => setShowPasteModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste the list of present students from an external scanner or physical check-in sheet. Those pasted will be marked <strong>Present</strong>, and all other assigned students will automatically be marked <strong>Absent</strong>.
            </p>

            <textarea
              rows={6}
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder={`21CS001\n21CS002\n21IT005`}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />

            {pastePreview && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">Preview Before Saving:</div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Present Count:</span>
                  <span>{pastePreview.presentCount} students</span>
                </div>
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Absent Count:</span>
                  <span>{pastePreview.absentCount} students</span>
                </div>
                {pastePreview.unmatchedCount > 0 && (
                  <div className="text-amber-600 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                    ⚠ {pastePreview.unmatchedCount} numbers not assigned to this drive (will be ignored).
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>

              {!pastePreview ? (
                <button
                  type="button"
                  onClick={handlePreviewPaste}
                  disabled={pasteProcessing || !pasteInput.trim()}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {pasteProcessing ? 'Checking...' : 'Preview Changes'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCommitPaste}
                  disabled={pasteProcessing}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {pasteProcessing ? 'Saving...' : 'Confirm & Save Attendance'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FINALIZE & LOCK MODAL */}
      <ConfirmModal
        isOpen={showFinalizeModal}
        title="Finalize Attendance & Lock Drive?"
        message={`Are you sure you want to finalize attendance for ${currentDrive?.company}? Any currently unmarked students will automatically be marked Absent. Attendance will be locked, and the official report preview will open.`}
        confirmText="Yes, Finalize & Lock"
        isDanger={false}
        loading={finalizeLoading}
        onConfirm={handleFinalizeAttendance}
        onCancel={() => setShowFinalizeModal(false)}
      />
    </div>
  );
};
