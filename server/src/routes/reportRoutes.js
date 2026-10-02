import express from 'express';
import {
  getDriveReport,
  getAbsenteesReport,
  getStudentHistoryReport,
  getDepartmentSummaryReport,
  getConsolidatedReport,
  getReportHistory,
} from '../controllers/reportController.js';

const router = express.Router();

// Report endpoints
router.get('/drive/:id', getDriveReport);
router.get('/absentees/:id', getAbsenteesReport);
router.get('/student-history/:studentId', getStudentHistoryReport);
router.get('/department-summary', getDepartmentSummaryReport);
router.get('/consolidated', getConsolidatedReport);
router.get('/history', getReportHistory);

export default router;
