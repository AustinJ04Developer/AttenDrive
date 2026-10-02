import express from 'express';
import {
  getSettings,
  updateSettings,
  exportAllData,
} from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/export/all', exportAllData);

export default router;
