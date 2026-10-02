import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAccessPin, requireAuth } from './middlewares/authMiddleware.js';
import { notFoundHandler, errorHandler } from './middlewares/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import driveRoutes from './routes/driveRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import importRoutes from './routes/importRoutes.js';
import templateRoutes from './routes/templateRoutes.js';

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible client integrations & dev tools
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching origin
      if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, or set to specific in prod
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-pin'],
  })
);

// Body parsing with generous limit for bulk data and base64 logo images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting: 1000 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Placement Drive Attendance System API',
  });
});

// Access PIN verification middleware
app.use(requireAccessPin);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', requireAuth, studentRoutes);
app.use('/api/drives', requireAuth, driveRoutes);
app.use('/api/drives', requireAuth, attendanceRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/export', requireAuth, settingsRoutes);
app.use('/api/imports', requireAuth, importRoutes);
app.use('/api/templates', templateRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

// Serve static client assets in production if build exists
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 and global error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
