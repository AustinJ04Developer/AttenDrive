import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
} from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// User Registration & Login
router.post('/register', register);
router.post('/login', login);

// Authenticated User Details & Profile
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);

// Legacy PIN Access verification endpoints
router.get('/status', (req, res) => {
  const configuredPin = process.env.ACCESS_PIN;
  const pinRequired = Boolean(configuredPin && configuredPin.trim().length > 0);
  res.json({
    success: true,
    pinRequired,
  });
});

router.post('/verify', (req, res) => {
  const configuredPin = process.env.ACCESS_PIN;
  if (!configuredPin || configuredPin.trim().length === 0) {
    return res.json({ success: true, message: 'No PIN required' });
  }

  const { pin } = req.body;
  if (pin && String(pin).trim() === configuredPin.trim()) {
    return res.json({ success: true, message: 'PIN verified successfully' });
  }

  return res.status(401).json({ success: false, message: 'Invalid access PIN' });
});

export default router;
