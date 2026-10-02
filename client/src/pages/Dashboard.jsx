import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  Calendar,
  Percent,
  Plus,
  FileSpreadsheet,
  UserCheck,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building,
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { addToast, branding } = useApp();

  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalDrives: 0,
    upcomingDrives: 0,
    todayAttendancePct: 0,
  });

  const [upcomingDrivesList, setUpcomingDrivesList] = useState([]);
  const [ongoingDrivesList, setOngoingDrivesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch student count and drives concurrently
        const [studentRes, driveRes] = await Promise.all([
          api.getStudents({ limit: 1 }),
          api.getDrives(),
        ]);

        const totalStudents = studentRes.pagination ? studentRes.pagination.total : 0;
        const allDrives = driveRes.drives || [];

        const upcoming = allDrives.filter((d) => d.status === 'Upcoming');
        const ongoing = allDrives.filter((d) => d.status === 'Ongoing');

        // Calculate attendance average for ongoing / completed drives
        let totalAssigned = 0;
        let totalPresent = 0;
        allDrives.forEach((d) => {
          if (d.assignedCount > 0) {
            totalAssigned += d.assignedCount;
            totalPresent += d.attendanceStats?.present || 0;
          }
        });

        const avgAttendance = totalAssigned > 0 ? Math.round((totalPresent / totalAssigned) * 100) : 0;

        setMetrics({
          totalStudents,
          totalDrives: allDrives.length,
          upcomingDrives: upcoming.length,
          todayAttendancePct: avgAttendance,
        });

        setUpcomingDrivesList(upcoming);
        setOngoingDrivesList(ongoing);
      } catch (err) {
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Placement Cell Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {branding?.collegeName ? `${branding.collegeName} • ` : ''}Monitor drives, manage student eligibility, and record session attendance
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/students/bulk-import')}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Add Students
          </button>

          <button
            onClick={() => navigate('/drives')}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-primary-500" />
            Create Drive
          </button>

          <button
            onClick={() => navigate('/attendance')}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            Mark Attendance
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <FileText className="w-4 h-4 text-sky-500" />
            Generate Report
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Students
            </p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
              {metrics.totalStudents}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Registered in Database
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Drives */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Drives
            </p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
              {metrics.totalDrives}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">All Recorded Drives</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Upcoming Drives */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Upcoming Drives
            </p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
              {metrics.upcomingDrives}
            </h3>
            <p className="text-[11px] text-primary-600 dark:text-primary-400 font-medium mt-1">
              Scheduled this season
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Today's Attendance % */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Today's Attendance %
            </p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
              {metrics.todayAttendancePct}%
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Active drives average</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Ongoing & Upcoming Drives Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ongoing Drives Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ongoing Placement Drives
              </h2>
            </div>
            <button
              onClick={() => navigate('/drives')}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {ongoingDrivesList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              No placement drives currently active today.
            </div>
          ) : (
            <div className="space-y-3">
              {ongoingDrivesList.map((drive) => (
                <div
                  key={drive._id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {drive.company}
                    </h3>
                    <p className="text-xs text-slate-500">{drive.role} • {drive.packageLpa} LPA</p>
                  </div>
                  <button
                    onClick={() => navigate('/attendance')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    Mark Attendance
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Drives Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upcoming Placement Drives
              </h2>
            </div>
            <button
              onClick={() => navigate('/drives')}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              Manage Drives <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingDrivesList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Building className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              No upcoming drives scheduled yet. Click "Create Drive" to add one.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDrivesList.map((drive) => (
                <div
                  key={drive._id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {drive.company}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {new Date(drive.driveDate).toLocaleDateString()} • {drive.venueMode}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400">
                    {drive.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
