import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Student } from '../models/Student.js';
import { Drive } from '../models/Drive.js';
import { DriveAssignment } from '../models/DriveAssignment.js';
import { Attendance } from '../models/Attendance.js';
import { ImportLog } from '../models/ImportLog.js';
import { ReportLog } from '../models/ReportLog.js';
import { Setting } from '../models/Setting.js';

dotenv.config();

const syncAllIndexes = async () => {
  try {
    console.log('[Index Sync] Connecting to MongoDB...');
    await connectDB();

    const models = [
      { name: 'Student', model: Student },
      { name: 'Drive', model: Drive },
      { name: 'DriveAssignment', model: DriveAssignment },
      { name: 'Attendance', model: Attendance },
      { name: 'ImportLog', model: ImportLog },
      { name: 'ReportLog', model: ReportLog },
      { name: 'Setting', model: Setting },
    ];

    console.log('[Index Sync] Synchronizing indexes for all models...');
    for (const { name, model } of models) {
      await model.syncIndexes();
      const indexes = await model.collection.indexes();
      console.log(`  ✓ ${name}: ${indexes.length} indexes synced:`);
      indexes.forEach((idx) => {
        console.log(`    - ${idx.name} (${JSON.stringify(idx.key)}) ${idx.unique ? '[UNIQUE]' : ''}`);
      });
    }

    console.log('[Index Sync] All indexes verified and synchronized successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Index Sync Error] Failed to sync indexes:', error);
    process.exit(1);
  }
};

syncAllIndexes();
