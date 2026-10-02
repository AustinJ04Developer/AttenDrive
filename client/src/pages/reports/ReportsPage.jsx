import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Building,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Eye,
  Settings,
  ChevronDown,
  UserX,
  PieChart as PieIcon,
  BarChart as BarIcon,
  Layers,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  generateDriveReportPDF,
  generateDepartmentSummaryPDF,
  generateConsolidatedReportPDF,
  generateStudentHistoryPDF,
} from '../../utils/pdfGenerator';

const STATUS_COLORS = {
  Present: '#10b981',
  Absent: '#f43f5e',
  Late: '#f59e0b',
  Unmarked: '#94a3b8',
};

export const ReportsPage = () => {
  const [searchParams] = useSearchParams();
  const {
    addToast,
    settings: appSettings,
    branding: appBranding,
    signatories: appSignatories,
    departments: appDepartments,
  } = useApp();

  // Active Report Type: 'drive' | 'absentees' | 'student' | 'department' | 'consolidated'
  const [activeTab, setActiveTab] = useState('drive');

  // Drives list for dropdown selection
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState(searchParams.get('driveId') || '');

  // Report Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Student history search
  const [studentSearchReg, setStudentSearchReg] = useState('');
  const [studentHistoryData, setStudentHistoryData] = useState(null);

  // Department summary data
  const [deptSummaryData, setDeptSummaryData] = useState(null);

  // Consolidated multi-drive data
  const [consolidatedData, setConsolidatedData] = useState(null);

  // Resolve institutional settings from active report data or fallback to app global settings
  const activeSettings =
    (activeTab === 'department'
      ? deptSummaryData?.settings
      : activeTab === 'consolidated'
      ? consolidatedData?.settings
      : activeTab === 'student'
      ? studentHistoryData?.settings
      : reportData?.settings) || appSettings;

  const branding = activeSettings?.college_branding || appBranding || {};
  const signatories = activeSettings?.report_signatories || appSignatories || {};

  // Export / Print Options
  const [orientation, setOrientation] = useState('portrait');
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeRemarks, setIncludeRemarks] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Sync orientation with institutional settings
  useEffect(() => {
    if (activeSettings?.default_orientation) {
      setOrientation(activeSettings.default_orientation);
    }
  }, [activeSettings?.default_orientation]);

  // Load drives on mount
  useEffect(() => {
    const fetchDrives = async () => {
      try {
        const res = await api.getDrives({ limit: 100 });
        setDrives(res.drives || []);

        const paramId = searchParams.get('driveId');
        if (paramId) {
          setSelectedDriveId(paramId);
        } else if (res.drives?.length > 0) {
          setSelectedDriveId(res.drives[0]._id);
        }
      } catch (err) {
        addToast('Failed to load drives', 'error');
      }
    };
    fetchDrives();
  }, [searchParams, addToast]);

  // Fetch report data when selected drive or active tab changes
  useEffect(() => {
    const fetchReport = async () => {
      if (activeTab === 'drive' && selectedDriveId) {
        setLoading(true);
        try {
          const res = await api.getDriveReport(selectedDriveId);
          setReportData(res);
        } catch (err) {
          addToast(err.message || 'Failed to generate report', 'error');
        } finally {
          setLoading(false);
        }
      } else if (activeTab === 'absentees' && selectedDriveId) {
        setLoading(true);
        try {
          const res = await api.getAbsenteesReport(selectedDriveId);
          setReportData(res);
        } catch (err) {
          addToast(err.message || 'Failed to generate absentees report', 'error');
        } finally {
          setLoading(false);
        }
      } else if (activeTab === 'department') {
        setLoading(true);
        try {
          const res = await api.getDepartmentSummaryReport();
          setDeptSummaryData(res);
        } catch (err) {
          addToast(err.message || 'Failed to load department summary', 'error');
        } finally {
          setLoading(false);
        }
      } else if (activeTab === 'consolidated') {
        setLoading(true);
        try {
          const res = await api.getConsolidatedReport();
          setConsolidatedData(res);
        } catch (err) {
          addToast(err.message || 'Failed to load consolidated report', 'error');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchReport();
  }, [activeTab, selectedDriveId, addToast]);

  // Handle student history search
  const handleStudentSearch = async (e) => {
    e.preventDefault();
    if (!studentSearchReg.trim()) return;

    setLoading(true);
    try {
      // Find student by register number first
      const studentRes = await api.getStudents({ search: studentSearchReg.trim(), limit: 1 });
      if (!studentRes.students || studentRes.students.length === 0) {
        addToast(`Student '${studentSearchReg}' not found`, 'error');
        setLoading(false);
        return;
      }

      const studentId = studentRes.students[0]._id;
      const historyRes = await api.getStudentHistoryReport(studentId);
      setStudentHistoryData(historyRes);
    } catch (err) {
      addToast(err.message || 'Failed to fetch student attendance history', 'error');
    } finally {
      setLoading(false);
    }
  };

  // PDF Export across all report types
  const handleDownloadPDF = () => {
    try {
      if (activeTab === 'drive' || activeTab === 'absentees') {
        if (!reportData) {
          addToast('Please select a placement drive first', 'warning');
          return;
        }
        generateDriveReportPDF({
          reportData: { ...reportData, settings: activeSettings },
          options: {
            orientation,
            includeSignatures,
            includeRemarks,
            includeCharts,
            departmentFilter: deptFilter,
            statusFilter,
          },
        });
      } else if (activeTab === 'department') {
        if (!deptSummaryData?.departments?.length) {
          addToast('No department summary data loaded', 'warning');
          return;
        }
        generateDepartmentSummaryPDF({
          summaryData: deptSummaryData,
          settings: activeSettings,
          options: { orientation },
        });
      } else if (activeTab === 'consolidated') {
        if (!consolidatedData?.drives?.length) {
          addToast('No consolidated drives data loaded', 'warning');
          return;
        }
        generateConsolidatedReportPDF({
          consolidatedData,
          settings: activeSettings,
          options: { orientation },
        });
      } else if (activeTab === 'student') {
        if (!studentHistoryData) {
          addToast('Please search for a student register number first', 'warning');
          return;
        }
        generateStudentHistoryPDF({
          studentData: studentHistoryData,
          settings: activeSettings,
          options: { orientation },
        });
      }
      addToast('Official PDF report downloaded successfully', 'success');
    } catch (err) {
      addToast('Failed to generate PDF: ' + err.message, 'error');
    }
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData?.students) return;
    const headers = ['S.No', 'Register No', 'Name', 'Department', 'Batch', 'Status', 'Remark'];
    const rows = reportData.students.map((s, idx) => [
      idx + 1,
      `"${s.registerNo}"`,
      `"${s.name}"`,
      `"${s.department}"`,
      `"${s.batch}"`,
      s.status,
      `"${s.remark || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `DriveAttendance_${reportData.drive.company}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recharts Chart Data
  const chartData = reportData?.summary
    ? [
        { name: 'Present', value: reportData.summary.presentCount, color: '#10b981' },
        { name: 'Absent', value: reportData.summary.absentCount, color: '#f43f5e' },
        { name: 'Late', value: reportData.summary.lateCount, color: '#f59e0b' },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Report Navigation Tabs */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Official Placement Reports
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Generate print-ready A4 documentation, absentees rosters, and college summaries
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/25 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5 Report Type Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          {[
            { id: 'drive', label: '1. Drive Attendance Report', icon: FileText },
            { id: 'absentees', label: '2. Absentees List', icon: UserX },
            { id: 'student', label: '3. Student History', icon: Users },
            { id: 'department', label: '4. Department Summary', icon: BarIcon },
            { id: 'consolidated', label: '5. Consolidated Report', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-500/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Controls Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          {/* Drive Selector (for Drive and Absentees tabs) */}
          {(activeTab === 'drive' || activeTab === 'absentees') && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Drive:</span>
              <select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {drives.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.company} - {d.role} ({d.packageLpa} LPA)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Search (for Student History tab) */}
          {activeTab === 'student' && (
            <form onSubmit={handleStudentSearch} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Register No:</span>
              <input
                type="text"
                value={studentSearchReg}
                onChange={(e) => setStudentSearchReg(e.target.value)}
                placeholder="e.g. 21CSA030..."
                className="px-3 py-1.5 text-xs uppercase font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary-600 text-white"
              >
                Search History
              </button>
            </form>
          )}

          {/* Report Options Controls */}
          {activeTab === 'drive' && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-primary-600"
                />
                <span>Signature Column</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRemarks}
                  onChange={(e) => setIncludeRemarks(e.target.checked)}
                  className="rounded text-primary-600"
                />
                <span>Remarks</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="rounded text-primary-600"
                />
                <span>Visual Chart</span>
              </label>

              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* A4 PRINT & PREVIEW CANVAS */}
      <div className="flex justify-center">
        <div
          className="print-area bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full min-h-[1100px] flex flex-col justify-between relative overflow-hidden"
          style={
            branding?.headerMode === 'full_page' && branding?.fullPageLetterhead
              ? {
                  backgroundImage: `url(${branding.fullPageLetterhead})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                }
              : {}
          }
        >
          <div>
            {/* Header: Full A4 Page Template Mode */}
            {branding?.headerMode === 'full_page' && branding?.fullPageLetterhead ? (
              <div className="pt-24 pb-4 text-center">
                <span className="inline-block px-3 py-1 bg-white/90 backdrop-blur-xs text-slate-900 font-bold text-xs uppercase tracking-wider rounded-md border border-slate-300 shadow-xs">
                  {activeTab === 'absentees'
                    ? 'OFFICIAL ABSENTEES ROSTER'
                    : activeTab === 'department'
                    ? 'DEPARTMENT-WISE ATTENDANCE SUMMARY'
                    : activeTab === 'consolidated'
                    ? 'CONSOLIDATED PLACEMENT DRIVES REPORT'
                    : activeTab === 'student'
                    ? 'STUDENT ATTENDANCE HISTORY'
                    : 'PLACEMENT DRIVE ATTENDANCE REPORT'}
                </span>
              </div>
            ) : branding?.headerMode === 'preprinted' ? (
              /* Header: Pre-Printed Physical Paper Mode (Blank space reserved) */
              <div
                style={{ height: `${(branding?.preprintedMarginTop || 45) * 3.78}px` }}
                className="flex items-center justify-center border-b-2 border-dashed border-amber-300 pb-2 mb-4"
              >
                <div className="no-print text-center px-4 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-mono">
                  [ Blank space ({branding?.preprintedMarginTop || 45}mm) reserved for physical pre-printed letterhead paper • Hidden during printing ]
                </div>
              </div>
            ) : (branding?.headerMode === 'banner' || branding?.headerMode === 'letterhead') && branding?.letterheadImage ? (
              /* Header: Banner Image Mode */
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-2">
                <div className="w-full flex items-center justify-center py-1">
                  <img
                    src={branding.letterheadImage}
                    alt="College Letterhead"
                    className="max-h-28 w-auto max-w-full object-contain mx-auto"
                  />
                </div>
                <div className="pt-1">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-md border border-slate-300">
                    {activeTab === 'absentees'
                      ? 'OFFICIAL ABSENTEES ROSTER'
                      : activeTab === 'department'
                      ? 'DEPARTMENT-WISE ATTENDANCE SUMMARY'
                      : activeTab === 'consolidated'
                      ? 'CONSOLIDATED PLACEMENT DRIVES REPORT'
                      : activeTab === 'student'
                      ? 'STUDENT ATTENDANCE HISTORY'
                      : 'PLACEMENT DRIVE ATTENDANCE REPORT'}
                  </span>
                </div>
              </div>
            ) : (
              /* Header: Structured Details + Emblem */
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                {branding?.logo && (
                  <div className="flex justify-center pb-1">
                    <img
                      src={branding.logo}
                      alt="College Emblem"
                      className="h-14 w-auto object-contain mx-auto"
                    />
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 font-serif">
                  {branding?.collegeName || 'National Institute of Technology & Engineering'}
                </h2>
                <p className="text-xs text-slate-600">
                  {branding?.address || 'University Campus, Knowledge City - 560001'}
                </p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-md border border-slate-300">
                    {activeTab === 'absentees'
                      ? 'OFFICIAL ABSENTEES ROSTER'
                      : activeTab === 'department'
                      ? 'DEPARTMENT-WISE ATTENDANCE SUMMARY'
                      : activeTab === 'consolidated'
                      ? 'CONSOLIDATED PLACEMENT DRIVES REPORT'
                      : activeTab === 'student'
                      ? 'STUDENT ATTENDANCE HISTORY'
                      : 'PLACEMENT DRIVE ATTENDANCE REPORT'}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 1: MAIN DRIVE ATTENDANCE REPORT */}
            {activeTab === 'drive' && reportData && (
              <div className="mt-6 space-y-6">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Company</span>
                    <p className="font-bold text-slate-900">{reportData.drive?.company}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Job Role</span>
                    <p className="font-bold text-slate-900">{reportData.drive?.role || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Package</span>
                    <p className="font-bold text-slate-900">{reportData.drive?.packageLpa} LPA</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Date & Venue</span>
                    <p className="font-bold text-slate-900">
                      {reportData.drive?.driveDate ? new Date(reportData.drive.driveDate).toLocaleDateString() : 'TBD'}{' '}
                      • {reportData.drive?.venueMode}
                    </p>
                  </div>
                </div>

                {/* Summary Metrics & Chart */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold">Assigned</span>
                      <p className="text-xl font-bold font-mono">{reportData.summary?.totalAssigned}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                      <span className="font-semibold">Present</span>
                      <p className="text-xl font-bold font-mono">{reportData.summary?.presentCount}</p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
                      <span className="font-semibold">Absent</span>
                      <p className="text-xl font-bold font-mono">{reportData.summary?.absentCount}</p>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-xl border border-primary-200 text-primary-800">
                      <span className="font-semibold">Attendance %</span>
                      <p className="text-xl font-bold font-mono">{reportData.summary?.attendancePct}%</p>
                    </div>
                  </div>

                  {/* Visual Chart */}
                  {includeCharts && chartData.length > 0 && (
                    <div className="h-28 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Department-Wise Summary Table */}
                {reportData.departmentSummary?.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Department-Wise Summary
                    </h3>
                    <table className="w-full text-left border-collapse text-xs border border-slate-300">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-2">Department</th>
                          <th className="p-2 text-center">Assigned</th>
                          <th className="p-2 text-center">Present</th>
                          <th className="p-2 text-center">Absent</th>
                          <th className="p-2 text-center">Late</th>
                          <th className="p-2 text-center">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        {reportData.departmentSummary.map((d, i) => (
                          <tr key={i}>
                            <td className="p-2 font-sans font-medium">{d.department}</td>
                            <td className="p-2 text-center">{d.assigned}</td>
                            <td className="p-2 text-center text-emerald-600 font-bold">{d.present}</td>
                            <td className="p-2 text-center text-rose-600">{d.absent}</td>
                            <td className="p-2 text-center text-amber-600">{d.late}</td>
                            <td className="p-2 text-center font-bold text-slate-800">{d.attendancePct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Main Attendance Table */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Candidate Attendance Checklist
                  </h3>
                  <table className="w-full text-left border-collapse text-xs border border-slate-300">
                    <thead className="bg-slate-900 text-white font-bold border-b border-slate-900">
                      <tr>
                        <th className="p-2 text-center w-10">S.No</th>
                        <th className="p-2">Reg No</th>
                        <th className="p-2">Student Name</th>
                        <th className="p-2">Department</th>
                        <th className="p-2 text-center">Status</th>
                        {includeRemarks && <th className="p-2">Remarks</th>}
                        {includeSignatures && <th className="p-2 text-center w-28">Signature</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                      {reportData.students?.map((s, idx) => (
                        <tr key={s.studentId} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-sans text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">{s.registerNo}</td>
                          <td className="p-2 font-sans font-medium">{s.name}</td>
                          <td className="p-2 font-sans text-slate-600">{s.department || '—'}</td>
                          <td className="p-2 text-center font-sans font-bold">
                            <span
                              className={
                                s.status === 'Present'
                                  ? 'text-emerald-700'
                                  : s.status === 'Absent'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }
                            >
                              {s.status}
                            </span>
                          </td>
                          {includeRemarks && (
                            <td className="p-2 font-sans text-slate-500 text-[10px]">{s.remark || '—'}</td>
                          )}
                          {includeSignatures && (
                            <td className="p-2 text-center border-l border-slate-200"></td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Separate Absentees List at the End */}
                {reportData.absentees?.length > 0 && (
                  <div className="space-y-1.5 pt-4 page-break-before">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <UserX className="w-3.5 h-3.5" />
                      Official Absentees Summary ({reportData.absentees.length} Absentees)
                    </h3>
                    <table className="w-full text-left border-collapse text-xs border border-rose-300">
                      <thead className="bg-rose-900 text-white font-bold">
                        <tr>
                          <th className="p-2 text-center w-10">S.No</th>
                          <th className="p-2">Reg No</th>
                          <th className="p-2">Student Name</th>
                          <th className="p-2">Department</th>
                          <th className="p-2">Batch</th>
                          <th className="p-2">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 font-mono text-[11px]">
                        {reportData.absentees.map((a, idx) => (
                          <tr key={idx} className="bg-rose-50/40">
                            <td className="p-2 text-center font-sans text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-rose-900">{a.registerNo}</td>
                            <td className="p-2 font-sans font-medium text-slate-900">{a.name}</td>
                            <td className="p-2 font-sans text-slate-600">{a.department}</td>
                            <td className="p-2 font-sans text-slate-500">{a.batch}</td>
                            <td className="p-2 font-sans text-slate-500 text-[10px]">{a.remark || 'Absent'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ABSENTEES LIST REPORT */}
            {activeTab === 'absentees' && reportData && (
              <div className="mt-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex justify-between items-center">
                  <div>
                    <strong>Company:</strong> {reportData.drive?.company} • {reportData.drive?.role}
                  </div>
                  <div className="font-bold text-base font-mono">
                    Total Absentees: {reportData.totalAbsent}
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead className="bg-rose-950 text-white font-bold">
                    <tr>
                      <th className="p-2 text-center w-10">S.No</th>
                      <th className="p-2">Register No</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Department</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Absence Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {reportData.absentees?.map((a, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-center font-sans text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-bold text-rose-900">{a.registerNo}</td>
                        <td className="p-2 font-sans font-medium text-slate-900">{a.name}</td>
                        <td className="p-2 font-sans text-slate-600">{a.department}</td>
                        <td className="p-2 font-sans text-slate-500">{a.email || '—'}</td>
                        <td className="p-2 text-slate-600">{a.phone || '—'}</td>
                        <td className="p-2 font-sans text-slate-500">{a.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: STUDENT ATTENDANCE HISTORY */}
            {activeTab === 'student' && studentHistoryData && (
              <div className="mt-6 space-y-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Student Name</span>
                    <p className="font-bold text-slate-900 text-sm">{studentHistoryData.student?.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Register No</span>
                    <p className="font-bold text-primary-700 font-mono">{studentHistoryData.student?.registerNo}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Department</span>
                    <p className="font-bold text-slate-900">{studentHistoryData.student?.department}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Overall Attendance %</span>
                    <p className="font-black text-emerald-700 font-mono text-base">
                      {studentHistoryData.metrics?.overallPct}%
                    </p>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2">Company</th>
                      <th className="p-2">Role</th>
                      <th className="p-2 text-center">Package</th>
                      <th className="p-2">Date</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {studentHistoryData.history?.map((h, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-sans font-bold text-slate-900">{h.company}</td>
                        <td className="p-2 font-sans text-slate-600">{h.role}</td>
                        <td className="p-2 text-center font-bold text-emerald-600">{h.packageLpa} LPA</td>
                        <td className="p-2">{h.driveDate ? new Date(h.driveDate).toLocaleDateString() : '—'}</td>
                        <td className="p-2 text-center font-sans font-bold">
                          <span
                            className={
                              h.status === 'Present'
                                ? 'text-emerald-700'
                                : h.status === 'Absent'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }
                          >
                            {h.status}
                          </span>
                        </td>
                        <td className="p-2 font-sans text-slate-500">{h.remark || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: DEPARTMENT SUMMARY */}
            {activeTab === 'department' && deptSummaryData && (
              <div className="mt-6 space-y-6">
                <div className="text-xs text-slate-500 font-medium">
                  Aggregated across all {deptSummaryData.totalDrives} placement sessions.
                </div>

                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2">Academic Department</th>
                      <th className="p-2 text-center">Total Sessions</th>
                      <th className="p-2 text-center">Present</th>
                      <th className="p-2 text-center">Absent</th>
                      <th className="p-2 text-center">Late</th>
                      <th className="p-2 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {deptSummaryData.departments?.map((d, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-sans font-bold text-slate-900">{d.department}</td>
                        <td className="p-2 text-center">{d.totalSessions}</td>
                        <td className="p-2 text-center text-emerald-600 font-bold">{d.present}</td>
                        <td className="p-2 text-center text-rose-600">{d.absent}</td>
                        <td className="p-2 text-center text-amber-600">{d.late}</td>
                        <td className="p-2 text-center font-black text-slate-900">{d.attendancePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: CONSOLIDATED MULTI-DRIVE REPORT */}
            {activeTab === 'consolidated' && consolidatedData && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-center font-mono">
                  <div>
                    <span className="text-slate-400 font-sans font-semibold">Total Drives</span>
                    <p className="text-xl font-bold">{consolidatedData.metrics?.totalDrives}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans font-semibold">Total Assigned</span>
                    <p className="text-xl font-bold">{consolidatedData.metrics?.totalAssigned}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans font-semibold">Total Present</span>
                    <p className="text-xl font-bold text-emerald-600">{consolidatedData.metrics?.totalPresent}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans font-semibold">Overall Attendance %</span>
                    <p className="text-xl font-black text-primary-700">{consolidatedData.metrics?.overallPct}%</p>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs border border-slate-300">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2">Company</th>
                      <th className="p-2">Date</th>
                      <th className="p-2 text-center">Package</th>
                      <th className="p-2 text-center">Assigned</th>
                      <th className="p-2 text-center">Present</th>
                      <th className="p-2 text-center">Absent</th>
                      <th className="p-2 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {consolidatedData.drives?.map((d) => (
                      <tr key={d._id}>
                        <td className="p-2 font-sans font-bold">{d.company}</td>
                        <td className="p-2 font-sans">{d.driveDate ? new Date(d.driveDate).toLocaleDateString() : '—'}</td>
                        <td className="p-2 text-center font-bold text-emerald-600">{d.packageLpa} LPA</td>
                        <td className="p-2 text-center">{d.assigned}</td>
                        <td className="p-2 text-center text-emerald-600">{d.present}</td>
                        <td className="p-2 text-center text-rose-600">{d.absent}</td>
                        <td className="p-2 text-center font-bold">{d.attendancePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* OFFICIAL SIGNATURE FOOTER (Page footer on physical paper) */}
          {includeSignatures && (
            <div className="mt-12 pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="h-10"></div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  {signatories?.officer || 'Placement Officer'}
                </div>
                <div className="text-[10px] text-slate-400">Placement & Training Cell</div>
              </div>

              <div>
                <div className="h-10"></div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  {signatories?.coordinator || 'Drive Coordinator'}
                </div>
                <div className="text-[10px] text-slate-400">Faculty Coordinator</div>
              </div>

              <div>
                <div className="h-10"></div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  {signatories?.principal || 'Principal / Dean'}
                </div>
                <div className="text-[10px] text-slate-400">Head of Institution</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
