import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { X, UploadCloud, Download, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

export const BulkUploadDrivesModal = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useApp();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [parsedDrives, setParsedDrives] = useState([]);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processRawRows(results.data);
        },
      });
    } else if (['xlsx', 'xls'].includes(extension)) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          processRawRows(json);
        } catch (err) {
          addToast(`Error reading Excel: ${err.message}`, 'error');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const processRawRows = (rows) => {
    const drives = rows.map((r) => {
      // Parse allowed departments comma separated string
      let allowedDepts = [];
      const rawDeptStr = r['Allowed Departments'] || r.allowedDepartments || r.Department || '';
      if (rawDeptStr) {
        allowedDepts = String(rawDeptStr)
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean);
      }

      return {
        company: String(r.Company || r.company || '').trim(),
        role: String(r.Role || r.role || '').trim(),
        packageLpa: Number(r['Package LPA'] || r.packageLpa || r.Package || 0) || 0,
        driveDate: r['Drive Date'] || r.driveDate ? new Date(r['Drive Date'] || r.driveDate) : null,
        driveTime: String(r['Drive Time'] || r.driveTime || '').trim(),
        venueMode: String(r['Venue / Mode'] || r.venueMode || 'Offline').trim(),
        coordinator: String(r.Coordinator || r.coordinator || '').trim(),
        status: 'Upcoming',
        eligibility: {
          minCgpa: Number(r['Min CGPA'] || r.minCgpa || 0) || 0,
          maxBacklogs: Number(r['Max Backlogs'] || r.maxBacklogs || 0) || 0,
          allowedDepartments: allowedDepts,
          batch: String(r.Batch || r.batch || '').trim(),
        },
      };
    }).filter((d) => d.company);

    setParsedDrives(drives);
  };

  const handleSubmit = async () => {
    if (parsedDrives.length === 0) {
      addToast('No valid drive rows detected', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.bulkCreateDrives(parsedDrives);
      addToast(res.message || `Uploaded ${res.addedCount} placement drives`, 'success');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to upload drives', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Bulk Upload Drives (CSV / Excel)
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 group text-center"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-2 group-hover:scale-105 transition-transform" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {fileName || 'Click to select CSV or Excel file'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Supports multiple drives with eligibility criteria</p>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <span>Need the proper columns?</span>
          <button
            onClick={() => api.downloadTemplate('drives')}
            className="text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            Download Drives Template
          </button>
        </div>

        {parsedDrives.length > 0 && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            ✓ Ready to import {parsedDrives.length} drive(s):{' '}
            {parsedDrives.map((d) => d.company).slice(0, 3).join(', ')}
            {parsedDrives.length > 3 ? ` and ${parsedDrives.length - 3} more` : ''}
          </div>
        )}

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || parsedDrives.length === 0}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/25 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Confirm Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};
