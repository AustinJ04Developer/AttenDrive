import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { ensureDefaultAdmin } from './controllers/authController.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start HTTP server
const startServer = async () => {
  await connectDB();
  await ensureDefaultAdmin();

  const server = app.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`🚀 Placement Drive Attendance API Server running`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🛡️  Access PIN: ${process.env.ACCESS_PIN ? 'ENABLED' : 'DISABLED (open access)'}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`================================================`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
