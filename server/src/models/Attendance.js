import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late'],
      required: true,
      default: 'Present',
    },
    remark: {
      type: String,
      trim: true,
      default: '',
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on (driveId, studentId)
attendanceSchema.index({ driveId: 1, studentId: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
