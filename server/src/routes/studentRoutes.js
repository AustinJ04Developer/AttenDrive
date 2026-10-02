import express from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  bulkEditStudents,
  bulkDeleteStudents,
  checkExistingRegisterNos,
} from '../controllers/studentController.js';

const router = express.Router();

// Bulk & special endpoints
router.post('/check-duplicates', checkExistingRegisterNos);
router.post('/bulk', bulkImportStudents);
router.put('/bulk', bulkEditStudents);
router.delete('/bulk', bulkDeleteStudents);

// Standard CRUD
router.get('/', getStudents);
router.post('/', createStudent);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;
