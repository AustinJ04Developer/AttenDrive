import express from 'express';
import { undoImport } from '../controllers/studentController.js';
import { ImportLog } from '../models/ImportLog.js';

const router = express.Router();

// Get recent import logs
router.get('/recent', async (req, res, next) => {
  try {
    const logs = await ImportLog.find().sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
});

// Undo import by log ID
router.post('/:id/undo', undoImport);

export default router;
