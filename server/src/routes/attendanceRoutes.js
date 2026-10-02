import express from 'express';
import {
  getDriveAttendanceSheet,
  rapidScanAttendance,
  bulkUpdateAttendance,
  markAllAttendance,
  pastePresentRegisterNos,
  finalizeAttendance,
  unlockAttendance,
} from '../controllers/attendanceController.js';

const router = express.Router({ mergeParams: true });

// Attendance Sheet & Operations for a drive
router.get('/:id/attendance', getDriveAttendanceSheet);
router.post('/:id/attendance/bulk', bulkUpdateAttendance);
router.post('/:id/attendance/mark-all', markAllAttendance);
router.post('/:id/attendance/rapid-scan', rapidScanAttendance);
router.post('/:id/attendance/paste-present', pastePresentRegisterNos);
router.post('/:id/finalize', finalizeAttendance);
router.post('/:id/unlock', unlockAttendance);

export default router;
