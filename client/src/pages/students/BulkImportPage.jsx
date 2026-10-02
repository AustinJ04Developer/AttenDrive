import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  ClipboardList,
  Hash,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  FileCheck,
  Undo2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { OFFICIAL_DEPARTMENTS } from '../../config/departments';

// Standard expected model fields
const SYSTEM_FIELDS = [
  { key: 'registerNo', label: 'Register Number *', required: true, aliases: ['reg', 'regno', 'roll', 'rollno', 'register', 'id'] },
  { key: 'name', label: 'Student Name *', required: true, aliases: ['name', 'studentname', 'fullname'] },
  { key: 'department', label: 'Department', required: false, aliases: ['dept', 'department', 'branch', 'program'] },
  { key: 'batch', label: 'Batch / Year', required: false, aliases: ['batch', 'year', 'passingyear', 'gradyear'] },
  { key: 'email', label: 'Email Address', required: false, aliases: ['email', 'mail', 'emailid', 'emailaddress'] },
  { key: 'phone', label: 'Phone Number', required: false, aliases: ['phone', 'mobile', 'contact', 'cell'] },
  { key: 'cgpa', label: 'CGPA (0 - 10)', required: false, aliases: ['cgpa', 'gpa', 'pointer', 'marks'] },
  { key: 'backlogs', label: 'Backlogs Count', required: false, aliases: ['backlog', 'backlogs', 'arrear', 'arrears', 'standingarrears'] },
];

export const BulkImportPage = () => {
  const navigate = useNavigate();
  const { addToast, departments: configuredDepartments } = useApp();
  const deptList = (configuredDepartments && configuredDepartments.length > 0) ? configuredDepartments : OFFICIAL_DEPARTMENTS;

  // Wizard Step: 1 = Input, 2 = Mapping, 3 = Preview & Validate, 4 = Confirm, 5 = Result
  const [currentStep, setCurrentStep] = useState(1);

  // Input Method: 'upload' | 'paste' | 'regOnly'
  const [inputMethod, setInputMethod] = useState('upload');

  // Raw file / parsed data
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [fileName, setFileName] = useState('');

  // Paste Text
  const [pasteText, setPasteText] = useState('');

  // Register numbers only settings
  const [regOnlyText, setRegOnlyText] = useState('');
  const [regOnlyDept, setRegOnlyDept] = useState('');
  const [regOnlyBatch, setRegOnlyBatch] = useState('');

  // Step 2: Mapping
  const [columnMapping, setColumnMapping] = useState({});

  // Step 3: Validated Rows & In-Place Editing
  const [previewRows, setPreviewRows] = useState([]);
  const [dbDuplicates, setDbDuplicates] = useState(new Set());
  const [validating, setValidating] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, field }

  // Step 4: Import Config & Progress
  const [conflictMode, setConflictMode] = useState('skip'); // 'skip' | 'update'
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  // Step 5: Final Result
  const [importSummary, setImportSummary] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [createdImportLogId, setCreatedImportLogId] = useState(null);
  const [undoLoading, setUndoLoading] = useState(false);

  const fileInputRef = useRef(null);

  // --- Step 1 Handlers ---
  const handleFileUpload = (file) => {
    if (!file) return;
    setFileName(file.name);
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            addToast('The uploaded CSV file is empty', 'error');
            return;
          }
          setRawHeaders(results.meta.fields || []);
          setRawRows(results.data);
          autoDetectMapping(results.meta.fields || []);
          setCurrentStep(2);
        },
        error: (err) => {
          addToast(`Failed to parse CSV: ${err.message}`, 'error');
        },
      });
    } else if (['xlsx', 'xls'].includes(extension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!json || json.length === 0) {
            addToast('The uploaded Excel worksheet contains no data', 'error');
            return;
          }

          const headers = Object.keys(json[0]);
          setRawHeaders(headers);
          setRawRows(json);
          autoDetectMapping(headers);
          setCurrentStep(2);
        } catch (err) {
          addToast(`Error reading Excel file: ${err.message}`, 'error');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      addToast('Please upload a valid .csv, .xlsx, or .xls file', 'error');
    }
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) {
      addToast('Please paste data into the text box', 'warning');
      return;
    }

    const parsed = Papa.parse(pasteText.trim(), {
      header: true,
      skipEmptyLines: true,
    });

    if (!parsed.data || parsed.data.length === 0 || !parsed.meta.fields) {
      addToast('Could not detect headers in pasted text. Make sure first row has column headers.', 'error');
      return;
    }

    setFileName('Pasted_Spreadsheet_Data');
    setRawHeaders(parsed.meta.fields);
    setRawRows(parsed.data);
    autoDetectMapping(parsed.meta.fields);
    setCurrentStep(2);
  };

  const handleProcessRegOnly = () => {
    const lines = regOnlyText
      .split('\n')
      .map((l) => l.trim().toUpperCase())
      .filter(Boolean);

    if (lines.length === 0) {
      addToast('Please enter at least one register number', 'warning');
      return;
    }

    const rows = lines.map((regNo) => ({
      registerNo: regNo,
      name: `Student ${regNo}`,
      department: regOnlyDept.trim(),
      batch: regOnlyBatch.trim(),
      email: '',
      phone: '',
      cgpa: '',
      backlogs: '0',
    }));

    setFileName(`Quick_RegNos_(${rows.length})`);
    setRawHeaders(['registerNo', 'name', 'department', 'batch', 'email', 'phone', 'cgpa', 'backlogs']);
    setRawRows(rows);

    const directMapping = {
      registerNo: 'registerNo',
      name: 'name',
      department: 'department',
      batch: 'batch',
      email: 'email',
      phone: 'phone',
      cgpa: 'cgpa',
      backlogs: 'backlogs',
    };
    setColumnMapping(directMapping);
    validateAndBuildPreview(rows, directMapping);
    setCurrentStep(3);
  };

  // --- Step 2: Auto Mapping Heuristics ---
  const autoDetectMapping = (headers) => {
    const mapping = {};
    const lowerHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    SYSTEM_FIELDS.forEach((field) => {
      // Find best match in headers
      for (let i = 0; i < headers.length; i++) {
        const rawH = headers[i];
        const normH = lowerHeaders[i];
        if (normH === field.key.toLowerCase() || field.aliases.includes(normH)) {
          mapping[field.key] = rawH;
          break;
        }
      }
    });

    setColumnMapping(mapping);
  };

  // --- Step 3: Validate & Build Preview Table ---
  const validateAndBuildPreview = async (rows, mapping) => {
    setValidating(true);
    try {
      // 1. Transform raw rows into mapped student objects
      const transformed = rows.map((rawRow, index) => {
        const student = {
          _originalIndex: index + 1,
          registerNo: String(rawRow[mapping.registerNo] || '').trim().toUpperCase(),
          name: String(rawRow[mapping.name] || '').trim(),
          department: String(rawRow[mapping.department] || '').trim(),
          batch: String(rawRow[mapping.batch] || '').trim(),
          email: String(rawRow[mapping.email] || '').trim().toLowerCase(),
          phone: String(rawRow[mapping.phone] || '').trim(),
          cgpa: rawRow[mapping.cgpa] !== undefined && rawRow[mapping.cgpa] !== '' ? String(rawRow[mapping.cgpa]).trim() : '',
          backlogs: rawRow[mapping.backlogs] !== undefined && rawRow[mapping.backlogs] !== '' ? String(rawRow[mapping.backlogs]).trim() : '0',
        };
        return student;
      });

      // 2. Fetch DB duplicates
      const uniqueRegNos = Array.from(new Set(transformed.map((t) => t.registerNo).filter(Boolean)));
      let existingInDb = [];
      if (uniqueRegNos.length > 0) {
        const dbRes = await api.checkDuplicates(uniqueRegNos);
        existingInDb = dbRes.existingRegisterNos || [];
      }
      const dbDupSet = new Set(existingInDb);
      setDbDuplicates(dbDupSet);

      // 3. Perform row-level validation
      const seenInFile = new Set();
      const validatedList = transformed.map((row) => {
        const issues = [];

        // Required checks
        if (!row.registerNo) {
          issues.push('Missing Register Number');
        } else if (seenInFile.has(row.registerNo)) {
          issues.push(`Duplicate Register No in file (${row.registerNo})`);
        } else {
          seenInFile.add(row.registerNo);
        }

        if (!row.name) {
          issues.push('Missing Student Name');
        }

        // Email check
        if (row.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email)) {
            issues.push('Invalid email format');
          }
        }

        // Phone check
        if (row.phone) {
          if (!/^[+]?[\d\s-]{7,15}$/.test(row.phone)) {
            issues.push('Invalid phone format');
          }
        }

        // CGPA check
        if (row.cgpa !== '') {
          const val = Number(row.cgpa);
          if (isNaN(val) || val < 0 || val > 10) {
            issues.push('CGPA must be between 0.0 and 10.0');
          }
        }

        // Backlogs check
        if (row.backlogs !== '') {
          const val = Number(row.backlogs);
          if (isNaN(val) || val < 0) {
            issues.push('Backlogs cannot be negative');
          }
        }

        const isDbDuplicate = row.registerNo ? dbDupSet.has(row.registerNo) : false;

        return {
          ...row,
          isValid: issues.length === 0,
          issues,
          isDbDuplicate,
        };
      });

      setPreviewRows(validatedList);
      setCurrentStep(3);
    } catch (err) {
      addToast(err.message || 'Validation failed', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmMapping = () => {
    if (!columnMapping.registerNo) {
      addToast('Please map the Register Number column (Required)', 'error');
      return;
    }
    if (!columnMapping.name) {
      addToast('Please map the Student Name column (Required)', 'error');
      return;
    }

    validateAndBuildPreview(rawRows, columnMapping);
  };

  // Re-validate a single edited cell inline in Step 3
  const handleCellChange = (rowIndex, field, value) => {
    setPreviewRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[rowIndex], [field]: value };

      // Recompute issues for this row
      const issues = [];
      const regNo = row.registerNo.trim().toUpperCase();
      if (!regNo) issues.push('Missing Register Number');
      if (!row.name.trim()) issues.push('Missing Student Name');

      if (row.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email.trim())) issues.push('Invalid email format');
      }

      if (row.phone.trim()) {
        if (!/^[+]?[\d\s-]{7,15}$/.test(row.phone.trim())) issues.push('Invalid phone format');
      }

      if (row.cgpa !== '') {
        const num = Number(row.cgpa);
        if (isNaN(num) || num < 0 || num > 10) issues.push('CGPA must be between 0.0 and 10.0');
      }

      if (row.backlogs !== '') {
        const num = Number(row.backlogs);
        if (isNaN(num) || num < 0) issues.push('Backlogs cannot be negative');
      }

      row.registerNo = regNo;
      row.isValid = issues.length === 0;
      row.issues = issues;
      row.isDbDuplicate = regNo ? dbDuplicates.has(regNo) : false;

      updated[rowIndex] = row;
      return updated;
    });
  };

  // Stats for preview
  const previewStats = useMemo(() => {
    const total = previewRows.length;
    const valid = previewRows.filter((r) => r.isValid).length;
    const invalid = total - valid;
    const dbConflicts = previewRows.filter((r) => r.isDbDuplicate).length;
    return { total, valid, invalid, dbConflicts };
  }, [previewRows]);

  // --- Step 4 & 5: Submission in batches of 500 ---
  const handleExecuteImport = async () => {
    if (previewStats.valid === 0) {
      addToast('No valid rows available to import', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    try {
      const validRowsToImport = previewRows
        .filter((r) => r.isValid)
        .map((r) => ({
          registerNo: r.registerNo,
          name: r.name,
          department: r.department,
          batch: r.batch,
          email: r.email,
          phone: r.phone,
          cgpa: r.cgpa !== '' ? Number(r.cgpa) : null,
          backlogs: r.backlogs !== '' ? Number(r.backlogs) : 0,
        }));

      setImportProgress(40);
      const res = await api.bulkImportStudents(validRowsToImport, conflictMode);
      setImportProgress(100);

      setImportSummary({
        total: previewRows.length,
        added: res.summary.added,
        updated: res.summary.updated,
        skipped: res.summary.skipped + previewStats.invalid, // Include invalid rows as skipped/failed
        failed: res.summary.failed + previewStats.invalid,
      });

      // Combine client-side invalid row errors with any backend errors
      const combinedErrors = [
        ...previewRows
          .filter((r) => !r.isValid)
          .map((r) => ({
            row: r._originalIndex,
            registerNo: r.registerNo || '(Empty)',
            reason: r.issues.join('; '),
          })),
        ...(res.errors || []),
      ];

      setImportErrors(combinedErrors);
      setCreatedImportLogId(res.importLogId);
      setCurrentStep(5);
      addToast('Bulk import operation completed successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Bulk import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Download error report CSV
  const downloadErrorReport = () => {
    if (importErrors.length === 0) return;
    const headers = ['Row Number', 'Register No', 'Failure Reason'];
    const rows = importErrors.map((e) => [e.row, `"${e.registerNo}"`, `"${e.reason}"`]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Import_Errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Undo Import
  const handleUndoImport = async () => {
    if (!createdImportLogId) return;
    setUndoLoading(true);
    try {
      const res = await api.undoImport(createdImportLogId);
      addToast(res.message || 'Import undone successfully', 'success');
      setCreatedImportLogId(null);
    } catch (err) {
      addToast(err.message || 'Failed to undo import', 'error');
    } finally {
      setUndoLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bulk Student Onboarding
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Import hundreds of student records at once via CSV/Excel, spreadsheet paste, or register numbers
          </p>
        </div>

        <button
          onClick={() => api.downloadTemplate('students')}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 self-start transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Sample Template
        </button>
      </div>

      {/* 5-Step Stepper Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
          {[
            { step: 1, label: '1. Input Data' },
            { step: 2, label: '2. Column Mapping' },
            { step: 3, label: '3. Preview & Validation' },
            { step: 4, label: '4. Conflict & Confirm' },
            { step: 5, label: '5. Summary' },
          ].map((s) => (
            <div
              key={s.step}
              className={`py-2 px-1 rounded-xl transition-all ${
                currentStep === s.step
                  ? 'bg-primary-600 text-white font-bold shadow-md shadow-primary-600/20'
                  : currentStep > s.step
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: INPUT METHODS */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          {/* Method selector tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
            <button
              onClick={() => setInputMethod('upload')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                inputMethod === 'upload'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload CSV / Excel
            </button>

            <button
              onClick={() => setInputMethod('paste')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                inputMethod === 'paste'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Paste from Sheets / Excel
            </button>

            <button
              onClick={() => setInputMethod('regOnly')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                inputMethod === 'regOnly'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Hash className="w-4 h-4" />
              Register Numbers Only
            </button>
          </div>

          {/* Option A: File Upload */}
          {inputMethod === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-inner">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Drop your CSV or Excel file here, or browse
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supports .csv, .xlsx, .xls up to 50,000 rows
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span>Expected columns: Register No, Name, Department, Batch, Email, Phone, CGPA, Backlogs</span>
                <button
                  onClick={() => api.downloadTemplate('students')}
                  className="text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </button>
              </div>
            </div>
          )}

          {/* Option B: Paste from Sheets */}
          {inputMethod === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Paste rows directly from Google Sheets or Excel (Include column headers in row 1)
                </label>
                <textarea
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Register No\tName\tDepartment\tBatch\tCGPA\n21CS001\tJohn Doe\tCSE\t2021-2025\t8.45\n21CS002\tJane Smith\tCSE\t2021-2025\t7.90`}
                  className="w-full font-mono text-xs p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleProcessPaste}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2"
                >
                  Parse & Map Columns
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Option C: Register Numbers Only */}
          {inputMethod === 'regOnly' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quickly create placeholder student records using just their Register Numbers. Default department and batch will be assigned.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Department (optional)
                  </label>
                  <select
                    value={regOnlyDept}
                    onChange={(e) => setRegOnlyDept(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    {deptList.map((dept) => (
                      <option key={dept.code} value={dept.name}>
                        {dept.code} — {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Batch (optional)
                  </label>
                  <input
                    type="text"
                    value={regOnlyBatch}
                    onChange={(e) => setRegOnlyBatch(e.target.value)}
                    placeholder="e.g. 2021-2025"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Register Numbers (One per line)
                </label>
                <textarea
                  rows={8}
                  value={regOnlyText}
                  onChange={(e) => setRegOnlyText(e.target.value)}
                  placeholder={`21CS001\n21CS002\n21CS003\n21IT001`}
                  className="w-full font-mono text-xs p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleProcessRegOnly}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2"
                >
                  Generate Preview
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Map Columns from "{fileName}"
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirm or adjust which spreadsheet column corresponds to each student field.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {rawRows.length} rows detected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SYSTEM_FIELDS.map((field) => (
              <div
                key={field.key}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {field.label}
                  </div>
                  <div className="text-[11px] text-slate-400">Target Field</div>
                </div>

                <select
                  value={columnMapping[field.key] || ''}
                  onChange={(e) =>
                    setColumnMapping({ ...columnMapping, [field.key]: e.target.value })
                  }
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none min-w-[180px]"
                >
                  <option value="">-- Do Not Import --</option>
                  {rawHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleConfirmMapping}
              disabled={validating}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2"
            >
              {validating ? (
                'Validating Rows...'
              ) : (
                <>
                  Validate & Preview Rows
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW TABLE WITH ROW-LEVEL VALIDATION & INLINE EDITING */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Validation Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">Total Rows</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {previewStats.total}
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Valid Rows
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {previewStats.valid}
              </div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm">
              <div className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                Invalid / Errors
              </div>
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                {previewStats.invalid}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm">
              <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Existing in DB
              </div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                {previewStats.dbConflicts}
              </div>
            </div>
          </div>

          {/* Interactive Preview Table with Inline Edit */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Row-Level Validation Preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Green rows are valid. Red rows have errors — click on any cell to edit and fix errors directly in table!
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Showing first {Math.min(previewRows.length, 100)} of {previewRows.length} rows
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-12 text-center">Row</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Register No *</th>
                    <th className="p-3">Name *</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">CGPA</th>
                    <th className="p-3">Backlogs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {previewRows.slice(0, 100).map((row, rIdx) => {
                    const isError = !row.isValid;
                    return (
                      <tr
                        key={rIdx}
                        className={`transition-colors ${
                          isError
                            ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/50'
                            : 'bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-2.5 text-center text-slate-400 font-sans">{rIdx + 1}</td>
                        <td className="p-2.5 font-sans">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              {row.isDbDuplicate ? 'DB Conflict' : 'Valid'}
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 cursor-help"
                              title={row.issues.join('; ')}
                            >
                              <AlertCircle className="w-3 h-3" />
                              {row.issues[0]}
                            </span>
                          )}
                        </td>

                        {/* Inline Editable Columns */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.registerNo}
                            onChange={(e) => handleCellChange(rIdx, 'registerNo', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 bg-transparent uppercase font-bold"
                          />
                        </td>
                        <td className="p-2 font-sans font-medium">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleCellChange(rIdx, 'name', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 bg-transparent font-sans"
                          />
                        </td>
                        <td className="p-2 font-sans">
                          <input
                            type="text"
                            value={row.department}
                            onChange={(e) => handleCellChange(rIdx, 'department', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 bg-transparent font-sans"
                          />
                        </td>
                        <td className="p-2 font-sans">
                          <input
                            type="text"
                            value={row.batch}
                            onChange={(e) => handleCellChange(rIdx, 'batch', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 bg-transparent font-sans"
                          />
                        </td>
                        <td className="p-2 font-sans">
                          <input
                            type="email"
                            value={row.email}
                            onChange={(e) => handleCellChange(rIdx, 'email', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 bg-transparent font-sans lowercase"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.phone}
                            onChange={(e) => handleCellChange(rIdx, 'phone', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 bg-transparent"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={row.cgpa}
                            onChange={(e) => handleCellChange(rIdx, 'cgpa', e.target.value)}
                            className="w-16 px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 bg-transparent text-center"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.backlogs}
                            onChange={(e) => handleCellChange(rIdx, 'backlogs', e.target.value)}
                            className="w-12 px-2 py-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 bg-transparent text-center"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Mapping
              </button>

              <button
                onClick={() => setCurrentStep(4)}
                disabled={previewStats.valid === 0}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                Proceed to Conflict & Confirm ({previewStats.valid} valid rows)
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: CONFLICT RESOLUTION & CONFIRM */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 max-w-xl mx-auto">
          <div className="text-center pb-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Duplicate Conflict Resolution
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Choose how you want to handle register numbers that already exist in the database.
            </p>
          </div>

          <div className="space-y-3">
            <label
              onClick={() => setConflictMode('skip')}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                conflictMode === 'skip'
                  ? 'bg-primary-50/60 dark:bg-primary-950/40 border-primary-500 ring-2 ring-primary-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="conflictMode"
                value="skip"
                checked={conflictMode === 'skip'}
                onChange={() => setConflictMode('skip')}
                className="mt-1 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Skip Duplicates (Safe)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Keep existing student records unchanged in database. Only insert new register numbers.
                </div>
              </div>
            </label>

            <label
              onClick={() => setConflictMode('update')}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                conflictMode === 'update'
                  ? 'bg-primary-50/60 dark:bg-primary-950/40 border-primary-500 ring-2 ring-primary-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="conflictMode"
                value="update"
                checked={conflictMode === 'update'}
                onChange={() => setConflictMode('update')}
                className="mt-1 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Update Existing Records
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Overwrite existing student details (Department, CGPA, Backlogs, Email, Phone) with new data from file.
                </div>
              </div>
            </label>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <div className="flex justify-between">
              <span>Batch processing:</span>
              <span className="font-semibold">Chunks of 500 records</span>
            </div>
            <div className="flex justify-between">
              <span>Valid records to import:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {previewStats.valid} records
              </span>
            </div>
            <div className="flex justify-between">
              <span>Invalid records to ignore:</span>
              <span className="font-semibold text-rose-500">{previewStats.invalid} records</span>
            </div>
          </div>

          {/* Progress bar during active import */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Importing records to database...</span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-600 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setCurrentStep(3)}
              disabled={isImporting}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              {isImporting ? 'Processing Import...' : 'Confirm & Execute Import'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: RESULT SUMMARY WITH UNDO & ERROR REPORT */}
      {currentStep === 5 && importSummary && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <FileCheck className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Import Completed
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your bulk student data has been processed into the database.
            </p>
          </div>

          {/* Summary Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                Added New
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {importSummary.added}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
              <div className="text-xs text-sky-700 dark:text-sky-400 font-semibold">Updated</div>
              <div className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">
                {importSummary.updated}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Skipped</div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {importSummary.skipped}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
              <div className="text-xs text-rose-700 dark:text-rose-400 font-semibold">Failed</div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                {importSummary.failed}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/students')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 transition-all"
            >
              View Students List
            </button>

            {importErrors.length > 0 && (
              <button
                onClick={downloadErrorReport}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Error Report CSV ({importErrors.length})
              </button>
            )}

            {createdImportLogId && (
              <button
                onClick={handleUndoImport}
                disabled={undoLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Undo2 className="w-4 h-4 text-amber-500" />
                {undoLoading ? 'Undoing...' : 'Undo This Import'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
