import { Setting } from '../models/Setting.js';
import { Student } from '../models/Student.js';
import { Drive } from '../models/Drive.js';
import { Attendance } from '../models/Attendance.js';
import { DriveAssignment } from '../models/DriveAssignment.js';
import { OFFICIAL_DEPARTMENTS } from '../config/departments.js';

// Default college settings
const DEFAULT_SETTINGS = {
  college_branding: {
    headerMode: 'banner', // 'banner' | 'full_page' | 'preprinted' | 'custom'
    collegeName: 'National Institute of Technology & Engineering',
    address: 'University Campus, Placement Division, Knowledge City - 560001',
    logo: '',
    letterheadImage: '',
    fullPageLetterhead: '',
    preprintedMarginTop: 45,
    email: 'placements@nite.edu.in',
    phone: '+91 80 2345 6789',
  },
  official_departments: OFFICIAL_DEPARTMENTS,
  report_signatories: {
    officer: 'Prof. Alan Turing (Placement Officer)',
    coordinator: 'Dr. Grace Hopper (Drive Coordinator)',
    principal: 'Dr. John von Neumann (Principal)',
  },
  default_orientation: 'portrait',
};

// Get all settings
export const getSettings = async (req, res, next) => {
  try {
    const settingsList = await Setting.find().lean();
    const settingsMap = { ...DEFAULT_SETTINGS };

    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      settings: settingsMap,
    });
  } catch (error) {
    next(error);
  }
};

// Update settings
export const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body; // e.g. { college_branding: {...}, report_signatories: {...}, default_orientation: 'portrait' }

    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true, new: true }
      );
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Full database backup export (Never on disk, sent as JSON payload / stream)
export const exportAllData = async (req, res, next) => {
  try {
    const [students, drives, assignments, attendance, settings] = await Promise.all([
      Student.find().lean(),
      Drive.find().lean(),
      DriveAssignment.find().lean(),
      Attendance.find().lean(),
      Setting.find().lean(),
    ]);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="AttenDrive_Backup_${Date.now()}.json"`);

    res.json({
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      data: {
        students,
        drives,
        assignments,
        attendance,
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};
