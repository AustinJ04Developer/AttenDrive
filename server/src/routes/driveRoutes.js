import express from 'express';
import {
  getDrives,
  getDriveById,
  createDrive,
  updateDrive,
  deleteDrive,
  bulkCreateDrives,
  getEligiblePreview,
  autoAssignEligible,
  bulkAssignStudents,
  getDriveAssignments,
  bulkRemoveAssignments,
  assignStudentToMultipleDrives,
} from '../controllers/driveController.js';

const router = express.Router();

// Bulk & special drive routes
router.post('/bulk', bulkCreateDrives);
router.post('/students/:studentId/assign-multiple', assignStudentToMultipleDrives);

// Assignment & eligibility routes for a drive
router.get('/:id/eligible', getEligiblePreview);
router.post('/:id/assign/auto', autoAssignEligible);
router.post('/:id/assign/bulk', bulkAssignStudents);
router.delete('/:id/assign/bulk', bulkRemoveAssignments);
router.get('/:id/assignments', getDriveAssignments);

// Standard CRUD
router.get('/', getDrives);
router.post('/', createDrive);
router.get('/:id', getDriveById);
router.put('/:id', updateDrive);
router.delete('/:id', deleteDrive);

export default router;
