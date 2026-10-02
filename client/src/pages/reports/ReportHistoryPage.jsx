import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, FileText, Calendar, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

export const ReportHistoryPage = () => {
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getReportHistory();
      setLogs(res.logs || []);
    } catch (err) {
      addToast(err.message || 'Failed to load report history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Report Generation History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete audit trail of all finalized attendance sheets and generated official reports
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 self-start"
          title="Refresh History"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Report Title</th>
                <th className="p-3.5">Drive Company</th>
                <th className="p-3.5">Report Type</th>
                <th className="p-3.5">Generated Timestamp</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    Loading report audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400">
                    No reports generated yet. Finalize a drive attendance or preview a report to generate records.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                      <span>{log.title || 'Official Drive Attendance Report'}</span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {log.driveId?.company || log.meta?.company || 'All College'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {new Date(log.generatedAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right">
                      {log.driveId?._id ? (
                        <button
                          onClick={() => navigate(`/reports?driveId=${log.driveId._id}`)}
                          className="px-3 py-1 rounded-lg bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/60 dark:hover:bg-primary-900 text-primary-700 dark:text-primary-300 font-semibold text-xs inline-flex items-center gap-1"
                        >
                          View Report <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate('/reports')}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs inline-flex items-center gap-1"
                        >
                          View <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
